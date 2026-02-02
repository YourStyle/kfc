import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';

type AuthMode = 'login' | 'register' | 'verify';

interface AuthScreenProps {
  onClose: () => void;
  onSuccess: () => void;
}

// Eye icons as SVG
const EyeIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
    <circle cx="12" cy="12" r="3"/>
  </svg>
);

const EyeOffIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
    <line x1="1" y1="1" x2="23" y2="23"/>
  </svg>
);

export function AuthScreen({ onClose, onSuccess }: AuthScreenProps) {
  const { login, register, verify, resendCode } = useAuth();
  const [mode, setMode] = useState<AuthMode>('login');
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [pendingEmail, setPendingEmail] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    const result = await login(email, password);
    setIsLoading(false);

    if (result.success) {
      onSuccess();
    } else {
      setError(result.error || 'Login failed');
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    const result = await register(email, username, password);
    setIsLoading(false);

    if (result.success) {
      setPendingEmail(email);
      setMode('verify');
    } else {
      setError(result.error || 'Registration failed');
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    const result = await verify(pendingEmail, code);
    setIsLoading(false);

    if (result.success) {
      onSuccess();
    } else {
      setError(result.error || 'Verification failed');
    }
  };

  const handleResendCode = async () => {
    setError('');
    setIsLoading(true);
    const result = await resendCode(pendingEmail);
    setIsLoading(false);

    if (!result.success) {
      setError(result.error || 'Failed to resend code');
    }
  };

  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>
        <button style={styles.closeButton} onClick={onClose}>
          &times;
        </button>

        <div style={styles.logo}>ROSTIC'S Kitchen</div>

        {mode === 'login' && (
          <form onSubmit={handleLogin} style={styles.form}>
            <h2 style={styles.title}>Вход</h2>

            {error && <div style={styles.error}>{error}</div>}

            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={styles.input}
              required
            />

            <div style={styles.passwordContainer}>
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="Пароль"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={styles.passwordInput}
                required
              />
              <button
                type="button"
                style={styles.eyeButton}
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <EyeOffIcon /> : <EyeIcon />}
              </button>
            </div>

            <button type="submit" style={styles.button} disabled={isLoading}>
              {isLoading ? 'Загрузка...' : 'Войти'}
            </button>

            <p style={styles.switchText}>
              Нет аккаунта?{' '}
              <span style={styles.link} onClick={() => setMode('register')}>
                Зарегистрироваться
              </span>
            </p>
          </form>
        )}

        {mode === 'register' && (
          <form onSubmit={handleRegister} style={styles.form}>
            <h2 style={styles.title}>Регистрация</h2>

            {error && <div style={styles.error}>{error}</div>}

            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={styles.input}
              required
            />

            <input
              type="text"
              placeholder="Имя пользователя"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              style={styles.input}
              required
              minLength={3}
            />

            <div style={styles.passwordContainer}>
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="Пароль"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={styles.passwordInput}
                required
                minLength={6}
              />
              <button
                type="button"
                style={styles.eyeButton}
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <EyeOffIcon /> : <EyeIcon />}
              </button>
            </div>

            <button type="submit" style={styles.button} disabled={isLoading}>
              {isLoading ? 'Загрузка...' : 'Зарегистрироваться'}
            </button>

            <p style={styles.switchText}>
              Уже есть аккаунт?{' '}
              <span style={styles.link} onClick={() => setMode('login')}>
                Войти
              </span>
            </p>
          </form>
        )}

        {mode === 'verify' && (
          <form onSubmit={handleVerify} style={styles.form}>
            <h2 style={styles.title}>Подтверждение</h2>

            <p style={styles.description}>
              Мы отправили код подтверждения на {pendingEmail}
            </p>

            {error && <div style={styles.error}>{error}</div>}

            <input
              type="text"
              placeholder="000000"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              style={styles.codeInput}
              required
              maxLength={6}
            />

            <button type="submit" style={styles.button} disabled={isLoading || code.length !== 6}>
              {isLoading ? 'Загрузка...' : 'Подтвердить'}
            </button>

            <p style={styles.switchText}>
              Не получили код?{' '}
              <span style={styles.link} onClick={handleResendCode}>
                Отправить повторно
              </span>
            </p>
          </form>
        )}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  modal: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 30,
    width: '90%',
    maxWidth: 400,
    position: 'relative',
  },
  closeButton: {
    position: 'absolute',
    top: 10,
    right: 15,
    background: 'none',
    border: 'none',
    fontSize: 28,
    cursor: 'pointer',
    color: '#666',
  },
  logo: {
    textAlign: 'center',
    backgroundColor: '#E4002B',
    color: '#fff',
    padding: '10px 20px',
    borderRadius: 25,
    fontWeight: 'bold',
    fontSize: 16,
    marginBottom: 20,
    display: 'inline-block',
    width: '100%',
    boxSizing: 'border-box',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: 15,
  },
  title: {
    textAlign: 'center',
    color: '#333',
    margin: 0,
    fontSize: 24,
  },
  description: {
    textAlign: 'center',
    color: '#666',
    fontSize: 14,
    margin: 0,
  },
  input: {
    padding: 15,
    borderRadius: 10,
    border: '2px solid #ddd',
    fontSize: 16,
    outline: 'none',
    transition: 'border-color 0.2s',
  },
  passwordContainer: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
  },
  passwordInput: {
    padding: 15,
    paddingRight: 50,
    borderRadius: 10,
    border: '2px solid #ddd',
    fontSize: 16,
    outline: 'none',
    transition: 'border-color 0.2s',
    width: '100%',
    boxSizing: 'border-box',
  },
  eyeButton: {
    position: 'absolute',
    right: 12,
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: 5,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#666',
  },
  codeInput: {
    padding: 20,
    borderRadius: 10,
    border: '3px solid #E4002B',
    fontSize: 28,
    textAlign: 'center',
    letterSpacing: 10,
    fontWeight: 'bold',
    outline: 'none',
  },
  button: {
    padding: 15,
    borderRadius: 10,
    border: 'none',
    backgroundColor: '#E4002B',
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    cursor: 'pointer',
    transition: 'background-color 0.2s',
  },
  error: {
    backgroundColor: '#fee',
    color: '#c00',
    padding: 10,
    borderRadius: 8,
    fontSize: 14,
    textAlign: 'center',
  },
  switchText: {
    textAlign: 'center',
    color: '#666',
    fontSize: 14,
    margin: 0,
  },
  link: {
    color: '#E4002B',
    cursor: 'pointer',
    fontWeight: 'bold',
  },
};
