import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { QuickCaptureForm } from "../components/QuickCapture/QuickCaptureForm";

const SAVE_TARGETS = [
  { id: "1:inbox", locationId: 1, relPath: "inbox", label: "Workspace A / inbox" },
  { id: "1:inbox/projects", locationId: 1, relPath: "inbox/projects", label: "Workspace A / inbox/projects" },
];

describe("QuickCaptureForm", () => {
  it("submits on Enter in quick note mode", () => {
    const onSubmit = vi.fn();
    const onClose = vi.fn();

    render(<QuickCaptureForm onSubmit={onSubmit} onClose={onClose} isSubmitting={false} error={null} />);

    const textarea = screen.getByPlaceholderText("Type your note here...");
    fireEvent.change(textarea, { target: { value: "Capture this" } });
    fireEvent.keyDown(textarea, { key: "Enter" });

    expect(onSubmit).toHaveBeenCalledWith("Capture this", "QuickNote");
    expect(onClose).not.toHaveBeenCalled();
  });

  it("does not submit on Enter in writing session mode unless modifier is pressed", () => {
    const onSubmit = vi.fn();
    const onClose = vi.fn();

    render(
      <QuickCaptureForm
        defaultMode="WritingSession"
        onSubmit={onSubmit}
        onClose={onClose}
        isSubmitting={false}
        error={null} />,
    );

    const textarea = screen.getByPlaceholderText("Type your note here...");
    fireEvent.change(textarea, { target: { value: "Longer draft" } });

    fireEvent.keyDown(textarea, { key: "Enter" });
    expect(onSubmit).not.toHaveBeenCalled();

    fireEvent.keyDown(textarea, { key: "Enter", metaKey: true });
    expect(onSubmit).toHaveBeenCalledWith("Longer draft", "WritingSession");
  });

  it("does not submit on Shift+Enter in quick note mode", () => {
    const onSubmit = vi.fn();
    const onClose = vi.fn();

    render(<QuickCaptureForm onSubmit={onSubmit} onClose={onClose} isSubmitting={false} error={null} />);

    const textarea = screen.getByPlaceholderText("Type your note here...");
    fireEvent.change(textarea, { target: { value: "Keep typing" } });
    fireEvent.keyDown(textarea, { key: "Enter", shiftKey: true });

    expect(onSubmit).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
  });

  it("closes on Escape", () => {
    const onSubmit = vi.fn();
    const onClose = vi.fn();

    render(<QuickCaptureForm onSubmit={onSubmit} onClose={onClose} isSubmitting={false} error={null} />);

    const textarea = screen.getByPlaceholderText("Type your note here...");
    fireEvent.keyDown(textarea, { key: "Escape" });

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("chooses Save To destination from the dropdown menu", () => {
    const onSubmit = vi.fn();
    const onClose = vi.fn();

    render(
      <QuickCaptureForm
        onSubmit={onSubmit}
        onClose={onClose}
        isSubmitting={false}
        error={null}
        saveTargets={SAVE_TARGETS} />,
    );

    const textarea = screen.getByPlaceholderText("Type your note here...");
    fireEvent.change(textarea, { target: { value: "Capture this" } });

    fireEvent.click(screen.getByLabelText("Choose save destination"));
    fireEvent.click(screen.getByRole("menuitem", { name: "Save to Workspace A / inbox/projects" }));
    fireEvent.click(screen.getByText("Save To"));

    expect(onSubmit).toHaveBeenCalledWith("Capture this", "QuickNote", { locationId: 1, relPath: "inbox/projects" });
  });

  it("disables Save To selection in append mode", () => {
    const onSubmit = vi.fn();
    const onClose = vi.fn();

    render(
      <QuickCaptureForm
        defaultMode="Append"
        onSubmit={onSubmit}
        onClose={onClose}
        isSubmitting={false}
        error={null}
        saveTargets={SAVE_TARGETS} />,
    );

    expect(screen.getByLabelText("Choose save destination")).toBeDisabled();
  });
});
