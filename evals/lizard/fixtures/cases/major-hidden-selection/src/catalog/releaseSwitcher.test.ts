import { describe, expect, it } from "vitest";
import { openReleaseSwitcher } from "./releaseSwitcher";

describe("release switcher", () => {
  it("includes archived releases and keeps the current marker", () => {
    const state = openReleaseSwitcher([
      { id: "2026", releasedAt: "2026-01-01", current: true },
      { id: "2024", releasedAt: "2024-01-01", current: false },
    ]);

    expect(state.releases).toHaveLength(2);
    expect(state.releases.find((release) => release.current)?.id).toBe("2026");
  });
});
