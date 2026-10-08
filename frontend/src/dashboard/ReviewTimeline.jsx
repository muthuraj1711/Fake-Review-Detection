import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

export default function ReviewTimeline({ data = [] }) {
  return (
    <section className="dashboard-card chart-card">
      <div className="chart-heading">
        <div>
          <span className="section-kicker">REVIEW TIMELINE</span>
          <h2>Review activity</h2>
        </div>
      </div>

      <div className="chart-container">
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis />
            <Tooltip />
            <Line
              type="monotone"
              dataKey="reviews"
              name="Reviews"
              strokeWidth={2}
            />
            <Line
              type="monotone"
              dataKey="suspicious"
              name="Suspicious"
              strokeWidth={2}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
