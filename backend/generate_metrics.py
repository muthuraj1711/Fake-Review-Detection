import json
from pathlib import Path

from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score, confusion_matrix

from src.amazon_parser import load_reviews
from src.predict import predict

ROOT = Path(__file__).resolve().parent
OUTPUT_DIR = ROOT / "outputs"
OUTPUT_DIR.mkdir(exist_ok=True)

print("Loading dataset...")
df = load_reviews()

y_true = []
y_pred = []

print(f"Running predictions for {len(df)} reviews...")

for _, row in df.iterrows():
    text = str(row.get("review_text", "") or "")
    rating = row.get("rating", None)
    verified = row.get("verified_purchase", None)

    try:
        if rating is not None:
            rating = int(rating)
    except:
        rating = None

    if verified is not None:
        verified = bool(verified)

    try:
        result = predict(text, rating=rating, verified=verified)
        y_pred.append(result["prediction"].upper())
        y_true.append(str(row["label"]).upper())
    except Exception as e:
        print("Skipping:", e)

def norm(x):
    x = str(x).upper().strip()
    if x in ("1", "TRUE", "FAKE", "FRAUD"):
        return "FAKE"
    if x in ("0", "FALSE", "REAL", "GENUINE"):
        return "REAL"
    return x

y_true = [norm(x) for x in y_true]
y_pred = [norm(x) for x in y_pred]

accuracy = accuracy_score(y_true, y_pred)
precision = precision_score(y_true, y_pred, pos_label="FAKE", zero_division=0)
recall = recall_score(y_true, y_pred, pos_label="FAKE", zero_division=0)
f1 = f1_score(y_true, y_pred, pos_label="FAKE", zero_division=0)

cm = confusion_matrix(y_true, y_pred, labels=["REAL", "FAKE"])

metrics = {
    "accuracy": float(accuracy),
    "precision": float(precision),
    "recall": float(recall),
    "f1_score": float(f1),
    "confusion_matrix": {
        "true_negative": int(cm[0][0]),
        "false_positive": int(cm[0][1]),
        "false_negative": int(cm[1][0]),
        "true_positive": int(cm[1][1])
    },
    "dataset": {
        "total_reviews": len(y_true),
        "real_reviews": int(sum(x == "REAL" for x in y_true)),
        "fake_reviews": int(sum(x == "FAKE" for x in y_true))
    }
}

output = OUTPUT_DIR / "metrics.json"

with open(output, "w", encoding="utf-8") as f:
    json.dump(metrics, f, indent=2)

print("\nSUCCESS")
print("Metrics written to:", output)
print(json.dumps(metrics, indent=2))
