from typing import List, Optional

# pyrefly: ignore [missing-import]
from pydantic import BaseModel, ConfigDict, field_validator


class MediaInfoRequest(BaseModel):
    url: str

    @field_validator("url")
    @classmethod
    def not_empty(cls, v: str) -> str:
        if not v or not v.strip():
            raise ValueError("URL cannot be empty")
        return v.strip()


class FormatInfo(BaseModel):
    format_id: str
    quality: str
    ext: str
    filesize: Optional[int] = None
    type: str


class MediaInfoResponse(BaseModel):
    title: str
    thumbnail: str
    duration: int
    formats: List[FormatInfo]
    platform: str


class DownloadRequest(BaseModel):
    url: str
    format_id: str


class DownloadResponse(BaseModel):
    job_id: str


class JobStatusResponse(BaseModel):
    job_id: str
    status: str
    progress: Optional[float] = None
    filename: Optional[str] = None
    error: Optional[str] = None


class PreviewImageRequest(BaseModel):
    videoUrl: str
    s: str


class PreviewRequest(BaseModel):
    videoLink: str
    s: str


class ProcessUrlRequest(BaseModel):
    videoUrl: str
    s: str


class SearchRequest(BaseModel):
    info: str
    info2: Optional[str] = None
    s: str
