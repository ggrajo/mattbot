"""Unit tests for core/security.py"""


from app.core.security import (
    constant_time_compare,
    generate_otp,
    generate_recovery_codes,
    generate_token,
    generate_totp_secret,
    get_totp_uri,
    hash_password,
    hash_token,
    is_common_password,
    verify_password,
    verify_totp,
)


def test_hash_and_verify_password():
    pw = "MySecurePassword123"
    hashed = hash_password(pw)
    assert hashed != pw
    assert verify_password(pw, hashed)


def test_verify_wrong_password():
    hashed = hash_password("correct_password")
    assert not verify_password("wrong_password", hashed)


def test_hash_token():
    token = "some-token-value"
    h = hash_token(token)
    assert len(h) == 64
    assert h == hash_token(token)


def test_generate_token():
    t1 = generate_token()
    t2 = generate_token()
    assert t1 != t2
    assert len(t1) > 20


def test_constant_time_compare():
    assert constant_time_compare("abc", "abc")
    assert not constant_time_compare("abc", "def")


def test_common_password_check():
    assert is_common_password("password")
    assert is_common_password("PASSWORD")
    assert not is_common_password("xK9!mQ2pL7zR")


def test_totp_generation_and_verification():
    secret = generate_totp_secret()
    assert len(secret) > 10

    import pyotp
    totp = pyotp.TOTP(secret)
    code = totp.now()
    assert verify_totp(secret, code)
    assert not verify_totp(secret, "000000")


def test_totp_uri():
    secret = generate_totp_secret()
    uri = get_totp_uri(secret, "user@example.com")
    assert "otpauth://totp/" in uri
    assert "MattBot" in uri


def test_recovery_codes_generation():
    codes = generate_recovery_codes(10)
    assert len(codes) == 10
    for code in codes:
        assert "-" in code
        assert len(code) == 9
    assert len(set(codes)) == 10


def test_otp_generation():
    otp = generate_otp(6)
    assert len(otp) == 6
    assert otp.isdigit()
