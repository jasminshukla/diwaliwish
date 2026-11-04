import { rateWindowStart, sha256Hex } from "@/lib/wish-rules";
import { bindings, blank } from "./env";
import { first, run } from "./db";

const WINDOW_SEC = 3600;

async function bump(bucket: string, nowMs: number): Promise<number> {
  const windowStart = rateWindowStart(nowMs, WINDOW_SEC);
  const row = await first<{ count: number }>(
    `INSERT INTO rate_limits (bucket_key, window_start, count)
     VALUES (?, ?, 1)
     ON CONFLICT(bucket_key, window_start) DO UPDATE SET count = count + 1
     RETURNING count`,
    [bucket, windowStart],
  );
  return Number(row?.count ?? 1);
}

async function networkHash(request: Request): Promise<string | null> {
  const salt = blank(bindings().RATE_LIMIT_SALT);
  if (!salt) return null;
  const hint = request.headers.get("cf-connecting-ip");
  if (!hint) return null;
  const day = new Date().toISOString().slice(0, 10);
  return (await sha256Hex(`${salt}|${day}|${hint}`)).slice(0, 32);
}

export async function enforceRateLimit(
  request: Request,
  scope: "wish" | "event",
  sessionId: string,
): Promise<{ ok: true } | { ok: false; retryAfter: number }> {
  const now = Date.now();
  const sessionLimit = scope === "wish" ? 8 : 60;
  const networkLimit = scope === "wish" ? 20 : 120;
  const sessionCount = await bump(`${scope}:session:${sessionId}`, now);
  if (sessionCount > sessionLimit) return { ok: false, retryAfter: WINDOW_SEC };
  const hash = await networkHash(request);
  if (hash) {
    const networkCount = await bump(`${scope}:net:${hash}`, now);
    if (networkCount > networkLimit) return { ok: false, retryAfter: WINDOW_SEC };
  }
  return { ok: true };
}

export async function purgeRateLimits(nowMs = Date.now()): Promise<void> {
  const cutoff = Math.floor(nowMs / 1000) - 2 * 24 * 60 * 60;
  await run("DELETE FROM rate_limits WHERE window_start < ?", [cutoff]);
}
