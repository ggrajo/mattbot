"""Unit tests for core/encryption.py"""

from app.core.encryption import decrypt_field, encrypt_field


def test_encrypt_decrypt_roundtrip():
    plaintext = b"my-totp-secret-key"
    ciphertext, nonce, key_version = encrypt_field(plaintext)

    assert ciphertext != plaintext
    assert len(nonce) == 12
    assert key_version == 1

    decrypted = decrypt_field(ciphertext, nonce, key_version)
    assert decrypted == plaintext


def test_different_nonces():
    plaintext = b"same-data"
    ct1, n1, _ = encrypt_field(plaintext)
    ct2, n2, _ = encrypt_field(plaintext)
    assert n1 != n2
    assert ct1 != ct2


def test_decrypt_with_wrong_data():
    import pytest
    plaintext = b"test"
    ct, nonce, kv = encrypt_field(plaintext)
    with pytest.raises(Exception):
        decrypt_field(ct + b"x", nonce, kv)
