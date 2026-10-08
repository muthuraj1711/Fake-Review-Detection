import json
from pathlib import Path

import joblib
import numpy as np
import pandas as pd

from scipy.sparse import hstack, csr_matrix

from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.pipeline import FeatureUnion
from sklearn.linear_model import LogisticRegression
from sklearn.preprocessing import StandardScaler
from sklearn.model_selection import train_test_split
from sklearn.metrics import (
    accuracy_score,
    precision_score,
    recall_score,
    f1_score,
    confusion_matrix,
    classification_report,
)

from src.amazon_parser import load_reviews


ROOT = Path(__file__).resolve().parent
MODEL_DIR = ROOT / "models"
OUTPUT_DIR = ROOT / "outputs"

MODEL_DIR.mkdir(exist_ok=True)
OUTPUT_DIR.mkdir(exist_ok=True)

RANDOM_STATE = 42
TEST_SIZE = 0.20


def clean_text(text):
    import re

    text = str(text)
    text = re.sub(r"<.*?>", " ", text)
    text = re.sub(r"http\S+|www\.\S+", " ", text)
    text = re.sub(r"[^a-zA-Z0-9\s.,!?']", " ", text)
    text = re.sub(r"\s+", " ", text)
    return text.strip()


def cap_ratio(text):
    words = text.split()
    if not words:
        return 0.0
    return sum(1 for w in words if w.isupper() and len(w) > 1) / len(words)


print("=" * 70)
print("FAKE REVIEW DETECTION - MODEL TRAINING")
print("=" * 70)

print("\n[1/6] Loading dataset...")
df = load_reviews().copy()

required = ["review_text", "label", "rating", "verified_purchase"]
missing = [c for c in required if c not in df.columns]

if missing:
    raise RuntimeError(f"Dataset is missing columns: {missing}")

df["review_text"] = df["review_text"].fillna("").astype(str)
df["text_clean"] = df["review_text"].map(clean_text)

df["label"] = (
    df["label"]
    .astype(str)
    .str.upper()
    .str.strip()
)

df = df[df["label"].isin(["REAL", "FAKE"])].copy()

print(f"Total usable reviews: {len(df)}")
print(df["label"].value_counts().to_string())

texts = df["text_clean"].astype(str).to_numpy()
labels = df["label"].astype(str).to_numpy()

print("\n[2/6] Creating stratified train/test split...")

(
    X_train_text,
    X_test_text,
    y_train,
    y_test,
    train_idx,
    test_idx,
) = train_test_split(
    texts,
    labels,
    np.arange(len(df)),
    test_size=TEST_SIZE,
    random_state=RANDOM_STATE,
    stratify=labels,
)

print(f"Training reviews: {len(X_train_text)}")
print(f"Testing reviews : {len(X_test_text)}")

print("\n[3/6] Training word + character TF-IDF...")

word_vectorizer = TfidfVectorizer(
    analyzer="word",
    ngram_range=(1, 2),
    min_df=2,
    max_df=0.98,
    max_features=70000,
    sublinear_tf=True,
    strip_accents="unicode",
    lowercase=True,
)

char_vectorizer = TfidfVectorizer(
    analyzer="char_wb",
    ngram_range=(3, 5),
    min_df=2,
    max_features=70000,
    sublinear_tf=True,
    lowercase=True,
)

vectorizer = FeatureUnion([
    ("word", word_vectorizer),
    ("char", char_vectorizer),
])

X_train_tfidf = vectorizer.fit_transform(X_train_text)
X_test_tfidf = vectorizer.transform(X_test_text)

print(f"TF-IDF training matrix: {X_train_tfidf.shape}")
print(f"TF-IDF testing matrix : {X_test_tfidf.shape}")

print("\n[4/6] Adding review metadata...")

train_df = df.iloc[train_idx].copy()
test_df = df.iloc[test_idx].copy()


def metadata(frame):
    verified = (
        frame["verified_purchase"]
        .fillna(False)
        .astype(bool)
        .astype(int)
        .values
    )

    ratings = pd.to_numeric(
        frame["rating"],
        errors="coerce"
    ).fillna(3).values

    lengths = frame["text_clean"].map(
        lambda x: len(x.split())
    ).values

    exclaims = frame["review_text"].map(
        lambda x: x.count("!")
    ).values

    caps = frame["review_text"].map(cap_ratio).values

    extreme = np.isin(
        ratings.astype(int),
        [1, 5]
    ).astype(int)

    return np.column_stack([
        verified,
        lengths,
        exclaims,
        caps,
        extreme,
    ]).astype(float)


meta_train_raw = metadata(train_df)
meta_test_raw = metadata(test_df)

