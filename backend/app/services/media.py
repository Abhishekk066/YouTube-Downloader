import asyncio
import logging
import re
from typing import AsyncIterator

from app.config.settings import settings

logger = logging.getLogger(__name__)

FFMPEG = settings.FFMPEG_BIN
_CHUNK = 65536


async def stream_merged_video(
    video_url: str,
    audio_url: str,
) -> AsyncIterator[bytes]:
    ua = settings.USER_AGENT or "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    cmd = [
        FFMPEG,
        "-user_agent", ua,
        "-i", video_url,
        "-user_agent", ua,
        "-i", audio_url,
        "-map", "0:v",
        "-map", "1:a",
        "-c:v", "copy",
        "-c:a", "copy",
        "-movflags", "frag_keyframe+empty_moov",
        "-f", "mp4",
        "-loglevel", "error",
        "pipe:1",
    ]
    proc = await asyncio.create_subprocess_exec(
        *cmd,
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.PIPE,
    )
    try:
        while True:
            chunk = await proc.stdout.read(_CHUNK)
            if not chunk:
                break
            yield chunk
    except asyncio.CancelledError:
        proc.kill()
        raise
    finally:
        try:
            proc.stdout._transport.close()
        except Exception:
            pass
        await proc.wait()


async def stream_audio(audio_url: str, bitrate: str = "128") -> AsyncIterator[bytes]:
    ua = settings.USER_AGENT or "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    cmd = [
        FFMPEG,
        "-user_agent", ua,
        "-i", audio_url,
        "-ar", "44100",
        "-c:a", "libmp3lame",
        "-b:a", f"{bitrate}k",
        "-f", "mp3",
        "-loglevel", "error",
        "pipe:1",
    ]
    proc = await asyncio.create_subprocess_exec(
        *cmd,
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.PIPE,
    )
    try:
        while True:
            chunk = await proc.stdout.read(_CHUNK)
            if not chunk:
                break
            yield chunk
    except asyncio.CancelledError:
        proc.kill()
        raise
    finally:
        try:
            proc.stdout._transport.close()
        except Exception:
            pass
        await proc.wait()


async def stream_fmp4(
    video_url: str,
    audio_url: str | None,
    start: float = 0.0,
) -> AsyncIterator[bytes]:
    ua = settings.USER_AGENT or "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    if audio_url:
        cmd = [
            FFMPEG,
            "-user_agent", ua,
            "-ss", f"{start:.3f}", "-i", video_url,
            "-user_agent", ua,
            "-ss", f"{start:.3f}", "-i", audio_url,
            "-map", "0:v", "-map", "1:a",
            "-c:v", "copy", "-c:a", "aac",
            "-movflags", "frag_keyframe+empty_moov+default_base_moof",
            "-f", "mp4",
            "-loglevel", "error",
            "pipe:1",
        ]
    else:
        cmd = [
            FFMPEG,
            "-user_agent", ua,
            "-ss", f"{start:.3f}", "-i", video_url,
            "-map", "0:v", "-map", "0:a",
            "-c:v", "copy", "-c:a", "aac",
            "-movflags", "frag_keyframe+empty_moov+default_base_moof",
            "-f", "mp4",
            "-loglevel", "error",
            "pipe:1",
        ]
    proc = await asyncio.create_subprocess_exec(
        *cmd,
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.PIPE,
    )
    try:
        while True:
            chunk = await proc.stdout.read(_CHUNK)
            if not chunk:
                break
            yield chunk
    except asyncio.CancelledError:
        proc.kill()
        raise
    finally:
        try:
            proc.stdout._transport.close()
        except Exception:
            pass
        await proc.wait()


async def stream_hls_segment(
    video_url: str,
    audio_url: str | None,
    start: float,
    duration: float,
) -> AsyncIterator[bytes]:
    ua = settings.USER_AGENT or "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    if audio_url:
        # Separate video + audio streams
        cmd = [
            FFMPEG,
            "-user_agent", ua,
            "-ss", f"{start:.3f}", "-i", video_url,
            "-user_agent", ua,
            "-ss", f"{start:.3f}", "-i", audio_url,
            "-t", f"{duration:.3f}",
            "-map", "0:v", "-map", "1:a",
            "-c:v", "copy",
            "-c:a", "aac", "-b:a", "128k",
            "-af", "aresample=async=1",
            "-output_ts_offset", f"{start:.3f}",
            "-f", "mpegts",
            "-loglevel", "error",
            "pipe:1",
        ]
    else:
        # Single combined a/v stream — perfect A/V sync, no chunk drift
        cmd = [
            FFMPEG,
            "-user_agent", ua,
            "-ss", f"{start:.3f}", "-i", video_url,
            "-t", f"{duration:.3f}",
            "-map", "0:v", "-map", "0:a",
            "-c:v", "copy",
            "-c:a", "aac", "-b:a", "128k",
            "-af", "aresample=async=1",
            "-output_ts_offset", f"{start:.3f}",
            "-f", "mpegts",
            "-loglevel", "error",
            "pipe:1",
        ]
    proc = await asyncio.create_subprocess_exec(
        *cmd,
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.PIPE,
    )
    try:
        while True:
            chunk = await proc.stdout.read(_CHUNK)
            if not chunk:
                break
            yield chunk
    except asyncio.CancelledError:
        proc.kill()
        raise
    finally:
        try:
            proc.stdout._transport.close()
        except Exception:
            pass
        await proc.wait()


def sanitize_filename(name: str) -> str:
    name = re.sub(r"\s+", "_", name)
    name = re.sub(r'[|/\\#:*?"<>]', "", name)
    name = re.sub(r"_+", "_", name)
    return name
