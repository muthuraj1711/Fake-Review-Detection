import { Star, ShieldCheck } from "lucide-react";

export default function ReviewInput({
  value,
  onChange,
  rating = 5,
  onRatingChange,
  verified = false,
  onVerifiedChange,
  onAnalyze,
  loading = false,
}) {
  return (
    <div className="review-input">
      <label className="field-label" htmlFor="review-text">
        Review text
      </label>

      <textarea
        id="review-text"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="Paste the review you want TrustLens to analyze..."
        rows={7}
      />

      <div className="review-options">
        <div className="rating-control">
          <span className="field-label">Rating</span>

          <div className="stars">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                aria-label={`${star} star`}
                className={star <= rating ? "star active" : "star"}
                onClick={() => onRatingChange(star)}
              >
                <Star
                  size={20}
                  fill={star <= rating ? "currentColor" : "none"}
                />
              </button>
            ))}
          </div>
        </div>

        <label className="verified-toggle">
          <input
            type="checkbox"
            checked={verified}
            onChange={(event) => onVerifiedChange(event.target.checked)}
          />

          <ShieldCheck size={18} />

          <span>Verified purchase</span>
        </label>
      </div>

      <button
        type="button"
        className="primary-btn analyze-btn"
        onClick={onAnalyze}
        disabled={loading || !value?.trim()}
      >
        {loading ? "Analyzing..." : "Analyze review"}
      </button>
    </div>
  );
}
