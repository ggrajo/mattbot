import hashlib
import hmac
import secrets
import string
from pathlib import Path

import argon2
import pyotp

_ph = argon2.PasswordHasher(time_cost=3, memory_cost=65536, parallelism=4, type=argon2.Type.ID)

_COMMON_PASSWORDS: set[str] | None = None


def _load_common_passwords() -> set[str]:
    global _COMMON_PASSWORDS
    if _COMMON_PASSWORDS is None:
        pw_path = Path(__file__).resolve().parent.parent.parent / "data" / "common_passwords.txt"
        if pw_path.exists():
            _COMMON_PASSWORDS = {
                line.strip().lower() for line in pw_path.read_text().splitlines() if line.strip()
            }
        else:
            _COMMON_PASSWORDS = set()
    return _COMMON_PASSWORDS


def hash_password(password: str) -> str:
    return _ph.hash(password)


def verify_password(password: str, password_hash: str) -> bool:
    try:
        return _ph.verify(password_hash, password)
    except argon2.exceptions.VerifyMismatchError:
        return False


def check_needs_rehash(password_hash: str) -> bool:
    return _ph.check_needs_rehash(password_hash)


def is_common_password(password: str) -> bool:
    return password.strip().lower() in _load_common_passwords()


def generate_token(nbytes: int = 32) -> str:
    return secrets.token_urlsafe(nbytes)


def hash_token(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def constant_time_compare(a: str, b: str) -> bool:
    return hmac.compare_digest(a.encode("utf-8"), b.encode("utf-8"))


def generate_totp_secret() -> str:
    return pyotp.random_base32()


def get_totp_uri(secret: str, email: str, issuer: str = "MattBot") -> str:
    totp = pyotp.TOTP(secret)
    return totp.provisioning_uri(name=email, issuer_name=issuer)


def verify_totp(secret: str, code: str) -> bool:
    totp = pyotp.TOTP(secret)
    return totp.verify(code, valid_window=1)


def generate_recovery_codes(count: int = 10) -> list[str]:
    alphabet = string.ascii_uppercase + string.digits
    alphabet = alphabet.replace("O", "").replace("0", "").replace("I", "").replace("1", "")
    codes: list[str] = []
    for _ in range(count):
        part1 = "".join(secrets.choice(alphabet) for _ in range(4))
        part2 = "".join(secrets.choice(alphabet) for _ in range(4))
        codes.append(f"{part1}-{part2}")
    return codes


def generate_otp(length: int = 6) -> str:
    return "".join(str(secrets.randbelow(10)) for _ in range(length))
