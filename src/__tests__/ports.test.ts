import { logger } from "$logger";
import {
  backendEvents,
  batch,
  docList,
  docOpen,
  docSave,
  err,
  globalCaptureGet,
  globalCaptureOpen,
  globalCapturePause,
  globalCaptureSet,
  globalCaptureSubmit,
  globalCaptureValidateShortcut,
  invokeCmd,
  isErr,
  isOk,
  locationAddViaDialog,
  locationList,
  locationRemove,
  locationValidate,
  none,
  noSub,
  ok,
  renderMarkdown,
  renderMarkdownForPdf,
  runCmd,
  searchDocuments,
  startWatch,
  stopWatch,
  SubscriptionManager,
  uiLayoutGet,
  uiLayoutSet,
} from "$ports";
import type { BatchCmd, Cmd, InvokeCmd, StartWatchCmd, StopWatchCmd } from "$ports";
import type { AppError, LocationDescriptor } from "$types";
import { invoke } from "@tauri-apps/api/core";
import { beforeEach, describe, expect, it, vi } from "vitest";

describe("commandResult", () => {
  describe(ok, () => {
    it("should create an Ok result with value", () => {
      const result = ok(42);
      expect(result).toStrictEqual({ type: "ok", value: 42 });
    });

    it("should work with complex objects", () => {
      const descriptor: LocationDescriptor = {
        id: 1,
        name: "Test",
        root_path: "/test",
        added_at: new Date().toISOString(),
      };
      const result = ok(descriptor);
      expect(isOk(result)).toBeTruthy();
      if (isOk(result)) {
        expect(result.value).toStrictEqual(descriptor);
      }
    });

    it("should work with arrays", () => {
      const locations: LocationDescriptor[] = [{ id: 1, name: "A", root_path: "/a", added_at: "2024-01-01" }, {
        id: 2,
        name: "B",
        root_path: "/b",
        added_at: "2024-01-02",
      }];
      const result = ok(locations);
      expect(isOk(result)).toBeTruthy();
    });
  });

  describe(err, () => {
    it("should create an Err result with error", () => {
      const error: AppError = { code: "NOT_FOUND", message: "Resource not found" };
      const result = err(error);
      expect(result).toStrictEqual({ type: "err", error });
    });

    it("should work with all error codes", () => {
      const codes = [
        "NOT_FOUND",
        "PERMISSION_DENIED",
        "INVALID_PATH",
        "IO_ERROR",
        "PARSE_ERROR",
        "INDEX_ERROR",
        "CONFLICT",
      ] as const;

      for (const code of codes) {
        const error: AppError = { code, message: "test error" };
        const result = err(error);
        expect(isErr(result)).toBeTruthy();
        if (isErr(result)) {
          expect(result.error.code).toBe(code);
        }
      }
    });

    it("should include context when provided", () => {
      const error: AppError = { code: "IO_ERROR", message: "Failed to read", context: "File: /test/file.md" };
      const result = err(error);
      if (isErr(result)) {
        expect(result.error.context).toBe("File: /test/file.md");
      }
    });
  });

  describe(isOk, () => {
    it("should return true for Ok results", () => {
      expect(isOk(ok("success"))).toBeTruthy();
      expect(isOk(ok(null))).toBeTruthy();
      expect(isOk(ok(void 0))).toBeTruthy();
    });

    it("should return false for Err results", () => {
      expect(isOk(err({ code: "NOT_FOUND", message: "" }))).toBeFalsy();
    });

    it("should narrow type correctly", () => {
      const result = ok(42);
      if (isOk(result)) {
        const { value } = result;
        expect(value).toBe(42);
      }
    });
  });

  describe(isErr, () => {
    it("should return true for Err results", () => {
      expect(isErr(err({ code: "IO_ERROR", message: "" }))).toBeTruthy();
    });

    it("should return false for Ok results", () => {
      expect(isErr(ok("success"))).toBeFalsy();
    });

    it("should narrow type correctly", () => {
      const error: AppError = { code: "PERMISSION_DENIED", message: "Access denied" };
      const result = err(error);
      if (isErr(result)) {
        expect(result.error.code).toBe("PERMISSION_DENIED");
      }
    });
  });
});

