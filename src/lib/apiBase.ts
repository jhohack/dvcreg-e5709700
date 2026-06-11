const trimTrailingSlashes = (value: string) => value.trim().replace(/\/+$/, "");

const configuredApiBase = trimTrailingSlashes(import.meta.env.VITE_API_BASE_URL ?? "");

const isLocalHostname = (hostname: string) => hostname === "localhost" || hostname === "127.0.0.1";

const resolveConfiguredUrl = () => {
  if (typeof window === "undefined" || configuredApiBase === "") {
    return null;
  }

  try {
    return new URL(configuredApiBase, window.location.origin);
  } catch {
    return null;
  }
};

const shouldUseLocalProxy = () => {
  if (typeof window === "undefined") {
    return false;
  }

  if (!isLocalHostname(window.location.hostname)) {
    return false;
  }

  if (configuredApiBase === "") {
    return true;
  }

  const url = resolveConfiguredUrl();
  if (url) {
    return isLocalHostname(url.hostname);
  }

  return configuredApiBase.startsWith("/api");
};

export const getApiBaseUrl = () => {
  if (shouldUseLocalProxy()) {
    return "/api";
  }

  const url = resolveConfiguredUrl();
  if (url && typeof window !== "undefined") {
    const pageIsLocal = isLocalHostname(window.location.hostname);
    const apiIsLocal = isLocalHostname(url.hostname);

    // If a localhost API value is baked into a non-local deployment, force same-origin /api.
    if (!pageIsLocal && apiIsLocal) {
      return "/api";
    }
  }

  return configuredApiBase;
};
