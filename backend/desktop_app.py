import os
import socket
import sys
import threading
import time


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
    import shutil
    for candidate in (
        "/opt/homebrew/bin/ffmpeg",
        "/usr/local/bin/ffmpeg",
        "/opt/local/bin/ffmpeg",
    ):
        if os.path.isfile(candidate):
            return candidate
    return shutil.which("ffmpeg") or "ffmpeg"


def _start_server(port: int) -> None:
    if getattr(sys, "frozen", False):
        for _p in ("/opt/homebrew/bin", "/usr/local/bin", "/opt/local/bin"):
            if os.path.isdir(_p) and _p not in os.environ.get("PATH", ""):
                os.environ["PATH"] = _p + ":" + os.environ.get("PATH", "")

    os.environ.setdefault("PORT", str(port))
    os.environ.setdefault("HOST", "127.0.0.1")
    os.environ.setdefault(
        "DOWNLOAD_DIR",
        os.path.join(os.path.expanduser("~"), "Downloads", "YT-Downloader"),
    )
    os.environ.setdefault("FFMPEG_BIN", _find_ffmpeg())
    os.environ.setdefault(
        "ALLOWED_ORIGINS",
        '["http://localhost", "http://127.0.0.1", '
        f'"http://localhost:{port}", "http://127.0.0.1:{port}"]',
    )
    os.environ.setdefault("RATE_LIMIT_PER_MINUTE", "60")
    os.environ.setdefault("DEBUG", "false")

    if getattr(sys, "frozen", False):
        os.chdir(sys._MEIPASS)

    import uvicorn
    from app.main import app as fastapi_app

    uvicorn.run(fastapi_app, host="127.0.0.1", port=port, log_level="warning")


def main() -> None:
    import multiprocessing
    multiprocessing.freeze_support()

    port = 6670

    server_thread = threading.Thread(target=_start_server, args=(port,), daemon=True)
    server_thread.start()

    if not _wait_for_port(port, timeout=45):
        sys.exit("YouTube Downloader: server failed to start within 45 s")

    url = f"http://127.0.0.1:{port}"

    try:
        import webview

        webview.create_window(
            "YouTube Downloader",
            url,
            width=1280,
            height=820,
            min_size=(900, 600),
        )
        webview.start()
    except ImportError:
        import webbrowser
        webbrowser.open(url)
        server_thread.join()


if __name__ == "__main__":
    main()
