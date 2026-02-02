#!/bin/bash
set -e

echo "=== ROSTIC'S Kitchen - Database Initialization ==="

# Wait for database to be ready
echo "Waiting for database..."
until PGPASSWORD=$POSTGRES_PASSWORD psql -h db -U rostics -d rostics -c '\q' 2>/dev/null; do
  sleep 1
done
echo "Database is ready!"

# Run migrations
echo "Running migrations..."
cd /app
flask db upgrade

# Create default admin if not exists
echo "Checking admin user..."
python3 << 'EOF'
from app import create_app, db
from app.models import AdminUser

app = create_app()
with app.app_context():
    admin = AdminUser.query.filter_by(username='admin').first()
    if not admin:
        import os
        password = os.environ.get('ADMIN_PASSWORD', 'admin123')
        admin = AdminUser(username='admin', is_active=True)
        admin.set_password(password)
        db.session.add(admin)
        db.session.commit()
        print(f"Created admin user: admin / {password}")
    else:
        print("Admin user already exists")
EOF

echo "=== Initialization complete ==="
