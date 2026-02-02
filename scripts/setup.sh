#!/bin/bash

echo "🍗 ROSTIC'S Kitchen - Setup Script"
echo "=================================="

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker first."
    exit 1
fi

# Create .env from example if it doesn't exist
if [ ! -f .env ]; then
    echo "📝 Creating .env from .env.example..."
    cp .env.example .env
    echo "⚠️  Please edit .env to configure your settings"
fi

# Start database containers
echo "🐘 Starting PostgreSQL and Redis..."
docker-compose up -d db redis

# Wait for database to be ready
echo "⏳ Waiting for database..."
sleep 5

# Check if database is ready
if docker-compose exec -T db pg_isready -U rostics > /dev/null 2>&1; then
    echo "✅ Database is ready!"
else
    echo "❌ Database failed to start. Check docker-compose logs db"
    exit 1
fi

# Install frontend dependencies
echo "📦 Installing frontend dependencies..."
npm install

# Install backend dependencies
echo "🐍 Setting up Python virtual environment..."
cd backend
if [ ! -d "venv" ]; then
    python3 -m venv venv
fi
source venv/bin/activate
pip install -r requirements.txt
cd ..

echo ""
echo "✅ Setup complete!"
echo ""
echo "To start development:"
echo "  1. Start backend:  cd backend && source venv/bin/activate && flask run"
echo "  2. Start frontend: npm run dev"
echo ""
echo "Or use: make dev"
