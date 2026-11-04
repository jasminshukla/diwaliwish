import { bindings, blank, isProduction } from "./env";

type Siteverify = { success?: boolean };

export async function verifyTurnstile(token: unknown, request: Request): Promise<{ ok: true } | { ok: false; status: number; error: string; code: string }> {
  const secret = blank(bindings().TURNSTILE_SECRET_KEY);
  if (!secret) {
    if (isProduction()) {
      return {
        ok: false,
        status: 503,
        error: "Greeting protection is not configured yet.",
        code: "turnstile_not_configured",
      };
    }
    return { ok: true };
  }
  if (typeof token !== "string" || token.length < 10 || token.length > 2048) {
    return { ok: false, status: 403, error: "Please confirm you are a person and try again.", code: "turnstile_required" };
  }
  const body = new URLSearchParams({ secret, response: token });
  const host = new URL(request.url).hostname;
  let response: Response;
  try {
    response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body,
    });
  } catch (error) {
    console.error(JSON.stringify({ level: "error", message: "turnstile_unreachable", host }));
    void error;
    return { ok: false, status: 503, error: "Greeting protection could not be checked. Try again.", code: "turnstile_unavailable" };
  }
  if (!response.ok) {
    return { ok: false, status: 503, error: "Greeting protection could not be checked. Try again.", code: "turnstile_unavailable" };
  }
  const result = (await response.json()) as Siteverify;
  if (!result.success) {
    return { ok: false, status: 403, error: "Please confirm you are a person and try again.", code: "turnstile_failed" };
  }
  return { ok: true };
}
