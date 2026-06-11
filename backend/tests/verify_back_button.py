import subprocess
import time
import sys
import os

def run():
    # 1. Start the uvicorn server on port 6679 (a unique port to avoid collisions)
    print("Starting local Uvicorn server...")
    server_process = subprocess.Popen(
        ["venv/bin/uvicorn", "app.main:app", "--host", "127.0.0.1", "--port", "6679"],
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True
    )
    
    # Wait for the server to start
    time.sleep(3)
    
    # Check if server started successfully
    if server_process.poll() is not None:
        print("Failed to start Uvicorn server!")
        stdout, stderr = server_process.communicate()
        print("Stdout:", stdout)
        print("Stderr:", stderr)
        sys.exit(1)
        
    print("Uvicorn server started successfully on http://127.0.0.1:6679")
    
    try:
        # 2. Run Playwright script
        from playwright.sync_api import sync_playwright

        print("Launching headless Chromium...")
        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True)
            page = browser.new_page()
            
            print("Navigating to http://127.0.0.1:6679...")
            page.goto("http://127.0.0.1:6679")
            
            # Wait for loading screen to disappear and search input to become visible
            print("Waiting for loading screen to disappear...")
            page.wait_for_selector("#urlInput", state="visible", timeout=5000)
            print("Homepage loaded successfully.")
            
            # Type "new songs" and click Search
            page.locator("#urlInput").fill("new songs")
            page.locator("#search-btn").click()
            print("Searching for 'new songs'...")
            
            # Wait for search modal to display
            page.wait_for_selector("#searchModal", state="visible", timeout=10000)
            print("Search results modal displayed.")
            
            # Verify back button is visible
            go_back_btn = page.locator("#go-back")
            assert go_back_btn.is_visible(), "Back button should be visible"
            
            # Check z-index
            z_index = go_back_btn.evaluate("el => window.getComputedStyle(el).zIndex")
            print(f"Back button z-index is: {z_index}")
            assert int(z_index) == 600, f"Back button z-index should be 600, got {z_index}"
            
            # Click back button
            go_back_btn.click()
            print("Clicked back button.")
            
            # Verify search modal is hidden
            page.wait_for_selector("#searchModal", state="hidden", timeout=5000)
            print("Search modal hidden successfully.")
            
            browser.close()
            
        print("Verification completed successfully! The back button z-index and hide/show transitions work perfectly.")
    finally:
        # 3. Shutdown the server
        print("Stopping server...")
        server_process.terminate()
        server_process.wait()
        print("Server stopped.")

if __name__ == "__main__":
    run()