describe("command Builders", () => {
  describe(invokeCmd, () => {
    it("should create an Invoke command", () => {
      const onOk = vi.fn();
      const onErr = vi.fn();
      const cmd = invokeCmd<string>("test_command", { id: 1 }, onOk, onErr) as InvokeCmd;

      expect(cmd.type).toBe("Invoke");
      expect(cmd.command).toBe("test_command");
      expect(cmd.payload).toStrictEqual({ id: 1 });
      expect(cmd.onOk).toBe(onOk);
      expect(cmd.onErr).toBe(onErr);
    });

    it("should preserve callback references", () => {
      const onOk = vi.fn();
      const onErr = vi.fn();
      const cmd = invokeCmd<number>("count", {}, onOk, onErr) as InvokeCmd;

      cmd.onOk(42);
      expect(onOk).toHaveBeenCalledWith(42);

      const error: AppError = { code: "NOT_FOUND", message: "" };
      cmd.onErr(error);
      expect(onErr).toHaveBeenCalledWith(error);
    });
  });

  describe(startWatch, () => {
    it("should create a StartWatch command", () => {
      const cmd = startWatch(123) as StartWatchCmd;
      expect(cmd.type).toBe("StartWatch");
      expect(cmd.locationId).toBe(123);
    });

    it("should accept any number as location ID", () => {
      expect((startWatch(0) as StartWatchCmd).locationId).toBe(0);
      expect((startWatch(-1) as StartWatchCmd).locationId).toBe(-1);
      expect((startWatch(999_999) as StartWatchCmd).locationId).toBe(999_999);
    });
  });

  describe(stopWatch, () => {
    it("should create a StopWatch command", () => {
      const cmd = stopWatch(456) as StopWatchCmd;
      expect(cmd.type).toBe("StopWatch");
      expect(cmd.locationId).toBe(456);
    });
  });

  describe(batch, () => {
    it("should create a Batch command with multiple commands", () => {
      const cmd1 = startWatch(1);
      const cmd2 = startWatch(2);
      const batchCmd = batch([cmd1, cmd2]) as BatchCmd;

      expect(batchCmd.type).toBe("Batch");
      expect(batchCmd.commands).toHaveLength(2);
      expect(batchCmd.commands[0]).toBe(cmd1);
      expect(batchCmd.commands[1]).toBe(cmd2);
    });

    it("should handle empty batch", () => {
      const batchCmd = batch([]) as BatchCmd;
      expect(batchCmd.type).toBe("Batch");
      expect(batchCmd.commands).toHaveLength(0);
    });

    it("should handle nested batches", () => {
      const inner = batch([startWatch(1)]);
      const outer = batch([inner, stopWatch(2)]) as BatchCmd;

      expect(outer.commands).toHaveLength(2);
      expect(outer.commands[0].type).toBe("Batch");
    });
  });

  describe("none", () => {
    it("should create a None command", () => {
      expect(none.type).toBe("None");
    });
  });
});

describe("subscription Builders", () => {
  describe(backendEvents, () => {
    it("should create a BackendEvents subscription", () => {
      const handler = vi.fn();
      const sub = backendEvents(handler);

      expect(sub.type).toBe("BackendEvents");
      expect((sub as Extract<typeof sub, { type: "BackendEvents" }>).onEvent).toBe(handler);
    });

    it("should handle all backend event types", () => {
      const handler = vi.fn();
      const sub = backendEvents(handler);

      const events = [{ type: "LocationMissing", location_id: 1, path: "/test" }, {
        type: "LocationChanged",
        location_id: 2,
        old_path: "/old",
        new_path: "/new",
      }, { type: "ReconciliationComplete", checked: 5, missing: [1, 2, 3] }];

      for (const event of events) {
        (sub as Extract<typeof sub, { type: "BackendEvents" }>).onEvent(event as Parameters<typeof handler>[0]);
      }

      expect(handler).toHaveBeenCalledTimes(3);
    });
  });

  describe("noSub", () => {
    it("should create a None subscription", () => {
      expect(noSub.type).toBe("None");
    });
  });
});

