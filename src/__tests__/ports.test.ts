/**
 * Tests for ports.ts - Core Elm-style architecture
 */

import { invoke } from "@tauri-apps/api/core";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  type AppError,
  type BatchCmd,
  type Cmd,
  type InvokeCmd,
  type LocationDescriptor,
  type StartWatchCmd,
  type StopWatchCmd,
  SubscriptionManager,
  backendEvents,
  batch,
  err,
  invokeCmd,
  isErr,
  isOk,
  locationAddViaDialog,
  locationList,
  locationRemove,
  locationValidate,
  noSub,
  none,
  ok,
  runCmd,
  startWatch,
  stopWatch,
} from "../ports";

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

      codes.forEach((code) => {
        const error: AppError = { code, message: "test error" };
        const result = err(error);
        expect(isErr(result)).toBeTruthy();
        if (isErr(result)) {
          expect(result.error.code).toBe(code);
        }
      });
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
      expect(isOk(ok())).toBeTruthy();
    });

    it("should return false for Err results", () => {
      expect(isOk(err({ code: "NOT_FOUND", message: "" }))).toBeFalsy();
    });

    it("should narrow type correctly", () => {
      const result = ok(42);
      if (isOk(result)) {
        const {value} = result;
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

  describe(none, () => {
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

      events.forEach((event) => {
        (sub as Extract<typeof sub, { type: "BackendEvents" }>).onEvent(event as Parameters<typeof handler>[0]);
      });

      expect(handler).toHaveBeenCalledTimes(3);
    });
  });

  describe(noSub, () => {
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
    it("should handle StartWatch (currently no-op)", async () => {
      const cmd = startWatch(123);
      await expect(runCmd(cmd)).resolves.toBeUndefined();
    });

    it("should handle StopWatch (currently no-op)", async () => {
      const cmd = stopWatch(123);
      await expect(runCmd(cmd)).resolves.toBeUndefined();
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
      const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
      const unknownCmd = { type: "Unknown" } as unknown as Cmd;

      await runCmd(unknownCmd);

      expect(warnSpy).toHaveBeenCalledWith("Unknown command type:", unknownCmd);
      warnSpy.mockRestore();
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
      const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
      const unknownSub = { type: "Unknown" } as unknown as Parameters<typeof manager.subscribe>[0];

      await manager.subscribe(unknownSub);

      expect(warnSpy).toHaveBeenCalledWith("Unknown subscription type:", unknownSub);
      warnSpy.mockRestore();
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
