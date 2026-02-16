import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import QuestProgressBar from '../quest/QuestProgressBar';
import QuestStartScreen from '../quest/QuestStartScreen';
import QuestScanHandler from '../quest/QuestScanHandler';

// Mock API service
const mockScanQuestQR = vi.fn();
const mockGetToken = vi.fn();
const mockGetQuestProgress = vi.fn();
const mockGetQuestPage = vi.fn();
const mockSkipQuestQuestion = vi.fn();

vi.mock('../services/api', () => ({
  default: {
    getToken: () => mockGetToken(),
    scanQuestQR: (token: string) => mockScanQuestQR(token),
    getQuestProgress: () => mockGetQuestProgress(),
    getQuestPage: (pageNum: number) => mockGetQuestPage(pageNum),
    skipQuestQuestion: () => mockSkipQuestQuestion(),
  },
}));

// Mock AuthContext
const mockUseAuth = vi.fn();
vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}));

// Mock react-router-dom
const mockNavigate = vi.fn();
const mockUseParams = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useParams: () => mockUseParams(),
    useNavigate: () => mockNavigate,
    useSearchParams: () => [new URLSearchParams(), vi.fn()],
  };
});

describe('QuestProgressBar', () => {
  it('renders step count "X / Y" correctly', () => {
    render(<QuestProgressBar current={5} total={20} score={50} />);

    expect(screen.getByText('5 / 20')).toBeInTheDocument();
  });

  it('renders score in pts', () => {
    render(<QuestProgressBar current={5} total={20} score={50} />);

    expect(screen.getByText('50 pts')).toBeInTheDocument();
  });

  it('fill bar width matches percentage', () => {
    const { container } = render(<QuestProgressBar current={10} total={20} score={100} />);

    // Find the fill bar element
    const fillBar = container.querySelector('[style*="width"]');
    expect(fillBar).toBeInTheDocument();

    // Check that the width is 50% (10/20 * 100)
    const style = fillBar?.getAttribute('style');
    expect(style).toContain('width: 50%');
  });

  it('handles edge case where total=0', () => {
    const { container } = render(<QuestProgressBar current={0} total={0} score={0} />);

    expect(screen.getByText('0 / 0')).toBeInTheDocument();
    expect(screen.getByText('0 pts')).toBeInTheDocument();

    // Fill bar should be 0% width
    const fillBar = container.querySelector('[style*="width"]');
    const style = fillBar?.getAttribute('style');
    expect(style).toContain('width: 0%');
  });

  it('handles 100% completion', () => {
    const { container } = render(<QuestProgressBar current={20} total={20} score={200} />);

    expect(screen.getByText('20 / 20')).toBeInTheDocument();

    const fillBar = container.querySelector('[style*="width"]');
    const style = fillBar?.getAttribute('style');
    expect(style).toContain('width: 100%');
  });

  it('handles partial completion correctly', () => {
    const { container } = render(<QuestProgressBar current={7} total={20} score={70} />);

    expect(screen.getByText('7 / 20')).toBeInTheDocument();

    const fillBar = container.querySelector('[style*="width"]');
    const style = fillBar?.getAttribute('style');
    expect(style).toContain('width: 35%');
  });
});

