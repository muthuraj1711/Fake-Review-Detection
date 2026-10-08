import re


POSITIVE = {
    "amazing", "best", "better", "benefit", "comfortable", "excellent",
    "fantastic", "good", "great", "happy", "helpful", "improve", "improved",
    "love", "nice", "perfect", "positive", "recommend", "reliable", "smooth",
    "useful", "value", "well", "worth", "wonderful", "works",
}
NEGATIVE = {
    "awful", "bad", "broken", "complaint", "disappoint", "disappointed",
    "disappointing", "dirty", "fake", "hate", "horrible", "issue", "issues",
    "poor", "problem", "refund", "return", "terrible", "unusable", "useless",
    "waste", "worst", "fail", "failed", "smell", "fishy",
}
NEGATORS = {"not", "no", "never", "hardly", "isn't", "wasn't", "doesn't", "don't"}


def analyze_sentiment(text: str) -> dict:
    """Small explainable word-cue sentiment score; independent of fake/real prediction."""
    tokens = re.findall(r"[a-z']+", (text or "").lower())
    score = 0.0
    hits = 0
    for index, token in enumerate(tokens):
        value = 1 if token in POSITIVE else -1 if token in NEGATIVE else 0
        if not value:
            continue
        if any(word in NEGATORS for word in tokens[max(0, index - 3):index]):
            value *= -1
        score += value
        hits += 1
    normalized = score / max(hits, 2) if hits else 0.0
    normalized = max(-1.0, min(1.0, normalized))
    label = "positive" if normalized > 0.15 else "negative" if normalized < -0.15 else "neutral"
    return {"label": label, "score": round(normalized, 3), "method": "lexicon"}
