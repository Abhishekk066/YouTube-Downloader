import base64
import json
import os

from Crypto.Cipher import AES
from Crypto.Hash import MD5


def _evp_kdf(
    password: bytes, salt: bytes, key_size: int = 32, iv_size: int = 16
) -> tuple[bytes, bytes]:
    d, d_i = b"", b""
    while len(d) < key_size + iv_size:
        d_i = MD5.new(d_i + password + salt).digest()
        d += d_i
    return d[:key_size], d[key_size : key_size + iv_size]


def encrypt_response(data, key: str) -> str:
    salt = os.urandom(8)
    key_bytes, iv = _evp_kdf(key.encode("utf-8"), salt)
    cipher = AES.new(key_bytes, AES.MODE_CBC, iv)
    plaintext = json.dumps(data, ensure_ascii=False).encode("utf-8")

    pad = 16 - len(plaintext) % 16
    plaintext += bytes([pad] * pad)
    encrypted = b"Salted__" + salt + cipher.encrypt(plaintext)
    return base64.b64encode(encrypted).decode("utf-8")
