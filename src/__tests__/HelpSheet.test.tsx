import { act, fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("$ports", () => {
  const markdownSource = "# Markdown Reference";
  const markdownHtml = `
    <h1>Markdown Reference</h1>
    <h2>Text Formatting</h2>
    <h2>Headings</h2>
    <h2>Lists</h2>
    <h2>Links &amp; Images</h2>
    <h2>Code Blocks</h2>
    <h2>Tables</h2>
  `;

  return {
    markdownHelpGet: (onOk: (value: string) => void, onErr: (error: { message: string }) => void) => ({
      type: "Invoke",
      command: "markdown_help_get",
      payload: {},
      onOk,
      onErr,
    }),
    renderMarkdown: (
      _locationId: number,
      _relPath: string,
      _text: string,
      _profile: string | undefined,
      onOk: (value: { html: string }) => void,
      onErr: (error: { message: string }) => void,
    ) => ({ type: "Invoke", command: "markdown_render", payload: {}, onOk, onErr }),
    runCmd: vi.fn(
      (cmd: { command: string; onOk: (value: unknown) => void; onErr: (error: { message: string }) => void }) => {
        if (cmd.command === "markdown_help_get") {
          cmd.onOk(markdownSource);
          return Promise.resolve();
        }
        if (cmd.command === "markdown_render") {
          cmd.onOk({ html: markdownHtml });
          return Promise.resolve();
        }
        cmd.onErr({ message: `Unexpected command: ${cmd.command}` });
        return Promise.resolve();
      },
    ),
  };
});

import { HelpSheet } from "$components/HelpSheet";
import { resetShortcutsStore, useShortcutsStore } from "$state/stores/shortcuts";
import { resetUiStore, useUiStore } from "$state/stores/ui";

function callback() {
  return void 0;
}

function renderHelpSheet() {
  return render(<HelpSheet isOpen onClose={callback} />);
}

describe("HelpSheet", () => {
  beforeEach(() => {
    resetUiStore();
    resetShortcutsStore();
  });

  it("does not render when closed", () => {
    useUiStore.getState().setHelpSheetOpen(false);

    render(<HelpSheet isOpen={false} onClose={callback} />);

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("renders when open", () => {
    renderHelpSheet();

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText("Help")).toBeInTheDocument();
  });

  it("renders accessible tabs", () => {
    renderHelpSheet();

    expect(screen.getByRole("tab", { name: "Keyboard Shortcuts" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Markdown Help" })).toBeInTheDocument();
  });

  it("shows shortcuts tab by default", () => {
    renderHelpSheet();
    expect(screen.getByText("No keyboard shortcuts registered.")).toBeInTheDocument();
  });

  it("switches to markdown tab when clicked", async () => {
    renderHelpSheet();
    fireEvent.click(screen.getByRole("tab", { name: "Markdown Help" }));
    expect(await screen.findByText("Markdown Reference")).toBeInTheDocument();
  });

  it("supports keyboard navigation between tabs", async () => {
    renderHelpSheet();
    const tabList = screen.getByRole("tablist", { name: "Help sections" });

    fireEvent.keyDown(tabList, { key: "ArrowRight" });

    expect(screen.getByRole("tab", { name: "Markdown Help" })).toHaveAttribute("aria-selected", "true");
    expect(await screen.findByText("Markdown Reference")).toBeInTheDocument();
  });

  it("calls onClose when close button is clicked", () => {
    const onClose = vi.fn();
    render(<HelpSheet isOpen onClose={onClose} />);

    fireEvent.click(screen.getByLabelText("Close help sheet"));

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("calls onClose when Escape is pressed", async () => {
    const onClose = vi.fn();
    render(<HelpSheet isOpen onClose={onClose} />);

    await act(async () => {
      await fireEvent.keyDown(document, { key: "Escape" });
    });

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("displays registered shortcuts", () => {
    resetShortcutsStore();
    useShortcutsStore.getState().registerShortcut({
      id: "test-shortcut",
      category: "Test",
      label: "Test Action",
      keys: ["Cmd", "T"],
      description: "A test shortcut",
    });

    renderHelpSheet();
    expect(screen.getByText("Test Action")).toBeInTheDocument();
    expect(screen.getByText("A test shortcut")).toBeInTheDocument();
    expect(screen.getByText("T")).toBeInTheDocument();
  });

  it("displays markdown help content in markdown tab", async () => {
    renderHelpSheet();
    fireEvent.click(screen.getByRole("tab", { name: "Markdown Help" }));

    expect(await screen.findByText("Text Formatting")).toBeInTheDocument();
    expect(screen.getByText("Headings")).toBeInTheDocument();
    expect(screen.getByText("Lists")).toBeInTheDocument();
    expect(screen.getByText("Links & Images")).toBeInTheDocument();
    expect(screen.getByText("Code Blocks")).toBeInTheDocument();
    expect(screen.getByText("Tables")).toBeInTheDocument();
  });

  it("resets to shortcuts tab when reopened", async () => {
    const { rerender } = render(<HelpSheet isOpen onClose={callback} />);
    fireEvent.click(screen.getByRole("tab", { name: "Markdown Help" }));
    expect(await screen.findByText("Markdown Reference")).toBeInTheDocument();

    rerender(<HelpSheet isOpen={false} onClose={callback} />);
    rerender(<HelpSheet isOpen onClose={callback} />);

    expect(screen.getByRole("tab", { name: "Keyboard Shortcuts" })).toHaveAttribute("aria-selected", "true");
  });
});
