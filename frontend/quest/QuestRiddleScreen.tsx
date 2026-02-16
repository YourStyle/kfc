import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Html5Qrcode } from 'html5-qrcode';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';
import QuestProgressBar from './QuestProgressBar';
import type { QuestPageSummary, QuestProgressData } from '../services/api';

type ScreenState = 'loading' | 'riddle' | 'scanner' | 'success' | 'error' | 'skip_confirm';

interface SuccessData {
  pointsEarned: number;
  factText: string;
}

const QUEST_CACHE_KEY = 'rostics_quest_cache';

interface QuestCache {
  pages: QuestPageSummary[];
  progress: QuestProgressData;
  timestamp: number;
}

function saveQuestCache(pages: QuestPageSummary[], progress: QuestProgressData): void {
  try {
    const cache: QuestCache = { pages, progress, timestamp: Date.now() };
    localStorage.setItem(QUEST_CACHE_KEY, JSON.stringify(cache));
  } catch {
    // localStorage full or unavailable — silently ignore
  }
}

function loadQuestCache(): QuestCache | null {
  try {
    const raw = localStorage.getItem(QUEST_CACHE_KEY);
    if (!raw) return null;
    const cache: QuestCache = JSON.parse(raw);
    // Reject cache older than 24 hours
    if (Date.now() - cache.timestamp > 24 * 60 * 60 * 1000) return null;
    if (!cache.pages || !cache.progress) return null;
    return cache;
  } catch {
    return null;
  }
}

