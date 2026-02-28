import { QuickCaptureApp } from "$components/QuickCapture";
import { Route, Router, Switch, useLocation } from "wouter";
import { useHashLocation } from "wouter/use-hash-location";
import App from "./App";

const NotFoundRoute = () => (
  <main className="flex h-dvh items-center justify-center bg-bg-primary text-text-primary">
    <p className="text-sm text-text-secondary">Route not found.</p>
  </main>
);

const AppShellRoute = () => {
  const [location] = useLocation();

  if (location === "/" || location === "/settings" || location === "/diagnostics") {
    return <App />;
  }

  return <NotFoundRoute />;
};

export const AppRouter = () => (
  <Router hook={useHashLocation}>
    <Switch>
      <Route path="/quick-capture" component={QuickCaptureApp} />
      <Route component={AppShellRoute} />
    </Switch>
  </Router>
);

export function applyInitialRoute(windowLabel: string): void {
  const targetHash = windowLabel === "quick_capture" ? "#/quick-capture" : "#/";
  if (!globalThis.location.hash || windowLabel === "quick_capture") {
    globalThis.history.replaceState(null, "", targetHash);
  }
}
