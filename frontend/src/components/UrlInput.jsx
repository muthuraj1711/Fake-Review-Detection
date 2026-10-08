import { Link } from "lucide-react";

export default function UrlInput({ value, onChange, onAnalyze, loading = false }) {
  return (
    <div className="url-input-card">
      <div className="input-heading">
        <div>
          <h3>Analyze a product or review URL</h3>
          <p>
            Paste a supported product or review page URL to analyze its review data.
          </p>
        </div>
        <Link size={20} />
      </div>

      <div className="url-input-row">
        <input
          type="url"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder="https://example.com/product-or-review"
        />

        <button
          type="button"
          onClick={onAnalyze}
          disabled={loading || !value?.trim()}
        >
          {loading ? "Analyzing..." : "Analyze URL"}
        </button>
      </div>
    </div>
  );
}
