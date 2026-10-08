const API_BASE =
  import.meta.env.VITE_API_BASE || "http://127.0.0.1:8000";

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
    ...options,
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(
      data.detail
        ? JSON.stringify(data.detail)
        : `Request failed (${response.status})`
    );
  }

  return data;
}

export async function predictReview({
  reviewText,
  rating,
  verified,
}) {
  const payload = {
    text: reviewText,
    rating: rating ?? null,
    verified_purchase: verified ?? null,
  };

  return request("/api/predict", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}


export async function explainReview(reviewText, rating = null, verified = null) {
  return request("/api/explain", {
    method: "POST",
    body: JSON.stringify({
      text: reviewText,
      num_features: 10,
      rating,
      verified_purchase: verified,
    }),
  });
}

export async function getHealth() {
  return request("/api/health");
}

export async function scrapeProduct(url) {
  return request("/api/scrape", {
    method: "POST",
    body: JSON.stringify({ url, browser: "chromium", headless: true }),
  });
}

export async function analyzeImage(file) {
  const form = new FormData();
  form.append("file", file);
  const response = await fetch(`${API_BASE}/api/ocr`, { method: "POST", body: form });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.detail || `Request failed (${response.status})`);
  return data;
}