describe('QuestStartScreen', () => {
  beforeEach(() => {
    mockNavigate.mockClear();
    mockUseAuth.mockReturnValue({
      isAuthenticated: false,
      isLoading: false,
      user: null,
    });
  });

  it('renders the title "Космический Квест"', () => {
    render(
      <MemoryRouter>
        <QuestStartScreen />
      </MemoryRouter>
    );

    expect(screen.getByText('Космический Квест')).toBeInTheDocument();
  });

  it('shows prize tiers (160, 140, 120 баллов)', () => {
    render(
      <MemoryRouter>
        <QuestStartScreen />
      </MemoryRouter>
    );

    expect(screen.getByText('160+ баллов')).toBeInTheDocument();
    expect(screen.getByText('140+ баллов')).toBeInTheDocument();
    expect(screen.getByText('120+ баллов')).toBeInTheDocument();
  });

  it('shows "Начать квест" button', () => {
    render(
      <MemoryRouter>
        <QuestStartScreen />
      </MemoryRouter>
    );

    expect(screen.getByText('Начать квест')).toBeInTheDocument();
  });

  it('navigates to /spacequest/auth when not authenticated and button clicked', () => {
    mockUseAuth.mockReturnValue({
      isAuthenticated: false,
      isLoading: false,
      user: null,
    });

    render(
      <MemoryRouter>
        <QuestStartScreen />
      </MemoryRouter>
    );

    const startButton = screen.getByText('Начать квест');
    fireEvent.click(startButton);

    expect(mockNavigate).toHaveBeenCalledWith('/spacequest/auth');
  });

  it('navigates to /spacequest/play when authenticated and button clicked', () => {
    mockUseAuth.mockReturnValue({
      isAuthenticated: true,
      isLoading: false,
      user: { id: 1, username: 'testuser' },
    });

    render(
      <MemoryRouter>
        <QuestStartScreen />
      </MemoryRouter>
    );

    const startButton = screen.getByText('Начать квест');
    fireEvent.click(startButton);

    expect(mockNavigate).toHaveBeenCalledWith('/spacequest/play');
  });

  it('displays user greeting when authenticated', () => {
    mockUseAuth.mockReturnValue({
      isAuthenticated: true,
      isLoading: false,
      user: { id: 1, username: 'testuser' },
    });

    render(
      <MemoryRouter>
        <QuestStartScreen />
      </MemoryRouter>
    );

    expect(screen.getByText(/Добро пожаловать, testuser!/)).toBeInTheDocument();
  });

  it('displays login prompt when not authenticated', () => {
    mockUseAuth.mockReturnValue({
      isAuthenticated: false,
      isLoading: false,
      user: null,
    });

    render(
      <MemoryRouter>
        <QuestStartScreen />
      </MemoryRouter>
    );

    expect(screen.getByText('Войдите, чтобы сохранить прогресс')).toBeInTheDocument();
  });

  it('shows prize rewards correctly', () => {
    render(
      <MemoryRouter>
        <QuestStartScreen />
      </MemoryRouter>
    );

    expect(screen.getByText('Скидка 15%')).toBeInTheDocument();
    expect(screen.getByText('Скидка 10%')).toBeInTheDocument();
    expect(screen.getByText('Пирожок за 1₽')).toBeInTheDocument();
  });

  it('shows quest rules and instructions', () => {
    render(
      <MemoryRouter>
        <QuestStartScreen />
      </MemoryRouter>
    );

    expect(screen.getByText(/Всего 20 вопросов/)).toBeInTheDocument();
    expect(screen.getByText(/За каждый правильный ответ вы получаете 10 баллов/)).toBeInTheDocument();
    expect(screen.getByText(/Можно пропустить вопрос/)).toBeInTheDocument();
    expect(screen.getByText(/Сканируйте QR-коды/)).toBeInTheDocument();
  });
});

