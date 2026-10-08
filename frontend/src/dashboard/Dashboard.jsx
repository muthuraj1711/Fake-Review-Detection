import { useEffect, useMemo, useState } from "react";
import { RefreshCw, Database, ShieldCheck, Star, MessageSquare, ArrowUpRight } from "lucide-react";
import { Bar, BarChart, CartesianGrid, Cell, ComposedChart, Line, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import Header from "../components/Header";
import LimeExplanation from "../components/LimeExplanation";
import { explainReview } from "../api";

const API = import.meta.env.VITE_API_BASE || "http://127.0.0.1:8000";
const STORAGE_KEY = "trustlens.latestProductAnalysis";
const COLORS = { real: "#176b4d", fake: "#c84d4d", positive: "#176b4d", neutral: "#b88420", negative: "#c84d4d" };
function readHistory() {
  try {
    const entries = JSON.parse(window.localStorage.getItem("trustlens.analysisHistory") || "[]");
    if (Array.isArray(entries) && entries.length) return entries;
    const latest = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || "null");
    return latest ? [latest] : [];
  } catch { return []; }
}

export default function Dashboard() {
  const [dataset, setDataset] = useState(null);
  const [analysis, setAnalysis] = useState(() => {
    try { return JSON.parse(window.localStorage.getItem(STORAGE_KEY) || "null"); } catch { return null; }
  });
  const [history, setHistory] = useState(() => readHistory());
  const [trendPeriod, setTrendPeriod] = useState("year");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  async function load() {
    setLoading(true); setError("");
    try {
      const response = await fetch(`${API}/api/dashboard`);
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.detail || "Dashboard data is unavailable.");
      setDataset(payload);
      try { setAnalysis(JSON.parse(window.localStorage.getItem(STORAGE_KEY) || "null")); } catch { setAnalysis(null); }
      setHistory(readHistory());
    } catch (err) { setError(err.message || "Could not load dashboard data."); }
    finally { setLoading(false); }
  }
  useEffect(() => { load(); }, []);

  const latestAnalysis = history.at(-1) || analysis;
  const reviews = (latestAnalysis?.review_predictions || []).map(review => ({
    ...review,
    analyzed_at: latestAnalysis.analyzed_at,
  }));
  const referenceDate = latestAnalysis?.captured_at || latestAnalysis?.analyzed_at || new Date().toISOString();
  const metrics = useMemo(() => getMetrics(reviews, referenceDate, trendPeriod), [reviews, referenceDate, trendPeriod]);
  const hasProductAnalysis = Boolean(reviews.length);

  return <div className="app-shell"><Header /><main className="dashboard-page">
    <header className="dashboard-header"><div><span className="section-kicker">LATEST REVIEW ANALYSIS</span><h1>{latestAnalysis?.product_title || "Review intelligence"}</h1><p>{hasProductAnalysis ? `${reviews.length} reviews analyzed · ${latestAnalysis?.analyzed_at ? `updated ${new Date(latestAnalysis.analyzed_at).toLocaleString()}` : "latest analysis"}` : "Analyze review text, a screenshot, or a product URL to populate this dashboard."}</p></div><div className="dashboard-actions"><a href="/" className="back-btn">Analyze a review</a><button className="refresh-btn" onClick={load} disabled={loading}><RefreshCw size={16} />{loading ? "Loading…" : "Refresh"}</button></div></header>
    {error && <div className="error-message" role="alert">{error}</div>}
    {loading && <div className="loading-state"><span className="spinner" />Loading dashboard data…</div>}
    {!loading && !hasProductAnalysis && <div className="empty-product-state dashboard-empty"><strong>No product analysis yet</strong><p>Run a product URL analysis first. Its extracted reviews and predictions will appear here.</p><a href="/" className="primary-btn empty-dashboard-action">Analyze a product</a></div>}
    {hasProductAnalysis && <>
      <div className="dashboard-kpis">
        <Kpi icon={<MessageSquare />} label="Reviews analyzed" value={reviews.length} />
        <Kpi icon={<ShieldCheck />} label="Likely real" value={`${metrics.realPercent}%`} detail={`${metrics.realCount} reviews`} />
        <Kpi icon={<ShieldCheck />} label="Suspicious / fake" value={`${metrics.fakePercent}%`} detail={`${metrics.fakeCount} reviews`} />
        <Kpi icon={<Star />} label="Average rating" value={metrics.averageRating == null ? "—" : `${metrics.averageRating.toFixed(1)} / 5`} />
      </div>
      <div className="analytics-grid">
        <Panel eyebrow="TRUST DISTRIBUTION" title="Predicted review authenticity"><div className="dashboard-donut"><ResponsiveContainer width="100%" height={230}><PieChart><Pie data={[{name:"Likely real",value:metrics.realCount,color:COLORS.real},{name:"Suspicious / fake",value:metrics.fakeCount,color:COLORS.fake}]} dataKey="value" nameKey="name" innerRadius={65} outerRadius={93} paddingAngle={3}>{[COLORS.real,COLORS.fake].map(c=><Cell key={c} fill={c}/>)}</Pie><Tooltip /></PieChart></ResponsiveContainer><strong>{reviews.length}<small>reviews</small></strong></div><Legend items={[{label:"Likely real",value:`${metrics.realPercent}%`,color:COLORS.real},{label:"Suspicious / fake",value:`${metrics.fakePercent}%`,color:COLORS.fake}]} /></Panel>
        <Panel eyebrow="SENTIMENT TRENDS" title="Review tone over time"><p className="chart-caption">Lexicon-based word cues from reviews dated within the selected window, anchored to this analysis date ({new Date(referenceDate).toLocaleDateString()}).</p><div className="trend-range-tabs" role="group" aria-label="Sentiment trend time range">{[["week","Week"],["month","Month"],["year","Year"]].map(([key,label])=><button key={key} type="button" className={trendPeriod===key?"active":""} onClick={()=>setTrendPeriod(key)}>{label}</button>)}</div>{metrics.sentimentReviewCount ? <ResponsiveContainer width="100%" height={255}><ComposedChart data={metrics.sentimentSeries} margin={{top:12,right:10,left:-18,bottom:0}}><CartesianGrid strokeDasharray="3 3" stroke="#e8eeea"/><XAxis dataKey="month" tick={{fontSize:11}}/><YAxis allowDecimals={false} tick={{fontSize:11}}/><Tooltip/><Line type="monotone" dataKey="positive" stroke={COLORS.positive} strokeWidth={3} dot={{r:3}}/><Line type="monotone" dataKey="neutral" stroke={COLORS.neutral} strokeWidth={2} dot={{r:3}}/><Line type="monotone" dataKey="negative" stroke={COLORS.negative} strokeWidth={2} dot={{r:3}}/></ComposedChart></ResponsiveContainer> : <div className="chart-empty">No analyzed reviews fall within this {trendPeriod}. Choose a longer window or analyze more recent reviews.</div>}<Legend items={[{label:"Positive",color:COLORS.positive},{label:"Neutral",color:COLORS.neutral},{label:"Negative",color:COLORS.negative}]} /></Panel>
        <Panel eyebrow="RATING DISTRIBUTION" title="Ratings across extracted reviews"><ResponsiveContainer width="100%" height={240}><BarChart data={metrics.ratingSeries} margin={{top:12,right:12,left:-18,bottom:0}}><CartesianGrid strokeDasharray="3 3" stroke="#e8eeea"/><XAxis dataKey="rating" tick={{fontSize:11}}/><YAxis allowDecimals={false} tick={{fontSize:11}}/><Tooltip/><Bar dataKey="reviews" name="Reviews" fill="#176b4d" radius={[5,5,0,0]}/></BarChart></ResponsiveContainer></Panel>
        <Panel eyebrow="PURCHASE VERIFICATION" title="Verification details"><div className="dashboard-donut"><ResponsiveContainer width="100%" height={230}><PieChart><Pie data={metrics.verificationSeries} dataKey="value" nameKey="name" innerRadius={65} outerRadius={93} paddingAngle={3}>{metrics.verificationSeries.map(item=><Cell key={item.name} fill={item.color}/>)}</Pie><Tooltip /></PieChart></ResponsiveContainer><strong>{metrics.verifiedCount}<small>verified</small></strong></div><Legend items={metrics.verificationSeries.map(item=>({label:item.name,value:`${item.value} · ${Math.round(item.value*100/Math.max(reviews.length,1))}%`,color:item.color}))}/></Panel>
      </div>
      <section className="dashboard-review-section"><div className="dashboard-section-heading"><div><span className="section-kicker">REVIEW LEVEL</span><h2>Review predictions and LIME explanations</h2></div><span>{reviews.length} reviews</span></div><div className="review-results-list">{reviews.map((review,index)=><DashboardReview key={`${review.reviewer || "review"}-${index}`} review={review}/>)}</div></section>
      <p className="dashboard-method-note">Sentiment is a lightweight word-cue estimate. REAL/FAKE is the trained classifier’s prediction. LIME explanations show local word contributions to the fake-class score.</p>
    </>}
    {dataset && <details className="training-data-details"><summary><Database size={16}/> Model training dataset reference</summary><div className="dataset-grid"><Kpi icon={<MessageSquare/>} label="Reviews in training data" value={Number(dataset.total_reviews).toLocaleString()}/><Kpi icon={<ShieldCheck/>} label="Real training labels" value={Number(dataset.real_reviews).toLocaleString()}/><Kpi icon={<ShieldCheck/>} label="Fake training labels" value={Number(dataset.fake_reviews).toLocaleString()}/></div></details>}
  </main></div>;
}

