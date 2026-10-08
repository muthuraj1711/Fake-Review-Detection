export default function Signal({
  label,
  value,
  detail,
}) {
  return (
    <div className="signal-card">
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{detail}</small>
    </div>
  );
}