"""Update levels 4 and 5 with frozen tiles and larger grids

Revision ID: 010_frozen_levels
Revises: 009_load_promo_codes
Create Date: 2026-02-25

Levels 4 and 5 now use 8x8 grids with frozen tiles (non-blocking obstacles)
instead of blocking asteroid obstacles. All 8 product types are available.
"""
from alembic import op
from sqlalchemy import text
import json

revision = '010_frozen_levels'
down_revision = '009_promo_codes'
branch_labels = None
depends_on = None


def upgrade():
    conn = op.get_bind()

    # Level 4: "Космический холод" — 8x8, frozen tiles scattered, all products
    level_4_targets = json.dumps({
        'collect': {'ice_cream': 12, 'cappuccino': 10, 'burger': 8, 'drumstick': 8},
        'min_score': 1500,
        'frozen': 12,
    })
    level_4_obstacles = json.dumps([
        # Frozen positions in a diamond pattern — tiles underneath are normal products
        {'row': 1, 'col': 3, 'type': 'frozen'}, {'row': 1, 'col': 4, 'type': 'frozen'},
        {'row': 2, 'col': 2, 'type': 'frozen'}, {'row': 2, 'col': 5, 'type': 'frozen'},
        {'row': 3, 'col': 1, 'type': 'frozen'}, {'row': 3, 'col': 6, 'type': 'frozen'},
        {'row': 4, 'col': 1, 'type': 'frozen'}, {'row': 4, 'col': 6, 'type': 'frozen'},
        {'row': 5, 'col': 2, 'type': 'frozen'}, {'row': 5, 'col': 5, 'type': 'frozen'},
        {'row': 6, 'col': 3, 'type': 'frozen'}, {'row': 6, 'col': 4, 'type': 'frozen'},
    ])
    level_4_items = '["drumstick", "wing", "burger", "fries", "bucket", "ice_cream", "donut", "cappuccino"]'

    conn.execute(text("""
        UPDATE levels SET
            name = :name,
            grid_width = :grid_width,
            grid_height = :grid_height,
            max_moves = :max_moves,
            item_types = :item_types,
            targets = :targets,
            obstacles = :obstacles
        WHERE "order" = 4
    """), {
        'name': 'Космический холод',
        'grid_width': 8,
        'grid_height': 8,
        'max_moves': 28,
        'item_types': level_4_items,
        'targets': level_4_targets,
        'obstacles': level_4_obstacles,
    })
    print("  + Updated Level 4: Космический холод (8x8, 12 frozen tiles)")

    # Level 5: "Звёздный шторм" — 8x8, more frozen tiles, all products, harder targets
    level_5_targets = json.dumps({
        'collect': {'drumstick': 15, 'wing': 12, 'fries': 10, 'donut': 8, 'bucket': 6},
        'min_score': 2500,
        'frozen': 16,
    })
    level_5_obstacles = json.dumps([
        # Frozen positions in an X pattern + center cluster
        {'row': 0, 'col': 0, 'type': 'frozen'}, {'row': 0, 'col': 7, 'type': 'frozen'},
        {'row': 1, 'col': 1, 'type': 'frozen'}, {'row': 1, 'col': 6, 'type': 'frozen'},
        {'row': 2, 'col': 2, 'type': 'frozen'}, {'row': 2, 'col': 5, 'type': 'frozen'},
        {'row': 3, 'col': 3, 'type': 'frozen'}, {'row': 3, 'col': 4, 'type': 'frozen'},
        {'row': 4, 'col': 3, 'type': 'frozen'}, {'row': 4, 'col': 4, 'type': 'frozen'},
        {'row': 5, 'col': 2, 'type': 'frozen'}, {'row': 5, 'col': 5, 'type': 'frozen'},
        {'row': 6, 'col': 1, 'type': 'frozen'}, {'row': 6, 'col': 6, 'type': 'frozen'},
        {'row': 7, 'col': 0, 'type': 'frozen'}, {'row': 7, 'col': 7, 'type': 'frozen'},
    ])
    level_5_items = '["drumstick", "wing", "burger", "fries", "bucket", "ice_cream", "donut", "cappuccino"]'

    conn.execute(text("""
        UPDATE levels SET
            name = :name,
            grid_width = :grid_width,
            grid_height = :grid_height,
            max_moves = :max_moves,
            item_types = :item_types,
            targets = :targets,
            obstacles = :obstacles
        WHERE "order" = 5
    """), {
        'name': 'Звёздный шторм',
        'grid_width': 8,
        'grid_height': 8,
        'max_moves': 30,
        'item_types': level_5_items,
        'targets': level_5_targets,
        'obstacles': level_5_obstacles,
    })
    print("  + Updated Level 5: Звёздный шторм (8x8, 16 frozen tiles)")


def downgrade():
    # Revert to original levels — handled by migration 001
    pass
