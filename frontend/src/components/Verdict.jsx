import { CheckCircle2, AlertTriangle, ExternalLink } from "lucide-react";

export default function Verdict({ result, productUrl = "" }) {
  const prediction =
    result?.prediction ||
    result?.label ||
    result?.verdict ||
    "UNKNOWN";

  const suspicious =
    prediction === "FAKE" ||
    prediction === "SUSPICIOUS";

  const confidence =
    result?.confidence ??
    result?.fake_probability ??
    result?.probability ??
    null;

  return (
    <div className={`verdict-card ${suspicious ? "suspicious" : "real"}`}>
      <div className="verdict-icon">
        {suspicious ? (
          <AlertTriangle size={30} />
        ) : (
          <CheckCircle2 size={30} />
        )}
      </div>

      <div className="verdict-content">
        <span className="section-kicker">ANALYSIS RESULT</span>

        <h2>
          {suspicious
            ? "Potentially suspicious review"
            : "Likely genuine review"}
        </h2>

        <p>
          {suspicious
            ? "The model found patterns that may be associated with a fake or manipulated review."
            : "The model did not find strong evidence suggesting that this review is fake."}
        </p>

        {confidence !== null && (
          <strong className="verdict-confidence">
            Confidence:{" "}
            {Number(confidence) <= 1
              ? `${(Number(confidence) * 100).toFixed(1)}%`
              : `${Number(confidence).toFixed(1)}%`}
          </strong>
        )}

        {productUrl && (
          <a
            href={productUrl}
            target="_blank"
            rel="noreferrer"
            className="result-link"
          >
            View source page
            <ExternalLink size={15} />
          </a>
        )}
      </div>
    </div>
  );
}
