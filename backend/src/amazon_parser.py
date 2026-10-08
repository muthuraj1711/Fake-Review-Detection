from pathlib import Path
import pandas as pd


# backend/src/amazon_parser.py
DATA_PATH = Path(__file__).resolve().parents[2] / "data" / "amazon_reviews.txt"


def load_reviews():
    if not DATA_PATH.exists():
        raise FileNotFoundError(
            f"Dataset not found: {DATA_PATH}"
        )

    df = pd.read_csv(
        DATA_PATH,
        sep="\t",
        encoding="utf-8",
        on_bad_lines="skip"
    )

    # Normalize column names
    df.columns = [
        c.strip().lower()
        for c in df.columns
    ]

    # Convert fields to useful types
    df["doc_id"] = pd.to_numeric(df["doc_id"], errors="coerce")
    df["rating"] = pd.to_numeric(df["rating"], errors="coerce")

    df["verified_purchase"] = (
        df["verified_purchase"]
        .astype(str)
        .str.upper()
        .eq("Y")
    )

    # Convert dataset labels into useful names
    df["label"] = (
        df["label"]
        .astype(str)
        .map({
            # Amazon's original review dataset defines label1 as fake and
            # label2 as truthful. Keep training labels aligned with that source.
            "__label1__": "FAKE",
            "__label2__": "REAL",
        })
        .fillna(df["label"])
    )

    df["review_text"] = df["review_text"].fillna("")
    df["review_title"] = df["review_title"].fillna("")

    return df


def dataset_summary():
    df = load_reviews()

    return {
        "total_reviews": int(len(df)),
        "real_reviews": int((df["label"] == "REAL").sum()),
        "fake_reviews": int((df["label"] == "FAKE").sum()),
        "verified_reviews": int(df["verified_purchase"].sum()),
        "unverified_reviews": int((~df["verified_purchase"]).sum()),
        "average_rating": float(df["rating"].mean()),
        "categories": int(df["product_category"].nunique()),
    }


if __name__ == "__main__":
    df = load_reviews()

    print("Dataset:", DATA_PATH)
    print("Shape:", df.shape)
    print("Columns:", df.columns.tolist())
    print()
    print(df[
        [
            "doc_id",
            "label",
            "rating",
            "verified_purchase"
        ]
    ].head())

    print()
    print(dataset_summary())
