# Fake Review Detection — FastAPI Backend

This backend wraps the **existing trained artifacts** rather than retraining the model.

## Required project layout

Copy the existing project artifacts into this backend:

```text
backend/
├── app/
│   └── main.py
├── src/
│   └── predict.py
├── models/
│   ├── baseline_model.pkl
│   ├── ensemble_model.pkl
│   ├── scaler.pkl
│   └── tfidf_vectorizer.pkl
└── outputs/
    └── metrics.json
```

## Start

```powershell
python -m venv .venv
.\.venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

API: `http://127.0.0.1:8000`
Docs: `http://127.0.0.1:8000/docs`

## Endpoints

- `GET /api/health`
- `POST /api/predict`
- `POST /api/explain`
- `GET /api/metrics`

The prediction endpoint preserves the original feature order:

`verified_flag → review_length → exclaim_count → cap_word_ratio → extreme_rating`

Unknown verified/rating values use the scaler's training means, matching the original app's neutral-metadata approach.
