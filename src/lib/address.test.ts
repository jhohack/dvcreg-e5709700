import { describe, expect, it } from "vitest";
import { formatAddress, hasRequiredAddressComponents } from "./address";

describe("structured addresses", () => {
  it("formats a canonical legacy address without duplicating Barangay", () => {
    expect(formatAddress({
      streetAddress: "  Purok 2, Mabini Street ",
      barangay: "Barangay San Isidro",
      cityMunicipality: "Digos City",
      province: "Davao del Sur",
      postalCode: "8002",
    })).toBe("Purok 2, Mabini Street, Barangay San Isidro, Digos City, Davao del Sur, 8002");
  });

  it("allows an address without a formal street or postal code", () => {
    const address = {
      streetAddress: "",
      barangay: "Kapatagan",
      cityMunicipality: "Digos City",
      province: "Davao del Sur",
      postalCode: "",
    };

    expect(hasRequiredAddressComponents(address)).toBe(true);
    expect(formatAddress(address)).toBe("Barangay Kapatagan, Digos City, Davao del Sur");
  });
});
