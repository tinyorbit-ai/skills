import { describe, expect, it } from "vitest";
import { validateCheckoutDetails } from "./checkout";

const valid = { firstName: "Ada", lastName: "Lovelace", email: "ada@example.com" };

describe("validateCheckoutDetails", () => {
  it("accepts complete details", () => {
    expect(validateCheckoutDetails(valid)).toEqual([]);
  });

  it("requires a first name, a last name and a valid email", () => {
    expect(validateCheckoutDetails({ firstName: " ", lastName: "", email: "nope" })).toEqual([
      "First name is required",
      "Last name is required",
      "Enter a valid email address",
    ]);
  });
});
