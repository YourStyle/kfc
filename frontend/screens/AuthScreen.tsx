import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';

type AuthMode = 'login' | 'register' | 'verify';

// Список регионов России (субъекты РФ)
const RUSSIAN_REGIONS = [
  // Федеральные города
  { name: 'Москва', category: 'moscow' as const },
  { name: 'Московская область', category: 'moscow' as const },
  { name: 'Санкт-Петербург', category: 'region' as const },
  { name: 'Севастополь', category: 'region' as const },

  // Области
  { name: 'Амурская область', category: 'region' as const },
  { name: 'Архангельская область', category: 'region' as const },
  { name: 'Астраханская область', category: 'region' as const },
  { name: 'Белгородская область', category: 'region' as const },
  { name: 'Брянская область', category: 'region' as const },
  { name: 'Владимирская область', category: 'region' as const },
  { name: 'Волгоградская область', category: 'region' as const },
  { name: 'Вологодская область', category: 'region' as const },
  { name: 'Воронежская область', category: 'region' as const },
  { name: 'Ивановская область', category: 'region' as const },
  { name: 'Иркутская область', category: 'region' as const },
  { name: 'Калининградская область', category: 'region' as const },
  { name: 'Калужская область', category: 'region' as const },
  { name: 'Кемеровская область', category: 'region' as const },
  { name: 'Кировская область', category: 'region' as const },
  { name: 'Костромская область', category: 'region' as const },
  { name: 'Курганская область', category: 'region' as const },
  { name: 'Курская область', category: 'region' as const },
  { name: 'Ленинградская область', category: 'region' as const },
  { name: 'Липецкая область', category: 'region' as const },
  { name: 'Магаданская область', category: 'region' as const },
  { name: 'Мурманская область', category: 'region' as const },
  { name: 'Нижегородская область', category: 'region' as const },
  { name: 'Новгородская область', category: 'region' as const },
  { name: 'Новосибирская область', category: 'region' as const },
  { name: 'Омская область', category: 'region' as const },
  { name: 'Оренбургская область', category: 'region' as const },
  { name: 'Орловская область', category: 'region' as const },
  { name: 'Пензенская область', category: 'region' as const },
  { name: 'Псковская область', category: 'region' as const },
  { name: 'Ростовская область', category: 'region' as const },
  { name: 'Рязанская область', category: 'region' as const },
  { name: 'Самарская область', category: 'region' as const },
  { name: 'Саратовская область', category: 'region' as const },
  { name: 'Сахалинская область', category: 'region' as const },
  { name: 'Свердловская область', category: 'region' as const },
  { name: 'Смоленская область', category: 'region' as const },
  { name: 'Тамбовская область', category: 'region' as const },
  { name: 'Тверская область', category: 'region' as const },
  { name: 'Томская область', category: 'region' as const },
  { name: 'Тульская область', category: 'region' as const },
  { name: 'Тюменская область', category: 'region' as const },
  { name: 'Ульяновская область', category: 'region' as const },
  { name: 'Челябинская область', category: 'region' as const },
  { name: 'Ярославская область', category: 'region' as const },

  // Края
  { name: 'Алтайский край', category: 'region' as const },
  { name: 'Забайкальский край', category: 'region' as const },
  { name: 'Камчатский край', category: 'region' as const },
  { name: 'Краснодарский край', category: 'region' as const },
  { name: 'Красноярский край', category: 'region' as const },
  { name: 'Пермский край', category: 'region' as const },
  { name: 'Приморский край', category: 'region' as const },
  { name: 'Ставропольский край', category: 'region' as const },
  { name: 'Хабаровский край', category: 'region' as const },

  // Республики
  { name: 'Республика Адыгея', category: 'region' as const },
  { name: 'Республика Алтай', category: 'region' as const },
  { name: 'Республика Башкортостан', category: 'region' as const },
  { name: 'Республика Бурятия', category: 'region' as const },
  { name: 'Республика Дагестан', category: 'region' as const },
  { name: 'Республика Ингушетия', category: 'region' as const },
  { name: 'Кабардино-Балкарская Республика', category: 'region' as const },
  { name: 'Республика Калмыкия', category: 'region' as const },
  { name: 'Карачаево-Черкесская Республика', category: 'region' as const },
  { name: 'Республика Карелия', category: 'region' as const },
  { name: 'Республика Коми', category: 'region' as const },
  { name: 'Республика Крым', category: 'region' as const },
  { name: 'Донецкая Народная Республика', category: 'region' as const },
  { name: 'Луганская Народная Республика', category: 'region' as const },
  { name: 'Запорожская область', category: 'region' as const },
  { name: 'Херсонская область', category: 'region' as const },
  { name: 'Республика Марий Эл', category: 'region' as const },
  { name: 'Республика Мордовия', category: 'region' as const },
  { name: 'Республика Саха (Якутия)', category: 'region' as const },
  { name: 'Республика Северная Осетия — Алания', category: 'region' as const },
  { name: 'Республика Татарстан', category: 'region' as const },
  { name: 'Республика Тыва', category: 'region' as const },
  { name: 'Удмуртская Республика', category: 'region' as const },
  { name: 'Республика Хакасия', category: 'region' as const },
  { name: 'Чеченская Республика', category: 'region' as const },
  { name: 'Чувашская Республика', category: 'region' as const },

  // Автономные округа и область
  { name: 'Еврейская автономная область', category: 'region' as const },
  { name: 'Ненецкий автономный округ', category: 'region' as const },
  { name: 'Ханты-Мансийский автономный округ — Югра', category: 'region' as const },
  { name: 'Чукотский автономный округ', category: 'region' as const },
  { name: 'Ямало-Ненецкий автономный округ', category: 'region' as const },
];

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
  const [cityName, setCityName] = useState('');
  const [cityCategory, setCityCategory] = useState<'moscow' | 'region'>('region');
  const [citySearch, setCitySearch] = useState('');
  const [showCityDropdown, setShowCityDropdown] = useState(false);
  const [ageConsent, setAgeConsent] = useState(false);
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [pendingEmail, setPendingEmail] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const basePath = import.meta.env.BASE_URL || '/';

  // Animation states
  const [isVisible, setIsVisible] = useState(false);
  const [formAnimating, setFormAnimating] = useState(false);

  // Trigger entrance animation
  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 50);
    return () => clearTimeout(timer);
  }, []);

  // Animated mode change
  const changeMode = (newMode: AuthMode) => {
    setFormAnimating(true);
    setTimeout(() => {
      setMode(newMode);
      setError('');
      setFormAnimating(false);
    }, 200);
  };

  // Фильтрация регионов по поиску
  const filteredRegions = useMemo(() => {
    if (!citySearch) return RUSSIAN_REGIONS;
    const search = citySearch.toLowerCase();
    return RUSSIAN_REGIONS.filter(r => r.name.toLowerCase().includes(search));
  }, [citySearch]);

  const cityDropdownRef = useRef<HTMLDivElement>(null);

  const handleCitySelect = (region: typeof RUSSIAN_REGIONS[0]) => {
    setCityName(region.name);
    setCityCategory(region.category);
    setCitySearch(region.name);
    setShowCityDropdown(false);
  };

  // Закрытие dropdown при клике вне
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (cityDropdownRef.current && !cityDropdownRef.current.contains(event.target as Node)) {
        setShowCityDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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

    if (!ageConsent) {
      setError('Необходимо подтвердить возраст и согласие на обработку данных');
      return;
    }

    if (!cityName) {
      setError('Выберите город из списка');
      return;
    }

    setIsLoading(true);

    const result = await register(email, username, password, cityCategory, cityName);
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
    <div className={`auth-overlay ${isVisible ? 'auth-visible' : ''}`} style={styles.overlay}>
      {/* Background Image */}
      <div
        className={`auth-bg ${isVisible ? 'auth-bg-visible' : ''}`}
        style={{
          ...styles.backgroundImage,
          backgroundImage: `url(${basePath}images/loginbg.webp)`,
        }}
      />
      <div className={`auth-modal ${isVisible ? 'auth-modal-visible' : ''}`} style={styles.modal}>
        <button style={styles.closeButton} onClick={onClose}>
          &times;
        </button>

        <div style={styles.logo}>ROSTIC'S КУХНЯ</div>

        {mode === 'login' && (
          <form onSubmit={handleLogin} className={`auth-form ${formAnimating ? 'auth-form-exit' : 'auth-form-enter'}`} style={styles.form}>
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

            <button type="submit" className="sci-fi-btn" style={styles.button} disabled={isLoading}>
              {isLoading ? 'Загрузка...' : 'Войти'}
            </button>

            <p style={styles.switchText}>
              Нет аккаунта?{' '}
              <span style={styles.link} onClick={() => changeMode('register')}>
                Зарегистрироваться
              </span>
            </p>
          </form>
        )}

        {mode === 'register' && (
          <form onSubmit={handleRegister} className={`auth-form ${formAnimating ? 'auth-form-exit' : 'auth-form-enter'}`} style={styles.form}>
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

            <div style={styles.citySelectWrapper} ref={cityDropdownRef}>
              <input
                type="text"
                placeholder="Выберите город"
                value={citySearch}
                onChange={(e) => {
                  setCitySearch(e.target.value);
                  setCityName('');
                  setShowCityDropdown(true);
                }}
                onFocus={() => setShowCityDropdown(true)}
                style={styles.input}
                required
              />
              {showCityDropdown && (
                <div style={styles.cityDropdown} className="city-dropdown">
                  {filteredRegions.map(region => (
                    <div
                      key={region.name}
                      style={styles.cityOption}
                      onClick={() => handleCitySelect(region)}
                    >
                      {region.name}
                    </div>
                  ))}
                  {filteredRegions.length === 0 && (
                    <div style={styles.cityNoResults}>Регион не найден</div>
                  )}
                </div>
              )}
            </div>

            <label style={styles.checkboxLabel}>
              <input
                type="checkbox"
                checked={ageConsent}
                onChange={(e) => setAgeConsent(e.target.checked)}
                style={styles.checkbox}
              />
              <div
                style={{
                  ...styles.checkboxCustom,
                  ...(ageConsent ? styles.checkboxCustomChecked : {})
                }}
                className="sci-fi-checkbox"
              >
                {ageConsent && <span style={styles.checkboxIcon}>✓</span>}
              </div>
              <span style={styles.checkboxText}>
                Мне есть 18 лет и я согласен на{' '}
                <a
                  href="/privacy-policy"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={styles.privacyLink}
                  onClick={(e) => e.stopPropagation()}
                >
                  обработку персональных данных
                </a>
              </span>
            </label>

            <button type="submit" className="sci-fi-btn" style={styles.button} disabled={isLoading || !ageConsent}>
              {isLoading ? 'Загрузка...' : 'Зарегистрироваться'}
            </button>

            <p style={styles.switchText}>
              Уже есть аккаунт?{' '}
              <span style={styles.link} onClick={() => changeMode('login')}>
                Войти
              </span>
            </p>
          </form>
        )}

        {mode === 'verify' && (
          <form onSubmit={handleVerify} className={`auth-form ${formAnimating ? 'auth-form-exit' : 'auth-form-enter'}`} style={styles.form}>
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

            <button type="submit" className="sci-fi-btn" style={styles.button} disabled={isLoading || code.length !== 6}>
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
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    padding: 20,
    overflow: 'hidden',
  },
  backgroundImage: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    backgroundRepeat: 'no-repeat',
    zIndex: 0,
  },
  modal: {
    background: 'linear-gradient(180deg, rgba(21, 21, 21, 0.98) 0%, rgba(30, 30, 30, 0.98) 100%)',
    backdropFilter: 'blur(20px)',
    borderRadius: 20,
    padding: 36,
    width: '100%',
    maxWidth: 480,
    position: 'relative',
    zIndex: 10,
    border: '1px solid rgba(237, 28, 41, 0.25)',
    boxShadow: '0 20px 60px rgba(0, 0, 0, 0.6), 0 0 50px rgba(228, 0, 43, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.05)',
    overflow: 'hidden',
  },
  closeButton: {
    position: 'absolute',
    top: 12,
    right: 16,
    background: 'none',
    border: 'none',
    fontSize: 28,
    cursor: 'pointer',
    color: 'rgba(255, 255, 255, 0.5)',
    lineHeight: 1,
    transition: 'color 0.2s',
  },
  logo: {
    textAlign: 'center',
    background: '#ED1C29',
    color: '#fff',
    padding: '14px 28px',
    borderRadius: 12,
    fontWeight: 'bold',
    fontSize: 18,
    marginBottom: 24,
    letterSpacing: 0,
    fontFamily: "'RosticsCeraPro', sans-serif",
    boxShadow: '0 0 25px rgba(228, 0, 43, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.2)',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: 16,
  },
  title: {
    textAlign: 'center',
    color: '#fff',
    margin: 0,
    fontSize: 26,
    fontWeight: 700,
    fontFamily: "'RosticsCeraPro', sans-serif",
    letterSpacing: 0,
    textShadow: '0 0 15px rgba(255, 255, 255, 0.15)',
  },
  description: {
    textAlign: 'center',
    color: 'rgba(244, 166, 152, 0.7)',
    fontSize: 14,
    margin: 0,
    fontFamily: "'RosticsCeraPro', sans-serif",
  },
  input: {
    padding: 16,
    borderRadius: 12,
    border: '1px solid rgba(237, 28, 41, 0.2)',
    background: 'linear-gradient(160deg, rgba(21, 21, 21, 0.8) 0%, rgba(40, 40, 40, 0.6) 100%)',
    fontSize: 16,
    fontWeight: 600,
    outline: 'none',
    color: '#fff',
    fontFamily: "'RosticsCeraPro', sans-serif",
    transition: 'border-color 0.2s, box-shadow 0.2s',
    width: '100%',
    boxSizing: 'border-box',
  },
  passwordContainer: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
  },
  passwordInput: {
    padding: 16,
    paddingRight: 52,
    borderRadius: 12,
    border: '1px solid rgba(237, 28, 41, 0.2)',
    background: 'linear-gradient(160deg, rgba(21, 21, 21, 0.8) 0%, rgba(40, 40, 40, 0.6) 100%)',
    fontSize: 16,
    fontWeight: 600,
    outline: 'none',
    color: '#fff',
    width: '100%',
    boxSizing: 'border-box',
    fontFamily: "'RosticsCeraPro', sans-serif",
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
    color: 'rgba(244, 166, 152, 0.6)',
  },
  codeInput: {
    padding: 18,
    borderRadius: 14,
    border: '2px solid rgba(255, 100, 120, 0.4)',
    background: 'linear-gradient(160deg, rgba(228, 0, 43, 0.15) 0%, rgba(180, 0, 30, 0.1) 100%)',
    fontSize: 26,
    textAlign: 'center',
    letterSpacing: 10,
    fontWeight: 'bold',
    outline: 'none',
    color: '#fff',
    fontFamily: "'RosticsCeraCondensed', sans-serif",
    boxShadow: '0 0 20px rgba(228, 0, 43, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.05)',
  },
  button: {
    padding: 18,
    border: 'none',
    borderRadius: 12,
    background: '#ED1C29',
    color: '#fff',
    fontSize: 17,
    fontWeight: 700,
    cursor: 'pointer',
    boxShadow: '0 0 25px rgba(228, 0, 43, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.2)',
    textTransform: 'uppercase',
    letterSpacing: 0,
    marginTop: 8,
    fontFamily: "'RosticsCeraPro', sans-serif",
    transition: 'all 0.2s ease',
  },
  error: {
    background: 'linear-gradient(160deg, rgba(200, 0, 0, 0.2) 0%, rgba(150, 0, 0, 0.15) 100%)',
    border: '1px solid rgba(255, 100, 100, 0.3)',
    color: '#ff8080',
    padding: 12,
    borderRadius: 8,
    fontSize: 13,
    textAlign: 'center',
    fontFamily: "'RosticsCeraPro', sans-serif",
  },
  switchText: {
    textAlign: 'center',
    color: 'rgba(244, 166, 152, 0.6)',
    fontSize: 15,
    margin: 0,
    fontFamily: "'RosticsCeraPro', sans-serif",
  },
  link: {
    color: '#F4A698',
    cursor: 'pointer',
    fontWeight: 'bold',
    textShadow: '0 0 10px rgba(255, 100, 120, 0.3)',
  },
  citySelectWrapper: {
    position: 'relative',
  },
  cityDropdown: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    background: 'linear-gradient(180deg, rgba(21, 21, 21, 0.98) 0%, rgba(30, 30, 30, 0.98) 100%)',
    border: '1px solid rgba(237, 28, 41, 0.25)',
    borderRadius: '0 0 8px 8px',
    maxHeight: 250,
    overflowY: 'auto',
    zIndex: 100,
    boxShadow: '0 10px 30px rgba(0, 0, 0, 0.5)',
  },
  cityOption: {
    padding: '12px 16px',
    cursor: 'pointer',
    color: '#fff',
    fontSize: 15,
    fontFamily: "'RosticsCeraPro', sans-serif",
    transition: 'background 0.15s',
    borderBottom: '1px solid rgba(237, 28, 41, 0.1)',
  },
  cityNoResults: {
    padding: '16px',
    textAlign: 'center',
    color: 'rgba(255, 100, 100, 0.7)',
    fontSize: 14,
    fontFamily: "'RosticsCeraPro', sans-serif",
  },
  checkboxLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    cursor: 'pointer',
    padding: '10px 0',
  },
  checkbox: {
    display: 'none', // Скрываем стандартный checkbox
  },
  checkboxCustom: {
    width: 26,
    height: 26,
    borderRadius: '6px',
    border: '2px solid rgba(228, 0, 43, 0.5)',
    background: 'linear-gradient(160deg, rgba(30, 15, 20, 0.8) 0%, rgba(50, 20, 30, 0.6) 100%)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    transition: 'all 0.2s ease',
    boxShadow: '0 0 10px rgba(228, 0, 43, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.05)',
  },
  checkboxCustomChecked: {
    background: '#ED1C29',
    border: '2px solid #FF4D6D',
    boxShadow: '0 0 20px rgba(228, 0, 43, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.2)',
  },
  checkboxIcon: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    textShadow: '0 0 5px rgba(255, 255, 255, 0.5)',
  },
  checkboxText: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 13,
    lineHeight: 1.4,
    fontFamily: "'RosticsCeraPro', sans-serif",
  },
  privacyLink: {
    color: '#F4A698',
    textDecoration: 'underline',
  },
};