describe(runCmd, () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("invoke commands", () => {
    it("should call onOk with result value on success", async () => {
      const onOk = vi.fn();
      const onErr = vi.fn();
      const mockResult = { type: "ok", value: { id: 1, name: "Test" } };

      vi.mocked(invoke).mockResolvedValueOnce(mockResult);

      const cmd = invokeCmd<LocationDescriptor>("test", {}, onOk, onErr);
      await runCmd(cmd);

      expect(invoke).toHaveBeenCalledWith("test", {});
      expect(onOk).toHaveBeenCalledWith({ id: 1, name: "Test" });
      expect(onErr).not.toHaveBeenCalled();
    });

    it("should call onOk for Rust-style Ok envelopes", async () => {
      const onOk = vi.fn();
      const onErr = vi.fn();

      vi.mocked(invoke).mockResolvedValueOnce({ Ok: { id: 2, name: "Rust" } });

      const cmd = invokeCmd<LocationDescriptor>("test", {}, onOk, onErr);
      await runCmd(cmd);

      expect(onOk).toHaveBeenCalledWith({ id: 2, name: "Rust" });
      expect(onErr).not.toHaveBeenCalled();
    });

    it("should call onErr with error on command failure", async () => {
      const onOk = vi.fn();
      const onErr = vi.fn();
      const mockError: AppError = { code: "NOT_FOUND", message: "Not found" };
      const mockResult = { type: "err", error: mockError };

      vi.mocked(invoke).mockResolvedValueOnce(mockResult);

      const cmd = invokeCmd<unknown>("test", {}, onOk, onErr);
      await runCmd(cmd);

      expect(onErr).toHaveBeenCalledWith(mockError);
      expect(onOk).not.toHaveBeenCalled();
    });

    it("should normalize Rust-style Err envelopes", async () => {
      const onOk = vi.fn();
      const onErr = vi.fn();

      vi.mocked(invoke).mockResolvedValueOnce({ Err: { code: "PermissionDenied", message: "Denied" } });

      const cmd = invokeCmd<unknown>("test", {}, onOk, onErr);
      await runCmd(cmd);

      expect(onErr).toHaveBeenCalledWith({ code: "PERMISSION_DENIED", message: "Denied" });
      expect(onOk).not.toHaveBeenCalled();
    });

    it("should handle Tauri-level errors", async () => {
      const onOk = vi.fn();
      const onErr = vi.fn();

      vi.mocked(invoke).mockRejectedValueOnce(new Error("Network error"));

      const cmd = invokeCmd<unknown>("test", {}, onOk, onErr);
      await runCmd(cmd);

      expect(onErr).toHaveBeenCalledWith({ code: "IO_ERROR", message: "Network error", context: "Command: test" });
    });

    it("should handle non-Error exceptions", async () => {
      const onOk = vi.fn();
      const onErr = vi.fn();

      vi.mocked(invoke).mockRejectedValueOnce("string error");

      const cmd = invokeCmd<unknown>("test", {}, onOk, onErr);
      await runCmd(cmd);

      expect(onErr).toHaveBeenCalledWith({ code: "IO_ERROR", message: "string error", context: "Command: test" });
    });

    it("should pass payload to invoke", async () => {
      vi.mocked(invoke).mockResolvedValueOnce({ type: "ok", value: null });

      const payload = { locationId: 123, name: "Test" };
      const cmd = invokeCmd<unknown>("test", payload, vi.fn(), vi.fn());
      await runCmd(cmd);

      expect(invoke).toHaveBeenCalledWith("test", payload);
    });

    it("should treat raw responses as success values", async () => {
      const onOk = vi.fn();
      const onErr = vi.fn();

      vi.mocked(invoke).mockResolvedValueOnce([{ id: 1 }]);

      const cmd = invokeCmd<Array<{ id: number }>>("test", {}, onOk, onErr);
      await runCmd(cmd);

      expect(onOk).toHaveBeenCalledWith([{ id: 1 }]);
      expect(onErr).not.toHaveBeenCalled();
    });

    it("normalizes global capture settings from backend snake_case", async () => {
      const onOk = vi.fn();
      const onErr = vi.fn();

      vi.mocked(invoke).mockResolvedValueOnce({
        type: "ok",
        value: {
          enabled: true,
          shortcut: "CommandOrControl+Shift+N",
          paused: false,
          default_mode: "Append",
          target_location_id: 9,
          inbox_relative_dir: "captures",
          append_target: { location_id: 9, rel_path: "notes/daily.md" },
          close_after_save: false,
          show_tray_icon: true,
          last_capture_target: "9/notes/daily.md",
        },
      });

      await runCmd(globalCaptureGet(onOk, onErr));

      expect(onOk).toHaveBeenCalledWith({
        enabled: true,
        shortcut: "CommandOrControl+Shift+N",
        paused: false,
        defaultMode: "Append",
        targetLocationId: 9,
        inboxRelativeDir: "captures",
        appendTarget: { locationId: 9, relPath: "notes/daily.md" },
        closeAfterSave: false,
        showTrayIcon: true,
        lastCaptureTarget: "9/notes/daily.md",
      });
      expect(onErr).not.toHaveBeenCalled();
    });

    it("defaults global capture to enabled when backend omits the field", async () => {
      const onOk = vi.fn();
      const onErr = vi.fn();

      vi.mocked(invoke).mockResolvedValueOnce({
        type: "ok",
        value: {
          shortcut: "CommandOrControl+Shift+Space",
          paused: false,
          default_mode: "QuickNote",
          target_location_id: null,
          inbox_relative_dir: "inbox",
          append_target: null,
          close_after_save: true,
          show_tray_icon: true,
          last_capture_target: null,
        },
      });

      await runCmd(globalCaptureGet(onOk, onErr));

      expect(onOk).toHaveBeenCalledWith(expect.objectContaining({ enabled: true }));
      expect(onErr).not.toHaveBeenCalled();
    });

    it("normalizes global capture submit results from backend snake_case", async () => {
      const onOk = vi.fn();
      const onErr = vi.fn();

      vi.mocked(invoke).mockResolvedValueOnce({
        type: "ok",
        value: {
          success: true,
          saved_to: "inbox/2026/2026-02-23_12-00-00.md",
          location_id: 3,
          should_close: true,
          last_capture_target: "3/inbox/2026/2026-02-23_12-00-00.md",
        },
      });

      await runCmd(globalCaptureSubmit({ mode: "QuickNote", text: "hello" }, onOk, onErr));

      expect(onOk).toHaveBeenCalledWith({
        success: true,
        savedTo: "inbox/2026/2026-02-23_12-00-00.md",
        locationId: 3,
        shouldClose: true,
        lastCaptureTarget: "3/inbox/2026/2026-02-23_12-00-00.md",
      });
      expect(onErr).not.toHaveBeenCalled();
    });
  });

  describe("batch commands", () => {
    it("should execute all commands in batch", async () => {
      const onOk1 = vi.fn();
      const onOk2 = vi.fn();

      vi.mocked(invoke).mockResolvedValueOnce({ type: "ok", value: "result1" }).mockResolvedValueOnce({
        type: "ok",
        value: "result2",
      });

      const batchCmd = batch([
        invokeCmd<string>("cmd1", {}, onOk1, vi.fn()),
        invokeCmd<string>("cmd2", {}, onOk2, vi.fn()),
      ]);

      await runCmd(batchCmd);

      expect(invoke).toHaveBeenCalledTimes(2);
      expect(onOk1).toHaveBeenCalledWith("result1");
      expect(onOk2).toHaveBeenCalledWith("result2");
    });

    it("should stop on first error in batch", async () => {
      const onOk = vi.fn();
      const onErr = vi.fn();

      vi.mocked(invoke).mockResolvedValueOnce({ type: "ok", value: "result1" }).mockResolvedValueOnce({
        type: "err",
        error: { code: "IO_ERROR", message: "" },
      }).mockResolvedValueOnce({ type: "ok", value: "result3" });

      const batchCmd = batch([
        invokeCmd<unknown>("cmd1", {}, onOk, vi.fn()),
        invokeCmd<unknown>("cmd2", {}, vi.fn(), onErr),
        invokeCmd<unknown>("cmd3", {}, onOk, vi.fn()),
      ]);

      await runCmd(batchCmd);

      expect(invoke).toHaveBeenCalledTimes(3);
    });
  });

  describe("watch commands", () => {
    it("should invoke watch_enable for StartWatch", async () => {
      vi.mocked(invoke).mockResolvedValueOnce({ type: "ok", value: true });
      const cmd = startWatch(123);
      await expect(runCmd(cmd)).resolves.toBeUndefined();
      expect(invoke).toHaveBeenCalledWith("watch_enable", { locationId: 123 });
    });

    it("should invoke watch_disable for StopWatch", async () => {
      vi.mocked(invoke).mockResolvedValueOnce({ type: "ok", value: true });
      const cmd = stopWatch(123);
      await expect(runCmd(cmd)).resolves.toBeUndefined();
      expect(invoke).toHaveBeenCalledWith("watch_disable", { locationId: 123 });
    });
  });

  describe("none command", () => {
    it("should do nothing for None command", async () => {
      await expect(runCmd(none)).resolves.toBeUndefined();
      expect(invoke).not.toHaveBeenCalled();
    });
  });

  describe("unknown command type", () => {
    it("should warn on unknown command type", async () => {
      const warnSpy = vi.spyOn(logger, "warn").mockImplementation(() => {});
      const unknownCmd = { type: "Unknown" } as unknown as Cmd;

      await runCmd(unknownCmd);

      expect(warnSpy).toHaveBeenCalledWith("Unknown command type", { cmd: unknownCmd });
    });
  });
});

