# TrustLens Frontend

React + Vite frontend for the Fake Review Detection project.

## Run

```bash
npm install
npm run dev
```

The frontend expects FastAPI at:

`http://127.0.0.1:8000`

To change it:

```env
VITE_API_BASE=http://127.0.0.1:8000
```

## Current screen

- Review text input
- Star rating
- Verified purchase signal
- Ensemble prediction
- Fake/real likelihood gauges
- Confidence
- Behavioural signals
- LIME word-level explanation

This is the first frontend module. OCR, URL extraction, bulk analysis and the product analytics dashboard are planned as subsequent modules.
