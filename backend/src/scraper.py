import json
import re
from typing import Any
from urllib.parse import urlparse, parse_qs

import httpx
from bs4 import BeautifulSoup
from playwright.async_api import async_playwright


HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/131.0.0.0 Safari/537.36"
    )
}


def _clean(text: str) -> str:
    return re.sub(r"\s+", " ", text).strip()


def _detect_site(url: str) -> str:
    lower = url.lower()

    if "amazon." in lower or "amzn." in lower:
        return "amazon"

    if "flipkart.com" in lower:
        return "flipkart"

    raise ValueError(
        "Only Amazon and Flipkart URLs are supported."
    )


def _flipkart_review_url(url: str) -> str:
    parsed = urlparse(url)
    query = parse_qs(parsed.query)

    pid = query.get("pid", [None])[0]

    if not pid:
        return url

    path = parsed.path.rstrip("/")

    if "product-reviews" in path:
        return url

    if "/p/" not in path:
        return url

    item_id = path.split("/p/")[-1]

    return (
        "https://www.flipkart.com/"
        f"a/product-reviews/{item_id}"
        f"?pid={pid}"
    )


def _json_ld(soup: BeautifulSoup) -> list[dict[str, Any]]:
    results = []

    for tag in soup.find_all(
        "script",
        type="application/ld+json"
    ):
        try:
            data = json.loads(
                tag.string or tag.get_text()
            )
        except Exception:
            continue

        if isinstance(data, dict):
            results.append(data)

        elif isinstance(data, list):
            for item in data:
                if isinstance(item, dict):
                    results.append(item)

    return results


def _clean_review(text: str) -> str | None:
    text = _clean(text)

    if len(text) < 15:
        return None

    lower = text.lower()

    blocked = [
        "there was a problem filtering reviews",
        "please reload the page",
        "helpful sending feedback",
        "thank you for your feedback",
        "sorry, there was an error",
        "sorry, we failed",
        "report sending feedback",
        "write a product review",
        "video player is loading",
        "current time",
        "duration",
        "stream type",
        "captions settings",
        "fullscreen",
        "modal dialog",
        "brief content visible",
        "full content visible",
        "read more read less",
        "opens in a new tab",
        "cancel report",
        "more hide",
        "images in this review",
    ]

    if any(item in lower for item in blocked):
        return None

    text = re.sub(
        r"\b(?:Read more|Read less|More|Hide)\b",
        " ",
        text,
        flags=re.I,
    )

    text = _clean(text)

    words = re.findall(r"[A-Za-z]+", text)

    if len(words) < 3:
        return None

    if len(text) > 1200:
        return None

    return text


def _parse_rating(text: str) -> float | None:
    match = re.search(
        r"([1-5](?:\.[0-9])?)\s+out\s+of\s+5",
        text,
        re.I,
    )

    if match:
        try:
            return float(match.group(1))
        except ValueError:
            return None

    return None


def _amazon_reviews(
    soup: BeautifulSoup,
) -> list[dict[str, Any]]:

    results = []
    seen = set()

    # Amazon has used several equivalent review-card wrappers over time.
    cards = soup.select(
        '[data-hook="review"], div[id^="customer_review-"], '
        'div[id^="customer_review_"], .a-section.review, '
        '[data-testid="review"]'
    )

    for card in cards:

        body_element = card.select_one('[data-hook="reviewRichContentContainer"]')
        if not body_element:
            body_element = card.select_one(
            '[data-hook="review-body"] span, [data-hook="review-body"], '
            '[data-hook="reviewText"] span, [data-hook="reviewText"] p, [data-hook="reviewText"], '
            '.review-text-content, .review-text, [data-testid="review-text"]'
            )

        if not body_element:
            continue

        body = _clean_review(
            body_element.get_text(
                " ",
                strip=True
            )
        )

        if not body:
            continue

        if body in seen:
            continue

        seen.add(body)

        reviewer = None

        author = card.select_one(
            ".a-profile-name"
        )

        if author:
            reviewer = _clean(
                author.get_text(
                    " ",
                    strip=True
                )
            )

        title = None

        title_element = card.select_one(
            '[data-hook="review-title"], [data-hook="reviewTitle"]'
        )

        if title_element:
            title = _clean(
                title_element.get_text(
                    " ",
                    strip=True
                )
            )

            title = re.sub(
                r"^\s*\d(?:\.\d)?\s+out of 5 stars\s*",
                "",
                title,
                flags=re.I,
            )

        rating = None

        rating_element = card.select_one(
            '[data-hook="review-star-rating"], '
            '[data-hook="cmps-review-star-rating"]'
        )

        if rating_element:
            rating = _parse_rating(
                rating_element.get_text(
                    " ",
                    strip=True
                )
            )

        if rating is None:
            rating = _parse_rating(
                card.get_text(
                    " ",
                    strip=True
                )
            )

        date = None

        date_element = card.select_one(
            '[data-hook="review-date"], [data-hook="reviewDate"]'
        )

        if date_element:
            date = _clean(
                date_element.get_text(
                    " ",
                    strip=True
                )
            )

        card_text = card.get_text(
            " ",
            strip=True
        ).lower()

        verified = True if "verified purchase" in card_text else False if "verified purchase" not in card_text else None

        results.append({
            "reviewer": reviewer,
            "rating": rating,
            "title": title,
            "text": body,
            "date": date,
            "verified_purchase": verified,
        })

    return results[:20]


