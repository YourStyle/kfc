#!/bin/bash
set -e

echo "=== Admin Panel Starting ==="

# Wait for database
echo "Waiting for database..."
while ! nc -z db 5432; do
  sleep 1
done
echo "Database is ready!"

# Create tables and admin user
echo "Initializing database..."
python3 << EOF
from app import create_app, db
from app.models import AdminUser
import os

app = create_app()
with app.app_context():
    # Create tables if not exist
    db.create_all()
    print("Tables ready!")

    # Create admin user if not exists
    username = os.environ.get('ADMIN_USERNAME', 'admin')
    password = os.environ.get('ADMIN_PASSWORD', 'admin123')

    admin = AdminUser.query.filter_by(username=username).first()
    if not admin:
        admin = AdminUser(username=username, is_active=True)
        admin.set_password(password)
        db.session.add(admin)
        db.session.commit()
        print(f"Created admin user: {username}")
    else:
        print(f"Admin user '{username}' already exists")
EOF

# Start the application
echo "Starting Admin Panel..."
exec gunicorn --bind 0.0.0.0:5001 --workers 2 --threads 2 --timeout 60 "app:create_app()"
