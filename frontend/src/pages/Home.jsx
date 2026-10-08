import { useState } from "react";
import Header from "../components/Header";
import InputModeSelector from "../components/InputModeSelector";
import ReviewInput from "../components/ReviewInput";
import ImageUploader from "../components/ImageUploader";
import UrlInput from "../components/UrlInput";
import ExampleReview from "../components/ExampleReview";
import Verdict from "../components/Verdict";
import Gauge from "../components/Gauge";
import Signal from "../components/Signal";
import LimeExplanation from "../components/LimeExplanation";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { analyzeImage, explainReview, predictReview, scrapeProduct } from "../api";

function saveAnalysis(entry) {
  const saved = { ...entry, analyzed_at: new Date().toISOString() };
  let history = [];
  try { history = JSON.parse(window.localStorage.getItem("trustlens.analysisHistory") || "[]"); } catch { history = []; }
  history.push(saved);
  window.localStorage.setItem("trustlens.analysisHistory", JSON.stringify(history.slice(-100)));
  window.localStorage.setItem("trustlens.latestProductAnalysis", JSON.stringify(saved));
}

export default function Home() {
  const [mode, setMode] = useState("text");
  const [reviewText, setReviewText] = useState("");
  const [rating, setRating] = useState(5);
  const [verified, setVerified] = useState(false);
  const [url, setUrl] = useState("");
  const [result, setResult] = useState(null);
  const [productResult, setProductResult] = useState(null);
  const [explanation, setExplanation] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function analyzeReview() {
    if (!reviewText.trim()) { setError("Please enter a review before analyzing."); return; }
    setLoading(true); setError(""); setResult(null); setProductResult(null); setExplanation([]);
    try {
      const prediction = await predictReview({ reviewText, rating, verified });
      setResult(prediction);
      saveAnalysis({
        kind: "text-review", product_title: "Text review analysis", review_extraction_available: true, review_count_found: 1,
        review_predictions: [{ reviewer: "You", text: reviewText, rating, verified_purchase: verified, date: new Date().toISOString(), ...prediction }],
      });
      try {
        const data = await explainReview(reviewText, rating, verified);
        setExplanation(data?.explanation || data?.items || data?.features || []);
      } catch { setExplanation([]); }
    } catch (err) { setError(err.message || "Analysis failed."); }
    finally { setLoading(false); }
  }

  function useExample() {
    setReviewText("Absolutely amazing product! Best thing I have ever bought. The quality is perfect and I highly recommend it to everyone.");
    setRating(5); setVerified(false); setResult(null); setProductResult(null); setExplanation([]); setError(""); setMode("text");
  }

  async function handleImageSelect(file) {
    setLoading(true); setError(""); setResult(null); setProductResult(null);
    try {
      const prediction = await analyzeImage(file);
      setResult(prediction);
      saveAnalysis({
        kind: "screenshot-review", product_title: file.name || "Screenshot analysis", review_extraction_available: true, review_count_found: 1,
        review_predictions: [{ reviewer: "Screenshot review", text: prediction.text, rating: prediction.metadata?.rating, verified_purchase: prediction.metadata?.verified_purchase, date: new Date().toISOString(), ...prediction }],
      });
    }
    catch (err) { setError(err.message || "Image analysis failed."); }
    finally { setLoading(false); }
  }

  async function handleUrlAnalyze() {
    try { new URL(url); } catch { setError("Enter a valid product URL."); return; }
    const capturedAt = new Date().toISOString();
    setLoading(true); setError(""); setResult(null); setProductResult(null); setExplanation([]);
    try {
      const data = await scrapeProduct(url);
      setProductResult(data);
      saveAnalysis({ ...data, kind: "product-url", captured_at: capturedAt });
    }
    catch (err) { setError(err.message || "Could not analyze this product page."); }
    finally { setLoading(false); }
  }

  const fakeProbability = result?.fake_probability ?? result?.fake_score ?? result?.probability ?? null;
  const isFake = result?.prediction === "FAKE" || result?.prediction === "SUSPICIOUS" || result?.label === "FAKE" || result?.label === "SUSPICIOUS";

  return <div className="app-shell">
    <Header />
    <main className="home-page">
      <section className="hero-section"><span className="section-kicker">TRUSTLENS</span><h1>Detect suspicious reviews<br />before they influence you.</h1><p>Analyze review text, screenshots and product pages to identify signals associated with potentially fake or manipulated reviews.</p></section>
      <section className="analysis-card">
        <InputModeSelector mode={mode} onChange={(next) => { setMode(next); setError(""); }} />
        {mode === "text" && <ReviewInput value={reviewText} onChange={setReviewText} rating={rating} onRatingChange={setRating} verified={verified} onVerifiedChange={setVerified} onAnalyze={analyzeReview} loading={loading} />}
        {mode === "image" && <ImageUploader onImageSelect={handleImageSelect} />}
        {mode === "url" && <UrlInput value={url} onChange={setUrl} onAnalyze={handleUrlAnalyze} loading={loading} />}
        {error && <div className="error-message" role="alert">{error}</div>}
        {loading && <div className="loading-state"><span className="spinner" />{mode === "url" ? "Loading product reviews and analyzing them…" : mode === "image" ? "Reading screenshot and analyzing review…" : "Analyzing review…"}</div>}
        {!result && !productResult && mode === "text" && <ExampleReview onUseExample={useExample} />}
      </section>
      {result && <section className="results-section">
        <Verdict result={result} productUrl={mode === "url" ? url : ""} />
        {mode === "image" && <div className="analysis-result-actions"><a href="/dashboard">Open dashboard <span aria-hidden="true">→</span></a></div>}
        <div className="results-grid"><Gauge value={fakeProbability ?? 0} label="Fake probability" tone="danger" /><Gauge value={fakeProbability != null ? 1 - fakeProbability : 0} label="Real probability" tone="success" /></div>
        <div className="signals-section"><h2>Trust signals</h2><Signal label="Model verdict" value={result.prediction || result.label || "UNKNOWN"} detail="Classification from the trained model" /><Signal label="Confidence" value={result.confidence != null ? `${(result.confidence * 100).toFixed(1)}%` : "Unavailable"} detail="Model confidence for the prediction" /><Signal label="Verified purchase" value={result.metadata?.verified_purchase == null ? "Unknown" : result.metadata.verified_purchase ? "Yes" : "No"} detail="Provided metadata" /></div>
        {explanation.length > 0 && <div className="explanation-section"><h2>LIME explanation</h2><p className="chart-caption">Positive weights push toward FAKE; negative weights push toward REAL.</p><LimeExplanation items={explanation} /></div>}
        {result.text && <div className="ocr-extracted"><h2>Extracted review text</h2><p>{result.text}</p></div>}
      </section>}
      {productResult && <section className="product-results" aria-live="polite">
          <div className="product-results-heading"><div><span className="section-kicker">PRODUCT ANALYSIS</span><h2>{productResult.product_title || "Review analysis"}</h2><p>{productResult.site ? `${productResult.site} · ` : ""}{productResult.review_count_found || 0} individual reviews analyzed</p></div><div className="product-result-links"><a href="/dashboard">Open full dashboard →</a><a href={productResult.url || url} target="_blank" rel="noreferrer">View product ↗</a></div></div>
        {productResult.review_extraction_available ? <>
          <div className="product-summary"><div><span>Overall signal</span><strong>{productResult.overall_prediction}</strong></div><div><span>Likely real</span><strong>{productResult.overall_real_percentage}%</strong></div><div><span>Suspicious</span><strong>{productResult.overall_fake_percentage}%</strong></div><div><span>Verified purchases</span><strong>{productResult.review_predictions.filter(r => r.verified_purchase === true).length} / {productResult.review_predictions.length}</strong></div></div>
          <div className="product-charts">
            <ProductDonut title="Trust distribution" data={[{ name: "Likely real", value: productResult.review_predictions.filter(r => r.prediction === "REAL").length, color: "#176b4d" }, { name: "Suspicious / fake", value: productResult.review_predictions.filter(r => r.prediction === "FAKE").length, color: "#c84d4d" }]} />
            <ProductDonut title="Purchase verification" data={[{ name: "Verified", value: productResult.review_predictions.filter(r => r.verified_purchase === true).length, color: "#176b4d" }, { name: "Unverified", value: productResult.review_predictions.filter(r => r.verified_purchase === false).length, color: "#b88420" }, { name: "Unknown", value: productResult.review_predictions.filter(r => r.verified_purchase == null).length, color: "#aab5ae" }]} />
          </div>
          <div className="review-results-list">{productResult.review_predictions.map((review, i) => <ReviewPredictionCard key={`${review.reviewer || "review"}-${i}`} review={review} />)}</div>
        </> : <div className="empty-product-state"><strong>No individual reviews could be extracted from this page.</strong><p>{productResult.prediction_message || "The page may restrict access to review text. No results have been invented."}</p></div>}
      </section>}
    </main>
  </div>;
}

