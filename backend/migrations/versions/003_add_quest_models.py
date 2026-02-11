"""Add quest models, promo codes, and user source tracking

Revision ID: 003_quest_models
Revises: e0ab3c659401
Create Date: 2026-02-06

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy import text

revision = '003_quest_models'
down_revision = 'e0ab3c659401'
branch_labels = None
depends_on = None


def _column_exists(table, column):
    """Check if a column already exists in a table."""
    conn = op.get_bind()
    result = conn.execute(text(
        "SELECT 1 FROM information_schema.columns "
        "WHERE table_name = :table AND column_name = :column"
    ), {'table': table, 'column': column})
    return result.fetchone() is not None


def _table_exists(table):
    """Check if a table already exists."""
    conn = op.get_bind()
    result = conn.execute(text(
        "SELECT 1 FROM information_schema.tables "
        "WHERE table_name = :table AND table_schema = 'public'"
    ), {'table': table})
    return result.fetchone() is not None


def _index_exists(index_name):
    """Check if an index already exists."""
    conn = op.get_bind()
    result = conn.execute(text(
        "SELECT 1 FROM pg_indexes WHERE indexname = :name"
    ), {'name': index_name})
    return result.fetchone() is not None


def upgrade():
    # === Add new columns to users table ===
    if not _column_exists('users', 'registration_source'):
        op.add_column('users', sa.Column('registration_source', sa.String(length=20), server_default='game', nullable=True))
    if not _column_exists('users', 'quest_score'):
        op.add_column('users', sa.Column('quest_score', sa.Integer(), server_default='0', nullable=True))
    if not _index_exists('ix_users_registration_source'):
        op.create_index('ix_users_registration_source', 'users', ['registration_source'], unique=False)

    # === Add role column to admin_users table ===
    if not _column_exists('admin_users', 'role'):
        op.add_column('admin_users', sa.Column('role', sa.String(length=20), server_default='superadmin', nullable=True))

    # === Create quest_pages table ===
    if not _table_exists('quest_pages'):
        op.create_table('quest_pages',
            sa.Column('id', sa.Integer(), nullable=False),
            sa.Column('slug', sa.String(length=50), nullable=False),
            sa.Column('order', sa.Integer(), nullable=False, server_default='0'),
            sa.Column('title', sa.String(length=200), nullable=False),
            sa.Column('riddle_text', sa.Text(), nullable=False),
            sa.Column('fact_text', sa.Text(), nullable=True),
            sa.Column('image_url', sa.String(length=500), nullable=True),
            sa.Column('qr_token', sa.String(length=100), nullable=False),
            sa.Column('points', sa.Integer(), server_default='10', nullable=True),
            sa.Column('is_active', sa.Boolean(), server_default='true', nullable=True),
            sa.Column('created_at', sa.DateTime(), nullable=True),
            sa.Column('updated_at', sa.DateTime(), nullable=True),
            sa.PrimaryKeyConstraint('id'),
            sa.UniqueConstraint('slug'),
            sa.UniqueConstraint('qr_token'),
        )
    if not _index_exists('ix_quest_pages_slug'):
        op.create_index('ix_quest_pages_slug', 'quest_pages', ['slug'], unique=True)
    if not _index_exists('ix_quest_pages_qr_token'):
        op.create_index('ix_quest_pages_qr_token', 'quest_pages', ['qr_token'], unique=True)

    # === Create quest_progress table ===
    if not _table_exists('quest_progress'):
        op.create_table('quest_progress',
            sa.Column('id', sa.Integer(), nullable=False),
            sa.Column('user_id', sa.Integer(), nullable=False),
            sa.Column('quest_page_id', sa.Integer(), nullable=False),
            sa.Column('is_correct', sa.Boolean(), server_default='false', nullable=True),
            sa.Column('is_skipped', sa.Boolean(), server_default='false', nullable=True),
            sa.Column('points_earned', sa.Integer(), server_default='0', nullable=True),
            sa.Column('scanned_at', sa.DateTime(), nullable=True),
            sa.ForeignKeyConstraint(['quest_page_id'], ['quest_pages.id'], ondelete='CASCADE'),
            sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
            sa.PrimaryKeyConstraint('id'),
            sa.UniqueConstraint('user_id', 'quest_page_id', name='uq_user_quest_page'),
        )
    if not _index_exists('ix_quest_progress_user_id'):
        op.create_index('ix_quest_progress_user_id', 'quest_progress', ['user_id'], unique=False)

    # === Create promo_code_pools table ===
    if not _table_exists('promo_code_pools'):
        op.create_table('promo_code_pools',
            sa.Column('id', sa.Integer(), nullable=False),
            sa.Column('name', sa.String(length=100), nullable=False),
            sa.Column('tier', sa.String(length=20), nullable=False),
            sa.Column('min_score', sa.Integer(), nullable=False),
            sa.Column('discount_label', sa.String(length=200), nullable=True),
            sa.Column('total_codes', sa.Integer(), server_default='0', nullable=True),
            sa.Column('used_codes', sa.Integer(), server_default='0', nullable=True),
            sa.Column('alert_threshold', sa.Integer(), server_default='10', nullable=True),
            sa.Column('is_active', sa.Boolean(), server_default='true', nullable=True),
            sa.Column('created_at', sa.DateTime(), nullable=True),
            sa.PrimaryKeyConstraint('id'),
        )

    # === Create promo_codes table ===
    if not _table_exists('promo_codes'):
        op.create_table('promo_codes',
            sa.Column('id', sa.Integer(), nullable=False),
            sa.Column('pool_id', sa.Integer(), nullable=False),
            sa.Column('code', sa.String(length=50), nullable=False),
            sa.Column('is_used', sa.Boolean(), server_default='false', nullable=True),
            sa.Column('used_by_user_id', sa.Integer(), nullable=True),
            sa.Column('used_at', sa.DateTime(), nullable=True),
            sa.Column('created_at', sa.DateTime(), nullable=True),
            sa.ForeignKeyConstraint(['pool_id'], ['promo_code_pools.id'], ondelete='CASCADE'),
            sa.ForeignKeyConstraint(['used_by_user_id'], ['users.id'], ondelete='SET NULL'),
            sa.PrimaryKeyConstraint('id'),
            sa.UniqueConstraint('code'),
        )
    if not _index_exists('ix_promo_codes_pool_id'):
        op.create_index('ix_promo_codes_pool_id', 'promo_codes', ['pool_id'], unique=False)
    if not _index_exists('ix_promo_codes_code'):
        op.create_index('ix_promo_codes_code', 'promo_codes', ['code'], unique=True)

    # === Seed data (only if tables are empty) ===
    conn = op.get_bind()
    count = conn.execute(text("SELECT count(*) FROM quest_pages")).scalar()
    if count == 0:
        op.execute("""
            INSERT INTO quest_pages (slug, "order", title, riddle_text, fact_text, image_url, qr_token, points, is_active)
            VALUES
            ('hall-1', 1, 'Зал 1: Начало космической эры',
             'Найдите экспонат, посвящённый первому искусственному спутнику Земли. Он изменил мир навсегда — маленький шар с четырьмя антеннами, запущенный 4 октября 1957 года.',
             'Спутник-1 весил всего 83,6 кг и передавал радиосигнал «бип-бип» в течение 21 дня.',
             '/images/quest/placeholder.png', 'quest-hall-1', 10, true),
            ('hall-2', 2, 'Зал 2: Первые полёты',
             'Отыщите скафандр первого человека, побывавшего в открытом космосе. Этот подвиг был совершён 18 марта 1965 года.',
             'Алексей Леонов провёл в открытом космосе 12 минут 9 секунд. Его скафандр раздулся и он с трудом вернулся в шлюз.',
             '/images/quest/placeholder.png', 'quest-hall-2', 10, true),
            ('hall-3', 3, 'Зал 3: Луна и планеты',
             'Найдите макет лунохода — первого в мире автоматического самоходного аппарата, успешно работавшего на поверхности другого небесного тела.',
             'Луноход-1 проработал на Луне 301 сутки и прошёл 10 540 метров, передав на Землю более 20 000 снимков.',
             '/images/quest/placeholder.png', 'quest-hall-3', 10, true),
            ('hall-4', 4, 'Зал 4: Орбитальные станции',
             'Отыщите модель орбитальной станции «Мир» — символа международного сотрудничества в космосе.',
             'Станция «Мир» находилась на орбите 15 лет (1986-2001). На ней побывали 104 космонавта из 12 стран.',
             '/images/quest/placeholder.png', 'quest-hall-4', 10, true),
            ('hall-5', 5, 'Зал 5: Современная космонавтика',
             'Найдите экспонат, посвящённый Международной космической станции — самому большому объекту, когда-либо собранному в космосе.',
             'МКС весит около 420 тонн и облетает Землю за 90 минут на высоте около 400 км.',
             '/images/quest/placeholder.png', 'quest-hall-5', 10, true)
        """)

    pool_count = conn.execute(text("SELECT count(*) FROM promo_code_pools")).scalar()
    if pool_count == 0:
        op.execute("""
            INSERT INTO promo_code_pools (name, tier, min_score, discount_label, total_codes, used_codes, alert_threshold, is_active)
            VALUES
            ('Скидка 15% на всё меню', 'gold', 50, 'Промокод на скидку 15% — все загадки верно!', 0, 0, 10, true),
            ('Скидка 10%', 'silver', 40, 'Промокод на скидку 10%', 0, 0, 10, true),
            ('Пирожок за 1₽', 'bronze', 30, 'Пирожок за 1₽', 0, 0, 10, true)
        """)


def downgrade():
    op.drop_table('promo_codes')
    op.drop_table('promo_code_pools')
    op.drop_table('quest_progress')
    op.drop_table('quest_pages')

    with op.batch_alter_table('admin_users', schema=None) as batch_op:
        batch_op.drop_column('role')

    with op.batch_alter_table('users', schema=None) as batch_op:
        batch_op.drop_index('ix_users_registration_source')
        batch_op.drop_column('quest_score')
        batch_op.drop_column('registration_source')
