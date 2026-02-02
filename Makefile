.PHONY: help dev dev-frontend dev-backend db-start db-stop db-reset docker-up docker-down build deploy test test-backend test-admin test-frontend test-all setup-venv init

help:
	@echo "ROSTIC'S Kitchen - Development Commands"
	@echo ""
	@echo "Quick Start:"
	@echo "  make init           - Full setup: build, start, init DB & admin"
	@echo ""
	@echo "Development:"
	@echo "  make dev            - Start all services for development"
	@echo "  make dev-frontend   - Start frontend only (Vite)"
	@echo "  make dev-backend    - Start backend only (Flask + DB)"
	@echo ""
	@echo "Testing:"
	@echo "  make setup-venv     - Create Python venvs and install deps"
	@echo "  make test           - Run all tests (backend + admin + frontend)"
	@echo "  make test-backend   - Run backend tests only"
	@echo "  make test-admin     - Run admin panel tests only"
	@echo "  make test-frontend  - Run frontend tests only"
	@echo "  make test-docker    - Run all tests in Docker containers"
	@echo ""
	@echo "Database:"
	@echo "  make db-start       - Start PostgreSQL and Redis"
	@echo "  make db-stop        - Stop database containers"
	@echo "  make db-reset       - Reset database (WARNING: deletes all data)"
	@echo ""
	@echo "Docker:"
	@echo "  make docker-up      - Start all containers"
	@echo "  make docker-down    - Stop all containers"
	@echo ""
	@echo "Build:"
	@echo "  make build          - Build frontend for production"
	@echo "  make deploy         - Build and deploy with nginx"

# Development
dev:
	@echo "Starting development environment..."
	@make db-start
	@echo "Starting backend..."
	@cd backend && FLASK_ENV=development python3 -m flask run --host=0.0.0.0 --port=5000 &
	@echo "Starting frontend..."
	@cd frontend && npm run dev

dev-frontend:
	@cd frontend && npm run dev

dev-backend:
	@make db-start
	@cd backend && FLASK_ENV=development python3 -m flask run --host=0.0.0.0 --port=5000

# Database
db-start:
	@docker-compose up -d db redis
	@echo "Waiting for database to be ready..."
	@sleep 3
	@echo "Database started on localhost:5432"

db-stop:
	@docker-compose stop db redis

db-reset:
	@echo "WARNING: This will delete all data!"
	@read -p "Are you sure? [y/N] " confirm && [ "$$confirm" = "y" ] || exit 1
	@docker-compose down -v
	@docker-compose up -d db redis
	@sleep 3
	@echo "Database reset complete"

# Docker
docker-up:
	@docker-compose up -d

docker-down:
	@docker-compose down

# Full initialization (for new server deployment)
init:
	@echo "=== ROSTIC'S Kitchen - Full Initialization ==="
	@echo "Building containers..."
	@docker-compose build
	@echo "Starting services..."
	@docker-compose up -d
	@echo ""
	@echo "Waiting for services to initialize..."
	@sleep 10
	@echo ""
	@echo "=== Setup Complete! ==="
	@echo "Game:        http://localhost:3000"
	@echo "Admin Panel: http://localhost:5001"
	@echo "API:         http://localhost:5000"
	@echo "Grafana:     http://localhost:9000"
	@echo ""
	@echo "Admin credentials from .env:"
	@echo "  Username: $${ADMIN_USERNAME:-admin}"
	@echo "  Password: $${ADMIN_PASSWORD:-admin123}"

# Build
build:
	@cd frontend && npm run build

deploy:
	@cd frontend && npm run build
	@docker-compose --profile production up -d
	@echo "Deployed! Access at http://localhost"

# Testing
test: test-backend test-admin test-frontend
	@echo "All tests completed!"

test-backend:
	@echo "Running backend tests..."
	@cd backend && source venv/bin/activate && pytest -v

test-admin:
	@echo "Running admin tests..."
	@cd admin && source venv/bin/activate && pytest -v

# Setup virtual environments
setup-venv:
	@echo "Setting up backend venv..."
	@cd backend && python3 -m venv venv && source venv/bin/activate && pip install -r requirements.txt
	@echo "Setting up admin venv..."
	@cd admin && python3 -m venv venv && source venv/bin/activate && pip install -r requirements.txt
	@echo "Venvs ready!"

test-frontend:
	@echo "Running frontend tests..."
	@cd frontend && source ~/.nvm/nvm.sh && nvm use 20 && npm run test:run

test-docker:
	@echo "Running tests in Docker..."
	@docker-compose run --rm backend-test
	@docker-compose run --rm admin-test
	@docker-compose run --rm frontend-test
	@echo "All Docker tests completed!"

test-ci:
	@echo "Running CI tests (with coverage)..."
	@docker-compose --profile test up --build --abort-on-container-exit --exit-code-from backend-test
	@echo "CI tests completed!"
