/* oxlint-disable eslint-plugin-react-perf/jsx-no-new-object-as-prop */
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { WorkspacePanel } from "../components/layout/WorkspacePanel";

describe("WorkspacePanel", () => {
  it("renders preview-only mode when preview is enabled without split view", () => {
    const layout = {
      sidebarCollapsed: true,
      topBarsCollapsed: true,
      statusBarCollapsed: true,
      isSplitView: false,
      isPreviewVisible: true,
    } as const;
    const sidebar = {
      locations: [],
      selectedLocationId: undefined,
      selectedDocPath: undefined,
      documents: [],
      isLoading: false,
      filterText: "",
      onAddLocation: vi.fn(),
      onRemoveLocation: vi.fn(),
      onSelectLocation: vi.fn(),
      onSelectDocument: vi.fn(),
      onFilterChange: vi.fn(),
    };
    const toolbar = {
      saveStatus: "Idle" as const,
      isSplitView: false,
      isFocusMode: false,
      isPreviewVisible: true,
      onSave: vi.fn(),
      onToggleSplitView: vi.fn(),
      onToggleFocusMode: vi.fn(),
      onTogglePreview: vi.fn(),
      onOpenSettings: vi.fn(),
    };
    const tabs = { tabs: [], activeTabId: null, onSelectTab: vi.fn(), onCloseTab: vi.fn(), onReorderTabs: vi.fn() };
    const editor = {
      initialText: "# Hidden",
      theme: "dark" as const,
      showLineNumbers: true,
      onChange: vi.fn(),
      onSave: vi.fn(),
      onCursorMove: vi.fn(),
      onSelectionChange: vi.fn(),
    };
    const preview = {
      renderResult: {
        html: "<p>Preview content</p>",
        metadata: { title: null, outline: [], links: [], task_items: { total: 0, completed: 0 }, word_count: 2 },
      },
      theme: "dark" as const,
      editorLine: 1,
      onScrollToLine: vi.fn(),
    };
    const statusBar = { cursorLine: 1, cursorColumn: 1, wordCount: 0, charCount: 0 };

    const { container } = render(
      <WorkspacePanel
        layout={layout}
        sidebar={sidebar}
        toolbar={toolbar}
        tabs={tabs}
        editor={editor}
        preview={preview}
        statusBar={statusBar} />,
    );

    expect(screen.getByText("Preview content")).toBeInTheDocument();
    expect(container.querySelector("[data-testid='editor-container']")).not.toBeInTheDocument();
  });
});
