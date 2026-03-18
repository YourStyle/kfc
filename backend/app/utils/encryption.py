"""
Field-level encryption for sensitive data (ФЗ-152, п.6.3).

Uses Fernet (AES-128-CBC + HMAC-SHA256) for symmetric encryption.
Key is loaded from ENCRYPTION_KEY environment variable.
Provides EncryptedString SQLAlchemy TypeDecorator for transparent encrypt/decrypt.
"""
import hashlib
import os

from cryptography.fernet import Fernet, InvalidToken
from sqlalchemy import Text
from sqlalchemy.types import TypeDecorator


def _get_fernet():
    """Get Fernet instance from environment key."""
    key = os.environ.get('ENCRYPTION_KEY')
    if not key:
        return None
    return Fernet(key.encode() if isinstance(key, str) else key)


def encrypt(value: str) -> str:
    """Encrypt a string value. Returns plaintext if no key configured."""
    if not value:
        return value
    f = _get_fernet()
    if not f:
        return value
    return f.encrypt(value.encode('utf-8')).decode('utf-8')


def decrypt(value: str) -> str:
    """Decrypt a string value. Handles plaintext gracefully (migration period)."""
    if not value:
        return value
    f = _get_fernet()
    if not f:
        return value
    try:
        return f.decrypt(value.encode('utf-8')).decode('utf-8')
    except InvalidToken:
        # Not encrypted yet (legacy data) — return as-is
        return value


def compute_hash(value: str) -> str:
    """Compute SHA-256 hash for blind index lookups."""
    if not value:
        return ''
    # Use a pepper from env for extra security
    pepper = os.environ.get('HASH_PEPPER', '')
    return hashlib.sha256(f"{pepper}{value.lower().strip()}".encode('utf-8')).hexdigest()


def generate_encryption_key() -> str:
    """Generate a new Fernet key. Run once, store in .env."""
    return Fernet.generate_key().decode('utf-8')


class EncryptedString(TypeDecorator):
    """SQLAlchemy column type that transparently encrypts/decrypts string values.

    Usage:
        email = db.Column(EncryptedString(), nullable=False)
    """
    impl = Text
    cache_ok = True

    def process_bind_param(self, value, dialect):
        if value is None:
            return None
        return encrypt(str(value))

    def process_result_value(self, value, dialect):
        if value is None:
            return None
        return decrypt(value)
