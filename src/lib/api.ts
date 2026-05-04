import { toast } from "sonner";

export const API_BASE_URL = "https://glamour-ferris-spoken.ngrok-free.dev";

const SLOW_MS = 8000;

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const controller = new AbortController();
  const slowTimer = setTimeout(() => {
    toast.warning("API is responding slowly…", { id: `slow-${path}` });
  }, SLOW_MS);

  try {
    const res = await fetch(`${API_BASE_URL}${path}`, {
      ...init,
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        "ngrok-skip-browser-warning": "true",
        Accept: "application/json",
        ...(init.headers || {}),
      },
    });
    clearTimeout(slowTimer);

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      const msg = `${res.status} ${res.statusText}${text ? ` — ${text.slice(0, 140)}` : ""}`;
      toast.error(`API error: ${msg}`);
      throw new Error(msg);
    }

    if (res.status === 204) return undefined as T;
    const ct = res.headers.get("content-type") || "";
    if (ct.includes("application/json")) return (await res.json()) as T;
    return (await res.text()) as unknown as T;
  } catch (err: unknown) {
    clearTimeout(slowTimer);
    const message = err instanceof Error ? err.message : "Unknown error";
    if (!message.startsWith("4") && !message.startsWith("5")) {
      toast.error(`Network error: ${message}`);
    }
    throw err;
  }
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body: unknown) =>
    request<T>(path, { method: "POST", body: JSON.stringify(body) }),
  patch: <T>(path: string, body: unknown) =>
    request<T>(path, { method: "PATCH", body: JSON.stringify(body) }),
  put: <T>(path: string, body: unknown) =>
    request<T>(path, { method: "PUT", body: JSON.stringify(body) }),
  del: <T>(path: string) => request<T>(path, { method: "DELETE" }),
};
