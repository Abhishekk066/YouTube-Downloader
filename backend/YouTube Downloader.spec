# -*- mode: python ; coding: utf-8 -*-
from PyInstaller.utils.hooks import collect_data_files
from PyInstaller.utils.hooks import collect_all
from PyInstaller.utils.hooks import copy_metadata

datas = [('public', 'public')]
binaries = []
hiddenimports = ['app.main', 'app.api.routes', 'app.config.settings', 'app.services.downloader', 'app.services.media', 'app.services.search', 'app.tasks.cleanup', 'app.tasks.downloader', 'app.schemas.media', 'app.store', 'app.utils.crypto', 'uvicorn', 'uvicorn.config', 'uvicorn.main', 'uvicorn.server', 'uvicorn.logging', 'uvicorn.loops', 'uvicorn.loops.auto', 'uvicorn.loops.asyncio', 'uvicorn.protocols', 'uvicorn.protocols.http', 'uvicorn.protocols.http.auto', 'uvicorn.protocols.http.h11_impl', 'uvicorn.protocols.http.httptools_impl', 'uvicorn.protocols.websockets', 'uvicorn.protocols.websockets.auto', 'uvicorn.protocols.websockets.websockets_impl', 'uvicorn.lifespan', 'uvicorn.lifespan.on', 'uvicorn.middleware', 'uvicorn.middleware.proxy_headers', 'starlette.routing', 'starlette.middleware', 'starlette.middleware.cors', 'starlette.middleware.base', 'starlette.responses', 'starlette.requests', 'starlette.staticfiles', 'starlette.applications', 'starlette.datastructures', 'starlette.background', 'starlette.concurrency', 'starlette.exceptions', 'starlette.types', 'fastapi', 'fastapi.routing', 'fastapi.middleware', 'fastapi.middleware.cors', 'fastapi.responses', 'fastapi.staticfiles', 'slowapi', 'slowapi.extension', 'slowapi.util', 'slowapi.errors', 'limits', 'limits.storage', 'limits.strategies', 'pydantic_settings', 'pydantic', 'aiofiles', 'aiofiles.os', 'aiofiles.threadpool', 'httpx', 'httpx._transports.default', 'httpx._transports.asgi', 'Crypto', 'Crypto.Cipher', 'Crypto.Cipher.AES', 'Crypto.Random', 'Crypto.Util.Padding', 'certifi', 'h11', 'anyio', 'anyio._backends._asyncio', 'sniffio', 'webview', 'webview.platforms.cocoa', 'webview.js.api']
datas += collect_data_files('certifi')
datas += copy_metadata('yt-dlp')
datas += copy_metadata('bgutil-ytdlp-pot-provider')
tmp_ret = collect_all('yt_dlp')
datas += tmp_ret[0]; binaries += tmp_ret[1]; hiddenimports += tmp_ret[2]
tmp_ret = collect_all('webview')
datas += tmp_ret[0]; binaries += tmp_ret[1]; hiddenimports += tmp_ret[2]
tmp_ret = collect_all('bgutil_ytdlp_pot_provider')
datas += tmp_ret[0]; binaries += tmp_ret[1]; hiddenimports += tmp_ret[2]


a = Analysis(
    ['desktop_app.py'],
    pathex=[],
    binaries=binaries,
    datas=datas,
    hiddenimports=hiddenimports,
    hookspath=[],
    hooksconfig={},
    runtime_hooks=['/tmp/rthook_ytdl.py'],
    excludes=[],
    noarchive=False,
    optimize=0,
)
pyz = PYZ(a.pure)

exe = EXE(
    pyz,
    a.scripts,
    [],
    exclude_binaries=True,
    name='YouTube Downloader',
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    console=False,
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
)
coll = COLLECT(
    exe,
    a.binaries,
    a.datas,
    strip=False,
    upx=True,
    upx_exclude=[],
    name='YouTube Downloader',
)
app = BUNDLE(
    coll,
    name='YouTube Downloader.app',
    icon=None,
    bundle_identifier=None,
)
