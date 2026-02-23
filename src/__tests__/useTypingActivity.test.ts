import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useTypingActivity } from "../hooks/useTypingActivity";

describe("useTypingActivity", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("should start with isTyping false", () => {
    const { result } = renderHook(() => useTypingActivity());
    expect(result.current.isTyping).toBe(false);
  });

  it("should set isTyping to true on typing activity", () => {
    const { result } = renderHook(() => useTypingActivity());

    act(() => {
      result.current.handleTypingActivity();
    });

    expect(result.current.isTyping).toBe(true);
  });

  it("should set isTyping to false after idle timeout", () => {
    const { result } = renderHook(() => useTypingActivity({ idleTimeout: 1000 }));

    act(() => {
      result.current.handleTypingActivity();
    });

    expect(result.current.isTyping).toBe(true);

    act(() => {
      vi.advanceTimersByTime(1000);
    });

    expect(result.current.isTyping).toBe(false);
  });

  it("should reset timeout on continued typing", () => {
    const { result } = renderHook(() => useTypingActivity({ idleTimeout: 1000 }));

    act(() => {
      result.current.handleTypingActivity();
    });

    expect(result.current.isTyping).toBe(true);

    act(() => {
      vi.advanceTimersByTime(500);
      result.current.handleTypingActivity();
    });

    expect(result.current.isTyping).toBe(true);

    act(() => {
      vi.advanceTimersByTime(500);
    });

    expect(result.current.isTyping).toBe(true);

    act(() => {
      vi.advanceTimersByTime(500);
    });

    expect(result.current.isTyping).toBe(false);
  });

  it("should call onTypingStart callback when typing starts", () => {
    const onTypingStart = vi.fn();
    const { result } = renderHook(() => useTypingActivity({ onTypingStart }));

    act(() => {
      result.current.handleTypingActivity();
    });

    expect(onTypingStart).toHaveBeenCalledTimes(1);

    act(() => {
      result.current.handleTypingActivity();
    });

    expect(onTypingStart).toHaveBeenCalledTimes(1);
  });

  it("should call onTypingEnd callback when typing stops", () => {
    const onTypingEnd = vi.fn();
    const { result } = renderHook(() => useTypingActivity({ idleTimeout: 500, onTypingEnd }));

    act(() => {
      result.current.handleTypingActivity();
    });

    expect(onTypingEnd).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(500);
    });

    expect(onTypingEnd).toHaveBeenCalledTimes(1);
  });

  it("should clean up timeout on unmount", () => {
    const { result, unmount } = renderHook(() => useTypingActivity({ idleTimeout: 1000 }));

    act(() => {
      result.current.handleTypingActivity();
    });

    unmount();

    act(() => {
      vi.advanceTimersByTime(1000);
    });

    expect(result.current.isTyping).toBe(true);
  });
});

import { afterEach } from "vitest";
