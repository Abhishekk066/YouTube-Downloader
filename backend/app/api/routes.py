import asyncio
import base64
import hashlib
import logging
import os
import re
import time as _time
import uuid
from typing import List
from urllib.parse import quote

import httpx
from fastapi import APIRouter, BackgroundTasks, HTTPException, Query, Response
from fastapi.responses import FileResponse, JSONResponse, StreamingResponse

from app.config.settings import settings
from app.schemas.media import (
    DownloadRequest,
    DownloadResponse,
    FormatInfo,
    JobStatusResponse,
    MediaInfoRequest,
    MediaInfoResponse,
    PreviewImageRequest,
    PreviewRequest,
    ProcessUrlRequest,
    SearchRequest,
)
from app.services.downloader import (
    detect_platform,
    download_audio_cached,
    download_video_cached,
    get_suggestions,
    get_video_info,
)
from app.services.media import sanitize_filename, stream_fmp4, stream_hls_segment, stream_merged_video
from app.services.search import build_search_results
from app.store import create_job, get_job
from app.tasks.downloader import run_download
from app.utils.crypto import encrypt_response

logger = logging.getLogger(__name__)
router = APIRouter()


_hls_cache: dict[str, dict] = {}
_HLS_SEG_DUR = 20.0
_HLS_TTL = 1800



_preview_cache: dict[str, dict] = {}
_PREVIEW_TTL = 300


def _sweep_cache(cache: dict[str, dict]) -> None:
    """Remove expired entries from a TTL cache in-place."""
    now = _time.time()
    stale = [k for k, v in cache.items() if v.get("expires", 0) < now]
    for k in stale:
        del cache[k]


async def _resolve_preview(url: str, q: str) -> dict:
    _sweep_cache(_preview_cache)
    key = hashlib.md5(f"{url}:{q}".encode()).hexdigest()
    now = _time.time()
    if key in _preview_cache and _preview_cache[key]["expires"] > now:
        return _preview_cache[key]
    info = await get_video_info(url)
    if info.get("is_live"):
        raise HTTPException(400, "Live streams not supported")
    formats = info.get("formats", [])
    target_h = _extract_height(q)
    mp4_fmts = _best_mp4_formats(formats)
    vid_fmt = next((f for f in mp4_fmts if f.get("height") == target_h), mp4_fmts[0] if mp4_fmts else None)
    aud_fmt = _best_audio_format(formats)
    if not vid_fmt or not aud_fmt:
        raise HTTPException(400, f"Quality {q} unavailable")
    result = {
        "video_url": vid_fmt["url"],
        "audio_url": aud_fmt["url"],
        "duration": int(info.get("duration") or 0),
        "expires": now + _PREVIEW_TTL,
    }
    _preview_cache[key] = result
    return result




def _fmt_size(size_bytes: int) -> str:
    mb = size_bytes / (1024 * 1024)
    if mb >= 1024:
        return f"{mb / 1024:.2f} GB"
    return f"{mb:.2f} MB"


def _extract_height(quality: str) -> int:
    """'1080p', '1080p60', '720p' → height integer."""
    m = re.match(r"(\d+)", quality)
    return int(m.group(1)) if m else 0


def _best_mp4_formats(formats: list[dict]) -> list[dict]:
    """Return one H.264 MP4 video-only entry per height for HLS compatibility.
    Prefers avc1 (H.264) over AV1/VP9; within same codec picks highest bitrate."""
    by_height: dict[int, dict] = {}
    for f in formats:
        if (
            f.get("ext") == "mp4"
            and f.get("vcodec", "none") not in (None, "none")
            and f.get("acodec") in (None, "none")
            and (f.get("dynamic_range") or "SDR") == "SDR"
        ):
            h = f.get("height") or 0
            if not h:
                continue
            is_h264 = (f.get("vcodec") or "").startswith("avc1")
            tbr = f.get("tbr") or 0
            if h not in by_height:
                by_height[h] = f
            else:
                cur = by_height[h]
                cur_h264 = (cur.get("vcodec") or "").startswith("avc1")
                cur_tbr = cur.get("tbr") or 0
                if (is_h264 and not cur_h264) or (is_h264 == cur_h264 and tbr > cur_tbr):
                    by_height[h] = f
    return sorted(by_height.values(), key=lambda x: x.get("height", 0), reverse=True)


