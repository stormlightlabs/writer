import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { logger } from "./logger";

try {
  await logger.init();
} catch (error) {
  console.error("Failed to initialize frontend logging:", error);
}

logger.info("Frontend bootstrap started");

globalThis.addEventListener("error", (event) => {
  logger.error("Unhandled window error", {
    message: event.message,
    filename: event.filename,
    lineno: event.lineno,
    colno: event.colno,
  });
});

globalThis.addEventListener("unhandledrejection", (event) => {
  logger.error("Unhandled promise rejection", { reason: String(event.reason) });
});

ReactDOM.createRoot(document.querySelector("#root") as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
