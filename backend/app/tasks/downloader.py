import asyncio
import logging
import os

import yt_dlp

from app.config.settings import settings
from app.store import update_job

logger = logging.getLogger(__name__)


async def run_download(job_id: str, url: str, format_id: str) -> None:
    """Background coroutine: download media with yt-dlp and update job state."""
    await update_job(job_id, status="processing", progress=0.0)

    output_dir = settings.DOWNLOAD_DIR
    os.makedirs(output_dir, exist_ok=True)
    output_tpl = os.path.join(output_dir, f"{job_id}_%(title)s.%(ext)s")

    loop = asyncio.get_running_loop()

    def _progress_hook(d: dict) -> None:
        if d["status"] == "downloading":
            total = d.get("total_bytes") or d.get("total_bytes_estimate", 0)
            downloaded = d.get("downloaded_bytes", 0)
            if total:
                pct = round(downloaded / total * 100, 1)
                asyncio.run_coroutine_threadsafe(update_job(job_id, progress=pct), loop)

    is_audio_only = "bestaudio" in format_id and "bestvideo" not in format_id

    ydl_opts = {
        "format": format_id,
        "outtmpl": output_tpl,
        "progress_hooks": [_progress_hook],
        "quiet": True,
        "no_warnings": True,
        "nooverwrites": True,
        "concurrent_fragment_downloads": 4,
        "socket_timeout": 30,
    }

    if settings.FFMPEG_BIN != "ffmpeg":
        ydl_opts["ffmpeg_location"] = settings.FFMPEG_BIN

    if is_audio_only:
        ydl_opts["postprocessors"] = [{
            "key": "FFmpegExtractAudio",
            "preferredcodec": "mp3",
            "preferredquality": "0",
        }]
    else:
        ydl_opts["merge_output_format"] = "mp4"

    try:
        await asyncio.to_thread(_run_yt_dlp, ydl_opts, url)

        file_path = next(
            (
                os.path.join(output_dir, f)
                for f in sorted(os.listdir(output_dir))
                if f.startswith(job_id)
            ),
            None,
        )
        final_filename = None
        if file_path:
            raw_name = os.path.basename(file_path)
            if raw_name.startswith(f"{job_id}_"):
                cleaned_name = raw_name[len(job_id) + 1 :]
            else:
                cleaned_name = raw_name
            final_filename = f"Yt_Converter - {cleaned_name}"

        await update_job(
            job_id,
            status="completed",
            progress=100.0,
            file_path=file_path,
            filename=final_filename,
        )
        logger.info("Job %s completed: %s", job_id, file_path)
    except Exception as exc:
        logger.error("Job %s failed: %s", job_id, exc)
        await update_job(job_id, status="failed", error=str(exc))


def _run_yt_dlp(opts: dict, url: str) -> None:
    with yt_dlp.YoutubeDL(opts) as ydl:
        ydl.extract_info(url, download=True)
