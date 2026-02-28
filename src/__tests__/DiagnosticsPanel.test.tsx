import { DiagnosticsPanel } from "$components/AppLayout/DiagnosticsPanel";
import type { StyleMatch } from "$editor/types";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

const EMPTY_MATCHES: StyleMatch[] = [];
const STYLE_MATCH: StyleMatch = {
  from: 6,
  to: 15,
  text: "basically",
  category: "filler",
  replacement: "remove",
  line: 1,
  column: 6,
};
const SINGLE_MATCH: StyleMatch[] = [STYLE_MATCH];

describe("DiagnosticsPanel", () => {
  it("shows disabled state when style check is off", () => {
    const onOpenSettings = vi.fn();

    render(
      <DiagnosticsPanel
        isVisible
        styleCheckEnabled={false}
        matches={EMPTY_MATCHES}
        onSelectMatch={vi.fn()}
        onClose={vi.fn()}
        onOpenSettings={onOpenSettings} />,
    );

    expect(screen.getByText("Style Check is disabled")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Open Settings" }));
    expect(onOpenSettings).toHaveBeenCalledOnce();
  });

  it("renders issue rows when style check is enabled", () => {
    const onSelectMatch = vi.fn();

    render(
      <DiagnosticsPanel
        isVisible
        styleCheckEnabled
        matches={SINGLE_MATCH}
        onSelectMatch={onSelectMatch}
        onClose={vi.fn()}
        onOpenSettings={vi.fn()} />,
    );

    fireEvent.click(screen.getByText("basically"));
    expect(onSelectMatch).toHaveBeenCalledWith(STYLE_MATCH);
  });
});
