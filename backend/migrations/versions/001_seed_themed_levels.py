"""Seed themed game levels

Revision ID: 001_seed_levels
Revises:
Create Date: 2024-02-04

Creates 5 themed levels with unique obstacle patterns:
1. Первый вкус - Chicken drumstick shape (easy intro)
2. Острые крылышки - Wings pattern
3. Золотое ведёрко - Bucket shape
4. Буква R - Letter R for Rostic's
5. Полковник - Colonel's face (final boss)
"""
from alembic import op
import sqlalchemy as sa
import json
from datetime import datetime

# revision identifiers
revision = '001_seed_levels'
down_revision = None
branch_labels = None
depends_on = None


def upgrade():
    # Check if levels table exists and has data
    conn = op.get_bind()

    # First ensure the levels table exists
    result = conn.execute(sa.text(
        "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'levels')"
    ))
    if not result.scalar():
        print("Levels table doesn't exist yet, skipping seed")
        return

    # Check if levels already exist
    result = conn.execute(sa.text("SELECT COUNT(*) FROM levels"))
    if result.scalar() > 0:
        print("Levels already exist, skipping seed")
        return

    print("Seeding themed levels...")

    levels = [
        # Level 1: "Первый вкус" - Easy intro, NO obstacles
        {
            'name': 'Первый вкус',
            'order': 1,
            'grid_width': 7,
            'grid_height': 7,
            'max_moves': 25,
            'item_types': '["drumstick", "wing", "burger", "fries", "bucket", "ice_cream", "donut", "cappuccino"]',
            'targets': json.dumps({
                'collect': {'drumstick': 10},
                'min_score': 500
            }),
            'obstacles': json.dumps([]),  # No obstacles for beginners
            'is_active': True,
        },

        # Level 2: "Острые крылышки" - Still easy, NO obstacles
        {
            'name': 'Острые крылышки',
            'order': 2,
            'grid_width': 7,
            'grid_height': 7,
            'max_moves': 22,
            'item_types': '["drumstick", "wing", "burger", "fries", "bucket", "ice_cream", "donut", "cappuccino"]',
            'targets': json.dumps({
                'collect': {'drumstick': 12, 'fries': 8},
                'min_score': 800
            }),
            'obstacles': json.dumps([]),  # No obstacles yet
            'is_active': True,
        },

        # Level 3: "Золотое ведёрко" - Bucket shape (4 obstacles in center)
        {
            'name': 'Золотое ведёрко',
            'order': 3,
            'grid_width': 7,
            'grid_height': 7,
            'max_moves': 24,
            'item_types': '["drumstick", "wing", "burger", "fries", "bucket", "ice_cream", "donut", "cappuccino"]',
            'targets': json.dumps({
                'collect': {'bucket': 5, 'drumstick': 15},
                'min_score': 1000
            }),
            # Simple square in center - tiles can flow around
            'obstacles': json.dumps([
                {'row': 2, 'col': 2}, {'row': 2, 'col': 4},
                {'row': 4, 'col': 2}, {'row': 4, 'col': 4},
            ]),
            'is_active': True,
        },

        # Level 4: "Углы" - Corner obstacles (no trapped tiles!)
        {
            'name': 'Углы',
            'order': 4,
            'grid_width': 7,
            'grid_height': 7,
            'max_moves': 26,
            'item_types': '["drumstick", "wing", "burger", "fries", "bucket", "ice_cream", "donut", "cappuccino"]',
            'targets': json.dumps({
                'collect': {'burger': 10, 'wing': 10},
                'min_score': 1200
            }),
            # Corner L-shapes - tiles can flow around them
            'obstacles': json.dumps([
                # Top-left corner
                {'row': 1, 'col': 1}, {'row': 2, 'col': 1}, {'row': 1, 'col': 2},
                # Top-right corner
                {'row': 1, 'col': 5}, {'row': 2, 'col': 5}, {'row': 1, 'col': 4},
                # Bottom-left corner
                {'row': 5, 'col': 1}, {'row': 4, 'col': 1}, {'row': 5, 'col': 2},
                # Bottom-right corner
                {'row': 5, 'col': 5}, {'row': 4, 'col': 5}, {'row': 5, 'col': 4},
            ]),
            'is_active': True,
        },

        # Level 5: "Полковник" - Colonel's face (no bottom row obstacles!)
        {
            'name': 'Полковник',
            'order': 5,
            'grid_width': 7,
            'grid_height': 7,
            'max_moves': 30,
            'item_types': '["drumstick", "wing", "burger", "fries", "bucket", "ice_cream", "donut", "cappuccino"]',
            'targets': json.dumps({
                'collect': {'drumstick': 20, 'bucket': 8, 'burger': 12},
                'min_score': 2000
            }),
            'obstacles': json.dumps([
                # Eyes (glasses)
                {'row': 1, 'col': 1}, {'row': 1, 'col': 2},
                {'row': 1, 'col': 4}, {'row': 1, 'col': 5},
                # Nose
                {'row': 3, 'col': 3},
                # Smile (moved up from row 6)
                {'row': 4, 'col': 1}, {'row': 4, 'col': 5},
                {'row': 5, 'col': 2}, {'row': 5, 'col': 3}, {'row': 5, 'col': 4},
            ]),
            'is_active': True,
        },
    ]

    for level in levels:
        conn.execute(sa.text("""
            INSERT INTO levels (name, "order", grid_width, grid_height, max_moves,
                              item_types, targets, obstacles, is_active, created_at)
            VALUES (:name, :order, :grid_width, :grid_height, :max_moves,
                    :item_types, :targets, :obstacles, :is_active, :created_at)
        """), {
            **level,
            'created_at': datetime.utcnow()
        })
        print(f"  + Level {level['order']}: {level['name']}")

    print(f"Seeded {len(levels)} themed levels!")


def downgrade():
    # Remove seeded levels
    conn = op.get_bind()
    conn.execute(sa.text(
        "DELETE FROM levels WHERE name IN ('Первый вкус', 'Острые крылышки', "
        "'Золотое ведёрко', 'Буква R', 'Полковник')"
    ))
    print("Removed seeded levels")
