export default function ExampleReview({ onUseExample }) {
  return (
    <div className="example-review">
      <div>
        <span className="section-kicker">DEMO</span>
        <h3>Try an example review</h3>
        <p>
          See how TrustLens analyzes a review before entering your own.
        </p>
      </div>

      <div className="example-review-text">
        “Absolutely amazing product! Best thing I have ever bought.
        The quality is perfect and I highly recommend it to everyone.”
      </div>

      <div className="example-review-footer">
        <div className="example-rating">
          <span>?????</span>
          <small>5.0 / 5</small>
        </div>

        <button
          type="button"
          className="secondary-btn"
          onClick={onUseExample}
        >
          Analyze this example
        </button>
      </div>
    </div>
  );
}
