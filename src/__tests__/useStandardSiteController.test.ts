import { postGetMarkdown, postList, publicationList } from "$ports";
import { describe, expect, it } from "vitest";

const noop = () => {};

describe("publicationList command builder", () => {
  it("builds an invoke command with didOrHandle", () => {
    const cmd = publicationList("alice.bsky.social", noop, noop);
    expect(cmd.type).toBe("Invoke");
    if (cmd.type === "Invoke") {
      expect(cmd.command).toBe("publication_list");
      expect(cmd.payload).toEqual({ didOrHandle: "alice.bsky.social" });
    }
  });
});

describe("postList command builder", () => {
  it("builds an invoke command with didOrHandle and publicationTid", () => {
    const cmd = postList("alice.bsky.social", "3jzfcijpj2z2a", noop, noop);
    expect(cmd.type).toBe("Invoke");
    if (cmd.type === "Invoke") {
      expect(cmd.command).toBe("post_list");
      expect(cmd.payload).toEqual({ didOrHandle: "alice.bsky.social", publicationTid: "3jzfcijpj2z2a" });
    }
  });

  it("omits publicationTid when undefined", () => {
    const cmd = postList("alice.bsky.social", undefined, noop, noop);
    expect(cmd.type).toBe("Invoke");
    if (cmd.type === "Invoke") {
      expect(cmd.command).toBe("post_list");
      expect(cmd.payload).toEqual({ didOrHandle: "alice.bsky.social", publicationTid: undefined });
    }
  });
});

describe("postGetMarkdown command builder", () => {
  it("builds an invoke command with didOrHandle and tid", () => {
    const cmd = postGetMarkdown("alice.bsky.social", "3jzfcijpj2z2a", noop, noop);
    expect(cmd.type).toBe("Invoke");
    if (cmd.type === "Invoke") {
      expect(cmd.command).toBe("post_get_markdown");
      expect(cmd.payload).toEqual({ didOrHandle: "alice.bsky.social", tid: "3jzfcijpj2z2a" });
    }
  });
});
