export type AddressComponents = {
  streetAddress: string;
  barangay: string;
  cityMunicipality: string;
  province: string;
  postalCode: string;
};

export const formatAddress = (components: AddressComponents): string =>
  [
    components.streetAddress,
    components.barangay ? `Barangay ${components.barangay.replace(/^barangay\s+/i, "")}` : "",
    components.cityMunicipality,
    components.province,
    components.postalCode,
  ]
    .map((part) => part.trim().replace(/\s+/g, " "))
    .filter(Boolean)
    .join(", ");

export const hasRequiredAddressComponents = (components: AddressComponents): boolean =>
  Boolean(
    components.barangay.trim() &&
      components.cityMunicipality.trim() &&
      components.province.trim(),
  );
