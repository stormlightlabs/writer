import { pick, pickBy } from "$state/helpers";
import { describe, expect, it, vi } from "vitest";

describe("helpers", () => {
  describe("pick", () => {
    it("returns only the requested keys", () => {
      const source = { a: 1, b: 2, c: 3 };
      expect(pick(source, ["a", "c"])).toEqual({ a: 1, c: 3 });
    });

    it("returns an empty object when no keys are provided", () => {
      const source = { a: 1, b: 2 };
      expect(pick(source, [])).toEqual({});
    });
  });

  describe("pickBy", () => {
    it("returns only keys accepted by the predicate", () => {
      const source = { enabled: true, autoHide: false, focusMode: true };
      const result = pickBy(source, (key) => key !== "autoHide");
      expect(result).toEqual({ enabled: true, focusMode: true });
    });

    it("evaluates each key and returns empty object when predicate rejects all", () => {
      const source = { a: 1, b: 2, c: 3 };
      const predicate = vi.fn(() => false);
      const result = pickBy(source, predicate);
      expect(predicate).toHaveBeenCalledTimes(3);
      expect(result).toEqual({});
    });
  });
});