describe(SubscriptionManager, () => {
  let manager: SubscriptionManager;

  beforeEach(() => {
    manager = new SubscriptionManager();
  });

  describe("subscribe", () => {
    it("should subscribe to backend events", async () => {
      const handler = vi.fn();
      const sub = backendEvents(handler);
      const cleanup = await manager.subscribe(sub);
      expect(cleanup).toBeTypeOf("function");
    });

    it("should return no-op cleanup for None subscription", async () => {
      const cleanup = await manager.subscribe(noSub);
      expect(cleanup).toBeTypeOf("function");
      cleanup();
    });

    it("should warn on unknown subscription type", async () => {
      const warnSpy = vi.spyOn(logger, "warn").mockImplementation(() => {});
      const unknownSub = { type: "Unknown" } as unknown as Parameters<typeof manager.subscribe>[0];

      await manager.subscribe(unknownSub);

      expect(warnSpy).toHaveBeenCalledWith("Unknown subscription type", { sub: unknownSub });
    });
  });

  describe("cleanup", () => {
    it("should clean up all subscriptions", async () => {
      const handler = vi.fn();
      await manager.subscribe(backendEvents(handler));
      manager.cleanup();
    });

    it("should be safe to call multiple times", () => {
      manager.cleanup();
      manager.cleanup();
    });

    it("should be safe to call with no active subscriptions", () => {
      manager.cleanup();
    });
  });
});

