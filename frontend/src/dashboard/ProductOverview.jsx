import { Package, Star, MessageSquare, ShieldCheck } from "lucide-react";

export default function ProductOverview({ product = {} }) {
  return (
    <section className="dashboard-card product-overview">
      <div className="product-title">
        <div className="product-icon">
          <Package size={24} />
        </div>

        <div>
          <span className="section-kicker">PRODUCT OVERVIEW</span>
          <h2>{product.title || "Example Product"}</h2>
        </div>
      </div>

      <div className="overview-stats">
        <div>
          <Star size={18} />
          <strong>{product.rating ?? "—"}</strong>
          <span>Average rating</span>
        </div>

        <div>
          <MessageSquare size={18} />
          <strong>{product.totalReviews ?? "—"}</strong>
          <span>Total reviews</span>
        </div>

        <div>
          <ShieldCheck size={18} />
          <strong>
            {product.verifiedRate != null
              ? `${product.verifiedRate}%`
              : "—"}
          </strong>
          <span>Verified reviews</span>
        </div>

        <div>
          <strong>
            {product.trustScore != null
              ? `${product.trustScore}%`
              : "—"}
          </strong>
          <span>Trust score</span>
        </div>
      </div>
    </section>
  );
}
