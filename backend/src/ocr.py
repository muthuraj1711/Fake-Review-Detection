from io import BytesIO
import re

from PIL import Image
import pytesseract

pytesseract.pytesseract.tesseract_cmd = (
    r"C:\Program Files\Tesseract-OCR\tesseract.exe"
)


def extract_text_from_image(image_bytes: bytes) -> str:
    if not image_bytes:
        raise ValueError("Image is empty")

    try:
        image = Image.open(BytesIO(image_bytes))
    except Exception as exc:
        raise ValueError("Invalid image file") from exc

    text = pytesseract.image_to_string(image)

    return text.strip()


def normalize_ocr_review(raw_text: str) -> tuple[str, int | None, bool | None]:
    """Remove common review-page chrome and recover visible rating/verification metadata."""
    rating_match = re.search(r"\b([1-5](?:\.\d)?)\s*(?:out\s+of\s+5|/\s*5)\b", raw_text, re.I)
    rating = int(float(rating_match.group(1))) if rating_match else None
    lowered = raw_text.lower()
    verified = True if re.search(r"verified\s+purchase", lowered) else (
        False if re.search(r"unverified\s+purchase|not\s+verified", lowered) else None
    )

    cleaned_lines = []
    for line in raw_text.splitlines():
        line = re.sub(r"\s+", " ", line).strip()
        if not line:
            continue
        # Amazon's sticky review navigation often gets OCR'd into the same line
        # as the review content. Remove that known chrome without flattening the
        # remaining line structure.
        line = re.sub(
            r"\bTop\s+About this item\s+Similar\s+Product information\s+From the Brand\s+Reviews?\b",
            " ",
            line,
            flags=re.I,
        )
        line = re.sub(r"\s+", " ", line).strip()
        if not line:
            continue
        lower = line.lower()
        if lower in {"top", "about this item", "similar", "product information", "from the brand", "reviews"}:
            continue
        if any(token in lower for token in (
            "verified purchase", "reviewed in ", "all photos", "all images",
            "helpful", "report", "read more", "read less", "write a review",
        )):
            continue
        line = re.sub(r"\b[1-5](?:\.\d)?\s*(?:out\s+of\s+5|/\s*5)\s*(?:stars?)?\b", " ", line, flags=re.I)
        line = re.sub(r"\s+", " ", line).strip(" ·|-")
        if line:
            cleaned_lines.append(line)
    cleaned = "\n".join(cleaned_lines).strip()
    return cleaned or raw_text.strip(), rating, verified
