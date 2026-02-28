import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { QuickCaptureForm } from "../components/QuickCapture/QuickCaptureForm";

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
});
