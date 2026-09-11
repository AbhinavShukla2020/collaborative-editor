import { afterEach, describe, expect, it } from "vitest";
import { loadConfig } from "../src/config.js";

describe("configuration", () => {
  afterEach(() => delete process.env.SNAPSHOT_EVERY_UPDATES);

  it("loads defaults", () => expect(loadConfig().port).toBe(1234));
  it("validates positive counts", () => {
    process.env.SNAPSHOT_EVERY_UPDATES = "0";
    expect(() => loadConfig()).toThrow(/positive/);
  });
});

