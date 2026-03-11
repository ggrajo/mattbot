"""Unit tests for core/encryption.py"""

import os

import pytest

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
    plaintext = b"test"
    ct, nonce, kv = encrypt_field(plaintext)
    with pytest.raises(Exception):  # noqa: B017
        decrypt_field(ct + b"x", nonce, kv)


def test_decrypt_with_tampered_nonce():
    plaintext = b"secret"
    ct, nonce, kv = encrypt_field(plaintext)
    bad_nonce = bytes([b ^ 0xFF for b in nonce])
    with pytest.raises(Exception):  # noqa: B017
        decrypt_field(ct, bad_nonce, kv)


def test_decrypt_with_bit_flipped_ciphertext():
    plaintext = b"sensitive"
    ct, nonce, kv = encrypt_field(plaintext)
    flipped = bytearray(ct)
    flipped[0] ^= 0x01
    with pytest.raises(Exception):  # noqa: B017
        decrypt_field(bytes(flipped), nonce, kv)


def test_encrypt_empty_plaintext():
    ct, nonce, kv = encrypt_field(b"")
    decrypted = decrypt_field(ct, nonce, kv)
    assert decrypted == b""


def test_encrypt_long_plaintext():
    plaintext = os.urandom(10_000)
    ct, nonce, kv = encrypt_field(plaintext)
    decrypted = decrypt_field(ct, nonce, kv)
    assert decrypted == plaintext
