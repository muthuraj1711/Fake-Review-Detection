import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

export default function RatingDistribution({ data = [] }) {
  return (
    <section className="dashboard-card chart-card">
      <div className="chart-heading">
        <div>
          <span className="section-kicker">RATING DISTRIBUTION</span>
          <h2>Ratings vs trust</h2>
        </div>
      </div>

      <div className="chart-container">
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="rating" />
            <YAxis />
            <Tooltip />
            <Bar dataKey="real" name="Real" />
            <Bar dataKey="fake" name="Suspicious" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
