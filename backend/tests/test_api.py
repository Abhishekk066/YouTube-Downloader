import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient


@pytest_asyncio.fixture
async def client():
    from app.main import app
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        yield ac


@pytest.mark.asyncio
async def test_docs_available(client):
    resp = await client.get("/api/docs")
    assert resp.status_code == 200


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
        assert opts.get("http_headers") == {"User-Agent": "TestAgent/1.0"}