scaler = StandardScaler()

meta_train = scaler.fit_transform(meta_train_raw)
meta_test = scaler.transform(meta_test_raw)

X_train = hstack([
    X_train_tfidf,
    csr_matrix(meta_train)
]).tocsr()

X_test = hstack([
    X_test_tfidf,
    csr_matrix(meta_test)
]).tocsr()

print(f"Final training matrix: {X_train.shape}")
print(f"Final testing matrix : {X_test.shape}")

print("\n[5/6] Training Logistic Regression ensemble...")

ensemble = LogisticRegression(
    C=3.0,
    solver="liblinear",
    max_iter=2000,
    class_weight="balanced",
    random_state=RANDOM_STATE,
)

ensemble.fit(X_train, y_train)

predictions = ensemble.predict(X_test)

accuracy = accuracy_score(y_test, predictions)
precision = precision_score(
    y_test,
    predictions,
    pos_label="FAKE",
    zero_division=0,
)
recall = recall_score(
    y_test,
    predictions,
    pos_label="FAKE",
    zero_division=0,
)
f1 = f1_score(
    y_test,
    predictions,
    pos_label="FAKE",
    zero_division=0,
)

cm = confusion_matrix(
    y_test,
    predictions,
    labels=["REAL", "FAKE"],
)

print("\n" + "=" * 70)
print("VALIDATION RESULTS")
print("=" * 70)

print(f"Accuracy : {accuracy * 100:.2f}%")
print(f"Precision: {precision * 100:.2f}%")
print(f"Recall   : {recall * 100:.2f}%")
print(f"F1 Score : {f1 * 100:.2f}%")

print("\nConfusion Matrix:")
print(cm)

print("\nClassification Report:")
print(
    classification_report(
        y_test,
        predictions,
        labels=["REAL", "FAKE"],
        digits=4,
        zero_division=0,
    )
)

print("\n[6/6] Saving model artifacts...")

# Main model used by src.predict.py
joblib.dump(
    vectorizer,
    MODEL_DIR / "tfidf_vectorizer.pkl"
)

joblib.dump(
    ensemble,
    MODEL_DIR / "ensemble_model.pkl"
)

joblib.dump(
    scaler,
    MODEL_DIR / "scaler.pkl"
)

# Separate word-only baseline used by /api/explain.
baseline_vectorizer = TfidfVectorizer(
    analyzer="word",
    ngram_range=(1, 2),
    min_df=2,
    max_df=0.98,
    max_features=70000,
    sublinear_tf=True,
    strip_accents="unicode",
    lowercase=True,
)

X_baseline_train = baseline_vectorizer.fit_transform(
    X_train_text
)

baseline = LogisticRegression(
    C=3.0,
    solver="liblinear",
    max_iter=2000,
    class_weight="balanced",
    random_state=RANDOM_STATE,
)

baseline.fit(X_baseline_train, y_train)

joblib.dump(
    baseline_vectorizer,
    MODEL_DIR / "baseline_vectorizer.pkl"
)

joblib.dump(
    baseline,
    MODEL_DIR / "baseline_model.pkl"
)

metrics = {
    "accuracy": float(accuracy),
    "precision": float(precision),
    "recall": float(recall),
    "f1_score": float(f1),
    "test_size": TEST_SIZE,
    "random_state": RANDOM_STATE,
    "dataset": {
        "total_reviews": int(len(df)),
        "train_reviews": int(len(X_train_text)),
        "test_reviews": int(len(X_test_text)),
        "real_reviews": int((labels == "REAL").sum()),
        "fake_reviews": int((labels == "FAKE").sum()),
    },
    "features": {
        "word_ngrams": "1-2",
        "char_ngrams": "3-5",
        "metadata_features": 5,
        "total_features": int(X_train.shape[1]),
    },
    "confusion_matrix": {
        "true_negative": int(cm[0][0]),
        "false_positive": int(cm[0][1]),
        "false_negative": int(cm[1][0]),
        "true_positive": int(cm[1][1]),
    },
}

with open(
    OUTPUT_DIR / "metrics.json",
    "w",
    encoding="utf-8"
) as f:
    json.dump(metrics, f, indent=2)

print("\nModels saved successfully.")
print(f"Metrics saved to: {OUTPUT_DIR / 'metrics.json'}")

print("\nFINAL ACCURACY:")
print(f"{accuracy * 100:.2f}%")

if accuracy >= 0.75:
    print("\nSUCCESS: Accuracy target of 75%+ achieved.")
else:
    print("\nWARNING: Accuracy is below 75%.")
    print("The training pipeline is correct; further tuning is required.")

print("=" * 70)

