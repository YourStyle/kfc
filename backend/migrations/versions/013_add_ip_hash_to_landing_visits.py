"""Add ip_hash column to landing_visits for unique visitor counting.

Encrypted ip_address produces different ciphertext each time (Fernet random IV),
so COUNT(DISTINCT ip_address) always equals COUNT(*). Adding ip_hash (a blind
index via SHA-256) allows correct uniqueness queries.

Revision ID: 013_add_ip_hash_to_landing_visits
Revises: 012_encrypt_sensitive_fields
Create Date: 2026-03-20
"""
from alembic import op
import sqlalchemy as sa
import hashlib
import os

revision = '013_add_ip_hash_to_landing_visits'
down_revision = '012_encrypt_sensitive_fields'
branch_labels = None
depends_on = None


def _compute_hash(value):
    """Compute SHA-256 hash for blind index."""
    if not value:
        return None
    pepper = os.environ.get('HASH_PEPPER', '')
    return hashlib.sha256(f"{pepper}{value.lower().strip()}".encode('utf-8')).hexdigest()


def _decrypt(value):
    """Try to decrypt a Fernet-encrypted value. Returns plaintext or None."""
    if not value:
        return None
    try:
        from cryptography.fernet import Fernet
        key = os.environ.get('ENCRYPTION_KEY', '')
        if not key:
            return None
        f = Fernet(key.encode() if isinstance(key, str) else key)
        return f.decrypt(value.encode() if isinstance(value, str) else value).decode('utf-8')
    except Exception:
        return value  # Might already be plaintext (pre-encryption data)


def upgrade():
    # Add ip_hash column
    op.add_column('landing_visits', sa.Column('ip_hash', sa.String(64), index=True))

    # Backfill ip_hash from encrypted ip_address
    conn = op.get_bind()
    visits = conn.execute(sa.text('SELECT id, ip_address FROM landing_visits WHERE ip_address IS NOT NULL'))
    for row in visits:
        plaintext_ip = _decrypt(row[1])
        if plaintext_ip:
            ip_hash = _compute_hash(plaintext_ip)
            conn.execute(
                sa.text('UPDATE landing_visits SET ip_hash = :hash WHERE id = :id'),
                {'hash': ip_hash, 'id': row[0]}
            )


def downgrade():
    op.drop_column('landing_visits', 'ip_hash')
