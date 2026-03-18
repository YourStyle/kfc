"""Add match3_prizes table and category to promo_code_pools

Revision ID: 011_match3_prizes
Revises: 010_frozen_levels
Create Date: 2026-03-03
"""
from alembic import op
from sqlalchemy import text

revision = '011_match3_prizes'
down_revision = '010_frozen_levels'
branch_labels = None
depends_on = None


def upgrade():
    # Add category column to promo_code_pools (quest | match3)
    op.execute(text("""
        ALTER TABLE promo_code_pools
        ADD COLUMN IF NOT EXISTS category VARCHAR(20) NOT NULL DEFAULT 'quest'
    """))

    # Create match3_prizes tracking table
    op.execute(text("""
        CREATE TABLE IF NOT EXISTS match3_prizes (
            id SERIAL PRIMARY KEY,
            user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
            region VARCHAR(20) NOT NULL,
            rank INTEGER NOT NULL,
            tier VARCHAR(50) NOT NULL,
            prize_description TEXT,
            code VARCHAR(100),
            email_sent_at TIMESTAMP,
            created_at TIMESTAMP NOT NULL DEFAULT NOW()
        )
    """))

    op.execute(text("CREATE INDEX IF NOT EXISTS ix_match3_prizes_user_id ON match3_prizes(user_id)"))


def downgrade():
    op.execute(text("DROP TABLE IF EXISTS match3_prizes"))
    op.execute(text("ALTER TABLE promo_code_pools DROP COLUMN IF EXISTS category"))
