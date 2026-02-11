#!/bin/bash
set -e

echo "=== Backend Starting ==="

# Wait for database
echo "Waiting for database..."
while ! nc -z db 5432; do
  sleep 1
done
echo "Database is ready!"

# Run migrations first (creates tables + seeds data)
# Migrations are idempotent and handle pre-existing objects gracefully
echo "Running migrations..."
flask db upgrade

# Fallback: create any tables not covered by migrations
echo "Ensuring all tables exist..."
python3 << EOF
from app import create_app, db
app = create_app()
with app.app_context():
    db.create_all()
    print("Tables ready!")
EOF

# Start the application
echo "Starting Flask application..."
exec gunicorn --bind 0.0.0.0:5000 --workers 2 --threads 4 --timeout 60 "app:create_app()"
