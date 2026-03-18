"""Add encryption hash columns and make user_activities.user_id nullable.

Adds email_hash to users, code_hash to promo_codes for blind-index lookups.
Changes user_activities.user_id to nullable for anonymous event logging.
Encrypts existing sensitive data.

Revision ID: 012_encrypt_sensitive_fields
Revises: 011_match3_prizes
Create Date: 2026-03-10
"""
from alembic import op
import sqlalchemy as sa
import hashlib
import os

revision = '012_encrypt_sensitive_fields'
down_revision = '011_match3_prizes'
branch_labels = None
depends_on = None


def _compute_hash(value):
    """Compute SHA-256 hash for blind index."""
    if not value:
        return ''
    pepper = os.environ.get('HASH_PEPPER', '')
    return hashlib.sha256(f"{pepper}{value.lower().strip()}".encode('utf-8')).hexdigest()


def upgrade():
    # 1. Add hash columns (nullable first)
    op.add_column('users', sa.Column('email_hash', sa.String(64), nullable=True))
    op.add_column('promo_codes', sa.Column('code_hash', sa.String(64), nullable=True))

    # 2. Make user_activities.user_id nullable (for anonymous events like login_failed)
    op.alter_column('user_activities', 'user_id', existing_type=sa.Integer(), nullable=True)

    # 3. Widen columns to Text BEFORE encryption (encrypted strings are much longer)
    op.alter_column('users', 'email', type_=sa.Text(), existing_type=sa.String(255))
    op.alter_column('users', 'verification_code', type_=sa.Text(), existing_type=sa.String(6))
    op.alter_column('promo_codes', 'code', type_=sa.Text(), existing_type=sa.String(50))
    op.alter_column('user_activities', 'ip_address', type_=sa.Text(), existing_type=sa.String(45))
    op.alter_column('user_activities', 'user_agent', type_=sa.Text(), existing_type=sa.Text())
    op.alter_column('landing_visits', 'ip_address', type_=sa.Text(), existing_type=sa.String(45))
    op.alter_column('landing_visits', 'user_agent', type_=sa.Text(), existing_type=sa.String(512))
    op.alter_column('match3_prizes', 'code', type_=sa.Text(), existing_type=sa.String(100))

    # 4. Populate hash columns from existing plaintext data
    conn = op.get_bind()
    users = conn.execute(sa.text("SELECT id, email FROM users")).fetchall()
    for user in users:
        email_val = user.email
        if email_val and email_val.startswith('gAAAA'):
            continue
        conn.execute(
            sa.text("UPDATE users SET email_hash = :hash WHERE id = :id"),
            {'hash': _compute_hash(email_val), 'id': user.id}
        )

    codes = conn.execute(sa.text("SELECT id, code FROM promo_codes")).fetchall()
    for code_row in codes:
        code_val = code_row.code
        if code_val and code_val.startswith('gAAAA'):
            continue
        conn.execute(
            sa.text("UPDATE promo_codes SET code_hash = :hash WHERE id = :id"),
            {'hash': _compute_hash(code_val), 'id': code_row.id}
        )

    # 5. Encrypt existing data if ENCRYPTION_KEY is set
    encryption_key = os.environ.get('ENCRYPTION_KEY')
    if encryption_key:
        from cryptography.fernet import Fernet
        f = Fernet(encryption_key.encode() if isinstance(encryption_key, str) else encryption_key)

        def enc(val):
            if not val:
                return val
            return f.encrypt(val.encode('utf-8')).decode('utf-8')

        # Encrypt emails
        for user in users:
            if user.email and user.email.startswith('gAAAA'):
                continue
            conn.execute(
                sa.text("UPDATE users SET email = :email WHERE id = :id"),
                {'email': enc(user.email) if user.email else user.email, 'id': user.id}
            )

        # Encrypt verification codes
        vcodes = conn.execute(sa.text(
            "SELECT id, verification_code FROM users WHERE verification_code IS NOT NULL"
        )).fetchall()
        for vc in vcodes:
            if vc.verification_code and vc.verification_code.startswith('gAAAA'):
                continue
            conn.execute(
                sa.text("UPDATE users SET verification_code = :vc WHERE id = :id"),
                {'vc': enc(vc.verification_code), 'id': vc.id}
            )

        # Encrypt promo codes
        for code_row in codes:
            if code_row.code and code_row.code.startswith('gAAAA'):
                continue
            conn.execute(
                sa.text("UPDATE promo_codes SET code = :code WHERE id = :id"),
                {'code': enc(code_row.code) if code_row.code else code_row.code, 'id': code_row.id}
            )

        # Encrypt user_activities IP and user_agent
        activities = conn.execute(sa.text("SELECT id, ip_address, user_agent FROM user_activities")).fetchall()
        for act in activities:
            ip = act.ip_address
            ua = act.user_agent
            if ip and ip.startswith('gAAAA'):
                ip = None  # already encrypted, skip
            if ua and ua.startswith('gAAAA'):
                ua = None
            updates = {'id': act.id}
            set_parts = []
            if ip is not None:
                set_parts.append("ip_address = :ip")
                updates['ip'] = enc(ip) if ip else ip
            if ua is not None:
                set_parts.append("user_agent = :ua")
                updates['ua'] = enc(ua) if ua else ua
            if set_parts:
                conn.execute(sa.text(f"UPDATE user_activities SET {', '.join(set_parts)} WHERE id = :id"), updates)

        # Encrypt landing_visits IP and user_agent
        visits = conn.execute(sa.text("SELECT id, ip_address, user_agent FROM landing_visits")).fetchall()
        for visit in visits:
            ip = visit.ip_address
            ua = visit.user_agent
            if (ip and ip.startswith('gAAAA')):
                ip = None
            if (ua and ua.startswith('gAAAA')):
                ua = None
            updates = {'id': visit.id}
            set_parts = []
            if ip is not None:
                set_parts.append("ip_address = :ip")
                updates['ip'] = enc(ip) if ip else ip
            if ua is not None:
                set_parts.append("user_agent = :ua")
                updates['ua'] = enc(ua) if ua else ua
            if set_parts:
                conn.execute(sa.text(f"UPDATE landing_visits SET {', '.join(set_parts)} WHERE id = :id"), updates)

        # Encrypt match3_prizes codes
        prizes = conn.execute(sa.text("SELECT id, code FROM match3_prizes WHERE code IS NOT NULL")).fetchall()
        for prize in prizes:
            if prize.code and prize.code.startswith('gAAAA'):
                continue
            conn.execute(
                sa.text("UPDATE match3_prizes SET code = :code WHERE id = :id"),
                {'code': enc(prize.code), 'id': prize.id}
            )

    # 6. Make hash columns NOT NULL and add indexes
    op.alter_column('users', 'email_hash', nullable=False)
    op.alter_column('promo_codes', 'code_hash', nullable=False)
    op.create_index('ix_users_email_hash', 'users', ['email_hash'], unique=True)
    op.create_index('ix_promo_codes_code_hash', 'promo_codes', ['code_hash'], unique=True)

    # 7. Drop old unique constraint/index on email and code (constraint before index!)
    conn.execute(sa.text("ALTER TABLE users DROP CONSTRAINT IF EXISTS users_email_key"))
    conn.execute(sa.text("DROP INDEX IF EXISTS idx_users_email"))
    conn.execute(sa.text("DROP INDEX IF EXISTS ix_users_email"))
    conn.execute(sa.text("ALTER TABLE promo_codes DROP CONSTRAINT IF EXISTS promo_codes_code_key"))


