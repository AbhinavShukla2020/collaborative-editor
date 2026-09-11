import { describe, expect, it } from "vitest";
import * as Y from "yjs";
import { initialSync, syncUpdate } from "../src/protocol.js";

describe("wire protocol", () => {
  it("prefixes initial sync messages", () => {
    expect(initialSync(new Y.Doc())[0]).toBe(0);
  });

  it("prefixes update messages", () => {
    const document = new Y.Doc();
    document.getText("content").insert(0, "hello");
    expect(syncUpdate(Y.encodeStateAsUpdate(document))[0]).toBe(0);
  });
});

