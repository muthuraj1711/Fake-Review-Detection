import asyncio
from playwright.async_api import async_playwright


URL = "https://www.flipkart.com/a/p/itm1692bd8b2fe84?pid=COMHM94A7PHVCQT7&PARAM=3738&pageUID=1791438366605"


async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)

        page = await browser.new_page(
            viewport={"width": 1440, "height": 900}
        )

        await page.goto(
            URL,
            wait_until="domcontentloaded",
            timeout=30000,
        )

        await page.wait_for_timeout(5000)

        for _ in range(10):
            await page.mouse.wheel(0, 1500)
            await page.wait_for_timeout(1000)

        text = await page.locator("body").inner_text()

        print("\n===== PAGE TEXT =====\n")
        print(text[:20000])

        await page.screenshot(
            path="flipkart_debug.png",
            full_page=True,
        )

        await browser.close()


asyncio.run(main())