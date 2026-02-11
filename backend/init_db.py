#!/usr/bin/env python3
"""Initialize database with tables and seed data for local development."""

import os
import sys

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app import create_app, db
from app.models.user import User
from app.models.level import Level


def init_db():
    app = create_app()

    with app.app_context():
        # Create all tables
        db.create_all()
        print("✓ Database tables created")

        # Check if levels exist
        if Level.query.count() == 0:
            # Seed levels
            levels = [
                Level(
                    name='Обучение',
                    order=1,
                    grid_width=7,
                    grid_height=7,
                    max_moves=20,
                    item_types=['drumstick', 'burger', 'fries'],
                    targets={'collect': {'drumstick': 5}, 'min_score': 500}
                ),
                Level(
                    name='Лёгкий старт',
                    order=2,
                    grid_width=7,
                    grid_height=7,
                    max_moves=25,
                    item_types=['drumstick', 'wing', 'burger', 'fries'],
                    targets={'collect': {'drumstick': 10, 'burger': 5}, 'min_score': 1000}
                ),
                Level(
                    name='Комбо мастер',
                    order=3,
                    grid_width=8,
                    grid_height=8,
                    max_moves=30,
                    item_types=['drumstick', 'wing', 'burger', 'fries', 'bucket'],
                    targets={'collect': {'fries': 15}, 'min_score': 2000}
                ),
                Level(
                    name='Большой заказ',
                    order=4,
                    grid_width=8,
                    grid_height=8,
                    max_moves=35,
                    item_types=['drumstick', 'wing', 'burger', 'fries', 'bucket', 'ice_cream'],
                    targets={'collect': {'drumstick': 20, 'burger': 15, 'fries': 10}, 'min_score': 3000}
                ),
                Level(
                    name='Час пик',
                    order=5,
                    grid_width=8,
                    grid_height=8,
                    max_moves=25,
                    item_types=['drumstick', 'wing', 'burger', 'fries', 'bucket', 'ice_cream', 'donut', 'cappuccino'],
                    targets={'collect': {'drumstick': 25, 'cappuccino': 15}, 'min_score': 5000}
                ),
            ]

            for level in levels:
                db.session.add(level)

            db.session.commit()
            print(f"✓ Created {len(levels)} levels")
        else:
            print(f"✓ Levels already exist ({Level.query.count()} levels)")

        # Create test user if doesn't exist
        test_email = 'test@example.com'
        if not User.query.filter_by(email=test_email).first():
            test_user = User(
                email=test_email,
                username='TestPlayer',
                is_verified=True
            )
            test_user.set_password('test123')
            db.session.add(test_user)
            db.session.commit()
            print(f"✓ Created test user: {test_email} / test123")
        else:
            print(f"✓ Test user already exists")

        print("\n✅ Database initialized successfully!")
        print("\nTest credentials:")
        print("  Email: test@example.com")
        print("  Password: test123")


if __name__ == '__main__':
    init_db()
