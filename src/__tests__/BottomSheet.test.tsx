import { BottomSheet } from "$components/HelpSheet/BottomSheet";
import { useSkipAnimation } from "$hooks/useMotion";
import { resetLayoutStore } from "$state/stores/layout";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("$hooks/useMotion", () => ({ useSkipAnimation: vi.fn(() => false) }));

describe("BottomSheet", () => {
  beforeEach(() => {
    resetLayoutStore();
    vi.mocked(useSkipAnimation).mockReturnValue(false);
    document.body.style.overflow = "";
  });

  afterEach(() => {
    document.body.style.overflow = "";
  });

  it("does not render when closed", () => {
    render(
      <BottomSheet isOpen={false} onClose={vi.fn()}>
        <div data-testid="content">Sheet content</div>
      </BottomSheet>,
    );

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("renders when open", () => {
    render(
      <BottomSheet isOpen onClose={vi.fn()}>
        <div>Sheet content</div>
      </BottomSheet>,
    );

    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("calls onClose when backdrop is clicked", () => {
    const onClose = vi.fn();
    render(
      <BottomSheet isOpen onClose={onClose}>
        <div>Sheet content</div>
      </BottomSheet>,
    );

    fireEvent.click(screen.getByLabelText("Dismiss help sheet"));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("calls onClose when Escape is pressed", () => {
    const onClose = vi.fn();
    render(
      <BottomSheet isOpen onClose={onClose}>
        <div>Sheet content</div>
      </BottomSheet>,
    );

    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("focuses first focusable element when opened", async () => {
    render(
      <BottomSheet isOpen onClose={vi.fn()}>
        <button>First</button>
        <button>Second</button>
      </BottomSheet>,
    );

    const firstButton = screen.getByText("First");

    await waitFor(() => {
      expect(document.activeElement).toBe(firstButton);
    });
  });

  it("cycles focus from last to first element", () => {
    render(
      <BottomSheet isOpen onClose={vi.fn()}>
        <button>First</button>
        <button>Second</button>
      </BottomSheet>,
    );

    const firstButton = screen.getByText("First");
    const secondButton = screen.getByText("Second");

    secondButton.focus();
    fireEvent.keyDown(document, { key: "Tab" });
    expect(document.activeElement).toBe(firstButton);
  });

  it("cycles focus from first to last with shift+tab", () => {
    render(
      <BottomSheet isOpen onClose={vi.fn()}>
        <button>First</button>
        <button>Second</button>
      </BottomSheet>,
    );

    const firstButton = screen.getByText("First");
    const secondButton = screen.getByText("Second");

    firstButton.focus();
    fireEvent.keyDown(document, { key: "Tab", shiftKey: true });
    expect(document.activeElement).toBe(secondButton);
  });

  it("hides body overflow when open", () => {
    document.body.style.overflow = "scroll";

    render(
      <BottomSheet isOpen onClose={vi.fn()}>
        <div>Content</div>
      </BottomSheet>,
    );

    expect(document.body.style.overflow).toBe("hidden");
  });

  it("restores body overflow on unmount", () => {
    document.body.style.overflow = "scroll";
    const initialOverflow = document.body.style.overflow;

    const { unmount } = render(
      <BottomSheet isOpen onClose={vi.fn()}>
        <div>Content</div>
      </BottomSheet>,
    );

    unmount();
    expect(document.body.style.overflow).toBe(initialOverflow);
  });

  it("includes drag handle for dismissal", () => {
    const { container } = render(
      <BottomSheet isOpen onClose={vi.fn()}>
        <div>Content</div>
      </BottomSheet>,
    );

    const dialog = container.querySelector("[role=\"dialog\"]") as HTMLElement;
    const handle = dialog.firstElementChild;

    expect(handle).toBeInTheDocument();
    expect(handle?.className).toContain("cursor-grab");
    expect(handle?.className).toContain("active:cursor-grabbing");
  });
});

describe("BottomSheet drag-to-dismiss", () => {
  beforeEach(() => {
    vi.mocked(useSkipAnimation).mockReturnValue(false);
  });

  it("provides drag handle with touch support", () => {
    const { container } = render(
      <BottomSheet isOpen onClose={vi.fn()}>
        <div>Content</div>
      </BottomSheet>,
    );

    const dialog = container.querySelector("[role=\"dialog\"]") as HTMLElement;
    const handle = dialog.firstElementChild;

    expect(handle?.className).toContain("touch-none");
    expect(handle?.className).toContain("cursor-grab");
  });
});

describe("BottomSheet reduced motion", () => {
  it("renders normally without reduced motion", () => {
    vi.mocked(useSkipAnimation).mockReturnValue(false);

    render(
      <BottomSheet isOpen onClose={vi.fn()}>
        <div>Content</div>
      </BottomSheet>,
    );

    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("renders with reduced motion enabled", () => {
    vi.mocked(useSkipAnimation).mockReturnValue(true);

    render(
      <BottomSheet isOpen onClose={vi.fn()}>
        <div>Content</div>
      </BottomSheet>,
    );

    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });
});
