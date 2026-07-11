// API client — relative paths so it works on any host (observatory server at :31337).
// In demo mode (NEXT_PUBLIC_DEMO_MODE === "1") every call resolves from bundled
// fixtures with zero network, so the open-source build is fully explorable. See
// src/demo/index.ts. The `import` also self-installs a global fetch/EventSource
// patch that covers the many raw fetch() calls across pages.
import { isDemoMode, resolveDemo } from "@/demo";

async function apiCall<T = unknown>(
  path: string,
  options?: RequestInit
): Promise<T> {
  if (isDemoMode()) {
    // Resolve directly from fixtures — no network, longest-prefix match on path.
    return resolveDemo(path, options?.method || "GET") as T;
  }

  const response = await fetch(path, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options?.headers as Record<string, string>),
    },
  });
  if (!response.ok) {
    throw new Error(`API error: ${response.status} ${response.statusText}`);
  }
  return response.json() as Promise<T>;
}

// Exports — keep names for compatibility with existing hooks
export const localApiCall = apiCall;
export const localOnlyApiCall = apiCall;

// WebSocket stubs — observatory uses HTTP polling, not WebSocket
export function getResolvedWsUrl(): Promise<string> {
  return Promise.resolve("");
}
export const getLocalOnlyWsUrl = getResolvedWsUrl;
