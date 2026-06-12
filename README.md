# Social Media Downloader

A fast, self-hosted web app and API to download videos and audio from YouTube, Instagram, TikTok, Twitter/X, Facebook, Reddit, Vimeo, and Dailymotion.

Built with **FastAPI** + **yt-dlp**, served as a single Docker container with a bundled frontend.

---

## Features

- Download MP4 video at any available quality (144p – 4K)
- Download MP3 audio at any bitrate
- In-browser video preview via HLS streaming
- YouTube search with autocomplete suggestions
- Background job queue with progress polling
- Rate limiting and automatic file cleanup
- Cookie-based authentication for age-restricted content
- YouTube bot-detection bypass via [bgutil](https://github.com/brainicism/bgutil-ytdlp-pot-provider)
- Interactive API docs at `/api/docs`

---

## Quick Start (Docker)

```bash
# 1. Clone
git clone https://github.com/yourname/youtube-downloader.git
cd youtube-downloader/backend

# 2. Configure
cp .env.example .env.production
# Edit .env.production — set DEFAULT_SECRET_KEY and ALLOWED_ORIGINS

# 3. Run
docker compose -f docker-compose.yml up -d
```

The app is now available at `http://localhost:6670`.

---

## Configuration

Copy `.env.example` to `.env` (development) or `.env.production` (Docker).

| Variable | Default | Description |
|---|---|---|
| `ENV` | `development` | `development` or `production` |
| `DEFAULT_SECRET_KEY` | — | **Required in prod.** Secret used to encrypt API responses |
| `DOWNLOAD_DIR` | `downloads` | Directory where files are saved |
| `MAX_FILE_AGE_HOURS` | `1` | Hours before downloaded files are auto-deleted |
| `RATE_LIMIT_PER_MINUTE` | `30` | Max requests per IP per minute |
| `FFMPEG_BIN` | `ffmpeg` | Path to ffmpeg binary |
| `COOKIES_FILE` | — | Path to a Netscape `cookies.txt` (bypasses login walls) |
| `USER_AGENT` | — | Browser UA that exported `cookies.txt` |
| `HOST` | `0.0.0.0` | Bind address |
| `PORT` | `6670` | Bind port |
| `WORKERS` | `1` | Uvicorn worker count |
| `DEBUG` | `false` | Enable debug logging |
| `ALLOWED_ORIGINS` | `["*"]` | CORS allowlist (comma-separated or JSON array) |

> **Production requirements**: `DEFAULT_SECRET_KEY` must be changed, `ALLOWED_ORIGINS` must not be `["*"]`, and `DEBUG` must be `false`. The app will refuse to start otherwise.

---

## API Reference

Interactive docs: `GET /api/docs` (Swagger UI) · `GET /api/redoc`

### Get video info

```
POST /api/media/info
Content-Type: application/json

{ "url": "https://www.youtube.com/watch?v=..." }
```

Returns title, thumbnail, duration, and available formats.

### Enqueue a download

```
POST /api/media/download
Content-Type: application/json

{ "url": "https://...", "format_id": "137" }
```

Returns a `job_id` to poll.

### Poll job status

```
GET /api/media/status/{job_id}
```

`status` is one of `pending` | `running` | `completed` | `failed`.

### Download completed file

```
GET /api/media/file/{job_id}
```

Returns the file as an attachment once `status == "completed"`.

### Direct download endpoints (legacy)

```
GET /video?url=<url>&quality=1080p
GET /audio?url=<url>&quality=128
```

### Search & suggestions

```
POST /search           { "info": "query", "s": "<key>" }
GET  /suggestions?q=<query>&s=<key>
```

### Video preview (HLS)

```
GET /hls/manifest?url=<url>&q=1080p&duration=<secs>
GET /hls/segment/{stream_id}/{timestamp}
GET /preview/stream?url=<url>&q=360p&t=0
```

---

## Development

### Prerequisites

- Python 3.12+
- ffmpeg
- [Deno](https://deno.land/) (needed by bgutil for YouTube JS challenges)

### Setup

```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

### Run locally

```bash
uvicorn app.main:app --reload --port 6670
```

Open `http://localhost:6670`.

### Run tests

```bash
pytest
```

---

## Project Structure

```
backend/
├── app/
│   ├── api/
│   │   └── routes.py        # All HTTP endpoints
│   ├── config/
│   │   └── settings.py      # Pydantic settings (env-driven)
│   ├── schemas/             # Request / response models
│   ├── services/
│   │   ├── downloader.py    # yt-dlp wrappers, format selection
│   │   ├── media.py         # ffmpeg streaming helpers
│   │   └── search.py        # YouTube search
│   ├── tasks/
│   │   ├── cleanup.py       # Hourly file cleanup loop
│   │   └── downloader.py    # Background download task
│   ├── utils/
│   │   └── crypto.py        # AES response encryption (CryptoJS-compatible)
│   ├── store.py             # In-memory job store
│   └── main.py              # FastAPI app, CORS, rate limiter, lifespan
├── public/                  # Bundled frontend (HTML/CSS/JS)
├── tests/
├── Dockerfile
├── docker-compose.yml
├── docker-compose.prod.yml
├── requirements.txt
└── .env.example
```

---

## Docker Compose (Production)

```bash
docker compose -f docker-compose.prod.yml up -d
```

The production compose file starts two services:

- **bgutil** — solves YouTube's bot-detection JS challenges
- **api** — the FastAPI app, proxied through bgutil

A named volume (`yt-dlp-cache`) persists the yt-dlp cache across restarts.

---

## Cookies (Age-Restricted / Login-Walled Content)

1. Export cookies from your browser using a [cookies.txt extension](https://github.com/hrdl-github/cookies-txt) in Netscape format.
2. Place the file at the path set by `COOKIES_FILE`.
3. Set `USER_AGENT` to the exact browser UA used when exporting, to prevent cookie invalidation.

---

## License

MIT
