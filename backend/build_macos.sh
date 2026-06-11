#!/usr/bin/env bash
# build_macos.sh — builds YouTube Downloader.app and packages it into a DMG
# Usage: cd backend && ./build_macos.sh
set -euo pipefail

APP_NAME="YouTube Downloader"
DMG_NAME="YouTube-Downloader-macOS"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
VENV_DIR="$SCRIPT_DIR/.venv-build"

cd "$SCRIPT_DIR"

echo "▶  Step 1/6 — Set up build virtualenv"
if [ ! -d "$VENV_DIR" ]; then
    python3 -m venv "$VENV_DIR"
fi
# shellcheck source=/dev/null
source "$VENV_DIR/bin/activate"
pip install -q --upgrade pip

echo "▶  Step 2/6 — Install Python dependencies"
pip install -q -r requirements.txt
pip install -q "pywebview>=4.4.1" "pyinstaller>=6.0"

echo "▶  Step 3/6 — Create runtime hook (PATH + freeze_support)"
cat > /tmp/rthook_ytdl.py << 'HOOK'
import multiprocessing
import os

# macOS .app bundles don't inherit the user's shell PATH.
# Prepend common Homebrew/MacPorts locations so ffmpeg is found at runtime.
for _p in ("/opt/homebrew/bin", "/usr/local/bin", "/opt/local/bin"):
    if os.path.isdir(_p) and _p not in os.environ.get("PATH", ""):
        os.environ["PATH"] = _p + ":" + os.environ.get("PATH", "")

# Required by PyInstaller for any app that uses multiprocessing.
multiprocessing.freeze_support()
HOOK

echo "▶  Step 4/6 — Create entitlements.plist"
cat > /tmp/entitlements.plist << 'PLIST'
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN"
  "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <!-- Network access for downloading videos and reaching bgutil -->
    <key>com.apple.security.network.client</key>
    <true/>
    <key>com.apple.security.network.server</key>
    <true/>
    <!-- Write downloaded files to ~/Downloads -->
    <key>com.apple.security.files.downloads.read-write</key>
    <true/>
    <key>com.apple.security.files.user-selected.read-write</key>
    <true/>
    <!-- Allow JIT / unsigned memory needed by some yt-dlp JS runtimes -->
    <key>com.apple.security.cs.allow-jit</key>
    <true/>
    <key>com.apple.security.cs.allow-unsigned-executable-memory</key>
    <true/>
    <!-- Permit loading third-party dylibs bundled by PyInstaller -->
    <key>com.apple.security.cs.disable-library-validation</key>
    <true/>
</dict>
</plist>
PLIST