function getMetrics(reviews, referenceValue, period) {
  const realCount=reviews.filter(r=>r.prediction==="REAL").length, fakeCount=reviews.filter(r=>r.prediction==="FAKE").length;
  const ratings=reviews.map(r=>Number(r.rating)).filter(n=>n>=1&&n<=5);
  const { series: sentimentSeries, count: sentimentReviewCount } = buildSentimentSeries(reviews, referenceValue, period);
  const ratingSeries=[1,2,3,4,5].map(n=>({rating:`${n} star`,reviews:reviews.filter(r=>Number(r.rating)===n).length}));
  const verifiedCount=reviews.filter(r=>r.verified_purchase===true).length, unverifiedCount=reviews.filter(r=>r.verified_purchase===false).length, unknownCount=reviews.length-verifiedCount-unverifiedCount;
  const verificationSeries=[{name:"Verified",value:verifiedCount,color:COLORS.real},{name:"Unverified",value:unverifiedCount,color:COLORS.neutral},...(unknownCount?[{name:"Unknown",value:unknownCount,color:"#aab5ae"}]:[])];
  return {realCount,fakeCount,realPercent:reviews.length?Math.round(realCount*100/reviews.length):0,fakePercent:reviews.length?Math.round(fakeCount*100/reviews.length):0,averageRating:ratings.length?ratings.reduce((a,b)=>a+b,0)/ratings.length:null,ratingSeries,verifiedCount,verificationSeries,sentimentSeries,sentimentReviewCount};
}
function parseReviewDate(value) {
  if (!value) return null;
  const match = value.match(/\bon\s+(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})/i);
  let date;
  if (match) {
    const monthIndex = new Date(`${match[2]} 1, ${match[3]}`).getMonth();
    date = new Date(Number(match[3]), monthIndex, Number(match[1]), 12);
  } else date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}