describe("location Commands", () => {
  describe(locationAddViaDialog, () => {
    it("should create correct command", () => {
      const onOk = vi.fn();
      const onErr = vi.fn();
      const cmd = locationAddViaDialog(onOk, onErr) as InvokeCmd;

      expect(cmd.type).toBe("Invoke");
      expect(cmd.command).toBe("location_add_via_dialog");
      expect(cmd.payload).toStrictEqual({});
    });
  });

  describe(locationList, () => {
    it("should create correct command", () => {
      const onOk = vi.fn();
      const onErr = vi.fn();
      const cmd = locationList(onOk, onErr) as InvokeCmd;

      expect(cmd.type).toBe("Invoke");
      expect(cmd.command).toBe("location_list");
      expect(cmd.payload).toStrictEqual({});
    });
  });

  describe(locationRemove, () => {
    it("should create correct command with locationId", () => {
      const onOk = vi.fn();
      const onErr = vi.fn();
      const cmd = locationRemove(123, onOk, onErr) as InvokeCmd;

      expect(cmd.type).toBe("Invoke");
      expect(cmd.command).toBe("location_remove");
      expect(cmd.payload).toStrictEqual({ locationId: 123 });
    });
  });

  describe(locationValidate, () => {
    it("should create correct command", () => {
      const onOk = vi.fn();
      const onErr = vi.fn();
      const cmd = locationValidate(onOk, onErr) as InvokeCmd;

      expect(cmd.type).toBe("Invoke");
      expect(cmd.command).toBe("location_validate");
      expect(cmd.payload).toStrictEqual({});
    });
  });
});