const QuestRiddleScreen: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [state, setState] = useState<ScreenState>('loading');
  const [pages, setPages] = useState<QuestPageSummary[]>([]);
  const [progress, setProgress] = useState<QuestProgressData | null>(null);
  const [currentPage, setCurrentPage] = useState<QuestPageSummary | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [successData, setSuccessData] = useState<SuccessData | null>(null);
  const [isOffline, setIsOffline] = useState(false);

  const scannerRef = useRef<Html5Qrcode | null>(null);
  const qrReaderDivId = 'qr-reader';

  // Fetch quest data on mount
  useEffect(() => {
    const fetchQuestData = async () => {
      try {
        const [pagesRes, progressRes] = await Promise.all([
          api.getQuestPages(),
          api.getQuestProgress()
        ]);

        if (pagesRes.error || !pagesRes.data) {
          setErrorMessage(pagesRes.error || 'Не удалось загрузить страницы квеста');
          setState('error');
          return;
        }
        if (progressRes.error || !progressRes.data) {
          setErrorMessage(progressRes.error || 'Не удалось загрузить прогресс');
          setState('error');
          return;
        }

        const pagesData = pagesRes.data.pages;
        const progressData = progressRes.data;

        setPages(pagesData);
        setProgress(progressData);
        setIsOffline(false);
        saveQuestCache(pagesData, progressData);

        if (progressData.quest_completed) {
          navigate('/spacequest/result');
          return;
        }

        // Determine current page from progress data
        if (progressData.current_page_slug) {
          const page = pagesData.find(p => p.slug === progressData.current_page_slug);
          if (page) {
            setCurrentPage(page);
            setState('riddle');
            return;
          }
        }

        // Fallback: find first unanswered page
        const answeredSlugs = new Set(
          progressData.progress.filter(e => e.is_answered).map(e => e.page_slug)
        );
        const nextPage = pagesData.find(p => !answeredSlugs.has(p.slug));

        if (nextPage) {
          setCurrentPage(nextPage);
          setState('riddle');
        } else {
          navigate('/spacequest/result');
        }
      } catch (error) {
        console.error('Failed to fetch quest data:', error);

        // Try restoring from localStorage cache
        const cached = loadQuestCache();
        if (cached) {
          setPages(cached.pages);
          setProgress(cached.progress);
          setIsOffline(true);

          if (cached.progress.quest_completed) {
            navigate('/spacequest/result');
            return;
          }

          // Find current page from cached progress
          if (cached.progress.current_page_slug) {
            const page = cached.pages.find(p => p.slug === cached.progress.current_page_slug);
            if (page) {
              setCurrentPage(page);
              setState('riddle');
              return;
            }
          }

          const answeredSlugs = new Set(
            cached.progress.progress.filter(e => e.is_answered).map(e => e.page_slug)
          );
          const nextPage = cached.pages.find(p => !answeredSlugs.has(p.slug));
          if (nextPage) {
            setCurrentPage(nextPage);
            setState('riddle');
          } else {
            navigate('/spacequest/result');
          }
          return;
        }

        setErrorMessage('Не удалось загрузить данные квеста');
        setState('error');
      }
    };

    fetchQuestData();
  }, [navigate]);

  // Start QR scanner
  const startScanner = async () => {
    setState('scanner');

    try {
      // Small delay to ensure DOM is ready
      await new Promise(resolve => setTimeout(resolve, 100));

      const html5QrCode = new Html5Qrcode(qrReaderDivId);
      scannerRef.current = html5QrCode;

      await html5QrCode.start(
        { facingMode: "environment" },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 }
        },
        onScanSuccess,
        onScanFailure
      );
    } catch (err) {
      console.error('Failed to start scanner:', err);
      setErrorMessage('Не удалось запустить камеру');
      setState('error');
    }
  };

  // Stop QR scanner
  const stopScanner = async () => {
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop();
        scannerRef.current.clear();
        scannerRef.current = null;
      } catch (err) {
        console.error('Failed to stop scanner:', err);
      }
    }
  };

  // Handle successful QR scan
  const onScanSuccess = async (decodedText: string) => {
    // Extract token from URL pattern /spacequest/scan/{token}
    const match = decodedText.match(/\/spacequest\/scan\/([^/?]+)/);
    const token = match ? match[1] : decodedText;

    await stopScanner();

    const { data, error } = await api.scanQuestQR(token);

    if (error || !data) {
      setErrorMessage(error || 'Неверный QR-код');
      setState('error');
      return;
    }

    if (data.is_correct) {
      setSuccessData({
        pointsEarned: data.points_earned,
        factText: data.fact_text || ''
      });
      setState('success');

      // Update local progress
      if (progress) {
        const updatedProgress = {
          ...progress,
          total_score: data.total_quest_score,
          answered_pages: progress.answered_pages + 1,
          current_page_slug: data.next_page_slug,
          quest_completed: data.quest_completed,
        };
        setProgress(updatedProgress);
        saveQuestCache(pages, updatedProgress);
      }
    } else {
      setErrorMessage('Неверный QR-код. Найдите экспонат по текущей подсказке.');
      setState('error');
    }
  };

  const onScanFailure = (_error: string) => {
    // Silent - continuous scanning
  };

  // Cancel scanner
  const cancelScanner = async () => {
    await stopScanner();
    setState('riddle');
  };

  // Show skip confirmation
  const showSkipConfirm = () => {
    setState('skip_confirm');
  };

  // Skip question
  const skipQuestion = async () => {
    const { data, error } = await api.skipQuestQuestion();

    if (error || !data) {
      setErrorMessage(error || 'Ошибка при пропуске вопроса');
      setState('error');
      return;
    }

    if (data.quest_completed) {
      navigate('/spacequest/result');
      return;
    }

    // Move to next page
    if (data.next_page_slug) {
      const nextPage = pages.find(p => p.slug === data.next_page_slug);
      if (nextPage) {
        setCurrentPage(nextPage);
        if (progress) {
          const updatedProgress = {
            ...progress,
            total_score: data.total_quest_score,
            answered_pages: progress.answered_pages + 1,
            current_page_slug: data.next_page_slug,
            quest_completed: data.quest_completed,
          };
          setProgress(updatedProgress);
          saveQuestCache(pages, updatedProgress);
        }
        setState('riddle');
        return;
      }
    }

    navigate('/spacequest/result');
  };

  // Proceed to next page after success
  const proceedNext = () => {
    if (!progress) return;

    if (progress.quest_completed) {
      navigate('/spacequest/result');
      return;
    }

    if (progress.current_page_slug) {
      const nextPage = pages.find(p => p.slug === progress.current_page_slug);
      if (nextPage) {
        setCurrentPage(nextPage);
        setSuccessData(null);
        setState('riddle');
        return;
      }
    }

    navigate('/spacequest/result');
  };

  // Retry after error
  const retryAfterError = () => {
    setState('riddle');
    setErrorMessage('');
  };

  return (
    <div className="quest-riddle-screen">
      <style>{`
        .quest-riddle-screen {
          min-height: 100vh;
          background: linear-gradient(180deg, #0a0f1e 0%, #0c1220 50%, #0a0e1a 100%);
          padding: 20px;
          padding-bottom: 80px;
          position: relative;
          overflow-x: hidden;
        }

        /* Progress Bar */
        .quest-progress-container {
          margin-bottom: 24px;
          animation: slideDown 0.6s ease-out;
        }

        /* Content Container */
        .quest-content {
          max-width: 600px;
          margin: 0 auto;
          animation: fadeIn 0.6s ease-out;
        }

        /* Loading State */
        .loading-spinner {
          display: flex;
          justify-content: center;
          align-items: center;
          min-height: 400px;
        }

        .spinner {
          width: 60px;
          height: 60px;
          border: 4px solid rgba(228, 0, 43, 0.2);
          border-top-color: #ED1C29;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }

        /* Riddle Card */
        .riddle-card {
          background: linear-gradient(135deg, rgba(18, 24, 42, 0.97), rgba(14, 22, 38, 0.95));
          backdrop-filter: blur(24px);
          border: 1px solid rgba(228, 0, 43, 0.4);
          border-radius: 8px 16px 8px 16px;
          padding: 32px 24px;
          position: relative;
          box-shadow:
            0 12px 40px rgba(0, 0, 0, 0.5),
            0 0 40px rgba(228, 0, 43, 0.2),
            0 0 80px rgba(228, 0, 43, 0.08),
            inset 0 1px 0 rgba(255, 255, 255, 0.12);
          margin-bottom: 24px;
          animation: slideUp 0.6s ease-out;
        }

        .riddle-card::before,
        .riddle-card::after {
          content: '';
          position: absolute;
          width: 24px;
          height: 24px;
          border: 3px solid rgba(228, 0, 43, 0.85);
        }

        .riddle-card::before {
          top: -1px;
          left: -1px;
          border-right: none;
          border-bottom: none;
          border-radius: 8px 0 0 0;
        }

        .riddle-card::after {
          bottom: -1px;
          right: -1px;
          border-left: none;
          border-top: none;
          border-radius: 0 0 8px 0;
        }

        .riddle-title {
          font-family: 'RosticsCeraCondensed', sans-serif;
          font-size: 28px;
          font-weight: 600;
          color: #fff;
          margin-bottom: 16px;
          text-transform: uppercase;
          letter-spacing: 1px;
          text-shadow: 0 0 20px rgba(228, 0, 43, 0.5);
        }

        .riddle-text {
          font-family: 'RosticsCeraPro', sans-serif;
          font-size: 18px;
          line-height: 1.6;
          color: rgba(255, 255, 255, 0.9);
          margin-bottom: 20px;
        }

        .exhibit-image {
          width: 100%;
          height: auto;
          max-height: 300px;
          object-fit: contain;
          border-radius: 6px 12px 6px 12px;
          border: 1px solid rgba(228, 0, 43, 0.2);
          margin-bottom: 20px;
        }

        /* Buttons */
        .button-group {
          display: flex;
          gap: 12px;
          flex-wrap: wrap;
        }

        .btn-primary {
          flex: 1;
          min-width: 200px;
          padding: 16px 24px;
          background: #ED1C29;
          border: none;
          border-radius: 10px 24px 10px 24px;
          font-family: 'RosticsCeraPro', sans-serif;
          font-size: 18px;
          font-weight: 600;
          color: #fff;
          text-transform: uppercase;
          cursor: pointer;
          position: relative;
          overflow: hidden;
          box-shadow:
            0 4px 20px rgba(228, 0, 43, 0.4),
            0 0 30px rgba(228, 0, 43, 0.2);
          transition: all 0.3s ease;
        }

        .btn-primary::before {
          content: '';
          position: absolute;
          top: 0;
          left: -100%;
          width: 100%;
          height: 100%;
          background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.3), transparent);
          transition: left 0.6s ease;
        }

        .btn-primary:hover::before {
          left: 100%;
        }

        .btn-primary:hover {
          transform: translateY(-2px);
          box-shadow:
            0 6px 25px rgba(228, 0, 43, 0.5),
            0 0 40px rgba(228, 0, 43, 0.3);
        }

        .btn-secondary {
          flex: 1;
          min-width: 140px;
          padding: 16px 24px;
          background: rgba(21, 21, 21, 0.8);
          border: 2px solid rgba(228, 0, 43, 0.5);
          border-radius: 10px 24px 10px 24px;
          font-family: 'RosticsCeraPro', sans-serif;
          font-size: 18px;
          font-weight: 600;
          color: #ED1C29;
          text-transform: uppercase;
          cursor: pointer;
          backdrop-filter: blur(10px);
          transition: all 0.3s ease;
        }

        .btn-secondary:hover {
          background: rgba(228, 0, 43, 0.1);
          border-color: #ED1C29;
          transform: translateY(-2px);
          box-shadow: 0 4px 15px rgba(228, 0, 43, 0.3);
        }

        /* Scanner State */
        .scanner-container {
          animation: fadeIn 0.4s ease-out;
        }

        .scanner-frame {
          position: relative;
          background: rgba(21, 21, 21, 0.95);
          backdrop-filter: blur(20px);
          border: 2px solid rgba(228, 0, 43, 0.4);
          border-radius: 12px 24px 12px 24px;
          padding: 20px;
          margin-bottom: 20px;
          box-shadow:
            0 8px 32px rgba(0, 0, 0, 0.4),
            0 0 30px rgba(228, 0, 43, 0.2),
            inset 0 0 40px rgba(228, 0, 43, 0.05);
        }

        .scanner-frame::before,
        .scanner-frame::after {
          content: '';
          position: absolute;
          width: 30px;
          height: 30px;
          border: 3px solid #ED1C29;
          z-index: 10;
        }

        .scanner-frame::before {
          top: 15px;
          left: 15px;
          border-right: none;
          border-bottom: none;
          border-radius: 12px 0 0 0;
          animation: cornerPulse 2s ease-in-out infinite;
        }

        .scanner-frame::after {
          bottom: 15px;
          right: 15px;
          border-left: none;
          border-top: none;
          border-radius: 0 0 24px 0;
          animation: cornerPulse 2s ease-in-out infinite 1s;
        }

        .scanner-title {
          font-family: 'RosticsCeraCondensed', sans-serif;
          font-size: 24px;
          font-weight: 600;
          color: #fff;
          text-align: center;
          margin-bottom: 16px;
          text-transform: uppercase;
          letter-spacing: 1px;
        }

        #qr-reader {
          border-radius: 8px;
          overflow: hidden;
          position: relative;
        }

        #qr-reader video {
          border-radius: 8px;
        }

        .scan-line {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 2px;
          background: linear-gradient(90deg, transparent, #ED1C29, transparent);
          box-shadow: 0 0 10px #ED1C29;
          animation: scanLine 2s linear infinite;
          z-index: 5;
          pointer-events: none;
        }

        /* Success State */
        .success-container {
          text-align: center;
          animation: scaleIn 0.6s ease-out;
        }

        .success-card {
          background: linear-gradient(135deg, rgba(21, 21, 21, 0.95), rgba(30, 30, 30, 0.9));
          backdrop-filter: blur(20px);
          border: 1px solid rgba(34, 197, 94, 0.4);
          border-radius: 8px 16px 8px 16px;
          padding: 40px 24px;
          position: relative;
          box-shadow:
            0 8px 32px rgba(0, 0, 0, 0.4),
            0 0 30px rgba(34, 197, 94, 0.2);
        }

        .success-icon {
          width: 80px;
          height: 80px;
          margin: 0 auto 24px;
          border-radius: 50%;
          background: #ED1C29;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 0 40px rgba(34, 197, 94, 0.5);
          animation: checkmarkPop 0.6s ease-out;
        }

        .success-icon svg {
          width: 50px;
          height: 50px;
          stroke: white;
          stroke-width: 4;
          fill: none;
          stroke-linecap: round;
          stroke-linejoin: round;
          animation: checkmarkDraw 0.6s ease-out 0.2s both;
        }

        .points-earned {
          font-family: 'RosticsCeraCondensed', monospace;
          font-size: 48px;
          font-weight: 700;
          color: #ED1C29;
          margin-bottom: 12px;
          text-shadow: 0 0 30px rgba(34, 197, 94, 0.6);
        }

        .points-label {
          font-family: 'RosticsCeraPro', sans-serif;
          font-size: 20px;
          color: rgba(255, 255, 255, 0.8);
          margin-bottom: 24px;
          text-transform: uppercase;
        }

        .fact-text {
          font-family: 'RosticsCeraPro', sans-serif;
          font-size: 18px;
          line-height: 1.6;
          color: rgba(255, 255, 255, 0.9);
          padding: 20px;
          background: rgba(255, 255, 255, 0.05);
          border-radius: 6px 12px 6px 12px;
          border: 1px solid rgba(255, 255, 255, 0.1);
          margin-bottom: 24px;
        }

        /* Error State */
        .error-container {
          text-align: center;
          animation: shake 0.5s ease-out;
        }

        .error-card {
          background: linear-gradient(135deg, rgba(21, 21, 21, 0.95), rgba(30, 30, 30, 0.9));
          backdrop-filter: blur(20px);
          border: 1px solid rgba(239, 68, 68, 0.4);
          border-radius: 8px 16px 8px 16px;
          padding: 40px 24px;
          position: relative;
          box-shadow:
            0 8px 32px rgba(0, 0, 0, 0.4),
            0 0 30px rgba(239, 68, 68, 0.2);
        }

        .error-icon {
          width: 80px;
          height: 80px;
          margin: 0 auto 24px;
          border-radius: 50%;
          background: #ED1C29;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 0 40px rgba(239, 68, 68, 0.5);
        }

        .error-icon svg {
          width: 50px;
          height: 50px;
          stroke: white;
          stroke-width: 4;
          fill: none;
          stroke-linecap: round;
        }

        .error-message {
          font-family: 'RosticsCeraPro', sans-serif;
          font-size: 18px;
          color: rgba(255, 255, 255, 0.9);
          margin-bottom: 24px;
        }

        /* Skip Confirm Modal */
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.8);
          backdrop-filter: blur(10px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          padding: 20px;
          animation: fadeIn 0.3s ease-out;
        }

        .modal-content {
          background: linear-gradient(135deg, rgba(21, 21, 21, 0.98), rgba(30, 30, 30, 0.95));
          backdrop-filter: blur(24px);
          border: 1px solid rgba(228, 0, 43, 0.3);
          border-radius: 12px 24px 12px 24px;
          padding: 32px 24px;
          max-width: 400px;
          width: 100%;
          position: relative;
          box-shadow:
            0 12px 48px rgba(0, 0, 0, 0.6),
            0 0 40px rgba(228, 0, 43, 0.2);
          animation: scaleIn 0.3s ease-out;
        }

        .modal-title {
          font-family: 'RosticsCeraCondensed', sans-serif;
          font-size: 24px;
          font-weight: 600;
          color: #fff;
          text-align: center;
          margin-bottom: 16px;
          text-transform: uppercase;
        }

        .modal-text {
          font-family: 'RosticsCeraPro', sans-serif;
          font-size: 16px;
          color: rgba(255, 255, 255, 0.8);
          text-align: center;
          margin-bottom: 24px;
        }

        .modal-buttons {
          display: flex;
          gap: 12px;
        }

        /* Animations */
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        @keyframes slideDown {
          from { opacity: 0; transform: translateY(-20px); }
          to { opacity: 1; transform: translateY(0); }
        }

        @keyframes slideUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }

        @keyframes scaleIn {
          from { opacity: 0; transform: scale(0.9); }
          to { opacity: 1; transform: scale(1); }
        }

        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          10%, 30%, 50%, 70%, 90% { transform: translateX(-5px); }
          20%, 40%, 60%, 80% { transform: translateX(5px); }
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        @keyframes scanLine {
          0% { top: 0; }
          50% { top: calc(100% - 2px); }
          100% { top: 0; }
        }

        @keyframes cornerPulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.6; transform: scale(1.1); }
        }

        @keyframes checkmarkPop {
          0% { transform: scale(0); }
          50% { transform: scale(1.1); }
          100% { transform: scale(1); }
        }

        @keyframes checkmarkDraw {
          from { stroke-dasharray: 100; stroke-dashoffset: 100; }
          to { stroke-dasharray: 100; stroke-dashoffset: 0; }
        }

        @media (prefers-reduced-motion: reduce) {
          .quest-progress-container,
          .quest-content,
          .riddle-card,
          .scanner-container,
          .success-container,
          .error-container,
          .modal-overlay,
          .modal-content { animation: none !important; opacity: 1; transform: none; }
          .spinner { animation: none; }
          .scan-line { animation: none; }
          .scanner-frame::before,
          .scanner-frame::after { animation: none; }
          .success-icon { animation: none; }
          .success-icon svg { animation: none; }
          .btn-primary::before { transition: none; }
          .btn-primary:hover,
          .btn-secondary:hover { transform: none; }
        }

        /* Offline Banner */
        .offline-banner {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          padding: 10px 16px;
          margin-bottom: 16px;
          background: rgba(245, 158, 11, 0.15);
          border: 1px solid rgba(245, 158, 11, 0.4);
          border-radius: 8px;
          font-family: 'RosticsCeraPro', sans-serif;
          font-size: 14px;
          color: #fbbf24;
          animation: fadeIn 0.4s ease-out;
        }

        .offline-banner-text {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .offline-dismiss {
          background: none;
          border: none;
          color: rgba(251, 191, 36, 0.7);
          font-size: 18px;
          cursor: pointer;
          padding: 0 4px;
          line-height: 1;
        }

        .offline-dismiss:hover {
          color: #fbbf24;
        }

        .quest-copyright {
          text-align: center;
          padding: 20px 0;
          font-family: 'RosticsCeraPro', sans-serif;
          font-size: 11px;
          color: rgba(255, 255, 255, 0.4);
          letter-spacing: 1px;
        }

        /* Responsive - Tablet */
        @media (min-width: 768px) and (max-width: 1024px) {
          .quest-content { max-width: 700px; }
          .riddle-card { padding: 40px 32px; }
          .riddle-title { font-size: 32px; }
          .riddle-text { font-size: 20px; }
          .button-group { flex-wrap: nowrap; }
        }

        /* Responsive - Mobile */
        @media (max-width: 767px) {
          .quest-riddle-screen { padding: 16px; }
          .riddle-card { padding: 24px 20px; }
          .riddle-title { font-size: 24px; }
          .riddle-text { font-size: 16px; }
          .button-group { flex-direction: column; }
          .btn-primary, .btn-secondary { min-width: 100%; }
          .scanner-frame { padding: 16px; }
          .points-earned { font-size: 40px; }
        }
      `}</style>

      {/* Offline Banner */}
      {isOffline && (
        <div className="offline-banner">
          <span className="offline-banner-text">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M8 1L1 14h14L8 1z" stroke="currentColor" strokeWidth="1.5" fill="none"/>
              <path d="M8 6v4M8 11.5v.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
            Офлайн-режим — данные из кэша
          </span>
          <button className="offline-dismiss" onClick={() => setIsOffline(false)} aria-label="Закрыть">
            &times;
          </button>
        </div>
      )}

      {/* Progress Bar */}
      {progress && state !== 'loading' && (
        <div className="quest-progress-container">
          <QuestProgressBar
            current={progress.answered_pages}
            total={progress.total_pages}
            score={progress.total_score}
          />
        </div>
      )}

      <div className="quest-content">
        {/* Loading State */}
        {state === 'loading' && (
          <div className="loading-spinner">
            <div className="spinner"></div>
          </div>
        )}

        {/* Riddle State */}
        {state === 'riddle' && currentPage && (
          <div className="riddle-card">
            <h2 className="riddle-title">{currentPage.title}</h2>
            <p className="riddle-text">{currentPage.riddle_text}</p>

            {currentPage.image_url && (
              <img
                src={currentPage.image_url}
                alt="Экспонат"
                className="exhibit-image"
              />
            )}

            <div className="button-group">
              <button className="btn-primary" onClick={startScanner}>
                Сканировать QR
              </button>
              <button className="btn-secondary" onClick={showSkipConfirm}>
                Пропустить
              </button>
            </div>
          </div>
        )}

        {/* Scanner State */}
        {state === 'scanner' && (
          <div className="scanner-container">
            <div className="scanner-frame">
              <h3 className="scanner-title">Наведите камеру на QR-код</h3>
              <div style={{ position: 'relative' }}>
                <div id={qrReaderDivId}></div>
                <div className="scan-line"></div>
              </div>
            </div>
            <button className="btn-secondary" onClick={cancelScanner} style={{ width: '100%' }}>
              Отмена
            </button>
          </div>
        )}

        {/* Success State */}
        {state === 'success' && successData && (
          <div className="success-container">
            <div className="success-card">
              <div className="success-icon">
                <svg viewBox="0 0 50 50">
                  <polyline points="10,25 20,35 40,15" />
                </svg>
              </div>
              <div className="points-earned">+{successData.pointsEarned}</div>
              <div className="points-label">Баллов получено</div>
              {successData.factText && (
                <div className="fact-text">{successData.factText}</div>
              )}
              <button className="btn-primary" onClick={proceedNext} style={{ width: '100%' }}>
                Далее
              </button>
            </div>
          </div>
        )}

        {/* Error State */}
        {state === 'error' && (
          <div className="error-container">
            <div className="error-card">
              <div className="error-icon">
                <svg viewBox="0 0 50 50">
                  <line x1="15" y1="15" x2="35" y2="35" />
                  <line x1="35" y1="15" x2="15" y2="35" />
                </svg>
              </div>
              <p className="error-message">{errorMessage}</p>
              <button className="btn-primary" onClick={retryAfterError} style={{ width: '100%' }}>
                Попробовать снова
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Copyright */}
      <div className="quest-copyright">
        © Музей космонавтики, 2026 &nbsp;|&nbsp; © Юнирест
      </div>

      {/* Skip Confirm Modal */}
      {state === 'skip_confirm' && (
        <div className="modal-overlay" onClick={() => setState('riddle')}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3 className="modal-title">Пропустить загадку?</h3>
            <p className="modal-text">
              Баллы не начислятся
            </p>
            <div className="modal-buttons">
              <button className="btn-secondary" onClick={() => setState('riddle')}>
                Отмена
              </button>
              <button className="btn-primary" onClick={skipQuestion}>
                Пропустить
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default QuestRiddleScreen;
