import { describe, expect, it } from "vitest";
import { hasFullMiddleName, isValidMiddleNameChoice, normalizeOptionalMiddleName } from "./middle-name";

describe("optional middle name", () => {
  it("stores null when the student confirms no middle name", () => {
    expect(normalizeOptionalMiddleName("", true)).toBeNull();
    expect(isValidMiddleNameChoice("", true)).toBe(true);
  });

  it("requires an explicit choice when the field is blank", () => {
    expect(isValidMiddleNameChoice("", false)).toBe(false);
  });

  it("rejects initials and fake placeholders as full middle names", () => {
    expect(hasFullMiddleName("M.")).toBe(false);
    expect(hasFullMiddleName("N/A")).toBe(false);
    expect(hasFullMiddleName("-")).toBe(false);
  });

  it("trims a real middle name", () => {
    expect(normalizeOptionalMiddleName("  Santos  ", false)).toBe("Santos");
    expect(isValidMiddleNameChoice("Santos", false)).toBe(true);
  });
});
