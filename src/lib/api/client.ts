/**
 * Client-side helper for calling the data API (DL-32..DL-34). Returns a simple
 * result so components can surface errors without throwing. Client-safe (no
 * server-only imports).
 */
export interface SendResult {
  ok: boolean;
  message?: string;
}

export async function sendJson(
  url: string,
  body: unknown,
  method: "POST" | "PUT" = "POST",
): Promise<SendResult> {
  try {
    const res = await fetch(url, {
      method,
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    if (res.ok) return { ok: true };
    const data = (await res.json().catch(() => null)) as { message?: string } | null;
    return { ok: false, message: data?.message ?? "Something went wrong." };
  } catch {
    return { ok: false, message: "Network error. Please try again." };
  }
}