def _best_audio_format(formats: list[dict], target_abr: int | None = None) -> dict | None:
    audio = [f for f in formats if f.get("acodec", "none") not in (None, "none") and f.get("vcodec") in (None, "none")]
    if not audio:
        return None
    if target_abr:
        exact = next((f for f in audio if int(f.get("abr") or 0) == target_abr), None)
        if exact:
            return exact
    return max(audio, key=lambda x: x.get("abr") or 0)




@router.post("/api/media/info", response_model=MediaInfoResponse, tags=["media"])
async def media_info(body: MediaInfoRequest):
    """Fetch metadata and available formats for any supported URL."""
    try:
        info = await get_video_info(body.url)
    except Exception as exc:
        logger.error("media_info: %s", exc)
        raise HTTPException(status_code=400, detail=str(exc))

    formats: List[FormatInfo] = []
    for f in info.get("formats") or []:
        has_v = f.get("vcodec", "none") not in (None, "none")
        has_a = f.get("acodec", "none") not in (None, "none")
        if not has_v and not has_a:
            continue
        formats.append(
            FormatInfo(
                format_id=f.get("format_id", ""),
                quality=str(f.get("format_note") or f.get("height") or f.get("abr") or ""),
                ext=f.get("ext", ""),
                filesize=f.get("filesize") or f.get("filesize_approx"),
                type="video" if has_v else "audio",
            )
        )

    thumbs = info.get("thumbnails") or []
    thumb = thumbs[-1]["url"] if thumbs else (info.get("thumbnail") or "")

    return MediaInfoResponse(
        title=info.get("title", ""),
        thumbnail=thumb,
        duration=int(info.get("duration") or 0),
        formats=formats,
        platform=detect_platform(body.url),
    )


@router.post("/api/media/download", response_model=DownloadResponse, tags=["media"])
async def media_download(body: DownloadRequest, bg: BackgroundTasks):
    """Enqueue a background download. Returns a job_id to poll status."""
    job = await create_job(body.url, body.format_id)
    bg.add_task(run_download, job.id, body.url, body.format_id)
    return DownloadResponse(job_id=job.id)


@router.get("/api/media/status/{job_id}", response_model=JobStatusResponse, tags=["media"])
async def job_status(job_id: str):
    job = get_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    return JobStatusResponse(
        job_id=job.id,
        status=job.status,
        progress=job.progress,
        filename=job.filename,
        error=job.error,
    )


@router.get("/api/media/file/{job_id}", tags=["media"])
async def download_file(job_id: str):
    import mimetypes
    job = get_job(job_id)
    if not job or job.status != "completed" or not job.file_path or not os.path.exists(job.file_path):
        raise HTTPException(status_code=404, detail="File not found or not ready")

    fname = os.path.basename(job.file_path)
    media_type, _ = mimetypes.guess_type(fname)
    return FileResponse(
        job.file_path,
        media_type=media_type or "application/octet-stream",
        filename=job.filename or fname,
    )




@router.post("/previewImage")
async def preview_image(body: PreviewImageRequest):
    try:
        info = await get_video_info(body.videoUrl)
        if info.get("is_live"):
            return Response("Something is wrong", status_code=200)

        vid_id = info.get("id", "")
        urls = [
            f"https://i.ytimg.com/vi_webp/{vid_id}/mqdefault.webp",
            f"https://i.ytimg.com/vi_webp/{vid_id}/mq1.webp",
            f"https://i.ytimg.com/vi_webp/{vid_id}/mq2.webp",
            f"https://i.ytimg.com/vi_webp/{vid_id}/mq3.webp",
        ]
        async with httpx.AsyncClient(timeout=15.0) as client:
            responses = await asyncio.gather(*[client.get(u) for u in urls], return_exceptions=True)

        thumbnails = [
            f"data:{r.headers.get('content-type', 'image/webp')};base64,{base64.b64encode(r.content).decode()}"
            for r in responses
            if not isinstance(r, Exception)
        ]
        return Response(encrypt_response(thumbnails, body.s), media_type="application/json")
    except Exception as exc:
        logger.error("previewImage: %s", exc)
        raise HTTPException(status_code=500, detail=str(exc))


