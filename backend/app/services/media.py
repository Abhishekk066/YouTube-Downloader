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
    """Merge separate video+audio streams via FFmpeg, yielding chunks of MP4."""
    cmd = [
        FFMPEG,
        "-i", video_url,
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
    """Transcode audio to MP3 via FFmpeg, yielding chunks."""
    cmd = [
        FFMPEG,
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
    audio_url: str,
    start: float = 0.0,
) -> AsyncIterator[bytes]:
    """Stream merged video+audio as fragmented MP4 from `start` seconds.
    frag_keyframe+empty_moov lets the browser start playing immediately;
    default_base_mone keeps DTS/PTS consistent for seeking."""
    cmd = [
        FFMPEG,
        "-ss", f"{start:.3f}", "-i", video_url,
        "-ss", f"{start:.3f}", "-i", audio_url,
        "-map", "0:v", "-map", "1:a",
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
    audio_url: str,
    start: float,
    duration: float,
) -> AsyncIterator[bytes]:
    """Stream a single HLS MPEG-TS segment via FFmpeg input-seeking."""
    cmd = [
        FFMPEG,
        "-ss", f"{start:.3f}", "-i", video_url,
        "-ss", f"{start:.3f}", "-i", audio_url,
        "-t", f"{duration:.3f}",
        "-map", "0:v", "-map", "1:a",
        "-c:v", "copy", "-c:a", "aac",
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
