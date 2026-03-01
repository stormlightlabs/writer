import { TreeItem } from "$components/Sidebar/TreeItem";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

const Icon = () => <span aria-hidden="true">I</span>;
const ICON_MEMO = { Component: Icon, size: "sm" as const };

describe("TreeItem", () => {
  it("adds highlight styles when acting as a drop target", () => {
    const { container } = render(<TreeItem icon={ICON_MEMO} label="Folder" isDropTarget />);

    expect(screen.getByText("Folder")).toBeInTheDocument();
    expect(container.firstChild).toHaveClass("!bg-layer-hover-01");
    expect(container.firstChild).toHaveClass("ring-border-interactive");
  });
});