@router.post("/preview")
async def preview(body: PreviewRequest):
    try:
        if not body.videoLink:
            return JSONResponse({"message": "Something is wrong"})
        info = await get_video_info(body.videoLink)
        mp4_360 = [
            f["url"]
            for f in info.get("formats", [])
            if f.get("height") == 360
            and f.get("ext") == "mp4"
            and f.get("vcodec", "none") != "none"
            and f.get("acodec", "none") != "none"
        ]
        return Response(encrypt_response(mp4_360, body.s), media_type="application/json")
    except Exception as exc:
        logger.error("preview: %s", exc)
        raise HTTPException(status_code=500, detail=str(exc))


@router.get("/videopreview")
async def video_preview(url: str = Query(...), q: str = Query(...)):
    try:
        info = await get_video_info(url)
        if info.get("is_live"):
            return JSONResponse({"message": "Live content is not supported."})

        target_h = _extract_height(q)
        formats = info.get("formats", [])

        vid_fmt = next(
            (f for f in formats
             if f.get("height") == target_h
             and f.get("ext") == "mp4"
             and f.get("vcodec", "none") not in (None, "none")
             and f.get("acodec") in (None, "none")),
            None,
        )
        if not vid_fmt:
            raise HTTPException(status_code=400, detail=f"Quality {q} unavailable")

        aud_fmt = _best_audio_format(formats)
        if not aud_fmt:
            raise HTTPException(status_code=400, detail="No audio stream found")

        return StreamingResponse(
            stream_merged_video(vid_fmt["url"], aud_fmt["url"]),
            media_type="video/mp4",
        )
    except HTTPException:
        raise
    except Exception as exc:
        logger.error("videopreview: %s", exc)
        raise HTTPException(status_code=500, detail="Internal Server Error")


@router.get("/preview/stream")
async def preview_stream(
    url: str = Query(...),
    q: str = Query("360p"),
    t: float = Query(0),
):
    """Stream merged video+audio as fragmented MP4 from `t` seconds.
    Resolves YouTube URLs once and caches them for 5 minutes so repeated
    seek requests don't trigger extra yt-dlp calls."""
    try:
        cached = await _resolve_preview(url, q)
        return StreamingResponse(
            stream_fmp4(cached["video_url"], cached["audio_url"], t),
            media_type="video/mp4",
            headers={
                "X-Video-Duration": str(cached["duration"]),
                "Cache-Control": "no-cache",
                "Accept-Ranges": "none",
            },
        )
    except HTTPException:
        raise
    except Exception as exc:
        logger.error("preview_stream: %s", exc)
        raise HTTPException(status_code=500, detail="Internal Server Error")


