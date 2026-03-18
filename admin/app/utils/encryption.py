"""
Field-level encryption for sensitive data (ФЗ-152, п.6.3).
Mirror of backend/app/utils/encryption.py for admin panel.
"""
import hashlib
import os

from cryptography.fernet import Fernet, InvalidToken
from sqlalchemy import Text
from sqlalchemy.types import TypeDecorator


def _get_fernet():
    key = os.environ.get('ENCRYPTION_KEY')
    if not key:
        return None
    return Fernet(key.encode() if isinstance(key, str) else key)


def encrypt(value: str) -> str:
    if not value:
        return value
    f = _get_fernet()
    if not f:
        return value
    return f.encrypt(value.encode('utf-8')).decode('utf-8')


def decrypt(value: str) -> str:
    if not value:
        return value
    f = _get_fernet()
    if not f:
        return value
    try:
        return f.decrypt(value.encode('utf-8')).decode('utf-8')
    except InvalidToken:
        return value


def compute_hash(value: str) -> str:
    if not value:
        return ''
    pepper = os.environ.get('HASH_PEPPER', '')
    return hashlib.sha256(f"{pepper}{value.lower().strip()}".encode('utf-8')).hexdigest()


class EncryptedString(TypeDecorator):
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
