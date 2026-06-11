import asyncio
import hashlib
import json
import logging
import os
import re
from typing import Optional

import httpx
import yt_dlp

logger = logging.getLogger(__name__)


def _ydl_base() -> dict:
    from app.config.settings import settings
    opts: dict = {
        "quiet": True,
        "no_warnings": True,
        "noplaylist": True,
        "socket_timeout": 20,
        "extractor_args": {
            "youtubepot-bgutilhttp": {
                "base_url": [settings.BGUTIL_PROVIDER_URL],
            }
        },
    }
    if settings.COOKIES_FILE and os.path.isfile(settings.COOKIES_FILE):
        opts["cookiefile"] = settings.COOKIES_FILE
    return opts


_download_locks: dict[str, asyncio.Lock] = {}
_info_cache: dict[str, tuple[float, dict]] = {}
_INFO_TTL = 300  # 5 minutes

PLATFORM_PATTERNS: dict[str, list[str]] = {
    "youtube": [r"youtube\.com", r"youtu\.be"],
    "instagram": [r"instagram\.com"],
    "facebook": [r"facebook\.com", r"fb\.watch"],
    "tiktok": [r"tiktok\.com"],
    "twitter": [r"twitter\.com", r"x\.com"],
    "reddit": [r"reddit\.com"],
    "vimeo": [r"vimeo\.com"],
    "dailymotion": [r"dailymotion\.com"],
}


def detect_platform(url: str) -> str:
    for platform, patterns in PLATFORM_PATTERNS.items():
        for pat in patterns:
            if re.search(pat, url, re.IGNORECASE):
                return platform
    return "unknown"


async def get_video_info(url: str) -> dict:
    import time as _time
    now = _time.monotonic()
    if url in _info_cache:
        ts, cached = _info_cache[url]
        if now - ts < _INFO_TTL:
            return cached

    def _fetch() -> dict:
        with yt_dlp.YoutubeDL({**_ydl_base(), "skip_download": True}) as ydl:
            return ydl.extract_info(url, download=False)

    info = await asyncio.to_thread(_fetch)
    _info_cache[url] = (now, info)
    return info


async def get_suggestions(query: str) -> list[str]:
    async with httpx.AsyncClient(timeout=10.0) as client:
        try:
            resp = await client.get(
                "https://suggestqueries.google.com/complete/search",
                params={"client": "youtube", "q": query},
            )
            text = resp.text
            start, end = text.index("["), text.rindex("]")
            data = json.loads(text[start : end + 1])
            return [
                s[0]
                for s in data[1]
                if "download" not in s[0].lower()
            ][:9]
        except Exception as exc:
            logger.error("Suggestions fetch failed: %s", exc)
            return []


def _find_cached(output_dir: str, cache_key: str) -> Optional[str]:
    """Return path of a non-empty cached file whose name starts with cache_key."""
    if not os.path.isdir(output_dir):
        return None
    for fname in sorted(os.listdir(output_dir)):
        if fname.startswith(cache_key):
            fpath = os.path.join(output_dir, fname)
            if os.path.isfile(fpath) and os.path.getsize(fpath) > 0:
                return fpath
    return None


def _ydl_opts_base(output_tpl: str, ffmpeg_bin: str) -> dict:
    opts = {**_ydl_base(), "outtmpl": output_tpl, "nooverwrites": True,
            "concurrent_fragment_downloads": 4, "socket_timeout": 30}
    if ffmpeg_bin and ffmpeg_bin != "ffmpeg":
        opts["ffmpeg_location"] = ffmpeg_bin
    return opts


async def download_video_cached(url: str, height: int, output_dir: str, ffmpeg_bin: str = "ffmpeg") -> str:
    """Download and merge video+audio to output_dir via yt-dlp. Returns file path.
    Caches by (url, height) — repeat calls return instantly from cache."""
    cache_key = hashlib.md5(f"v:{url}:{height}".encode()).hexdigest()[:16]

    if hit := _find_cached(output_dir, cache_key):
        return hit

    if cache_key not in _download_locks:
        _download_locks[cache_key] = asyncio.Lock()

    async with _download_locks[cache_key]:
        if hit := _find_cached(output_dir, cache_key):
            return hit

        os.makedirs(output_dir, exist_ok=True)
        output_tpl = os.path.join(output_dir, f"{cache_key}_%(title)s.%(ext)s")
        opts = _ydl_opts_base(output_tpl, ffmpeg_bin)
        opts.update({
            "format": (
                f"bestvideo[height<={height}][ext=mp4]+bestaudio[ext=m4a]"
                f"/bestvideo[height<={height}]+bestaudio"
                f"/best[height<={height}]"
            ),
            "merge_output_format": "mp4",
        })

        def _run() -> None:
            with yt_dlp.YoutubeDL(opts) as ydl:
                ydl.extract_info(url, download=True)

        await asyncio.to_thread(_run)

        if hit := _find_cached(output_dir, cache_key):
            logger.info("Downloaded video %s → %s", url, hit)
            return hit
        raise RuntimeError("Downloaded file not found after yt-dlp")


async def download_audio_cached(url: str, bitrate: int, output_dir: str, ffmpeg_bin: str = "ffmpeg") -> str:
    """Download and convert to MP3 in output_dir via yt-dlp. Returns file path.
    Caches by (url, bitrate) — repeat calls return instantly from cache."""
    cache_key = hashlib.md5(f"a:{url}:{bitrate}".encode()).hexdigest()[:16]

    if hit := _find_cached(output_dir, cache_key):
        return hit

    if cache_key not in _download_locks:
        _download_locks[cache_key] = asyncio.Lock()

    async with _download_locks[cache_key]:
        if hit := _find_cached(output_dir, cache_key):
            return hit

        os.makedirs(output_dir, exist_ok=True)
        output_tpl = os.path.join(output_dir, f"{cache_key}_%(title)s.%(ext)s")
        opts = _ydl_opts_base(output_tpl, ffmpeg_bin)
        opts.update({
            "format": f"bestaudio[abr<={bitrate}]/bestaudio/best",
            "postprocessors": [{
                "key": "FFmpegExtractAudio",
                "preferredcodec": "mp3",
                "preferredquality": str(bitrate),
            }],
        })

        def _run() -> None:
            with yt_dlp.YoutubeDL(opts) as ydl:
                ydl.extract_info(url, download=True)

        await asyncio.to_thread(_run)

        if hit := _find_cached(output_dir, cache_key):
            logger.info("Downloaded audio %s → %s", url, hit)
            return hit
        raise RuntimeError("Downloaded audio file not found after yt-dlp")


async def search_videos(query: str, limit: int = 15) -> list[dict]:
    def _search() -> list[dict]:
        opts = {**_ydl_base(), "extract_flat": True}
        with yt_dlp.YoutubeDL(opts) as ydl:
            result = ydl.extract_info(f"ytsearch{limit}:{query}", download=False)
            return result.get("entries", []) if result else []

    return await asyncio.to_thread(_search)
