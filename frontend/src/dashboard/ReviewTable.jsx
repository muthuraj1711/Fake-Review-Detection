import { CheckCircle2, XCircle } from "lucide-react";

export default function ReviewTable({ reviews = [] }) {
  return (
    <section className="dashboard-card review-table-section">
      <div className="chart-heading">
        <div>
          <span className="section-kicker">REVIEW ANALYSIS</span>
          <h2>Analyzed reviews</h2>
        </div>
      </div>

      <div className="table-wrapper">
        <table className="review-table">
          <thead>
            <tr>
              <th>Reviewer</th>
              <th>Rating</th>
              <th>Prediction</th>
              <th>Confidence</th>
              <th>Verified</th>
              <th>Date</th>
            </tr>
          </thead>

          <tbody>
            {reviews.map((review) => {
              const suspicious =
                review.prediction === "SUSPICIOUS" ||
                review.prediction === "FAKE";

              return (
                <tr key={review.id}>
                  <td>
                    <strong>{review.author || "Anonymous"}</strong>
                    <small>{review.text}</small>
                  </td>

                  <td>{review.rating ?? "—"}?</td>

                  <td>
                    <span
                      className={
                        suspicious
                          ? "status suspicious"
                          : "status real"
                      }
                    >
                      {suspicious ? "Suspicious" : "Real"}
                    </span>
                  </td>

                  <td>
                    {review.confidence != null
                      ? `${review.confidence}%`
                      : "—"}
                  </td>

                  <td>
                    {review.verified ? (
                      <CheckCircle2 size={18} />
                    ) : (
                      <XCircle size={18} />
                    )}
                  </td>

                  <td>{review.date || "—"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
