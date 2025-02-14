# Rostics Legends

Match-3 игра и квест-платформа для промо-кампании Rostic's.

## Стек

- **Frontend:** React + Vite + PixiJS
- **Backend:** Flask + PostgreSQL + Redis
- **Admin:** Flask-Admin
- **Infra:** Docker Compose, Nginx, Prometheus + Grafana

## Запуск

```bash
cp .env.example .env
docker compose up -d
```

Frontend: http://localhost:3000
Backend API: http://localhost:5000/api/health
Admin: http://localhost:5001

## Структура

```
frontend/    — React SPA (match-3 игра, квест, лидерборд)
backend/     — Flask REST API
admin/       — Админ-панель
landing/     — Лендинги промо-кампаний
nginx/       — Конфигурация reverse proxy
scripts/     — Утилиты и миграции
monitoring/  — Prometheus, Grafana, Loki
```
