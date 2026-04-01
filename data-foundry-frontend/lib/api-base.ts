function trimTrailingSlash(value: string): string {
  return value.replace(/\/+$/, "");
}

function isAutoBase(value: string): boolean {
  return value.trim().toLowerCase() === "auto";
}

function shouldUseSameOriginProxy(base: string): boolean {
  if (!base) {
    return true;
  }

  if (isAutoBase(base)) {
    return false;
  }

  try {
    const url = new URL(base);
    return url.hostname === "localhost" || url.hostname === "127.0.0.1";
  } catch {
    return true;
  }
}

export function getBrowserApiBase(): string {
  const configuredRaw = (process.env.NEXT_PUBLIC_API_BASE ?? "").trim();
  const configured = trimTrailingSlash(configuredRaw);

  // Special case: let the browser call backend directly via current hostname:8000.
  // Useful when frontend is opened from another machine and "localhost" would point to the client.
  if (configured && isAutoBase(configured)) {
    if (typeof window === "undefined") {
      return "";
    }
    const protocol = window.location.protocol;
    const hostname = window.location.hostname;
    return `${protocol}//${hostname}:8000`;
  }

  return shouldUseSameOriginProxy(configured) ? "" : configured;
}

export function buildApiUrl(path: string): string {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${getBrowserApiBase()}${normalizedPath}`;
}

export function getServerBackendBase(): string {
  const configured = trimTrailingSlash(
    (process.env.BACKEND_API_BASE ?? process.env.NEXT_PUBLIC_API_BASE ?? "http://127.0.0.1:8000").trim(),
  );
  return configured || "http://127.0.0.1:8000";
}
