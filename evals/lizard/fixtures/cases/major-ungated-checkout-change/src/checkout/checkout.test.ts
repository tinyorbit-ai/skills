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

  it("lets a buyer with one name leave the last name blank", () => {
    expect(validateCheckoutDetails({ ...valid, lastName: "", singleName: true })).toEqual([]);
  });

  it("still requires a last name when the buyer has not said they have one name", () => {
    expect(validateCheckoutDetails({ ...valid, lastName: "", singleName: false })).toEqual([
      "Last name is required",
    ]);
  });
});