def _amazon_fallback_reviews(
    soup: BeautifulSoup,
) -> list[dict[str, Any]]:

    results = []
    seen = set()

    # Amazon sometimes changes the review-card markup.
    # Look specifically for review-body elements.
    bodies = soup.select(
        '[data-hook="review-body"] span, [data-hook="review-body"], '
        '[data-hook="reviewRichContentContainer"], '
        '.review-text-content, [data-testid="review-text"]'
    )

    for body_element in bodies:

        text = _clean_review(
            body_element.get_text(
                " ",
                strip=True
            )
        )

        if not text:
            continue

        if text in seen:
            continue

        seen.add(text)

        parent = body_element

        for _ in range(6):
            if parent.parent is None:
                break

            parent = parent.parent

            parent_text = parent.get_text(
                " ",
                strip=True
            )

            if (
                "out of 5 stars" in parent_text
                or "Verified Purchase" in parent_text
            ):
                break

        reviewer = None

        author = parent.select_one(
            ".a-profile-name"
        )

        if author:
            reviewer = _clean(
                author.get_text(
                    " ",
                    strip=True
                )
            )

        rating = _parse_rating(
            parent.get_text(
                " ",
                strip=True
            )
        )

        title = None

        title_element = parent.select_one(
            '[data-hook="review-title"]'
        )

        if title_element:
            title = _clean(
                title_element.get_text(
                    " ",
                    strip=True
                )
            )

        date = None

        date_element = parent.select_one(
            '[data-hook="review-date"]'
        )

        if date_element:
            date = _clean(
                date_element.get_text(
                    " ",
                    strip=True
                )
            )

        parent_text_lower = parent.get_text(
            " ",
            strip=True
        ).lower()

        verified = True if "verified purchase" in parent_text_lower else False

        results.append({
            "reviewer": reviewer,
            "rating": rating,
            "title": title,
            "text": text,
            "date": date,
            "verified_purchase": verified,
        })

    return results[:20]


def _flipkart_reviews(
    soup: BeautifulSoup,
) -> list[dict[str, Any]]:

    results = []
    seen = set()

    # Keep extraction conservative: generic class names include controls and
    # product copy, so only accept explicitly review-shaped text elements.
    selectors = ['[data-testid="review-text"]', '[class*="_2-N8zT"]', '[class*="review-text"]']

    for selector in selectors:

        for element in soup.select(selector):

            text = _clean_review(
                element.get_text(
                    " ",
                    strip=True
                )
            )

            if not text:
                continue

            if text in seen:
                continue

            seen.add(text)

            if len(text) < 35:
                continue
            results.append({
                "reviewer": None,
                "rating": None,
                "title": None,
                "text": text,
                "date": None,
                "verified_purchase": None,
            })

    return results[:20]


def _extract_rating(
    soup: BeautifulSoup,
) -> float | None:

    for item in _json_ld(soup):

        aggregate = item.get(
            "aggregateRating"
        )

        if isinstance(aggregate, dict):

            value = aggregate.get(
                "ratingValue"
            )

            try:
                if value is not None:
                    return float(value)
            except (TypeError, ValueError):
                pass

    return None


