import { AlertTriangle, Star } from "lucide-react";

export default function SuspiciousReviews({ reviews = [] }) {
  return (
    <section className="dashboard-card suspicious-section">
      <div className="chart-heading">
        <div>
          <span className="section-kicker">FLAGGED REVIEWS</span>
          <h2>Suspicious reviews</h2>
        </div>

        <AlertTriangle size={20} />
      </div>

      {reviews.length === 0 ? (
        <div className="empty-state">
          No suspicious reviews found.
        </div>
      ) : (
        <div className="suspicious-list">
          {reviews.map((review) => (
            <article key={review.id}>
              <div className="review-meta">
                <strong>{review.author || "Anonymous"}</strong>

                <span>
                  <Star size={14} fill="currentColor" />
                  {review.rating ?? "—"}
                </span>
              </div>

              <p>{review.text}</p>

              <div className="review-bottom">
                <span>
                  Suspicion score:{" "}
                  <strong>
                    {review.score != null
                      ? `${(review.score * 100).toFixed(0)}%`
                      : "—"}
                  </strong>
                </span>

                <span>{review.date || ""}</span>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
