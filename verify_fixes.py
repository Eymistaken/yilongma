import os
from playwright.sync_api import sync_playwright

def verify_fixes():
    file_path = os.path.abspath("index.html")
    file_url = f"file://{file_path}"

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        page.goto(file_url)

        print("--- Testing CPS Indicator ---")
        # Initial CPS
        initial_cps = page.text_content("#cps")
        print(f"Initial CPS: {initial_cps}")

        # Click 10 times
        skibidi = page.locator("#skibidi-toilet")
        for _ in range(10):
            skibidi.click()

        print("Clicked 10 times.")

        # Wait for the 1-second interval to update the UI
        page.wait_for_timeout(1100)

        new_cps = page.text_content("#cps")
        print(f"CPS after clicks: {new_cps}")

        if float(new_cps) > 0:
            print("PASS: CPS indicator updated reflecting manual clicks.")
        else:
            print("FAIL: CPS indicator did not update.")

        print("\n--- Testing Slot Machine ---")
        # Cheat to get money
        page.evaluate("window.gameState = window.gameState || {}; window.gameState.score = 5000; window.updateUI && window.updateUI();")

        # Check initial status
        initial_status = page.text_content("#slot-status")
        print(f"Initial Slot Status: {initial_status}")

        # Click Spin
        spin_btn = page.locator("#spin-btn")
        # Ensure button is enabled (might need updateUI to reflect score change if not automatic)
        # Note: updateUI is called in the cheat script above, but let's make sure button is clickable
        if spin_btn.is_disabled():
            print("Spin button disabled? refreshing UI...")
            page.evaluate("updateUI()")

        spin_btn.click()
        print("Clicked Spin.")

        # Check for 'Spinning' state immediately
        page.wait_for_timeout(100)
        spinning_status = page.text_content("#slot-status")
        print(f"Status during spin: {spinning_status}")

        if "Çeviriliyor" in spinning_status:
            print("PASS: Slot machine started spinning.")
        else:
            print("FAIL: Slot machine did not enter spinning state immediately.")

        # Wait for finish (2s animation + buffer)
        page.wait_for_timeout(2500)

        final_status = page.text_content("#slot-status")
        print(f"Status after finish: {final_status}")

        if "Çeviriliyor" not in final_status:
             print("PASS: Slot machine finished spinning.")
        else:
             print("FAIL: Slot machine stuck in spinning state.")

        browser.close()

if __name__ == "__main__":
    verify_fixes()