describe("document Commands", () => {
  describe(docList, () => {
    it("should create command with camelCase locationId payload key", () => {
      const onOk = vi.fn();
      const onErr = vi.fn();
      const cmd = docList(7, onOk, onErr) as InvokeCmd;

      expect(cmd.type).toBe("Invoke");
      expect(cmd.command).toBe("doc_list");
      expect(cmd.payload).toStrictEqual({ locationId: 7 });
    });
  });

  describe(docOpen, () => {
    it("should create command with expected payload keys", () => {
      const onOk = vi.fn();
      const onErr = vi.fn();
      const cmd = docOpen(11, "notes/today.md", onOk, onErr) as InvokeCmd;

      expect(cmd.type).toBe("Invoke");
      expect(cmd.command).toBe("doc_open");
      expect(cmd.payload).toStrictEqual({ locationId: 11, relPath: "notes/today.md" });
    });
  });

  describe(docSave, () => {
    it("should create command with expected payload keys", () => {
      const onOk = vi.fn();
      const onErr = vi.fn();
      const cmd = docSave(11, "notes/today.md", "# Draft", onOk, onErr) as InvokeCmd;

      expect(cmd.type).toBe("Invoke");
      expect(cmd.command).toBe("doc_save");
      expect(cmd.payload).toStrictEqual({ locationId: 11, relPath: "notes/today.md", text: "# Draft" });
    });
  });

  describe(renderMarkdown, () => {
    it("should create command with expected payload keys", () => {
      const onOk = vi.fn();
      const onErr = vi.fn();
      const cmd = renderMarkdown(11, "notes/today.md", "# Draft", "GfmSafe", onOk, onErr) as InvokeCmd;

      expect(cmd.type).toBe("Invoke");
      expect(cmd.command).toBe("markdown_render");
      expect(cmd.payload).toStrictEqual({
        locationId: 11,
        relPath: "notes/today.md",
        text: "# Draft",
        profile: "GfmSafe",
      });
    });
  });

  describe(renderMarkdownForPdf, () => {
    it("should create command with expected payload keys", () => {
      const onOk = vi.fn();
      const onErr = vi.fn();
      const cmd = renderMarkdownForPdf(11, "notes/today.md", "# Draft", "GfmSafe", onOk, onErr) as InvokeCmd;

      expect(cmd.type).toBe("Invoke");
      expect(cmd.command).toBe("markdown_render_for_pdf");
      expect(cmd.payload).toStrictEqual({
        locationId: 11,
        relPath: "notes/today.md",
        text: "# Draft",
        profile: "GfmSafe",
      });
    });
  });

  describe(searchDocuments, () => {
    it("should create command with expected payload keys", () => {
      const onOk = vi.fn();
      const onErr = vi.fn();
      const cmd = searchDocuments(
        "stormlight",
        { locations: [11], fileTypes: ["md"], dateRange: { from: "2026-02-19T00:00:00.000Z" } },
        25,
        onOk,
        onErr,
      ) as InvokeCmd;

      expect(cmd.type).toBe("Invoke");
      expect(cmd.command).toBe("search");
      expect(cmd.payload).toStrictEqual({
        query: "stormlight",
        filters: { locations: [11], fileTypes: ["md"], dateRange: { from: "2026-02-19T00:00:00.000Z" } },
        limit: 25,
      });
    });
  });
});

describe("ui layout Commands", () => {
  describe(uiLayoutGet, () => {
    it("should create command with empty payload", () => {
      const onOk = vi.fn();
      const onErr = vi.fn();
      const cmd = uiLayoutGet(onOk, onErr) as InvokeCmd;

      expect(cmd.type).toBe("Invoke");
      expect(cmd.command).toBe("ui_layout_get");
      expect(cmd.payload).toStrictEqual({});
    });
  });

  describe(uiLayoutSet, () => {
    it("should create command with settings payload", () => {
      const onOk = vi.fn();
      const onErr = vi.fn();
      const cmd = uiLayoutSet(
        {
          sidebar_collapsed: true,
          top_bars_collapsed: false,
          status_bar_collapsed: true,
          reduce_motion: false,
          line_numbers_visible: false,
          text_wrapping_enabled: true,
          syntax_highlighting_enabled: false,
          editor_font_size: 18,
          editor_font_family: "Monaspace Neon",
          focus_typewriter_scrolling_enabled: true,
          focus_dimming_mode: "sentence",
          focus_auto_enter_focus_mode: true,
          filename_visibility: false,
        },
        onOk,
        onErr,
      ) as InvokeCmd;

      expect(cmd.type).toBe("Invoke");
      expect(cmd.command).toBe("ui_layout_set");
      expect(cmd.payload).toStrictEqual({
        settings: {
          sidebar_collapsed: true,
          top_bars_collapsed: false,
          status_bar_collapsed: true,
          reduce_motion: false,
          line_numbers_visible: false,
          text_wrapping_enabled: true,
          syntax_highlighting_enabled: false,
          editor_font_size: 18,
          editor_font_family: "Monaspace Neon",
          focus_typewriter_scrolling_enabled: true,
          focus_dimming_mode: "sentence",
          focus_auto_enter_focus_mode: true,
          filename_visibility: false,
        },
      });
    });
  });
});

