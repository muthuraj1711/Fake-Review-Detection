import { Routes, Route } from "react-router-dom";

import Home from "./pages/Home";
import Dashboard from "./dashboard/Dashboard";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/dashboard" element={<Dashboard />} />
    </Routes>
  );
}
