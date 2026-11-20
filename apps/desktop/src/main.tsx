import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import QuickAccess from "./components/quick-access/QuickAccess";
const isQuickAccess = new URLSearchParams(window.location.search).has("qam");
document.documentElement.dataset.window = isQuickAccess
  ? "quick-access"
  : "main";
import "./styles.css";
ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    {isQuickAccess ? <QuickAccess /> : <App />}
  </React.StrictMode>,
);
