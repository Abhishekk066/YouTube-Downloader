# pyrefly: ignore [missing-import]
import pytest
# pyrefly: ignore [missing-import]
import pytest_asyncio
# pyrefly: ignore [missing-import]
from httpx import ASGITransport, AsyncClient


@pytest_asyncio.fixture
async def client():
    from app.main import app
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        yield ac


@pytest.mark.asyncio
async def test_docs_disabled(client):
    resp = await client.get("/api/docs")
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_index_served(client):
    resp = await client.get("/")
    assert resp.status_code == 200
    assert b"YT!Converter" in resp.content


@pytest.mark.asyncio
async def test_suggestions_missing_params(client):
    resp = await client.get("/suggestions")
    assert resp.status_code == 422


@pytest.mark.asyncio
async def test_search_empty_info(client):
    resp = await client.post("/search", json={"info": "", "s": "key"})
    assert resp.status_code == 200
    assert resp.json() == {"message": "Something is wrong"}


@pytest.mark.asyncio
async def test_media_info_empty_url(client):
    resp = await client.post("/api/media/info", json={"url": ""})
    assert resp.status_code == 422


@pytest.mark.asyncio
async def test_job_status_not_found(client):
    resp = await client.get("/api/media/status/nonexistent-job")
    assert resp.status_code == 404


def test_ydl_base_user_agent():
    from app.config.settings import settings
    from app.services.downloader import _ydl_base
    from unittest import mock

    with mock.patch.object(settings, "USER_AGENT", "TestAgent/1.0"):
        opts = _ydl_base()
        assert opts.get("user_agent") == "TestAgent/1.0"


def test_youtubedl_cookies_tempfile():
    import os
    import tempfile
    from app.services.downloader import YoutubeDL
    from unittest import mock

    # Create a dummy cookie file
    with tempfile.NamedTemporaryFile(mode="w", delete=False) as f:
        f.write("# Dummy cookies")
        dummy_cookie_path = f.name

    try:
        opts = {"cookiefile": dummy_cookie_path}
        
        # We will mock the raw YoutubeDL class imported in app.services.downloader
        with mock.patch("app.services.downloader._raw_yt_dlp.YoutubeDL") as MockYoutubeDL:
            mock_instance = mock.Mock()
            MockYoutubeDL.return_value.__enter__.return_value = mock_instance
            
            with YoutubeDL(opts) as ydl:
                assert ydl is mock_instance
                MockYoutubeDL.assert_called_once()
                called_opts = MockYoutubeDL.call_args[0][0]
                temp_cookie_path = called_opts.get("cookiefile")
                
                assert temp_cookie_path != dummy_cookie_path
                assert os.path.exists(temp_cookie_path)
                with open(temp_cookie_path, "r") as tf:
                    assert tf.read() == "# Dummy cookies"
            
            assert not os.path.exists(temp_cookie_path)
    finally:
        if os.path.exists(dummy_cookie_path):
            os.remove(dummy_cookie_path)


@pytest.mark.asyncio
async def test_hls_manifest_mocked(client):
    from app.api import routes
    from unittest import mock

    mock_data = {
        "video_url": "http://example.com/video.mp4",
        "audio_url": "http://example.com/audio.mp4",
        "duration": 60,
    }

    with mock.patch("app.api.routes._resolve_preview", return_value=mock_data):
        resp = await client.get("/hls/manifest?url=http://youtube.com/watch?v=123&q=360p")
        assert resp.status_code == 200
        assert resp.headers["content-type"] == "application/vnd.apple.mpegurl"
        content = resp.content.decode()
        assert "#EXTM3U" in content
        assert "/hls/segment/" in content


@pytest.mark.asyncio
async def test_hls_segment_not_found(client):
    resp = await client.get("/hls/segment/nonexistent-stream/0.0")
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_preview_frame_mocked(client):
    from unittest import mock

    mock_data = {
        "video_url": "http://example.com/video.mp4",
        "audio_url": "http://example.com/audio.mp4",
        "duration": 60,
    }

    with mock.patch("app.api.routes._resolve_preview", return_value=mock_data):
        mock_proc = mock.AsyncMock()
        mock_proc.communicate.return_value = (b"fake_jpeg_bytes", b"")
        mock_proc.returncode = 0

        with mock.patch("asyncio.create_subprocess_exec", return_value=mock_proc) as mock_exec:
            resp = await client.get("/preview/frame?url=http://youtube.com/watch?v=123&q=360p&t=15")
            assert resp.status_code == 200
            assert resp.headers["content-type"] == "image/jpeg"
            assert resp.content == b"fake_jpeg_bytes"
            mock_exec.assert_called_once()