describe("global capture Commands", () => {
  describe(globalCaptureGet, () => {
    it("should create command with empty payload", () => {
      const onOk = vi.fn();
      const onErr = vi.fn();
      const cmd = globalCaptureGet(onOk, onErr) as InvokeCmd;

      expect(cmd.type).toBe("Invoke");
      expect(cmd.command).toBe("global_capture_get");
      expect(cmd.payload).toStrictEqual({});
    });
  });

  describe(globalCaptureSet, () => {
    it("should create command with settings payload", () => {
      const onOk = vi.fn();
      const onErr = vi.fn();
      const settings = {
        enabled: true,
        shortcut: "CommandOrControl+Shift+Space",
        paused: false,
        defaultMode: "QuickNote" as const,
        targetLocationId: 1,
        inboxRelativeDir: "inbox",
        appendTarget: null,
        closeAfterSave: true,
        showTrayIcon: true,
        lastCaptureTarget: null,
      };
      const cmd = globalCaptureSet(settings, onOk, onErr) as InvokeCmd;

      expect(cmd.type).toBe("Invoke");
      expect(cmd.command).toBe("global_capture_set");
      expect(cmd.payload).toStrictEqual({
        settings: {
          enabled: true,
          shortcut: "CommandOrControl+Shift+Space",
          paused: false,
          default_mode: "QuickNote",
          target_location_id: 1,
          inbox_relative_dir: "inbox",
          append_target: null,
          close_after_save: true,
          show_tray_icon: true,
          last_capture_target: null,
        },
      });
    });
  });

  describe(globalCaptureOpen, () => {
    it("should create command with empty payload", () => {
      const onOk = vi.fn();
      const onErr = vi.fn();
      const cmd = globalCaptureOpen(onOk, onErr) as InvokeCmd;

      expect(cmd.type).toBe("Invoke");
      expect(cmd.command).toBe("global_capture_open");
      expect(cmd.payload).toStrictEqual({});
    });
  });

  describe(globalCaptureSubmit, () => {
    it("should create command with input payload", () => {
      const onOk = vi.fn();
      const onErr = vi.fn();
      const input = {
        mode: "QuickNote" as const,
        text: "Test capture",
        destination: { locationId: 1, relPath: "notes/capture.md" },
        openMainAfterSave: false,
      };
      const cmd = globalCaptureSubmit(input, onOk, onErr) as InvokeCmd;

      expect(cmd.type).toBe("Invoke");
      expect(cmd.command).toBe("global_capture_submit");
      expect(cmd.payload).toStrictEqual({
        mode: "QuickNote",
        text: "Test capture",
        destination: { location_id: 1, rel_path: "notes/capture.md" },
        open_main_after_save: false,
      });
    });
  });

  describe(globalCapturePause, () => {
    it("should create command with paused flag", () => {
      const onOk = vi.fn();
      const onErr = vi.fn();
      const cmd = globalCapturePause(true, onOk, onErr) as InvokeCmd;

      expect(cmd.type).toBe("Invoke");
      expect(cmd.command).toBe("global_capture_pause");
      expect(cmd.payload).toStrictEqual({ paused: true });
    });
  });

  describe(globalCaptureValidateShortcut, () => {
    it("should create command with shortcut string", () => {
      const onOk = vi.fn();
      const onErr = vi.fn();
      const cmd = globalCaptureValidateShortcut("CommandOrControl+Shift+N", onOk, onErr) as InvokeCmd;

      expect(cmd.type).toBe("Invoke");
      expect(cmd.command).toBe("global_capture_validate_shortcut");
      expect(cmd.payload).toStrictEqual({ shortcut: "CommandOrControl+Shift+N" });
    });
  });
});
