import { describe, expect, it } from "vitest";
import { normalizeFacebookLink } from "./facebook";

describe("normalizeFacebookLink", () => {
  it("normalizes a facebook username slug", () => {
    expect(normalizeFacebookLink("jhoroseland.firmeza")).toBe("https://web.facebook.com/jhoroseland.firmeza");
  });

  it("normalizes a facebook profile url", () => {
    expect(normalizeFacebookLink("https://www.facebook.com/jhoroseland.firmeza")).toBe(
      "https://web.facebook.com/jhoroseland.firmeza"
    );
  });

  it("rejects a display name", () => {
    expect(normalizeFacebookLink("Jhorose B. Firmeza")).toBe("");
  });
});