// Add game-style button styles
const authStyleSheet = document.createElement('style');
authStyleSheet.textContent = `
  /* @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@400;500;600;700;800&family=Rajdhani:wght@400;500;600;700&display=swap'); */

  /* ===== ENTRANCE ANIMATIONS ===== */

  /* Overlay fade in */
  .auth-overlay {
    opacity: 0;
    transition: opacity 0.4s ease-out;
  }
  .auth-overlay.auth-visible {
    opacity: 1;
  }

  /* Background zoom in */
  .auth-bg {
    opacity: 0;
    transform: scale(1.1);
    transition: opacity 0.6s ease-out, transform 0.8s ease-out;
  }
  .auth-bg.auth-bg-visible {
    opacity: 1;
    transform: scale(1);
  }

  /* Modal slide up and fade in */
  .auth-modal {
    opacity: 0;
    transform: translateY(30px) scale(0.95);
    transition: opacity 0.5s cubic-bezier(0.34, 1.56, 0.64, 1),
                transform 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
    transition-delay: 0.15s;
  }
  .auth-modal.auth-modal-visible {
    opacity: 1;
    transform: translateY(0) scale(1);
  }

  /* Form transitions */
  .auth-form {
    animation: formEnter 0.35s ease-out forwards;
  }
  .auth-form-exit {
    animation: formExit 0.2s ease-in forwards;
  }
  .auth-form-enter {
    animation: formEnter 0.35s ease-out forwards;
  }

  @keyframes formEnter {
    from {
      opacity: 0;
      transform: translateX(20px);
    }
    to {
      opacity: 1;
      transform: translateX(0);
    }
  }

  @keyframes formExit {
    from {
      opacity: 1;
      transform: translateX(0);
    }
    to {
      opacity: 0;
      transform: translateX(-20px);
    }
  }

  /* Auth overlay darkening */
  .auth-overlay::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(21, 21, 21, 0.6);
    z-index: 1;
    opacity: 0;
    transition: opacity 0.4s ease-out;
  }
  .auth-overlay.auth-visible::before {
    opacity: 1;
  }

  /* Mobile background for auth screen */
  @media (max-width: 500px) {
    .auth-bg {
      background-image: url('/images/loginbgmob.webp') !important;
    }
  }

  /* Desktop - larger modal */
  @media (min-width: 768px) {
    .auth-modal {
      max-width: 520px !important;
      padding: 44px !important;
    }
  }

  /* Sci-fi checkbox hover */
  .sci-fi-checkbox {
    cursor: pointer;
  }
  .sci-fi-checkbox:hover {
    border-color: rgba(255, 77, 109, 0.8) !important;
    box-shadow: 0 0 15px rgba(228, 0, 43, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.1) !important;
  }

  .sci-fi-btn {
    position: relative;
    overflow: hidden;
  }
  .sci-fi-btn::before {
    content: '';
    position: absolute;
    top: 0;
    left: -100%;
    width: 100%;
    height: 100%;
    background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.15), transparent);
    transition: left 0.4s ease;
  }
  .sci-fi-btn:hover::before {
    left: 100%;
  }
  .sci-fi-btn:hover {
    background: #ED1C29 !important;
    box-shadow: 0 0 35px rgba(228, 0, 43, 0.7), inset 0 1px 0 rgba(255, 255, 255, 0.3) !important;
    transform: translateY(-2px);
  }
  .sci-fi-btn:active {
    transform: translateY(0);
    box-shadow: 0 0 20px rgba(228, 0, 43, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.2) !important;
  }
  .sci-fi-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    transform: none !important;
  }
  .sci-fi-btn:disabled::before {
    display: none;
  }

  /* Input focus styles */
  input:focus {
    border-color: rgba(255, 100, 120, 0.5) !important;
    box-shadow: 0 0 15px rgba(228, 0, 43, 0.2) !important;
  }

  /* City dropdown styles */
  .city-dropdown {
    scrollbar-width: thin;
    scrollbar-color: rgba(237, 28, 41, 0.2) transparent;
  }
  .city-dropdown::-webkit-scrollbar {
    width: 6px;
  }
  .city-dropdown::-webkit-scrollbar-track {
    background: transparent;
  }
  .city-dropdown::-webkit-scrollbar-thumb {
    background: rgba(237, 28, 41, 0.2);
    border-radius: 3px;
  }
  .city-dropdown > div[style*="cursor: pointer"]:hover {
    background: rgba(228, 0, 43, 0.2) !important;
  }
`;
if (!document.getElementById('auth-styles')) {
  authStyleSheet.id = 'auth-styles';
  document.head.appendChild(authStyleSheet);
}
