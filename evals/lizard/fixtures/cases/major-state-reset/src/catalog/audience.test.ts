import { describe, expect, it } from "vitest";
import { createEventAudience } from "./audience";

describe("campaign audience", () => {
  it("starts a campaign inside its event", () => {
    expect(createEventAudience("event-7").filters).toContainEqual({
      key: "eventId",
      value: "event-7",
    });
  });
});