@router.get("/hls/manifest")
async def hls_manifest(
    url: str = Query(...),
    q: str = Query(...),
    duration: float = Query(0),
):
    """Return an HLS m3u8 manifest. Segments are served on-demand via /hls/segment."""
    try:
        info = await get_video_info(url)
        if info.get("is_live"):
            raise HTTPException(status_code=400, detail="Live streams not supported")

        formats = info.get("formats", [])
        target_h = _extract_height(q)
        mp4_fmts = _best_mp4_formats(formats)
        vid_fmt = next((f for f in mp4_fmts if f.get("height") == target_h), None)
        if not vid_fmt and mp4_fmts:
            vid_fmt = mp4_fmts[0]
        if not vid_fmt:
            raise HTTPException(status_code=400, detail=f"Quality {q} unavailable")

        aud_fmt = _best_audio_format(formats)
        if not aud_fmt:
            raise HTTPException(status_code=400, detail="No audio stream")

        dur = duration or int(info.get("duration") or 0)

        _sweep_cache(_hls_cache)
        stream_id = str(uuid.uuid4())
        _hls_cache[stream_id] = {
            "video_url": vid_fmt["url"],
            "audio_url": aud_fmt["url"],
            "duration": dur,
            "expires": _time.time() + _HLS_TTL,
        }

        lines = [
            "#EXTM3U",
            "#EXT-X-VERSION:3",
            f"#EXT-X-TARGETDURATION:{int(_HLS_SEG_DUR)}",
            "#EXT-X-MEDIA-SEQUENCE:0",
        ]
        t = 0.0
        first = True
        while t < dur:
            seg_dur = min(_HLS_SEG_DUR, dur - t)
            if not first:
                lines.append("#EXT-X-DISCONTINUITY")
            first = False
            lines.append(f"#EXTINF:{seg_dur:.3f},")
            lines.append(f"/hls/segment/{stream_id}/{t:.3f}")
            t += _HLS_SEG_DUR
        lines.append("#EXT-X-ENDLIST")

        return Response("\n".join(lines), media_type="application/vnd.apple.mpegurl")
    except HTTPException:
        raise
    except Exception as exc:
        logger.error("hls_manifest: %s", exc)
        raise HTTPException(status_code=500, detail="Internal Server Error")


@router.get("/hls/segment/{stream_id}/{t}")
async def hls_segment(stream_id: str, t: float):
    """Stream one MPEG-TS segment for the given stream_id starting at time t."""
    if stream_id not in _hls_cache:
        raise HTTPException(status_code=404, detail="Stream not found or expired")

    stream = _hls_cache[stream_id]
    seg_dur = min(_HLS_SEG_DUR, stream["duration"] - t)
    if seg_dur <= 0:
        raise HTTPException(status_code=404, detail="Segment out of range")

    return StreamingResponse(
        stream_hls_segment(stream["video_url"], stream["audio_url"], t, seg_dur),
        media_type="video/MP2T",
    )


@router.get("/suggestions")
async def suggestions(q: str = Query(...), s: str = Query(...)):
    if not q.strip():
        return Response(status_code=200)
    try:
        keywords = await get_suggestions(q)
        return Response(encrypt_response(keywords, s), media_type="application/json")
    except Exception as exc:
        logger.error("suggestions: %s", exc)
        raise HTTPException(status_code=500, detail="Internal server error")


@router.post("/search")
async def search(body: SearchRequest):
    try:
        if not body.info:
            return JSONResponse({"message": "Something is wrong"})
        results = await build_search_results(body.info)
        return Response(encrypt_response(results, body.s), media_type="application/json")
    except Exception as exc:
        logger.error("search: %s", exc)
        raise HTTPException(status_code=500, detail=str(exc))


@router.get("/audio")
async def download_audio(url: str = Query(...), quality: str = Query(...)):
    try:
        bitrate = int(quality) if quality.isdigit() else 128
        file_path = await download_audio_cached(url, bitrate, settings.DOWNLOAD_DIR, settings.FFMPEG_BIN)

        stem = os.path.splitext(os.path.basename(file_path))[0]
        title_part = stem[17:] if len(stem) > 17 else stem
        fname = sanitize_filename(f"YT_CONVERTER - {title_part}_{quality}k.mp3")
        return FileResponse(
            file_path,
            media_type="audio/mpeg",
            filename=fname,
            headers={"Content-Disposition": f"attachment; filename*=UTF-8''{quote(fname)}"},
        )
    except HTTPException:
        raise
    except Exception as exc:
        logger.error("audio: %s", exc)
        if "live" in str(exc).lower():
            return JSONResponse({"message": "Something is wrong"})
        raise HTTPException(status_code=500, detail="Internal Server Error")


