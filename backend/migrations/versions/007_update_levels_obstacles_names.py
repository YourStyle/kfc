"""Update levels 3-5 with more obstacles and better names, add level names to game_texts,
increase item variety per level.

Revision ID: 007_level_updates
Revises: 006_translate_names
Create Date: 2026-02-19
"""
from alembic import op
from sqlalchemy import text
import json

revision = '007_level_updates'
down_revision = '006_translate_names'
branch_labels = None
depends_on = None

# New names for all 5 levels (space-kitchen theme)
LEVEL_NAMES = {
    1: 'Космический завтрак',
    2: 'Звёздный перекус',
    3: 'На орбите',
    4: 'Гравитация',
    5: 'Миссия шефа',
}

# New obstacle layouts for levels 3-5
LEVEL_OBSTACLES = {
    3: [
        # Scattered pattern — 6 obstacles, max 1 per column (no trapping)
        {"row": 1, "col": 1},
        {"row": 2, "col": 5},
        {"row": 3, "col": 3},
        {"row": 4, "col": 0},
        {"row": 4, "col": 4},
        {"row": 5, "col": 2},
    ],
    4: [
        # Edge corner L-shapes — 12 obstacles (no center, corners at actual grid edges)
        # Top-left corner
        {"row": 0, "col": 0}, {"row": 0, "col": 1}, {"row": 1, "col": 0},
        # Top-right corner
        {"row": 0, "col": 5}, {"row": 0, "col": 6}, {"row": 1, "col": 6},
        # Bottom-left corner
        {"row": 5, "col": 0}, {"row": 6, "col": 0}, {"row": 6, "col": 1},
        # Bottom-right corner
        {"row": 5, "col": 6}, {"row": 6, "col": 5}, {"row": 6, "col": 6},
    ],
    5: [
        # Symmetric corridor — 12 obstacles (top/bottom rows + side pinch)
        # Top row
        {"row": 0, "col": 1}, {"row": 0, "col": 3}, {"row": 0, "col": 5},
        # Side pinch upper
        {"row": 1, "col": 0}, {"row": 1, "col": 6},
        # Middle pinch
        {"row": 3, "col": 1}, {"row": 3, "col": 5},
        # Side pinch lower
        {"row": 5, "col": 0}, {"row": 5, "col": 6},
        # Bottom row
        {"row": 6, "col": 1}, {"row": 6, "col": 3}, {"row": 6, "col": 5},
    ],
}

# Item type variety per level (more types = harder to match)
LEVEL_ITEM_TYPES = {
    1: ["drumstick", "wing", "burger", "fries", "bucket"],
    2: ["drumstick", "wing", "burger", "fries", "bucket", "ice_cream"],
    3: ["drumstick", "wing", "burger", "fries", "bucket", "ice_cream"],
    4: ["drumstick", "wing", "burger", "fries", "bucket", "ice_cream", "cappuccino"],
    5: ["drumstick", "wing", "burger", "fries", "bucket", "ice_cream", "cappuccino"],
}

# Level name texts to add to game_texts for admin editing
LEVEL_TEXT_ENTRIES = [
    ('level.name.1', 'game', 'Название уровня 1', 'Космический завтрак'),
    ('level.name.2', 'game', 'Название уровня 2', 'Звёздный перекус'),
    ('level.name.3', 'game', 'Название уровня 3', 'На орбите'),
    ('level.name.4', 'game', 'Название уровня 4', 'Гравитация'),
    ('level.name.5', 'game', 'Название уровня 5', 'Миссия шефа'),
]


def upgrade():
    conn = op.get_bind()

    # Update level names
    for order, name in LEVEL_NAMES.items():
        result = conn.execute(text(
            "UPDATE levels SET name = :name WHERE \"order\" = :order"
        ), {'name': name, 'order': order})
        if result.rowcount > 0:
            print(f"  Level {order}: renamed to '{name}'")

    # Update obstacles for levels 3-5
    for order, obstacles in LEVEL_OBSTACLES.items():
        obstacles_json = json.dumps(obstacles)
        result = conn.execute(text(
            "UPDATE levels SET obstacles = :obstacles WHERE \"order\" = :order"
        ), {'obstacles': obstacles_json, 'order': order})
        if result.rowcount > 0:
            print(f"  Level {order}: updated obstacles ({len(obstacles)} cells)")

    # Update item types for all levels
    for order, item_types in LEVEL_ITEM_TYPES.items():
        item_types_json = json.dumps(item_types)
        result = conn.execute(text(
            "UPDATE levels SET item_types = :item_types WHERE \"order\" = :order"
        ), {'item_types': item_types_json, 'order': order})
        if result.rowcount > 0:
            print(f"  Level {order}: updated item_types ({len(item_types)} types)")

    # Add level name texts to game_texts (if table exists)
    table_check = conn.execute(text(
        "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'game_texts')"
    )).scalar()

    if table_check:
        for key, section, label, value in LEVEL_TEXT_ENTRIES:
            exists = conn.execute(text(
                "SELECT 1 FROM game_texts WHERE key = :key"
            ), {'key': key}).fetchone()
            if not exists:
                conn.execute(text(
                    "INSERT INTO game_texts (key, section, label, value) VALUES (:key, :section, :label, :value)"
                ), {'key': key, 'section': section, 'label': label, 'value': value})
                print(f"  Added text: {key} = '{value}'")


def downgrade():
    conn = op.get_bind()

    # Revert level names
    OLD_NAMES = {
        1: 'Первый вкус',
        2: 'Острые крылышки',
        3: 'Золотое ведёрко',
        4: 'Углы',
        5: 'Полковник',
    }
    for order, name in OLD_NAMES.items():
        conn.execute(text(
            "UPDATE levels SET name = :name WHERE \"order\" = :order"
        ), {'name': name, 'order': order})

    OLD_OBSTACLES = {
        3: [{"row": 2, "col": 2}, {"row": 2, "col": 4}, {"row": 4, "col": 2}, {"row": 4, "col": 4}],
        4: [
            {"row": 1, "col": 1}, {"row": 2, "col": 1}, {"row": 1, "col": 2},
            {"row": 1, "col": 5}, {"row": 2, "col": 5}, {"row": 1, "col": 4},
            {"row": 5, "col": 1}, {"row": 4, "col": 1}, {"row": 5, "col": 2},
            {"row": 5, "col": 5}, {"row": 4, "col": 5}, {"row": 5, "col": 4},
        ],
        5: [
            {"row": 1, "col": 1}, {"row": 1, "col": 2}, {"row": 1, "col": 4}, {"row": 1, "col": 5},
            {"row": 3, "col": 3},
            {"row": 4, "col": 1}, {"row": 4, "col": 5},
            {"row": 5, "col": 2}, {"row": 5, "col": 3}, {"row": 5, "col": 4},
        ],
    }
    for order, obstacles in OLD_OBSTACLES.items():
        conn.execute(text(
            "UPDATE levels SET obstacles = :obstacles WHERE \"order\" = :order"
        ), {'obstacles': json.dumps(obstacles), 'order': order})

    # Revert item types to original (all 8 types for every level)
    all_types = json.dumps(["drumstick", "wing", "burger", "fries", "bucket", "ice_cream", "donut", "cappuccino"])
    for order in range(1, 6):
        conn.execute(text(
            "UPDATE levels SET item_types = :item_types WHERE \"order\" = :order"
        ), {'item_types': all_types, 'order': order})

    # Remove added texts
    for key, _, _, _ in LEVEL_TEXT_ENTRIES:
        conn.execute(text("DELETE FROM game_texts WHERE key = :key"), {'key': key})
