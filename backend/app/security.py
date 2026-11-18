"""Security utilities — password hashing, JWT tokens, Fernet encryption."""

import hashlib
import base64
from datetime import datetime, timedelta
from typing import Optional

from passlib.context import CryptContext
from jose import jwt, JWTError
from cryptography.fernet import Fernet

from app.config import settings

# ---------------------------------------------------------------------------
# Password hashing
# ---------------------------------------------------------------------------
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)


# ---------------------------------------------------------------------------
# JWT tokens
# ---------------------------------------------------------------------------
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_HOURS = 24


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(hours=ACCESS_TOKEN_EXPIRE_HOURS))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=ALGORITHM)


def decode_access_token(token: str) -> Optional[dict]:
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except JWTError:
        return None


# ---------------------------------------------------------------------------
# Fernet encryption for OAuth tokens
# ---------------------------------------------------------------------------
def _derive_fernet_key(secret: str) -> bytes:
    """Derive a 32-byte URL-safe base64 key from the app SECRET_KEY."""
    digest = hashlib.sha256(secret.encode()).digest()
    return base64.urlsafe_b64encode(digest)


def get_fernet() -> Fernet:
    return Fernet(_derive_fernet_key(settings.SECRET_KEY))


def encrypt_token(plaintext: str) -> str:
    return get_fernet().encrypt(plaintext.encode()).decode()


def decrypt_token(ciphertext: str) -> str:
    return get_fernet().decrypt(ciphertext.encode()).decode()