@router.get("/video")
async def download_video(url: str = Query(...), quality: str = Query(...)):
    try:
        height = _extract_height(quality)
        if not height:
            raise HTTPException(status_code=400, detail=f"Invalid quality: {quality}")
        file_path = await download_video_cached(url, height, settings.DOWNLOAD_DIR, settings.FFMPEG_BIN)
        stem = os.path.splitext(os.path.basename(file_path))[0]
        title_part = stem[17:] if len(stem) > 17 else stem
        fname = sanitize_filename(f"YT_CONVERTER - {title_part}_{quality}.mp4")
        return FileResponse(
            file_path,
            media_type="video/mp4",
            filename=fname,
            headers={"Content-Disposition": f"attachment; filename*=UTF-8''{quote(fname)}"},
        )
    except HTTPException:
        raise
    except Exception as exc:
        logger.error("video: %s", exc)
        if "live" in str(exc).lower():
            return JSONResponse({"message": "Live content is not supported."})
        raise HTTPException(status_code=500, detail="Internal Server Error")


@router.post("/process-url")
async def process_url(body: ProcessUrlRequest):
    try:
        info = await get_video_info(body.videoUrl)
        if info.get("is_live"):
            return Response("Can't download live Video", status_code=200)

        formats = info.get("formats", [])
        title = info.get("title", "")
        duration = int(info.get("duration") or 0)
        thumbs = info.get("thumbnails") or []
        thumb_url = thumbs[-1]["url"] if thumbs else (info.get("thumbnail") or "")

        fname = f"YT_CONVERTER - {sanitize_filename(title)}"

        h_t = duration // 3600
        m_t = (duration % 3600) // 60
        s_t = duration % 60
        video_timestamp = f"{h_t}:{m_t:02d}:{s_t:02d}" if h_t else f"{m_t}:{s_t:02d}"


        mp4_fmts = _best_mp4_formats(formats)
        quality_mp4 = [f'{f.get("height", "")}p' for f in mp4_fmts]
        size_mp4 = [
            _fmt_size(
                int(f.get("filesize") or f.get("filesize_approx") or 0) + int(128 * 1000 * duration / 8)
            )
            for f in mp4_fmts
        ]


        webm_fmts = [f for f in formats if f.get("ext") == "webm" and f.get("vcodec", "none") not in (None, "none")]
        quality_webm = [f.get("format_note") or f'{f.get("height", "")}p' for f in webm_fmts]
        size_webm = [
            _fmt_size(int(f.get("filesize") or f.get("filesize_approx") or 0))
            for f in webm_fmts
        ]


        mp3_fmts = [f for f in formats if f.get("acodec", "none") not in (None, "none") and f.get("vcodec") in (None, "none") and f.get("abr")]
        abrs = sorted({int(f["abr"]) for f in mp3_fmts}, reverse=True)
        size_mp3 = [_fmt_size(int(abr * 1000 * duration / 8)) for abr in abrs]

        data = {
            "thumbnailUrl": thumb_url,
            "videoTitle": title,
            "fileName": fname,
            "channelName": info.get("uploader") or info.get("channel") or "",
            "videoTimestamp": video_timestamp,
            "qualityLabelMp3": abrs,
            "contentLengthMp3Sizes": size_mp3,
            "qualityLabelMp4": quality_mp4,
            "contentLengthMp4Sizes": size_mp4,
            "qualityLabelWebm": quality_webm,
            "contentLengthWebm": size_webm,
            "discription": info.get("description") or "",
        }
        return Response(encrypt_response(data, body.s), media_type="application/json")
    except Exception as exc:
        logger.error("process-url: %s", exc)
        raise HTTPException(status_code=500, detail=str(exc))


@router.get("/proxy-image")
async def proxy_image(url: str = Query(...)):
    from urllib.parse import urlparse as _urlparse
    parsed = _urlparse(url)
    if parsed.scheme not in ("http", "https") or not parsed.netloc:
        raise HTTPException(status_code=400, detail="Invalid URL")
    try:
        async with httpx.AsyncClient(timeout=10.0, follow_redirects=True) as client:
            headers = {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            }
            resp = await client.get(url, headers=headers)
            resp.raise_for_status()
            content_type = resp.headers.get("content-type", "image/jpeg")
            if not content_type.startswith("image/"):
                raise HTTPException(status_code=400, detail="URL is not an image")
            return Response(resp.content, media_type=content_type)
    except HTTPException:
        raise
    except Exception as e:
        logger.error("proxy_image error: %s", e)
        raise HTTPException(status_code=400, detail="Failed to proxy image")
