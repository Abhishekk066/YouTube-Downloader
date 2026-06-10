import logging

from app.services.downloader import search_videos

logger = logging.getLogger(__name__)


def _fmt_views(views: int) -> str:
    if views >= 1_000_000_000:
        return f"{views // 1_000_000_000}B"
    if views >= 1_000_000:
        return f"{views // 1_000_000}M"
    if views >= 1_000:
        return f"{views // 1_000}K"
    return str(views)


def _secs_to_ts(seconds: int) -> str:
    h = seconds // 3600
    m = (seconds % 3600) // 60
    s = seconds % 60
    return f"{h}:{m:02d}:{s:02d}" if h else f"{m}:{s:02d}"


async def build_search_results(query: str, limit: int = 15) -> dict:
    entries = await search_videos(query, limit)
    filtered = [
        e for e in entries
        if e and not e.get("is_live") and (e.get("duration") or 0) < 1500
    ]

    thumbnails, titles, video_urls = [], [], []
    timestamps, durations, views, uploads, owners = [], [], [], [], []

    for e in filtered:
        vid_id = e.get("id", "")
        dur = int(e.get("duration") or 0)
        thumbnails.append(f"https://i.ytimg.com/vi/{vid_id}/mqdefault.jpg")
        titles.append(e.get("title", ""))
        video_urls.append(f"https://www.youtube.com/watch?v={vid_id}")
        durations.append(dur)
        timestamps.append(_secs_to_ts(dur))
        views.append(_fmt_views(int(e.get("view_count") or 0)))
        uploads.append(e.get("upload_date", ""))
        owners.append(e.get("uploader") or e.get("channel") or "")

    return {
        "thumbnails": thumbnails,
        "titles": titles,
        "videoUrl": video_urls,
        "videoTimestamps": timestamps,
        "durationsInSeconds": durations,
        "videoView": views,
        "videoUpload": uploads,
        "ownerName": owners,
    }
