# Развертывание ROSTIC'S Kitchen

## Требования

- Docker и Docker Compose (версия 2.x+)
- Git

## Быстрый старт (Production)

### 1. Клонирование репозитория

```bash
git clone <repository-url> rostics-kitchen
cd rostics-kitchen
```

### 2. Настройка переменных окружения

```bash
cp .env.example .env
```

Отредактируйте `.env` файл:

```bash
# Обязательные переменные
DATABASE_URL=postgresql://rostics:your_secure_password@db:5432/rostics
SECRET_KEY=your_very_long_random_secret_key_at_least_32_chars
JWT_SECRET_KEY=another_long_random_secret_key

# Для отправки email (опционально, можно оставить пустым для dev)
MAIL_SERVER=smtp.example.com
MAIL_PORT=587
MAIL_USERNAME=your_email@example.com
MAIL_PASSWORD=your_email_password

# Google AI для подсказок (опционально)
GOOGLE_AI_API_KEY=your_google_ai_key

# Redis
REDIS_URL=redis://redis:6379/0

# Grafana (для мониторинга)
GF_ADMIN_PASSWORD=admin_password_for_grafana
```

Генерация секретных ключей:
```bash
# Для SECRET_KEY и JWT_SECRET_KEY
python3 -c "import secrets; print(secrets.token_hex(32))"
```

### 3. Запуск (одна команда!)

```bash
make init
```

Эта команда автоматически:
- Соберет все Docker образы
- Запустит все контейнеры
- Применит миграции БД
- Создаст админ-пользователя (из переменных `ADMIN_USERNAME` / `ADMIN_PASSWORD` в .env)

Сервисы:
- PostgreSQL (порт 5432)
- Redis (порт 6379)
- Backend API (порт 5000)
- Admin Panel (порт 5001)
- Frontend (порт 3000)
- Grafana (порт 9000)

### 4. Проверка работы

- Игра: http://localhost:3000
- Admin Panel: http://localhost:5001
- API: http://localhost:5000/api/health
- Grafana: http://localhost:9000 (admin / пароль из .env)

## Структура сервисов

```
┌─────────────────┐     ┌─────────────────┐
│     Nginx       │────▶│    Frontend     │
│    (порт 80)    │     │   (React/Vite)  │
└────────┬────────┘     └─────────────────┘
         │
         │ /api/*
         ▼
┌─────────────────┐     ┌─────────────────┐
│    Backend      │────▶│   PostgreSQL    │
│  (Flask/5000)   │     │    (5432)       │
└────────┬────────┘     └─────────────────┘
         │                      ▲
         │              ┌───────┘
         ▼              │
┌─────────────────┐     │
│     Redis       │     │
│    (6379)       │     │
└─────────────────┘     │
                        │
┌─────────────────┐     │
│   Admin Panel   │─────┘
│  (Flask/5001)   │
└─────────────────┘
```

## Полезные команды

### Управление контейнерами

```bash
# Запуск
docker-compose up -d

# Остановка
docker-compose down

# Просмотр логов
docker-compose logs -f backend
docker-compose logs -f admin
docker-compose logs -f nginx

# Перезапуск сервиса
docker-compose restart backend
```

### База данных

```bash
# Резервное копирование
docker-compose exec db pg_dump -U rostics rostics > backup.sql

# Восстановление
docker-compose exec -T db psql -U rostics rostics < backup.sql

# Сброс базы (ОСТОРОЖНО!)
docker-compose down -v
docker-compose up -d
```

### Тестирование

```bash
# Запуск тестов в Docker
docker-compose run --rm backend-test
docker-compose run --rm admin-test
docker-compose run --rm frontend-test

# Или все сразу
make test-docker
```

## Локальная разработка

### Требования для разработки

- Python 3.9+
- Node.js 20+
- Docker (для БД)

### Настройка окружения

```bash
# Установка Python зависимостей
make setup-venv

# Или вручную:
cd backend && python3 -m venv venv && source venv/bin/activate && pip install -r requirements.txt
cd admin && python3 -m venv venv && source venv/bin/activate && pip install -r requirements.txt

# Установка Node зависимостей
cd frontend && npm install
```

### Запуск для разработки

```bash
# Запуск БД
make db-start

# Запуск backend (в отдельном терминале)
make dev-backend

# Запуск frontend (в отдельном терминале)
make dev-frontend
```

### Запуск тестов локально

```bash
# Все тесты
make test

# По отдельности
make test-backend
make test-admin
make test-frontend
```

## Обновление

```bash
# Получение обновлений
git pull

# Пересборка и перезапуск
docker-compose build
docker-compose up -d

# Применение миграций БД (если есть)
docker-compose exec backend flask db upgrade
```

## Troubleshooting

### Контейнер не запускается

```bash
# Проверка логов
docker-compose logs backend

# Проверка статуса
docker-compose ps
```

### Ошибка подключения к БД

1. Убедитесь, что PostgreSQL контейнер запущен: `docker-compose ps db`
2. Проверьте DATABASE_URL в .env
3. Проверьте, что БД создана: `docker-compose exec db psql -U rostics -c "\l"`

### Frontend не загружается

1. Проверьте, что nginx запущен: `docker-compose ps nginx`
2. Проверьте, что frontend собран: `docker-compose logs frontend`
3. Пересоберите: `docker-compose build frontend && docker-compose up -d`

### Порт занят

```bash
# Найти процесс на порту
lsof -i :5000

# Или изменить порты в docker-compose.yml
```

## Настройка домена

При использовании nginx (production profile) всё работает автоматически:

1. Frontend отдается nginx на порту 80
2. API запросы (`/api/*`) проксируются на backend
3. CORS не нужен, т.к. всё на одном домене

### Что настроить в `.env`:

```bash
# Относительный путь для API (через nginx)
VITE_API_URL=/api

# CORS для backend (укажите ваш домен)
CORS_ORIGINS=https://your-domain.com
```

### Для HTTPS (Let's Encrypt):

```bash
# Установите certbot
apt install certbot python3-certbot-nginx

# Получите сертификат
certbot --nginx -d your-domain.com
```

Или используйте Traefik/Caddy для автоматических сертификатов.

### Порты для firewall:

```bash
# Production (через nginx)
- 80/443 - открыть (веб)
- 5000, 5001, 9000 - закрыть (внутренние сервисы)

# Если нужен доступ к Admin Panel снаружи:
- 5001 - открыть (или настроить через nginx на /admin-panel/)
```

## Безопасность для Production

1. **Смените все пароли** в `.env` на уникальные и сложные
2. **Настройте HTTPS** через Let's Encrypt (см. выше)
3. **Ограничьте доступ** к портам - только 80/443 наружу
4. **Настройте firewall** - `ufw allow 80,443/tcp`
5. **Регулярно обновляйте** зависимости и образы Docker
