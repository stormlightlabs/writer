import { LayoutSettingsPanel, RoutedSettingsSheet } from "$components/layout/LayoutSettingsPanel";
import { resetUiStore, useUiStore } from "$state/stores/ui";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { Router } from "wouter";
import { useHashLocation } from "wouter/use-hash-location";

function renderSettingsSheets() {
  return render(
    <Router hook={useHashLocation}>
      <LayoutSettingsPanel />
      <RoutedSettingsSheet />
    </Router>,
  );
}

describe("Layout settings routing", () => {
  beforeEach(() => {
    resetUiStore();
    globalThis.history.replaceState(null, "", "#/");
  });

  it("opens routed settings sheet from view more and closes back to base route", async () => {
    useUiStore.getState().setLayoutSettingsOpen(true);

    renderSettingsSheets();

    fireEvent.click(screen.getByRole("button", { name: "View more" }));

    expect(globalThis.location.hash).toContain("/settings");
    expect(useUiStore.getState().layoutSettingsOpen).toBe(false);
    expect(screen.getByRole("dialog", { name: "Settings" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Close settings panel" }));

    await waitFor(() => {
      expect(globalThis.location.hash).toBe("#/");
    });
  });

  it("renders routed settings sheet on /settings", () => {
    globalThis.history.replaceState(null, "", "#/settings");

    render(
      <Router hook={useHashLocation}>
        <RoutedSettingsSheet />
      </Router>,
    );

    expect(screen.getByRole("dialog", { name: "Settings" })).toBeInTheDocument();
  });
});