describe('QuestScanHandler', () => {
  beforeEach(() => {
    mockNavigate.mockClear();
    mockScanQuestQR.mockClear();
    mockUseParams.mockReturnValue({ qrToken: 'test-token-123' });
  });

  it('shows loading spinner initially', () => {
    mockUseAuth.mockReturnValue({
      isAuthenticated: true,
      isLoading: false,
      user: { id: 1, username: 'testuser' },
    });

    // Mock scanQuestQR to delay
    mockScanQuestQR.mockImplementation(() => new Promise(() => {}));

    render(
      <MemoryRouter>
        <QuestScanHandler />
      </MemoryRouter>
    );

    expect(screen.getByText('Проверяем QR-код...')).toBeInTheDocument();
  });

  it('shows auth required screen when not authenticated', () => {
    mockUseAuth.mockReturnValue({
      isAuthenticated: false,
      isLoading: false,
      user: null,
    });

    render(
      <MemoryRouter>
        <QuestScanHandler />
      </MemoryRouter>
    );

    expect(screen.getByText('Авторизация')).toBeInTheDocument();
    expect(screen.getByText(/Для участия в квесте необходимо зарегистрироваться/)).toBeInTheDocument();
    expect(screen.getByText('Войти / Зарегистрироваться')).toBeInTheDocument();
  });

  it('calls scanQuestQR API with token from params', async () => {
    mockUseAuth.mockReturnValue({
      isAuthenticated: true,
      isLoading: false,
      user: { id: 1, username: 'testuser' },
    });

    mockScanQuestQR.mockResolvedValue({
      data: {
        success: true,
        points_earned: 10,
        total_quest_score: 50,
        quest_completed: false,
      },
      error: null,
    });

    render(
      <MemoryRouter>
        <QuestScanHandler />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(mockScanQuestQR).toHaveBeenCalledWith('test-token-123');
    });
  });

  it('shows success screen with points on correct scan', async () => {
    mockUseAuth.mockReturnValue({
      isAuthenticated: true,
      isLoading: false,
      user: { id: 1, username: 'testuser' },
    });

    mockScanQuestQR.mockResolvedValue({
      data: {
        success: true,
        points_earned: 10,
        total_quest_score: 50,
        quest_completed: false,
        fact_text: 'Интересный факт о космосе',
      },
      error: null,
    });

    render(
      <MemoryRouter>
        <QuestScanHandler />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Всё верно!')).toBeInTheDocument();
    });

    expect(screen.getByText('+10 баллов')).toBeInTheDocument();
    expect(screen.getByText(/Ваш счёт:/)).toBeInTheDocument();
    expect(screen.getByText(/50/)).toBeInTheDocument();
    expect(screen.getByText('Интересный факт о космосе')).toBeInTheDocument();
    expect(screen.getByText('Следующая загадка')).toBeInTheDocument();
  });

  it('shows error screen on wrong QR', async () => {
    mockUseAuth.mockReturnValue({
      isAuthenticated: true,
      isLoading: false,
      user: { id: 1, username: 'testuser' },
    });

    mockScanQuestQR.mockResolvedValue({
      data: null,
      error: 'Неверный QR-код',
    });

    render(
      <MemoryRouter>
        <QuestScanHandler />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Код неверный')).toBeInTheDocument();
    });

    expect(screen.getByText('Неверный QR-код')).toBeInTheDocument();
    expect(screen.getByText('Вернуться к загадке')).toBeInTheDocument();
  });

  it('navigates to /spacequest/auth when auth button clicked', async () => {
    mockUseAuth.mockReturnValue({
      isAuthenticated: false,
      isLoading: false,
      user: null,
    });

    mockUseParams.mockReturnValue({ qrToken: 'test-token-123' });

    render(
      <MemoryRouter>
        <QuestScanHandler />
      </MemoryRouter>
    );

    const authButton = screen.getByText('Войти / Зарегистрироваться');
    fireEvent.click(authButton);

    expect(mockNavigate).toHaveBeenCalledWith('/spacequest/auth?return=/spacequest/scan/test-token-123');
  });

  it('navigates to /spacequest/play when clicking "Следующая загадка"', async () => {
    mockUseAuth.mockReturnValue({
      isAuthenticated: true,
      isLoading: false,
      user: { id: 1, username: 'testuser' },
    });

    mockScanQuestQR.mockResolvedValue({
      data: {
        success: true,
        points_earned: 10,
        total_quest_score: 50,
        quest_completed: false,
      },
      error: null,
    });

    render(
      <MemoryRouter>
        <QuestScanHandler />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Следующая загадка')).toBeInTheDocument();
    });

    const nextButton = screen.getByText('Следующая загадка');
    fireEvent.click(nextButton);

    expect(mockNavigate).toHaveBeenCalledWith('/spacequest/play');
  });

  it('navigates to /spacequest/result when quest is completed', async () => {
    mockUseAuth.mockReturnValue({
      isAuthenticated: true,
      isLoading: false,
      user: { id: 1, username: 'testuser' },
    });

    mockScanQuestQR.mockResolvedValue({
      data: {
        success: true,
        points_earned: 10,
        total_quest_score: 200,
        quest_completed: true,
      },
      error: null,
    });

    render(
      <MemoryRouter>
        <QuestScanHandler />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Посмотреть результаты')).toBeInTheDocument();
    });

    const resultButton = screen.getByText('Посмотреть результаты');
    fireEvent.click(resultButton);

    expect(mockNavigate).toHaveBeenCalledWith('/spacequest/result');
  });

  it('navigates back to riddle when error button clicked', async () => {
    mockUseAuth.mockReturnValue({
      isAuthenticated: true,
      isLoading: false,
      user: { id: 1, username: 'testuser' },
    });

    mockScanQuestQR.mockResolvedValue({
      data: null,
      error: 'Неверный QR-код',
    });

    render(
      <MemoryRouter>
        <QuestScanHandler />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Вернуться к загадке')).toBeInTheDocument();
    });

    const backButton = screen.getByText('Вернуться к загадке');
    fireEvent.click(backButton);

    expect(mockNavigate).toHaveBeenCalledWith('/spacequest/play');
  });

  it('shows loading while auth is loading', () => {
    mockUseAuth.mockReturnValue({
      isAuthenticated: false,
      isLoading: true,
      user: null,
    });

    render(
      <MemoryRouter>
        <QuestScanHandler />
      </MemoryRouter>
    );

    expect(screen.getByText('Проверяем QR-код...')).toBeInTheDocument();
  });

  it('does not show fact box when fact_text is missing', async () => {
    mockUseAuth.mockReturnValue({
      isAuthenticated: true,
      isLoading: false,
      user: { id: 1, username: 'testuser' },
    });

    mockScanQuestQR.mockResolvedValue({
      data: {
        success: true,
        points_earned: 10,
        total_quest_score: 50,
        quest_completed: false,
        fact_text: null,
      },
      error: null,
    });

    render(
      <MemoryRouter>
        <QuestScanHandler />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Всё верно!')).toBeInTheDocument();
    });

    expect(screen.queryByText('Интересный факт')).not.toBeInTheDocument();
  });
});
