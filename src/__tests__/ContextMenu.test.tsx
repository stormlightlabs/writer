import { ContextMenu, useContextMenu } from "$components/ContextMenu";
import { act, fireEvent, render, renderHook, screen } from "@testing-library/react";
import { useCallback } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const origin = { x: 0, y: 0 };

const createPosition = (x?: number, y?: number) => ({ x: x ?? 0, y: y ?? 0 });

function ContextMenuHarness(
  { items, isOpen = false, position }: {
    items: Parameters<typeof ContextMenu>[0]["items"];
    isOpen?: boolean;
    position?: { x: number; y: number };
  },
) {
  const close = useCallback(() => {}, []);
  return (
    <ContextMenu isOpen={isOpen} position={createPosition(position?.x, position?.y)} onClose={close} items={items} />
  );
}

function createItems(items: Parameters<typeof ContextMenu>[0]["items"] = []) {
  return items;
}

const defaultItems = createItems([{ label: "Edit", onClick: vi.fn() }, { label: "Copy", onClick: vi.fn() }, {
  divider: true,
}, { label: "Delete", onClick: vi.fn(), danger: true }]);

const itemsWithIcons = createItems([{
  label: "Edit",
  onClick: vi.fn(),
  icon: <span data-testid="edit-icon">Icon</span>,
}]);

const disabledItems = createItems([{ label: "Disabled", onClick: vi.fn(), disabled: true }]);

describe("ContextMenu", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("rendering", () => {
    it("does not render when closed", () => {
      render(<ContextMenuHarness items={defaultItems} isOpen={false} />);
      expect(screen.queryByRole("menu")).not.toBeInTheDocument();
    });

    it("renders when open", () => {
      render(<ContextMenuHarness items={defaultItems} isOpen />);
      expect(screen.getByRole("menu")).toBeInTheDocument();
    });

    it("renders all menu items", () => {
      render(<ContextMenuHarness items={defaultItems} isOpen />);
      expect(screen.getByRole("menuitem", { name: "Edit" })).toBeInTheDocument();
      expect(screen.getByRole("menuitem", { name: "Copy" })).toBeInTheDocument();
      expect(screen.getByRole("menuitem", { name: "Delete" })).toBeInTheDocument();
    });

    it("renders divider between items", () => {
      const { container } = render(<ContextMenuHarness items={defaultItems} isOpen />);
      const divider = container.querySelector(".bg-border-subtle.h-px");
      expect(divider).toBeInTheDocument();
    });

    it("renders icons when provided", () => {
      render(<ContextMenuHarness items={itemsWithIcons} isOpen />);
      expect(screen.getByTestId("edit-icon")).toBeInTheDocument();
    });
  });

  describe("positioning", () => {
    it("positions menu at specified coordinates", () => {
      const pos = createPosition(50, 75);
      render(<ContextMenuHarness items={defaultItems} isOpen position={pos} />);
      const menu = screen.getByRole("menu");
      expect(menu).toHaveStyle({ left: "50px", top: "75px" });
    });
  });

  describe("interactions", () => {
    it("calls onClick and onClose when menu item is clicked", () => {
      const onClick = vi.fn();
      const onClose = vi.fn();
      const clickableItems = createItems([{ label: "Action", onClick }]);

      render(<ContextMenu isOpen position={origin} onClose={onClose} items={clickableItems} />);

      fireEvent.click(screen.getByRole("menuitem", { name: "Action" }));

      expect(onClick).toHaveBeenCalledTimes(1);
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it("does not call onClick when item is disabled", () => {
      const onClick = vi.fn();
      const onClose = vi.fn();
      const items = createItems([{ label: "Disabled Action", onClick, disabled: true }]);

      render(<ContextMenu isOpen position={origin} onClose={onClose} items={items} />);

      fireEvent.click(screen.getByRole("menuitem", { name: "Disabled Action" }));

      expect(onClick).not.toHaveBeenCalled();
      expect(onClose).not.toHaveBeenCalled();
    });

    it("closes on click outside", () => {
      const onClose = vi.fn();

      render(
        <div>
          <button data-testid="outside">Outside</button>
          <ContextMenu isOpen position={origin} onClose={onClose} items={defaultItems} />
        </div>,
      );

      fireEvent.click(screen.getByTestId("outside"));

      expect(onClose).toHaveBeenCalled();
    });

    it("closes on Escape key", () => {
      const onClose = vi.fn();

      render(<ContextMenu isOpen position={origin} onClose={onClose} items={defaultItems} />);

      fireEvent.keyDown(document, { key: "Escape" });

      expect(onClose).toHaveBeenCalled();
    });

    it("closes on contextmenu event elsewhere", () => {
      const onClose = vi.fn();

      render(
        <div>
          <button data-testid="another-trigger">Another</button>
          <ContextMenu isOpen position={origin} onClose={onClose} items={defaultItems} />
        </div>,
      );

      fireEvent.contextMenu(screen.getByTestId("another-trigger"));

      expect(onClose).toHaveBeenCalled();
    });
  });

  describe("styling", () => {
    it("applies danger styling to danger items", () => {
      render(<ContextMenuHarness items={defaultItems} isOpen />);
      const deleteItem = screen.getByRole("menuitem", { name: "Delete" });
      expect(deleteItem).toHaveClass("text-support-error");
    });

    it("applies disabled styling to disabled items", () => {
      render(<ContextMenuHarness items={disabledItems} isOpen />);
      const disabledItem = screen.getByRole("menuitem", { name: "Disabled" });
      expect(disabledItem).toHaveClass("text-text-disabled");
    });
  });
});

describe("useContextMenu", () => {
  it("returns closed state initially", () => {
    const { result } = renderHook(() => useContextMenu());
    expect(result.current.isOpen).toBe(false);
    expect(result.current.position).toEqual(origin);
  });

  it("opens on right-click with mouse position", () => {
    const { result } = renderHook(() => useContextMenu());

    act(() => {
      result.current.open({ preventDefault: vi.fn(), clientX: 150, clientY: 200 } as unknown as React.MouseEvent);
    });

    expect(result.current.isOpen).toBe(true);
    expect(result.current.position).toEqual({ x: 150, y: 200 });
  });

  it("closes when close is called", () => {
    const { result } = renderHook(() => useContextMenu());

    act(() => {
      result.current.open({ preventDefault: vi.fn(), clientX: 100, clientY: 100 } as unknown as React.MouseEvent);
    });
    expect(result.current.isOpen).toBe(true);

    act(() => {
      result.current.close();
    });
    expect(result.current.isOpen).toBe(false);
  });
});
