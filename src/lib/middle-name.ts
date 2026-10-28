export const hasFullMiddleName = (value: string) => value
  .trim()
  .split(/[^\p{L}]+/u)
  .some((part) => part.length >= 2);

export const normalizeOptionalMiddleName = (value: string, hasNoMiddleName: boolean) =>
  hasNoMiddleName ? null : value.trim() || null;

export const isValidMiddleNameChoice = (value: string, hasNoMiddleName: boolean) =>
  hasNoMiddleName || hasFullMiddleName(value);
