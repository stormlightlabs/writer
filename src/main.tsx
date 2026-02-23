import { logger } from "$logger";
import { getCurrentWindow } from "@tauri-apps/api/window";
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { QuickCaptureApp } from "./components/capture";
import "@fontsource-variable/ibm-plex-sans";
import "./App.css";

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

// Detect window label and render appropriate app
const windowLabel = getCurrentWindow().label;
logger.info(`Rendering app for window: ${windowLabel}`);

if (windowLabel === "quick_capture") {
  ReactDOM.createRoot(document.querySelector("#root") as HTMLElement).render(
    <React.StrictMode>
      <QuickCaptureApp />
    </React.StrictMode>,
  );
} else {
  ReactDOM.createRoot(document.querySelector("#root") as HTMLElement).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  );
}