function buildSentimentSeries(reviews, referenceValue, period) {
  const anchor = new Date(referenceValue);
  anchor.setHours(23,59,59,999);
  const days = period === "week" ? 7 : period === "month" ? 30 : 365;
  const start = new Date(anchor);
  start.setDate(start.getDate() - days + 1);
  start.setHours(0,0,0,0);
  const buckets = [];
  if (period === "week") {
    for (let offset=0; offset<7; offset++) {
      const date=new Date(start); date.setDate(start.getDate()+offset);
      buckets.push({ key: date.toDateString(), month: date.toLocaleDateString(undefined,{month:"short",day:"numeric"}), positive:0,neutral:0,negative:0 });
    }
  } else if (period === "month") {
    for (let index=0; index<5; index++) buckets.push({key:String(index),month:`Week ${index+1}`,positive:0,neutral:0,negative:0});
  } else {
    const firstMonth=new Date(anchor.getFullYear(),anchor.getMonth()-11,1);
    for (let index=0; index<12; index++) {
      const date=new Date(firstMonth.getFullYear(),firstMonth.getMonth()+index,1);
      buckets.push({key:`${date.getFullYear()}-${date.getMonth()}`,month:date.toLocaleDateString(undefined,{month:"short",year:"2-digit"}),positive:0,neutral:0,negative:0});
    }
  }
  const bucketMap=new Map(buckets.map(bucket=>[bucket.key,bucket]));
  let count=0;
  reviews.forEach(review=>{
    const date=parseReviewDate(review.date)||parseReviewDate(review.analyzed_at);
    if(!date||date<start||date>anchor)return;
    const sentiment=review.sentiment?.label;
    if(!["positive","neutral","negative"].includes(sentiment))return;
    let key;
    if(period==="week") key=date.toDateString();
    else if(period==="month") key=String(Math.min(4,Math.floor((date-start)/ (7*24*60*60*1000))));
    else key=`${date.getFullYear()}-${date.getMonth()}`;
    if(bucketMap.has(key)){bucketMap.get(key)[sentiment]++;count++;}
  });
  return {series:buckets,count};
}
function Kpi({icon,label,value,detail}) { return <article className="dashboard-kpi">{icon}<span>{label}</span><strong>{value}</strong>{detail&&<small>{detail}</small>}</article>; }
function Panel({eyebrow,title,children}) { return <section className="dashboard-panel"><span className="section-kicker">{eyebrow}</span><h2>{title}</h2>{children}</section>; }
function Legend({items}) { return <div className="dashboard-legend">{items.map(item=><div key={item.label}><span><i style={{background:item.color}}/>{item.label}</span>{item.value&&<strong>{item.value}</strong>}</div>)}</div>; }
function DashboardReview({review}) {
  const [open,setOpen]=useState(false),[features,setFeatures]=useState([]),[loading,setLoading]=useState(false),[error,setError]=useState("");
  async function toggle() {
    if(open){setOpen(false);return;} setOpen(true); if(features.length)return;
    setLoading(true);setError(""); try { const result=await explainReview(review.text,review.rating,review.verified_purchase);setFeatures(result.features||[]); } catch(err){setError(err.message||"Could not produce a LIME explanation.");} finally{setLoading(false);}
  }
  return <article className="review-result-card"><div className="review-result-top"><div><strong>{review.reviewer||"Reviewer"}</strong><span>{review.rating!=null?`★ ${review.rating}/5`:"Rating unavailable"}{review.verified_purchase===true?" · Verified":review.verified_purchase===false?" · Unverified":" · Verification unknown"}{review.date?` · ${review.date}`:""}{review.sentiment?.label?` · ${review.sentiment.label} sentiment`:""}</span></div><b className={`review-badge ${review.prediction==="FAKE"?"fake":"real"}`}>{review.prediction==="FAKE"?"SUSPICIOUS":"REAL"}</b></div>{review.title&&<h3>{review.title}</h3>}<p>{review.text}</p><div className="review-result-probs"><span>Real {(review.real_probability*100).toFixed(1)}%</span><span>Fake {(review.fake_probability*100).toFixed(1)}%</span><span>Confidence {(review.confidence*100).toFixed(1)}%</span></div><button type="button" className="explain-review-btn" onClick={toggle}>{open?"Hide LIME explanation":"Show LIME explanation"}</button>{open&&<div className="review-lime"><h4>Words influencing the fake-class score</h4>{loading?<div className="loading-state"><span className="spinner"/>Generating local explanation…</div>:error?<p className="inline-error">{error}</p>:<LimeExplanation items={features}/>}</div>}</article>;
}
