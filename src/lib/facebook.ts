const FACEBOOK_BASE_URL = "https://www.facebook.com";

const FACEBOOK_HOST_PATTERN = /^(?:www\.|m\.|web\.)?(?:facebook\.com|fb\.me)(?:\/|$)/i;

export const normalizeFacebookLink = (value: string) => {
  const trimmed = value.trim().replace(/^@+/, "");

  if (!trimmed) {
    return "";
  }

  if (/^https?:\/\//i.test(trimmed)) {
    return encodeURI(trimmed);
  }

  if (FACEBOOK_HOST_PATTERN.test(trimmed)) {
    return encodeURI(`https://${trimmed}`);
  }

  return encodeURI(`${FACEBOOK_BASE_URL}/${trimmed.replace(/^\/+/, "")}`);
};
