import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

createRoot(document.getElementById("root")!).render(<App />);

// Installable app + offline shell. Skipped inside the Lovable editor preview (an iframe) and in dev.
if (import.meta.env.PROD && "serviceWorker" in navigator && window.self === window.top) {
  window.addEventListener("load", () => navigator.serviceWorker.register("/sw.js").catch(() => undefined));
}
