"""Envelope encryption for sensitive fields (TOTP secrets).

Uses AES-256-GCM with per-record random nonces.
Master key is derived from the ENCRYPTION_MASTER_KEY env var.
key_version tracks rotation.
"""

import os

from cryptography.hazmat.primitives.ciphers.aead import AESGCM

from app.config import settings

_KEY_VERSION = 1


def _get_master_key() -> bytes:
    raw = settings.ENCRYPTION_MASTER_KEY
    key_bytes = bytes.fromhex(raw) if len(raw) == 64 else raw.encode("utf-8")[:32].ljust(32, b"\0")
    if len(key_bytes) != 32:
        raise ValueError("ENCRYPTION_MASTER_KEY must be 32 bytes (64 hex chars)")
    return key_bytes


def encrypt_field(plaintext: bytes) -> tuple[bytes, bytes, int]:
    """Returns (ciphertext, nonce, key_version)."""
    key = _get_master_key()
    nonce = os.urandom(12)
    aesgcm = AESGCM(key)
    ciphertext = aesgcm.encrypt(nonce, plaintext, None)
    return ciphertext, nonce, _KEY_VERSION


def decrypt_field(ciphertext: bytes, nonce: bytes, key_version: int) -> bytes:
    """Decrypt a field. key_version used for future rotation support."""
    _ = key_version
    key = _get_master_key()
    aesgcm = AESGCM(key)
    return aesgcm.decrypt(nonce, ciphertext, None)
