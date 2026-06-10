import asyncio
import logging
import os
import time

from app.config.settings import settings
from app.store import purge_expired

logger = logging.getLogger(__name__)


async def cleanup_loop(interval_secs: int = 3600) -> None:
    """Runs forever, purging expired downloads every *interval_secs* seconds."""
    while True:
        await asyncio.sleep(interval_secs)
        await _cleanup()


async def _cleanup() -> None:
    max_age = settings.MAX_FILE_AGE_HOURS * 3600
    deleted, now = 0, time.time()
    dl_dir = settings.DOWNLOAD_DIR

    if os.path.isdir(dl_dir):
        for fname in os.listdir(dl_dir):
            fpath = os.path.join(dl_dir, fname)
            if os.path.isfile(fpath) and (now - os.path.getmtime(fpath)) > max_age:
                try:
                    os.remove(fpath)
                    deleted += 1
                except OSError:
                    pass

    purged = await purge_expired(settings.MAX_FILE_AGE_HOURS)
    logger.info("Cleanup: %d file(s) deleted, %d job record(s) purged", deleted, purged)
