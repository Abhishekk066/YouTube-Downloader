from functools import lru_cache
from typing import Literal

from pydantic import model_validator
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    ENV: Literal["development", "production"] = "development"


    DEFAULT_SECRET_KEY: str = "ytconverter2024"


    DOWNLOAD_DIR: str = "downloads"
    MAX_FILE_AGE_HOURS: int = 1


    RATE_LIMIT_PER_MINUTE: int = 30


    FFMPEG_BIN: str = "ffmpeg"


    HOST: str = "0.0.0.0"
    PORT: int = 3000
    WORKERS: int = 1
    DEBUG: bool = False


    ALLOWED_ORIGINS: list[str] = ["*"]

    @model_validator(mode="after")
    def _enforce_production_security(self) -> "Settings":
        if self.ENV == "production":
            if self.DEFAULT_SECRET_KEY == "ytconverter2024":
                raise ValueError("DEFAULT_SECRET_KEY must be changed from the default in production")
            if self.ALLOWED_ORIGINS == ["*"]:
                raise ValueError("ALLOWED_ORIGINS must not be ['*'] in production")
            if self.DEBUG:
                raise ValueError("DEBUG must be False in production")
        return self

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8"}


@lru_cache()
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
