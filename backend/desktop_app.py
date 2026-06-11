"""
Desktop entry point — starts a local FastAPI server then opens a native WebKit window.

Development:  python desktop_app.py
Production:   built by build_macos.sh → YouTube Downloader.app / .dmg
"""
import os
import socket
import sys
import threading
import time


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _wait_for_port(port: int, timeout: float = 30) -> bool:
    deadline = time.monotonic() + timeout
    while time.monotonic() < deadline:
        try:
            with socket.create_connection(("127.0.0.1", port), timeout=1):
                return True
        except OSError:
            time.sleep(0.25)
    return False


def _find_ffmpeg() -> str:
    """Return the absolute path to ffmpeg, searching Homebrew locations first."""
    import shutil
    for candidate in (
        "/opt/homebrew/bin/ffmpeg",   # Apple Silicon Homebrew
        "/usr/local/bin/ffmpeg",      # Intel Homebrew
        "/opt/local/bin/ffmpeg",      # MacPorts
    ):
        if os.path.isfile(candidate):
            return candidate
    return shutil.which("ffmpeg") or "ffmpeg"


def _start_server(port: int) -> None:
    # macOS .app bundles don't inherit the user's shell PATH — fix it before
    # importing anything so ffmpeg and other tools are found.
    if getattr(sys, "frozen", False):
        for _p in ("/opt/homebrew/bin", "/usr/local/bin", "/opt/local/bin"):
            if os.path.isdir(_p) and _p not in os.environ.get("PATH", ""):
                os.environ["PATH"] = _p + ":" + os.environ.get("PATH", "")

    # Configure settings before any app import so pydantic-settings picks them up
    os.environ.setdefault("PORT", str(port))
    os.environ.setdefault("HOST", "127.0.0.1")
    os.environ.setdefault(
        "DOWNLOAD_DIR",
        os.path.join(os.path.expanduser("~"), "Downloads", "YT-Downloader"),
    )
    # Resolve ffmpeg to an absolute path so yt-dlp finds it inside the .app bundle
    os.environ.setdefault("FFMPEG_BIN", _find_ffmpeg())
    # Allow the embedded browser origin
    os.environ.setdefault(
        "ALLOWED_ORIGINS",
        '["http://localhost", "http://127.0.0.1", '
        f'"http://localhost:{port}", "http://127.0.0.1:{port}"]',
    )
    os.environ.setdefault("RATE_LIMIT_PER_MINUTE", "60")
    os.environ.setdefault("DEBUG", "false")

    # When frozen by PyInstaller, chdir so relative paths inside the app work
    if getattr(sys, "frozen", False):
        os.chdir(sys._MEIPASS)  # type: ignore[attr-defined]

    import uvicorn
    from app.main import app as fastapi_app  # noqa: F401  (triggers all sub-imports)

    uvicorn.run(fastapi_app, host="127.0.0.1", port=port, log_level="warning")


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main() -> None:
    import multiprocessing
    multiprocessing.freeze_support()  # required by PyInstaller on macOS

    port = 6670

    server_thread = threading.Thread(target=_start_server, args=(port,), daemon=True)
    server_thread.start()

    if not _wait_for_port(port, timeout=45):
        sys.exit("YouTube Downloader: server failed to start within 45 s")

    url = f"http://127.0.0.1:{port}"

    try:
        import webview  # pywebview — native WebKit on macOS

        webview.create_window(
            "YouTube Downloader",
            url,
            width=1280,
            height=820,
            min_size=(900, 600),
        )
        webview.start()
    except ImportError:
        # Fallback: open in system browser (no pywebview installed)
        import webbrowser
        webbrowser.open(url)
        server_thread.join()


if __name__ == "__main__":
    main()
