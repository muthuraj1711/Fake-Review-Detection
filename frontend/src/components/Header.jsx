import { LayoutDashboard, Search, ShieldCheck } from "lucide-react";
import { NavLink } from "react-router-dom";

export default function Header() {
  return (
    <header className="site-header">
      <NavLink to="/" className="brand">
        <div className="brand-mark">
          <ShieldCheck size={22} />
        </div>

        <div>
          <strong>TrustLens</strong>
          <span>Fake Review Detection</span>
        </div>
      </NavLink>

      <nav className="site-nav">
        <NavLink
          to="/"
          className={({ isActive }) =>
            isActive ? "nav-link active" : "nav-link"
          }
        >
          <Search size={16} aria-hidden="true" />
          Analyzer
        </NavLink>

        <NavLink
          to="/dashboard"
          className={({ isActive }) =>
            isActive ? "nav-link active" : "nav-link"
          }
        >
          <LayoutDashboard size={16} aria-hidden="true" />
          Dashboard
        </NavLink>
      </nav>
    </header>
  );
}
