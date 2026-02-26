import { QuickCaptureApp } from "$components/capture";
import { Route, Router, Switch } from "wouter";
import { useHashLocation } from "wouter/use-hash-location";
import App from "../App";

const NotFoundRoute = () => (
  <main className="flex h-dvh items-center justify-center bg-bg-primary text-text-primary">
    <p className="text-sm text-text-secondary">Route not found.</p>
  </main>
);

export const AppRouter = () => (
  <Router hook={useHashLocation}>
    <Switch>
      <Route path="/" component={App} />
      <Route path="/quick-capture" component={QuickCaptureApp} />
      <Route component={NotFoundRoute} />
    </Switch>
  </Router>
);

export function applyInitialRoute(windowLabel: string): void {
  const targetHash = windowLabel === "quick_capture" ? "#/quick-capture" : "#/";
  if (!globalThis.location.hash || windowLabel === "quick_capture") {
    globalThis.history.replaceState(null, "", targetHash);
  }
}