def downgrade():
    op.alter_column('users', 'email', type_=sa.String(255), existing_type=sa.Text())
    op.alter_column('users', 'verification_code', type_=sa.String(6), existing_type=sa.Text())
    op.alter_column('promo_codes', 'code', type_=sa.String(50), existing_type=sa.Text())
    op.alter_column('user_activities', 'ip_address', type_=sa.String(45), existing_type=sa.Text())
    op.alter_column('landing_visits', 'ip_address', type_=sa.String(45), existing_type=sa.Text())
    op.alter_column('landing_visits', 'user_agent', type_=sa.String(512), existing_type=sa.Text())
    op.alter_column('match3_prizes', 'code', type_=sa.String(100), existing_type=sa.Text())

    op.create_index('idx_users_email', 'users', ['email'], unique=True)
    op.create_unique_constraint('users_email_key', 'users', ['email'])
    op.create_unique_constraint('promo_codes_code_key', 'promo_codes', ['code'])

    op.drop_index('ix_promo_codes_code_hash', table_name='promo_codes')
    op.drop_column('promo_codes', 'code_hash')
    op.drop_index('ix_users_email_hash', table_name='users')
    op.drop_column('users', 'email_hash')

    op.alter_column('user_activities', 'user_id', existing_type=sa.Integer(), nullable=False)
