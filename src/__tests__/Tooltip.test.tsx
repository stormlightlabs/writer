import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useCallback, useRef, useState } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Tooltip } from "../components/Tooltip";

function TooltipHarness(
  { visible = true, placement = "bottom" as const, offset = 6, className }: {
    visible?: boolean;
    placement?: "top" | "bottom";
    offset?: number;
    className?: string;
  },
) {
  const anchorRef = useRef<HTMLButtonElement | null>(null);
  return (
    <div>
      <button ref={anchorRef}>Anchor</button>
      <Tooltip anchorRef={anchorRef} visible={visible} placement={placement} offset={offset} className={className}>
        Ctrl+S
      </Tooltip>
    </div>
  );
}

function ToggleHarness() {
  const [visible, setVisible] = useState(false);
  const anchorRef = useRef<HTMLButtonElement | null>(null);
  const handleClick = useCallback(() => {
    setVisible((v) => !v);
  }, []);

  return (
    <div>
      <button ref={anchorRef} onClick={handleClick}>Toggle</button>
      <Tooltip anchorRef={anchorRef} visible={visible}>Ctrl+P</Tooltip>
    </div>
  );
}

describe("Tooltip", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("does not render when not visible", () => {
    render(<TooltipHarness visible={false} />);
    expect(screen.queryByText("Ctrl+S")).not.toBeInTheDocument();
  });

  it("renders into the document body when visible", () => {
    render(<TooltipHarness visible />);
    const tooltip = screen.getByText("Ctrl+S");
    expect(tooltip).toBeInTheDocument();
    expect(document.body).toContainElement(tooltip);
  });

  it("applies bottom placement with computed position", () => {
    vi.spyOn(Element.prototype, "getBoundingClientRect").mockImplementation(function mockRect(this: any) {
      if (this instanceof HTMLButtonElement) {
        return new DOMRect(10, 20, 40, 30);
      }
      return new DOMRect();
    });

    render(<TooltipHarness visible placement="bottom" offset={8} />);
    const tooltip = screen.getByText("Ctrl+S");

    expect(tooltip).toHaveClass("-translate-x-1/2");
    expect(tooltip).not.toHaveClass("-translate-y-full");
    expect(tooltip).toHaveStyle({ left: "30px", top: "58px" });
  });

  it("applies top placement with computed position", () => {
    vi.spyOn(Element.prototype, "getBoundingClientRect").mockImplementation(function mockRect(this: any) {
      if (this instanceof HTMLButtonElement) {
        return new DOMRect(20, 100, 60, 24);
      }
      return new DOMRect();
    });

    render(<TooltipHarness visible placement="top" offset={10} className="custom-tooltip" />);
    const tooltip = screen.getByText("Ctrl+S");

    expect(tooltip).toHaveClass("-translate-x-1/2");
    expect(tooltip).toHaveClass("-translate-y-full");
    expect(tooltip).toHaveClass("custom-tooltip");
    expect(tooltip).toHaveStyle({ left: "50px", top: "90px" });
  });

  it("updates position on viewport changes", async () => {
    let left = 5;
    let top = 15;
    let width = 30;
    let height = 20;

    vi.spyOn(Element.prototype, "getBoundingClientRect").mockImplementation(function mockRect(this: any) {
      if (this instanceof HTMLButtonElement) {
        return new DOMRect(left, top, width, height);
      }
      return new DOMRect();
    });

    render(<ToggleHarness />);
    fireEvent.click(screen.getByText("Toggle"));

    await waitFor(() => {
      const tooltip = screen.getByText("Ctrl+P");
      expect(tooltip).toHaveStyle({ left: "20px", top: "41px" });
    });

    left = 50;
    top = 70;
    width = 50;
    height = 30;
    fireEvent(globalThis as unknown as Window, new Event("resize"));

    await waitFor(() => {
      const tooltip = screen.getByText("Ctrl+P");
      expect(tooltip).toHaveStyle({ left: "75px", top: "106px" });
    });
  });
});