echo "▶  Step 5/6 — PyInstaller"
pyinstaller \
    --noconfirm \
    --clean \
    --name "$APP_NAME" \
    --windowed \
    --add-data "public:public" \
    --runtime-hook "/tmp/rthook_ytdl.py" \
    \
    --hidden-import "app.main" \
    --hidden-import "app.api.routes" \
    --hidden-import "app.config.settings" \
    --hidden-import "app.services.downloader" \
    --hidden-import "app.services.media" \
    --hidden-import "app.services.search" \
    --hidden-import "app.tasks.cleanup" \
    --hidden-import "app.tasks.downloader" \
    --hidden-import "app.schemas.media" \
    --hidden-import "app.store" \
    --hidden-import "app.utils.crypto" \
    \
    --hidden-import "uvicorn" \
    --hidden-import "uvicorn.config" \
    --hidden-import "uvicorn.main" \
    --hidden-import "uvicorn.server" \
    --hidden-import "uvicorn.logging" \
    --hidden-import "uvicorn.loops" \
    --hidden-import "uvicorn.loops.auto" \
    --hidden-import "uvicorn.loops.asyncio" \
    --hidden-import "uvicorn.protocols" \
    --hidden-import "uvicorn.protocols.http" \
    --hidden-import "uvicorn.protocols.http.auto" \
    --hidden-import "uvicorn.protocols.http.h11_impl" \
    --hidden-import "uvicorn.protocols.http.httptools_impl" \
    --hidden-import "uvicorn.protocols.websockets" \
    --hidden-import "uvicorn.protocols.websockets.auto" \
    --hidden-import "uvicorn.protocols.websockets.websockets_impl" \
    --hidden-import "uvicorn.lifespan" \
    --hidden-import "uvicorn.lifespan.on" \
    --hidden-import "uvicorn.middleware" \
    --hidden-import "uvicorn.middleware.proxy_headers" \
    \
    --hidden-import "starlette.routing" \
    --hidden-import "starlette.middleware" \
    --hidden-import "starlette.middleware.cors" \
    --hidden-import "starlette.middleware.base" \
    --hidden-import "starlette.responses" \
    --hidden-import "starlette.requests" \
    --hidden-import "starlette.staticfiles" \
    --hidden-import "starlette.applications" \
    --hidden-import "starlette.datastructures" \
    --hidden-import "starlette.background" \
    --hidden-import "starlette.concurrency" \
    --hidden-import "starlette.exceptions" \
    --hidden-import "starlette.types" \
    \
    --hidden-import "fastapi" \
    --hidden-import "fastapi.routing" \
    --hidden-import "fastapi.middleware" \
    --hidden-import "fastapi.middleware.cors" \
    --hidden-import "fastapi.responses" \
    --hidden-import "fastapi.staticfiles" \
    \
    --hidden-import "slowapi" \
    --hidden-import "slowapi.extension" \
    --hidden-import "slowapi.util" \
    --hidden-import "slowapi.errors" \
    --hidden-import "limits" \
    --hidden-import "limits.storage" \
    --hidden-import "limits.strategies" \
    \
    --hidden-import "pydantic_settings" \
    --hidden-import "pydantic" \
    \
    --hidden-import "aiofiles" \
    --hidden-import "aiofiles.os" \
    --hidden-import "aiofiles.threadpool" \
    \
    --hidden-import "httpx" \
    --hidden-import "httpx._transports.default" \
    --hidden-import "httpx._transports.asgi" \
    \
    --hidden-import "Crypto" \
    --hidden-import "Crypto.Cipher" \
    --hidden-import "Crypto.Cipher.AES" \
    --hidden-import "Crypto.Random" \
    --hidden-import "Crypto.Util.Padding" \
    \
    --hidden-import "certifi" \
    --hidden-import "h11" \
    --hidden-import "anyio" \
    --hidden-import "anyio._backends._asyncio" \
    --hidden-import "sniffio" \
    \
    --hidden-import "webview" \
    --hidden-import "webview.platforms.cocoa" \
    --hidden-import "webview.js.api" \
    \
    --collect-all "yt_dlp" \
    --collect-all "webview" \
    --collect-all "bgutil_ytdlp_pot_provider" \
    --collect-data "certifi" \
    --copy-metadata "yt-dlp" \
    --copy-metadata "bgutil-ytdlp-pot-provider" \
    \
    desktop_app.py

echo "▶  Step 6/6 — Permissions, code-sign, and DMG"
APP_BUNDLE="dist/$APP_NAME.app"

# Ensure all shared libraries and the main binary are executable
find "$APP_BUNDLE" -type f \( -name "*.so" -o -name "*.dylib" \) -exec chmod 755 {} \;
find "$APP_BUNDLE/Contents/MacOS" -type f -exec chmod 755 {} \;

# Ad-hoc sign with entitlements so network + downloads access works
codesign --deep --force --sign - \
    --entitlements /tmp/entitlements.plist \
    "$APP_BUNDLE" 2>&1 || echo "⚠  Codesign failed — app may trigger Gatekeeper on first launch"

# Package into DMG
rm -f "dist/$DMG_NAME.dmg"
hdiutil create \
    -volname "$APP_NAME" \
    -srcfolder "$APP_BUNDLE" \
    -ov \
    -format UDZO \
    "dist/$DMG_NAME.dmg"

echo ""
echo "✅  Done!"
echo "   App  → dist/$APP_NAME.app"
echo "   DMG  → dist/$DMG_NAME.dmg  ($(du -sh "dist/$DMG_NAME.dmg" | cut -f1))"
echo ""
echo "ℹ️   ffmpeg must be installed: brew install ffmpeg"
echo "ℹ️   Downloaded videos are saved to ~/Downloads/YT-Downloader/"
