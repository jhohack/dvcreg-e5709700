const FACEBOOK_BASE_URL = "https://web.facebook.com";

const FACEBOOK_HOST_PATTERN = /^(?:www\.|m\.|web\.)?(?:facebook\.com|fb\.me)(?:\/|$)/i;
const FACEBOOK_USERNAME_PATTERN = /^(?=.{3,100}$)[A-Za-z0-9._-]+$/;

const isFacebookUsername = (value: string) => FACEBOOK_USERNAME_PATTERN.test(value);

export const normalizeFacebookLink = (value: string) => {
  const trimmed = value.trim().replace(/^@+/, "");

  if (!trimmed) {
    return "";
  }

  const looksLikeFacebookUrl = /^https?:\/\//i.test(trimmed) || FACEBOOK_HOST_PATTERN.test(trimmed);

  if (looksLikeFacebookUrl) {
    try {
      const url = new URL(/^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`);

      if (/(?:^|\.)facebook\.com$/i.test(url.hostname)) {
        url.hostname = "web.facebook.com";
      }

      url.protocol = "https:";
      return url.toString();
    } catch {
      return "";
    }
  }

  if (isFacebookUsername(trimmed)) {
    return `${FACEBOOK_BASE_URL}/${trimmed.replace(/^\/+/, "")}`;
  }

  return "";
};
