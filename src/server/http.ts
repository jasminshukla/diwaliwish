export function json(body: unknown, status = 200, extra?: HeadersInit): Response {
  const headers = new Headers(extra);
  headers.set("content-type", "application/json; charset=utf-8");
  headers.set("cache-control", "no-store");
  return new Response(JSON.stringify(body), { status, headers });
}

export function sameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return false;
  try {
    return new URL(origin).origin === new URL(request.url).origin;
  } catch {
    return false;
  }
}

export async function readJson(request: Request): Promise<{ ok: true; value: unknown } | { ok: false; response: Response }> {
  const declared = Number(request.headers.get("content-length") ?? "0");
  if (declared > 8_000) return { ok: false, response: json({ error: "Request is too large.", code: "too_large" }, 413) };
  let text = "";
  try {
    text = await request.text();
  } catch {
    return { ok: false, response: json({ error: "Could not read the request.", code: "invalid_body" }, 400) };
  }
  if (text.length > 8_000) return { ok: false, response: json({ error: "Request is too large.", code: "too_large" }, 413) };
  try {
    return { ok: true, value: JSON.parse(text) as unknown };
  } catch {
    return { ok: false, response: json({ error: "Request body must be JSON.", code: "invalid_body" }, 400) };
  }
}

export function absoluteUrl(request: Request, path: string): string {
  return new URL(path, request.url).toString();
}
