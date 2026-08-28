import { describe, expect, it } from "vitest";
import {
  resolveAppCatalogRoute,
  resolveLegacyCatalogRoute,
} from "./routes";

describe("catalog routes", () => {
  it("redirects both routers to the event occurrence", () => {
    const event = { id: "event-4", occurrenceId: "occ-9" };
    expect(resolveLegacyCatalogRoute(event)).toEqual({
      kind: "redirect",
      occurrenceId: "occ-9",
    });
    expect(resolveAppCatalogRoute(event)).toEqual({
      kind: "redirect",
      occurrenceId: "occ-9",
    });
  });
});
