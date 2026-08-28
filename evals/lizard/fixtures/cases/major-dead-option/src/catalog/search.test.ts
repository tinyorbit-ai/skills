import { describe, expect, it } from "vitest";
import { escapeSearchTerm } from "./search";

describe("catalog search", () => {
  it("escapes search metacharacters for partial matching", () => {
    expect(escapeSearchTerm("trail (pro)"))
      .toBe("trail \\(pro\\)");
  });
});
