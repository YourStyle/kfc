"""Update game texts per Feb 24 revision + add 3rd prize tier

Revision ID: 008_update_texts
Revises: 007_update_levels_obstacles_names
Create Date: 2026-02-24

"""
from alembic import op
from sqlalchemy import text

revision = '008_update_texts'
down_revision = '007_level_updates'
branch_labels = None
depends_on = None


# (key, new_value, new_label_or_None)
UPDATES = [
    # Game texts
    ('game.combo_3', '', None),
    ('game.loading_fallback', 'Жарим курочку…', None),
    ('game.tutorial_2_text', 'Собирай заказы, совмещая 3 и более одинаковых предмета. Чем больше ряд, тем круче эффект!', None),

    # Quest texts
    ('quest.btn_game', 'Играть в Легенды космоса', None),
    ('quest.prize_gold', "Скидка 15% на заказ в ROSTIC'S через мобильное приложение", None),
    ('quest.prize_silver', "Скидка 10% на заказ в ROSTIC'S через мобильное приложение", None),
    ('quest.promo_hint', "Используйте промокод в мобильном приложении ROSTIC'S", None),
    ('quest.result_no_prize_hint', "Наберите от 120 баллов, получите промокод на заказ в мобильном приложении ROSTIC'S", None),

    # Rules texts
    ('rules.rule_3', 'Выполни задание уровня раньше, чем закончатся ходы, каждый ход на счету!', None),
    ('rules.prizes_intro', "Набирай очки, получай призы от ROSTIC'S!", None),

    # Moscow prizes — update place ranges and texts
    ('rules.moscow_prize_1_title', 'Встреча с космонавтом', 'Москва: приз 1-20 место (название)'),
    ('rules.moscow_prize_1_text',
     "Пригласительный билет на одного взрослого +1 на встречу с космонавтом А.И. Лавейкиным и набор космического мерча от ROSTIC'S",
     'Москва: приз 1-20 место (описание)'),
    ('rules.moscow_prize_2_title', 'Промокод на скидку', 'Москва: приз 21-50 место (название)'),
    ('rules.moscow_prize_2_text',
     "Скидка 15% на заказ в ROSTIC'S через мобильное приложение",
     'Москва: приз 21-50 место (описание)'),

    # Region prizes — update place ranges and texts
    ('rules.region_prize_1_title', 'Промокод на скидку и набор мерча', 'Регионы: приз 1-30 место (название)'),
    ('rules.region_prize_1_text',
     "Промокод на скидку 30% в Rostic's и набор космического мерча от Rostic's",
     'Регионы: приз 1-30 место (описание)'),
    ('rules.region_prize_2_title', 'Промокод на скидку', 'Регионы: приз 31-50 место (название)'),
    ('rules.region_prize_2_text',
     "Скидка 15% на заказ в ROSTIC'S через мобильное приложение",
     'Регионы: приз 31-50 место (описание)'),
]

# New text keys for 3rd prize tier
NEW_TEXTS = [
    ('rules.moscow_prize_3_title', 'rules', 'Москва: приз 51+ место (название)', 'Промокод на скидку'),
    ('rules.moscow_prize_3_text', 'rules', 'Москва: приз 51+ место (описание)',
     "Скидка 7% на заказ в ROSTIC'S через мобильное приложение"),
    ('rules.region_prize_3_title', 'rules', 'Регионы: приз 51+ место (название)', 'Промокод на скидку'),
    ('rules.region_prize_3_text', 'rules', 'Регионы: приз 51+ место (описание)',
     "Скидка 7% на заказ в ROSTIC'S через мобильное приложение"),
]


def upgrade():
    conn = op.get_bind()

    # Update existing texts
    for key, new_value, new_label in UPDATES:
        if new_label:
            conn.execute(text(
                "UPDATE game_texts SET value = :value, label = :label WHERE key = :key"
            ), {'key': key, 'value': new_value, 'label': new_label})
        else:
            conn.execute(text(
                "UPDATE game_texts SET value = :value WHERE key = :key"
            ), {'key': key, 'value': new_value})

    # Insert new 3rd prize tier texts
    for key, section, label, value in NEW_TEXTS:
        conn.execute(text(
            "INSERT INTO game_texts (key, section, label, value) "
            "VALUES (:key, :section, :label, :value) "
            "ON CONFLICT (key) DO UPDATE SET value = :value, label = :label"
        ), {'key': key, 'section': section, 'label': label, 'value': value})


def downgrade():
    # Not reversible easily — these are data-only changes
    pass
