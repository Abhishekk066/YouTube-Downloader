
import asyncio
import time
import uuid
from dataclasses import dataclass, field
from typing import Optional

_lock = asyncio.Lock()
_jobs: dict[str, "DownloadJob"] = {}


@dataclass
class DownloadJob:
    id: str = field(default_factory=lambda: str(uuid.uuid4()))
    url: str = ""
    format_id: str = ""
    status: str = "pending"
    progress: float = 0.0
    file_path: Optional[str] = None
    filename: Optional[str] = None
    error: Optional[str] = None
    created_at: float = field(default_factory=time.time)


async def create_job(url: str, format_id: str) -> DownloadJob:
    async with _lock:
        job = DownloadJob(url=url, format_id=format_id)
        _jobs[job.id] = job
        return job


def get_job(job_id: str) -> Optional[DownloadJob]:
    return _jobs.get(job_id)


async def update_job(job_id: str, **kwargs) -> Optional[DownloadJob]:
    async with _lock:
        job = _jobs.get(job_id)
        if job:
            for k, v in kwargs.items():
                setattr(job, k, v)
        return job


async def purge_expired(max_age_hours: int) -> int:
    async with _lock:
        cutoff = time.time() - max_age_hours * 3600
        stale = [jid for jid, j in _jobs.items() if j.created_at < cutoff]
        for jid in stale:
            del _jobs[jid]
        return len(stale)
