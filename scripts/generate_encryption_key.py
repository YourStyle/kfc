#!/usr/bin/env python3
"""Generate ENCRYPTION_KEY and HASH_PEPPER for .env file.

Run once before first deploy with encryption enabled:
    python scripts/generate_encryption_key.py

Add the output to your .env file on the server.
"""
import secrets
from cryptography.fernet import Fernet

encryption_key = Fernet.generate_key().decode('utf-8')
hash_pepper = secrets.token_hex(32)

print("# Add these to your .env file:")
print(f"ENCRYPTION_KEY={encryption_key}")
print(f"HASH_PEPPER={hash_pepper}")
