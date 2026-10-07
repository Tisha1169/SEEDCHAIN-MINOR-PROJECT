import { createRoot } from "react-dom/client";
import { setBaseUrl } from "@workspace/api-client-react";
import "./i18n";
import App from "./App";
import "./index.css";

// Same-origin by default (the API serves or proxies the SPA). Set VITE_API_BASE_URL only for split deployments.
setBaseUrl((import.meta.env.VITE_API_BASE_URL as string | undefined) || null);

createRoot(document.getElementById("root")!).render(<App />);
