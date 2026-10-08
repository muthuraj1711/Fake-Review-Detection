import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
} from "recharts";

export default function TrustDistribution({ data = [] }) {
  return (
    <section className="dashboard-card chart-card">
      <div className="chart-heading">
        <div>
          <span className="section-kicker">TRUST DISTRIBUTION</span>
          <h2>Review trust</h2>
        </div>
      </div>

      <div className="chart-container">
        <ResponsiveContainer width="100%" height={260}>
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              innerRadius={65}
              outerRadius={95}
              paddingAngle={3}
            >
              {data.map((entry, index) => (
                <Cell key={index} />
              ))}
            </Pie>

            <Tooltip />
          </PieChart>
        </ResponsiveContainer>
      </div>

      <div className="chart-legend">
        {data.map((item, index) => (
          <div key={index}>
            <span className="legend-dot" />
            <span>{item.name}</span>
            <strong>{item.value}%</strong>
          </div>
        ))}
      </div>
    </section>
  );
}
