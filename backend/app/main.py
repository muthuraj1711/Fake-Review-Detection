import asyncio
from pathlib import Path
import json
from typing import Optional

from fastapi import FastAPI, HTTPException, UploadFile, File
from src.ocr import extract_text_from_image, normalize_ocr_review
from src.predict import predict
from src.scraper import scrape_review_url, scrape_with_browser
from src.amazon_parser import dataset_summary, load_reviews
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from src.predict import predict, lime_explain
from src.sentiment import analyze_sentiment

ROOT = Path(__file__).resolve().parents[1]

app = FastAPI(
    title="Fake Review Detection API",
    version="1.0.0",
    description="FastAPI wrapper around the existing TF-IDF + metadata ensemble.",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class ReviewRequest(BaseModel):
    text: str = Field(min_length=1)
    rating: Optional[int] = Field(default=None, ge=1, le=5)
    verified_purchase: Optional[bool] = None

class ExplainRequest(BaseModel):
    text: str = Field(min_length=1)
    num_features: int = Field(default=10, ge=1, le=30)
    rating: Optional[int] = Field(default=None, ge=1, le=5)
    verified_purchase: Optional[bool] = None

class ScrapeRequest(BaseModel):
    url: str
    browser: str = "chromium"
    headless: bool = True

@app.get("/")
def root():
    return {"name": "Fake Review Detection API", "status": "ok"}

@app.get("/api/health")
def health():
    return {"status": "healthy", "models_loaded": True}

@app.post("/api/predict")
def api_predict(request: ReviewRequest):
    print("RECEIVED REQUEST:", request.model_dump())

    try:
        result = predict(
            request.text,
            rating=request.rating,
            verified=request.verified_purchase,
        )
        result["sentiment"] = analyze_sentiment(request.text)
        return result
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@app.post("/api/explain")
def api_explain(request: ExplainRequest):
    try:
        return {
            "text": request.text,
            "explanation_model": "LIME for the trained review classifier",
            "features": lime_explain(
                request.text,
                request.num_features,
                rating=request.rating,
                verified=request.verified_purchase,
            ),
        }
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@app.get("/api/metrics")
def metrics():
    path = ROOT / "outputs" / "metrics.json"
    if not path.exists():
        raise HTTPException(status_code=404, detail="metrics.json not found")
    return json.loads(path.read_text(encoding="utf-8"))

@app.post("/api/ocr")
async def api_ocr(file: UploadFile = File(...)):
    try:
        image_bytes = await file.read()

        raw_text = extract_text_from_image(image_bytes)
        text, rating, verified = normalize_ocr_review(raw_text)

        if not text:
            raise ValueError("No text could be extracted from image")

        result = predict(text, rating=rating, verified=verified)
        result["sentiment"] = analyze_sentiment(text)

        return {
            "filename": file.filename,
            "text": text,
            "prediction": result["prediction"],
            "real_probability": result["real_probability"],
            "fake_probability": result["fake_probability"],
            "confidence": result["confidence"],
            "metadata": result["metadata"],
            "raw_ocr_text": raw_text,
        }

    except ValueError as exc:
        raise HTTPException(
            status_code=400,
            detail=str(exc),
        ) from exc

    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=str(exc),
        ) from exc

@app.get("/api/dashboard")
def dashboard():
    try:
        return dataset_summary()
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=str(exc),
        ) from exc

@app.get("/api/reviews")
def reviews(limit: int = 100):
    try:
        limit = max(1, min(limit, 1000))

        df = load_reviews().head(limit)

        records = df[
            [
                "doc_id",
                "label",
                "rating",
                "verified_purchase",
                "product_category",
                "product_id",
                "product_title",
                "review_title",
                "review_text",
            ]
        ].copy()

        records["verified_purchase"] = (
            records["verified_purchase"].astype(bool)
        )

        records["is_fake"] = records["label"].eq("FAKE").astype(bool)

        return {
            "reviews": records.to_dict(orient="records")
        }

    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc

@app.post("/api/scrape")
def api_scrape(request: ScrapeRequest):
    try:
        if request.browser.lower() == "http":
            result = scrape_review_url(request.url)
        else:
            import threading
            import asyncio

            result_holder = {}
            error_holder = {}

            def run_scraper():
                try:
                    result_holder["result"] = asyncio.run(
                        scrape_with_browser(
                            request.url,
                            browser=request.browser,
                            headless=request.headless,
                        )
                    )
                except Exception as exc:
                    error_holder["error"] = exc

            thread = threading.Thread(target=run_scraper)
            thread.start()
            thread.join()

            if "error" in error_holder:
                raise error_holder["error"]

            result = result_holder["result"]

        # Score structured review objects independently so each review keeps its
        # own rating and purchase verification metadata.
        reviews = result.get("review_details", [])
        if not reviews and result.get("reviews"):
            reviews = [{"text": item} for item in result["reviews"] if isinstance(item, str)]
        predictions = []

        for review in reviews:
            try:
                review_text = review.get("text", "")
                if not review_text.strip():
                    continue
                prediction = predict(
                    review_text,
                    rating=review.get("rating"),
                    verified=review.get("verified_purchase"),
                )

                predictions.append({
                    **review,
                    "prediction": prediction["prediction"],
                    "real_probability": prediction["real_probability"],
                    "fake_probability": prediction["fake_probability"],
                    "confidence": prediction["confidence"],
                    "metadata": prediction["metadata"],
                    "sentiment": analyze_sentiment(review_text),
                })

            except Exception as exc:
                predictions.append({
                    "text": review,
                    "prediction": None,
                    "error": str(exc),
                })

        result["review_count_found"] = len(predictions)
        result["review_extraction_available"] = bool(predictions)
        result["review_predictions"] = predictions
        if not predictions and result.get("site") == "flipkart":
            result["prediction_message"] = "Individual review text could not be extracted from this Flipkart page."
        elif not predictions:
            result["prediction_message"] = "No individual reviews could be extracted from this page."

        if predictions:
            real_count = sum(item["prediction"] == "REAL" for item in predictions)
            fake_count = len(predictions) - real_count
            result["overall_real_percentage"] = round(real_count * 100 / len(predictions))
            result["overall_fake_percentage"] = 100 - result["overall_real_percentage"]
            gap = abs(real_count - fake_count) / len(predictions)
            result["overall_prediction"] = (
                "MIXED" if gap < 0.1 else "TRUSTWORTHY" if real_count > fake_count else "SUSPICIOUS"
            )
        else:
            result["overall_real_percentage"] = None
            result["overall_fake_percentage"] = None
            result["overall_prediction"] = None
        # Preserve the old fields only for a true single-review result.
        if len(predictions) == 1:
            only = predictions[0]
            result.update({key: only.get(key) for key in ("text", "prediction", "real_probability", "fake_probability", "confidence", "metadata")})

        return result

    except ValueError as exc:
        raise HTTPException(
            status_code=400,
            detail=str(exc),
        ) from exc

    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"{type(exc).__name__}: {exc}",
        ) from exc
