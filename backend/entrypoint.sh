#!/bin/bash
set -e

echo "=== Backend Starting ==="

# Wait for database
echo "Waiting for database..."
while ! nc -z db 5432; do
  sleep 1
done
echo "Database is ready!"

# Create tables
echo "Initializing database..."
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
