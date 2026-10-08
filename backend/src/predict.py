from pathlib import Path
import re

import joblib
import numpy as np
import pandas as pd

from scipy.sparse import hstack, csr_matrix
from lime.lime_text import LimeTextExplainer


META_COLS = [
    "verified_flag",
    "review_length",
    "exclaim_count",
    "cap_word_ratio",
    "extreme_rating",
]

ROOT = Path(__file__).resolve().parents[1]
MODEL_DIR = ROOT / "models"

vectorizer = joblib.load(
    MODEL_DIR / "tfidf_vectorizer.pkl"
)

ensemble = joblib.load(
    MODEL_DIR / "ensemble_model.pkl"
)

scaler = joblib.load(
    MODEL_DIR / "scaler.pkl"
)

baseline_vectorizer = joblib.load(
    MODEL_DIR / "baseline_vectorizer.pkl"
)

baseline = joblib.load(
    MODEL_DIR / "baseline_model.pkl"
)

MODEL_CLASSES = [str(label) for label in ensemble.classes_]
explainer = LimeTextExplainer(class_names=MODEL_CLASSES, random_state=7)


def clean_text(text: str) -> str:
    text = str(text)
    text = re.sub(r"<.*?>", " ", text)
    text = re.sub(r"http\S+|www\.\S+", " ", text)
    text = re.sub(
        r"[^a-zA-Z0-9\s.,!?']",
        " ",
        text,
    )
    return re.sub(r"\s+", " ", text).strip()


def _cap_ratio(text: str) -> float:
    words = text.split()

    if not words:
        return 0.0

    return (
        sum(
            1
            for w in words
            if w.isupper() and len(w) > 1
        )
        / len(words)
    )


def _meta(rating, verified, text: str):
    cleaned = clean_text(text)

    verified_value = (
        scaler.mean_[0]
        if verified is None
        else int(bool(verified))
    )

    rating_value = (
        None
        if rating is None
        else int(rating)
    )

    extreme_value = (
        scaler.mean_[4]
        if rating_value is None
        else int(rating_value in (1, 5))
    )

    raw = np.asarray([[
        verified_value,
        len(cleaned.split()),
        text.count("!"),
        _cap_ratio(text),
        extreme_value,
    ]], dtype=float)

    return scaler.transform(raw)


def predict(
    text: str,
    rating=None,
    verified=None,
):
    if not text or not text.strip():
        raise ValueError(
            "Review text cannot be empty"
        )

    cleaned = clean_text(text)

    tfidf = vectorizer.transform([cleaned])

    meta = _meta(
        rating,
        verified,
        text,
    )

    fused = hstack([
        tfidf,
        csr_matrix(meta),
    ]).tocsr()

    proba = ensemble.predict_proba(fused)[0]

    classes = list(ensemble.classes_)

    fake_index = classes.index("FAKE")
    real_index = classes.index("REAL")

    fake_probability = float(
        proba[fake_index]
    )

    real_probability = float(
        proba[real_index]
    )

    prediction = (
        "FAKE"
        if fake_probability >= 0.5
        else "REAL"
    )

    return {
        "prediction": prediction,
        "real_probability": real_probability,
        "fake_probability": fake_probability,
        "confidence": float(max(proba)),
        "metadata": {
            "verified_purchase": verified,
            "rating": rating,
            "review_length": len(
                cleaned.split()
            ),
            "exclaim_count": text.count("!"),
            "cap_word_ratio": _cap_ratio(text),
            "extreme_rating": (
                None
                if rating is None
                else int(rating in (1, 5))
            ),
        },
    }


def explain(
    text: str,
    num_features: int = 10,
):
    cleaned = clean_text(text)

    X = baseline_vectorizer.transform(
        [cleaned]
    )

    feature_names = (
        baseline_vectorizer
        .get_feature_names_out()
    )

    weights = baseline.coef_[0]

    row = X.toarray()[0]

    active = np.flatnonzero(row)

    ranked = sorted(
        active,
        key=lambda i: abs(
            row[i] * weights[i]
        ),
        reverse=True,
    )[:num_features]

    result = []

    for i in ranked:
        weight = float(
            row[i] * weights[i]
        )

        result.append({
            "word": str(feature_names[i]),
            "weight": weight,
            "direction": (
                "FAKE"
                if weight > 0
                else "REAL"
            ),
        })

    return result


def lime_explain(
    text: str,
    num_features: int = 10,
    rating=None,
    verified=None,
    num_samples: int = 120,
):
    """Return local LIME feature weights for the production ensemble's fake class."""
    if not text or not text.strip():
        raise ValueError("Review text cannot be empty")
    cleaned = clean_text(text)
    fake_index = MODEL_CLASSES.index("FAKE")

    def probability_fn(texts):
        rows = []
        for sample in texts:
            item = predict(str(sample), rating=rating, verified=verified)
            rows.append([
                item["fake_probability"] if label == "FAKE" else item["real_probability"]
                for label in MODEL_CLASSES
            ])
        return np.asarray(rows)

    explanation = explainer.explain_instance(
        cleaned,
        probability_fn,
        labels=(fake_index,),
        num_features=num_features,
        num_samples=num_samples,
    )
    features = []
    for word, weight in explanation.as_list(label=fake_index):
        features.append({
            "word": str(word),
            "weight": float(weight),
            "direction": "FAKE" if weight > 0 else "REAL",
        })
    return features
