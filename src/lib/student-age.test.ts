import { describe, expect, it } from "vitest";
import { calculateAge, isValidStudentBirthdate, latestValidBirthdate } from "./student-age";

const today = new Date(2026, 9, 28);

describe("student birthdate validation", () => {
  it("accepts a student on their fifteenth birthday", () => {
    const birthdate = new Date(2011, 9, 28);
    expect(calculateAge(birthdate, today)).toBe(15);
    expect(isValidStudentBirthdate(birthdate, today)).toBe(true);
  });

  it("rejects a student one day short of age fifteen", () => {
    expect(isValidStudentBirthdate(new Date(2011, 9, 29), today)).toBe(false);
  });

  it("rejects a 2026 birthdate", () => {
    expect(isValidStudentBirthdate(new Date(2026, 0, 1), today)).toBe(false);
  });

  it("uses a date-specific cutoff", () => {
    expect(latestValidBirthdate(today)).toEqual(new Date(2011, 9, 28));
  });
});