function ReviewPredictionCard({ review }) {
  const [showExplanation, setShowExplanation] = useState(false);
  const [explanation, setExplanation] = useState([]);
  const [explanationLoading, setExplanationLoading] = useState(false);
  const [explanationError, setExplanationError] = useState("");
  async function loadExplanation() {
    if (showExplanation) { setShowExplanation(false); return; }
    setShowExplanation(true);
    if (explanation.length) return;
    setExplanationLoading(true); setExplanationError("");
    try {
      const data = await explainReview(review.text, review.rating, review.verified_purchase);
      setExplanation(data.features || []);
    } catch (err) { setExplanationError(err.message || "LIME explanation unavailable."); }
    finally { setExplanationLoading(false); }
  }
  return <article className="review-result-card">
    <div className="review-result-top"><div><strong>{review.reviewer || "Reviewer"}</strong><span>{review.rating != null ? `★ ${review.rating}/5` : "Rating unavailable"}{review.verified_purchase === true ? " · Verified purchase" : review.verified_purchase === false ? " · Unverified" : ""}{review.date ? ` · ${review.date}` : ""}{review.sentiment?.label ? ` · ${review.sentiment.label} sentiment` : ""}</span></div><b className={`review-badge ${review.prediction === "FAKE" ? "fake" : "real"}`}>{review.prediction === "FAKE" ? "SUSPICIOUS" : "REAL"}</b></div>
    {review.title && <h3>{review.title}</h3>}<p>{review.text}</p><div className="review-result-probs"><span>Real {(review.real_probability * 100).toFixed(1)}%</span><span>Fake {(review.fake_probability * 100).toFixed(1)}%</span><span>Confidence {(review.confidence * 100).toFixed(1)}%</span><span>{review.sentiment?.label || "Sentiment unavailable"}</span></div>
    <button className="explain-review-btn" type="button" onClick={loadExplanation}>{showExplanation ? "Hide LIME explanation" : "Explain this prediction with LIME"}</button>
    {showExplanation && <div className="review-lime"><h4>Words that influenced the fake-review score</h4>{explanationLoading ? <div className="loading-state"><span className="spinner" />Generating local explanation…</div> : explanationError ? <p className="inline-error">{explanationError}</p> : <LimeExplanation items={explanation} />}</div>}
  </article>;
}

function ProductDonut({ title, data }) {
  const total = data.reduce((sum, item) => sum + item.value, 0);
  return <section className="product-chart-card"><h3>{title}</h3>{total ? <>
    <div className="product-donut-wrap"><ResponsiveContainer width="100%" height={205}><PieChart><Pie data={data} dataKey="value" nameKey="name" innerRadius={57} outerRadius={80} paddingAngle={3}>{data.map(item => <Cell key={item.name} fill={item.color} />)}</Pie><Tooltip formatter={(value, name) => [`${value} (${Math.round(value * 100 / total)}%)`, name]} /></PieChart></ResponsiveContainer><strong className="donut-total">{total}<small>reviews</small></strong></div>
    <div className="product-chart-legend">{data.filter(item => item.value > 0).map(item => <div key={item.name}><span><i style={{ background: item.color }} />{item.name}</span><strong>{item.value} · {Math.round(item.value * 100 / total)}%</strong></div>)}</div>
  </> : <p className="chart-empty">No metadata available.</p>}</section>;
}
