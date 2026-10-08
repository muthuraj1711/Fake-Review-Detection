export default function Gauge({
  value = 0,
  label,
  tone = "success",
}) {
  const percentage = Math.max(
    0,
    Math.min(100, value * 100)
  );

  return (
    <div className={`gauge gauge-${tone}`}>
      <div className="gauge-header">
        <span>{label}</span>
        <strong>
          {percentage.toFixed(1)}%
        </strong>
      </div>

      <div className="gauge-track">
        <div
          className="gauge-fill"
          style={{
            width: `${percentage}%`,
          }}
        />
      </div>
    </div>
  );
}