def _parse_page(
    html: str,
    url: str,
) -> dict[str, Any]:

    soup = BeautifulSoup(
        html,
        "lxml"
    )

    site = _detect_site(url)

    title = None

    if soup.title:
        title = soup.title.get_text(
            " ",
            strip=True
        )

    if site == "amazon":

        review_objects = _amazon_reviews(
            soup
        )

        if not review_objects:
            review_objects = _amazon_fallback_reviews(
                soup
            )

    else:
        review_objects = []

    reviews = [
        item["text"]
        for item in review_objects
    ]

    product_rating = _extract_rating(
        soup
    )

    first_review = (
        review_objects[0]
        if review_objects
        else None
    )

    return {
        "url": url,
        "site": site,
        "product_title": title,
        "description": None,

        "review_text": (
            first_review["text"]
            if first_review
            else None
        ),

        "rating": (
            first_review["rating"]
            if first_review
            and first_review["rating"] is not None
            else product_rating
        ),

        "verified_purchase": (
            first_review["verified_purchase"]
            if first_review
            else None
        ),

        "reviews": reviews,
        "review_details": review_objects,
        "review_count_found": len(
            review_objects
        ),
    }


async def scrape_with_browser(
    url: str,
    browser: str = "chromium",
    headless: bool = True,
) -> dict[str, Any]:

    if not url.startswith(
        ("http://", "https://")
    ):
        raise ValueError(
            "URL must start with http:// or https://"
        )

    site = _detect_site(url)

    browser_name = browser.lower().strip()

    async with async_playwright() as p:

        if browser_name == "chromium":

            browser_instance = (
                await p.chromium.launch(
                    headless=headless
                )
            )

        elif browser_name == "chrome":

            browser_instance = (
                await p.chromium.launch(
                    channel="chrome",
                    headless=headless
                )
            )

        elif browser_name == "edge":

            browser_instance = (
                await p.chromium.launch(
                    channel="msedge",
                    headless=headless
                )
            )

        elif browser_name == "firefox":

            browser_instance = (
                await p.firefox.launch(
                    headless=headless
                )
            )

        elif browser_name == "webkit":

            browser_instance = (
                await p.webkit.launch(
                    headless=headless
                )
            )

        else:
            raise ValueError(
                f"Unsupported browser '{browser}'."
            )

        try:

            page = await browser_instance.new_page(
                viewport={
                    "width": 1440,
                    "height": 1000,
                }
            )

            target_url = url

            if site == "flipkart":
                target_url = _flipkart_review_url(
                    url
                )

            await page.goto(
                target_url,
                wait_until="domcontentloaded",
                timeout=30000,
            )

            await page.wait_for_timeout(
                7000
            )

            for _ in range(25):

                await page.mouse.wheel(
                    0,
                    1400
                )

                await page.wait_for_timeout(
                    500
                )

            await page.wait_for_timeout(
                3000
            )

            html = await page.content()

            result = _parse_page(
                html,
                page.url
            )

            # Product pages often render no review cards while the dedicated
            # review listing does. Try that first-party page as a fallback.
            if site == "amazon" and not result.get("review_details"):
                asin = re.search(r"/(?:dp|gp/product|product-reviews)/([A-Z0-9]{10})", page.url, re.I)
                if asin:
                    reviews_url = f"https://www.amazon.in/product-reviews/{asin.group(1)}?reviewerType=all_reviews&pageNumber=1"
                    try:
                        await page.goto(reviews_url, wait_until="domcontentloaded", timeout=20000)
                        await page.wait_for_timeout(2500)
                        result = _parse_page(await page.content(), page.url)
                    except Exception:
                        pass

            result["url"] = url

            return result

        finally:
            await browser_instance.close()


def scrape_review_url(
    url: str,
) -> dict[str, Any]:

    if not url.startswith(
        ("http://", "https://")
    ):
        raise ValueError(
            "URL must start with http:// or https://"
        )

    _detect_site(url)

    response = httpx.get(
        url,
        headers=HEADERS,
        timeout=15,
        follow_redirects=True,
    )

    response.raise_for_status()

    return _parse_page(
        response.text,
        str(response.url)
    )
