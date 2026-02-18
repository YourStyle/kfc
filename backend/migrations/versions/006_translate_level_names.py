"""Translate English level names to Russian

Revision ID: 006_translate_names
Revises: 005_game_texts
Create Date: 2026-02-18

Stakeholder feedback: "Все англоязычные наименования меню
(Tutorial, Easy start, Combo Master) обязательно перевести на русский"
"""
from alembic import op
from sqlalchemy import text

revision = '006_translate_names'
down_revision = '005_game_texts'
branch_labels = None
depends_on = None

# English name → Russian translation
TRANSLATIONS = {
    'Tutorial': 'Обучение',
    'Easy start': 'Лёгкий старт',
    'Easy Start': 'Лёгкий старт',
    'Combo Master': 'Мастер комбо',
    'Hard Mode': 'Сложный режим',
    'Challenge': 'Испытание',
    'Boss Level': 'Уровень босса',
    'Endless': 'Бесконечный',
    'Speed Run': 'На скорость',
    'Practice': 'Практика',
    'Big Order': 'Большой заказ',
    'Rush Hour': 'Час пик',
}


def upgrade():
    conn = op.get_bind()
    for eng, rus in TRANSLATIONS.items():
        result = conn.execute(text(
            "UPDATE levels SET name = :rus WHERE name = :eng"
        ), {'eng': eng, 'rus': rus})
        if result.rowcount > 0:
            print(f"  Translated: '{eng}' → '{rus}'")


def downgrade():
    conn = op.get_bind()
    for eng, rus in TRANSLATIONS.items():
        conn.execute(text(
            "UPDATE levels SET name = :eng WHERE name = :rus"
        ), {'eng': eng, 'rus': rus})
