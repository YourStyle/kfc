"""Add game_texts table for editable UI texts

Revision ID: 005_game_texts
Revises: 004_seed_quest_riddles
Create Date: 2026-02-18

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy import text

revision = '005_game_texts'
down_revision = '004_quest_riddles'
branch_labels = None
depends_on = None


def _table_exists(table):
    conn = op.get_bind()
    result = conn.execute(text(
        "SELECT 1 FROM information_schema.tables "
        "WHERE table_name = :table AND table_schema = 'public'"
    ), {'table': table})
    return result.fetchone() is not None


# All game and quest texts for seeding
DEFAULT_TEXTS = [
    # === LANDING / GAME GENERAL ===
    ('game.title', 'game', 'Название игры (лендинг)', 'Легенды космоса'),
    ('game.description', 'game', 'Описание на лендинге', 'Собирай комбо из любимых блюд, проходи уровни и соревнуйся за призы в галактическом рейтинге!'),
    ('game.loading_text', 'game', 'Текст загрузки ассетов', 'Готовим космическое меню...'),
    ('game.loading_fallback', 'game', 'Текст загрузки (без уровня)', 'Подготовка кухни...'),
    ('game.copyright', 'game', 'Копирайт в футере', '© 2026 ROSTIC\'S. Все права защищены'),

    # === GAME - COMBO TEXTS ===
    ('game.combo_3', 'game', 'Текст комбо 3 в ряд', 'ВКУСНО!'),
    ('game.combo_4', 'game', 'Текст комбо 4 в ряд', 'СОЧНО!'),
    ('game.combo_5', 'game', 'Текст комбо 5 в ряд', 'КОМБО!'),
    ('game.combo_6', 'game', 'Текст комбо 6+ в ряд', 'ШЕФ!'),
    ('game.effect_4match', 'game', 'Спецэффект 4 в ряд', 'ХРУСТЯЩЕ!'),
    ('game.effect_5match', 'game', 'Спецэффект 5+ в ряд', 'ГОРЯЧО!'),
    ('game.effect_bonus', 'game', 'Текст бонуса', 'БОНУС!'),
    ('game.effect_clear', 'game', 'Текст полной очистки', 'ГЕНЕРАЛЬНАЯ УБОРКА!'),

    # === GAME - TUTORIAL ===
    ('game.tutorial_1_title', 'game', 'Туториал шаг 1: заголовок', 'ПРИВЕТ, ШЕФ!'),
    ('game.tutorial_1_text', 'game', 'Туториал шаг 1: текст', 'Добро пожаловать на кухню ROSTIC\'S! Мы подготовили свежие ингредиенты!'),
    ('game.tutorial_2_title', 'game', 'Туториал шаг 2: заголовок', '3 В РЯД'),
    ('game.tutorial_2_text', 'game', 'Туториал шаг 2: текст', 'Собирай заказы, совмещая 3 и более предмета. Чем больше ряд, тем круче эффект!'),
    ('game.tutorial_3_title', 'game', 'Туториал шаг 3: заголовок', 'СПЕЦ-ЭФФЕКТЫ'),
    ('game.tutorial_3_text', 'game', 'Туториал шаг 3: текст', 'Каждый предмет имеет свои частицы: от хрустящих крошек до пузырьков капучино!'),
    ('game.tutorial_4_title', 'game', 'Туториал шаг 4: заголовок', 'СУПЕР-БОНУСЫ'),
    ('game.tutorial_4_text', 'game', 'Туториал шаг 4: текст', 'Складывай комбо, получай звание Шефа и набирай максимум очков!'),

    # === GAME - OVERLAY / HUD ===
    ('game.stat_collected', 'game', 'Лейбл "Собрано"', 'Собрано'),
    ('game.stat_moves', 'game', 'Лейбл "Ходы"', 'Ходы'),
    ('game.stat_score', 'game', 'Лейбл "Счёт"', 'Счёт'),
    ('game.game_over_title', 'game', 'Заголовок конца игры', 'Время вышло!'),
    ('game.btn_play_again', 'game', 'Кнопка "Играть снова"', 'Играть снова'),
    ('game.btn_next_level', 'game', 'Кнопка "Следующий уровень"', 'Следующий уровень'),
    ('game.btn_back_menu', 'game', 'Кнопка "В меню"', 'В меню'),
    ('game.btn_play', 'game', 'Кнопка "Продолжить игру"', 'Продолжить игру'),
    ('game.btn_login', 'game', 'Кнопка "Войти / Регистрация"', 'Войти / Регистрация'),

    # === RULES ===
    ('rules.title', 'rules', 'Заголовок экрана правил', 'Правила игры'),
    ('rules.how_to_play_title', 'rules', 'Секция: как играть', 'Как играть'),
    ('rules.rule_1', 'rules', 'Правило 1', 'Меняй местами соседние элементы, чтобы собрать 3 и более одинаковых в ряд'),
    ('rules.rule_2', 'rules', 'Правило 2', 'Совпавшие элементы исчезают, а сверху падают новые'),
    ('rules.rule_3', 'rules', 'Правило 3', 'Выполняй задание уровня до того, как закончатся ходы'),
    ('rules.prizes_intro', 'rules', 'Вступление к призам', 'Лучшие игроки по итогам акции получат призы от Rostic\'s! Рейтинг разделён на два региона — следи за своим местом.'),
    ('rules.moscow_prize_1_title', 'rules', 'Москва: приз 1-10 место (название)', 'Встреча с космонавтом'),
    ('rules.moscow_prize_1_text', 'rules', 'Москва: приз 1-10 место (описание)', 'Пригласительный билет на встречу с космонавтом А.И. Лавейкиным. Семейный билет: 1 взрослый + 1–2 ребёнка. Победитель также получает мерч-пакет.'),
    ('rules.moscow_prize_2_title', 'rules', 'Москва: приз 11-20 место (название)', 'Промокод на скидку'),
    ('rules.moscow_prize_2_text', 'rules', 'Москва: приз 11-20 место (описание)', 'Промокод на скидку в ресторанах Rostic\'s'),
    ('rules.region_prize_1_title', 'rules', 'Регионы: приз 1-10 место (название)', 'Повышенная скидка'),
    ('rules.region_prize_1_text', 'rules', 'Регионы: приз 1-10 место (описание)', 'Промокод с повышенной скидкой в ресторанах Rostic\'s'),
    ('rules.region_prize_2_title', 'rules', 'Регионы: приз 11-20 место (название)', 'Промокод на скидку'),
    ('rules.region_prize_2_text', 'rules', 'Регионы: приз 11-20 место (описание)', 'Промокод на скидку в ресторанах Rostic\'s'),

    # === QUEST ===
    ('quest.title', 'quest', 'Название квеста', 'Квест легенды космоса'),
    ('quest.description', 'quest', 'Описание квеста', 'Исследуйте Музей космонавтики, отгадывайте загадки у экспонатов и выигрывайте призы от ROSTIC\'S!'),
    ('quest.rule_1', 'quest', 'Правило 1', 'Прочитайте загадку на экране — она приведёт вас к нужному экспонату'),
    ('quest.rule_2', 'quest', 'Правило 2', 'Найдите QR-код рядом с экспонатом и отсканируйте его'),
    ('quest.rule_3', 'quest', 'Правило 3', 'За каждый верный скан — 10 баллов. Можно пропустить без штрафа'),
    ('quest.rule_4', 'quest', 'Правило 4', 'Наберите максимум баллов и получите промокод ROSTIC\'S!'),
    ('quest.prize_gold', 'quest', 'Приз Золото', 'Скидка 15% в ресторанах Rostic\'s'),
    ('quest.prize_silver', 'quest', 'Приз Серебро', 'Скидка 10% в ресторанах Rostic\'s'),
    ('quest.prize_bronze', 'quest', 'Приз Бронза', 'Пирожок за 1₽ в ресторанах Rostic\'s'),
    ('quest.btn_start', 'quest', 'Кнопка старта', 'Начать квест'),
    ('quest.btn_continue', 'quest', 'Кнопка продолжения', 'Продолжить квест'),
    ('quest.result_title', 'quest', 'Заголовок результата', 'КВЕСТ ЗАВЕРШЕН'),
    ('quest.result_no_prize', 'quest', 'Текст если нет приза', 'Вы отлично справились!'),
    ('quest.result_no_prize_hint', 'quest', 'Подсказка для набора баллов', 'Наберите 120 баллов или больше, чтобы получить промокод в ресторанах Rostic\'s'),
    ('quest.promo_hint', 'quest', 'Подсказка по промокоду', 'Используйте промокод в ресторанах Rostic\'s'),
    ('quest.btn_game', 'quest', 'Кнопка перехода в игру', 'Играть в Rostic\'s Легенды космоса'),
    ('quest.btn_back', 'quest', 'Кнопка возврата', 'Вернуться к квесту'),
    ('quest.copyright', 'quest', 'Копирайт квеста', '© Музей космонавтики, 2026  |  © Юнирест'),
    ('quest.btn_scan', 'quest', 'Кнопка сканирования', 'Сканировать QR'),
    ('quest.btn_skip', 'quest', 'Кнопка пропуска', 'Пропустить'),
    ('quest.skip_confirm_title', 'quest', 'Заголовок подтверждения пропуска', 'Пропустить загадку?'),
]


def upgrade():
    if not _table_exists('game_texts'):
        op.create_table(
            'game_texts',
            sa.Column('id', sa.Integer(), primary_key=True),
            sa.Column('key', sa.String(100), unique=True, nullable=False),
            sa.Column('section', sa.String(30), nullable=False),
            sa.Column('label', sa.String(200), nullable=False),
            sa.Column('value', sa.Text(), nullable=False),
            sa.Column('updated_at', sa.DateTime()),
        )
        op.create_index('ix_game_texts_key', 'game_texts', ['key'], unique=True)
        op.create_index('ix_game_texts_section', 'game_texts', ['section'])

    # Seed default texts (skip if already populated)
    conn = op.get_bind()
    count = conn.execute(text("SELECT COUNT(*) FROM game_texts")).scalar()
    if count == 0:
        for key, section, label, value in DEFAULT_TEXTS:
            conn.execute(text(
                "INSERT INTO game_texts (key, section, label, value) "
                "VALUES (:key, :section, :label, :value)"
            ), {'key': key, 'section': section, 'label': label, 'value': value})


def downgrade():
    op.drop_table('game_texts')
