/**
 * HTTP helpers that work in three environments:
 *  - Browser web app (uses fetch, CORS applies)
 *  - Next.js server (uses fetch, no CORS restrictions)
 *  - Capacitor Android WebView (uses the native HTTP bridge so CORS never applies)
 */

type NativeCapacitor = {
  isNativePlatform?: () => boolean;
  Plugins?: { CapacitorHttp?: NativeHttpPlugin };
};

type NativeHttpPlugin = {
  get: (options: {
    url: string;
    headers?: Record<string, string>;
    responseType?: string;
    connectTimeout?: number;
    readTimeout?: number;
  }) => Promise<{ status: number; data: unknown }>;
  post: (options: {
    url: string;
    headers?: Record<string, string>;
    data?: unknown;
    responseType?: string;
    connectTimeout?: number;
    readTimeout?: number;
  }) => Promise<{ status: number; data: unknown }>;
};

function nativeHttp(): NativeHttpPlugin | null {
  if (typeof window === "undefined") return null;
  const cap = (window as unknown as { Capacitor?: NativeCapacitor }).Capacitor;
  if (!cap) return null;
  const plugin = cap.Plugins?.CapacitorHttp ?? null;
  if (!plugin) return null;
  const native = typeof cap.isNativePlatform === "function" ? cap.isNativePlatform() : true;
  return native ? plugin : null;
}

export function isNativeApp(): boolean {
  return nativeHttp() !== null;
}

export async function httpGetJson<T>(url: string, headers: Record<string, string> = {}): Promise<T> {
  const plugin = nativeHttp();
  if (plugin) {
    const res = await plugin.get({
      url,
      headers: { Accept: "application/json", ...headers },
      responseType: "json",
      connectTimeout: 20000,
      readTimeout: 30000,
    });
    if (res.status >= 400) throw new Error(`Request failed (${res.status})`);
    return res.data as T;
  }
  const res = await fetch(url, {
    headers: { Accept: "application/json", ...headers },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Request failed (${res.status})`);
  return (await res.json()) as T;
}

export async function httpPostJson<T>(
  url: string,
  body: unknown,
  headers: Record<string, string> = {},
): Promise<T> {
  const plugin = nativeHttp();
  const payload = { headers: { "Content-Type": "application/json", Accept: "application/json", ...headers }, data: body };
  if (plugin) {
    const res = await plugin.post({ url, ...payload, responseType: "json", connectTimeout: 20000, readTimeout: 30000 });
    if (res.status >= 400) throw new Error(`Request failed (${res.status})`);
    return res.data as T;
  }
  const res = await fetch(url, { method: "POST", ...payload });
  if (!res.ok) throw new Error(`Request failed (${res.status})`);
  return (await res.json()) as T;
}

export async function httpGetText(url: string, headers: Record<string, string> = {}): Promise<string> {
  const plugin = nativeHttp();
  if (plugin) {
    const res = await plugin.get({ url, headers, responseType: "text", connectTimeout: 20000, readTimeout: 30000 });
    if (res.status >= 400) throw new Error(`Request failed (${res.status})`);
    return typeof res.data === "string" ? res.data : JSON.stringify(res.data);
  }
  const res = await fetch(url, { headers, cache: "no-store" });
  if (!res.ok) throw new Error(`Request failed (${res.status})`);
  return await res.text();
}
