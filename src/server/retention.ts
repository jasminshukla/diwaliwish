import { retentionDays } from "./env";
import { run } from "./db";
import { purgeRateLimits } from "./rate-limit";

export async function purgeExpired(now = new Date()): Promise<{ deleted: boolean; retentionDays: number }> {
  const days = retentionDays();
  await purgeRateLimits(now.getTime());
  if (days === 0) return { deleted: false, retentionDays: 0 };
  const cutoff = new Date(now.getTime() - days * 24 * 60 * 60 * 1000).toISOString();
  await run("DELETE FROM events WHERE created_at < ?", [cutoff]);
  await run("DELETE FROM idempotency_keys WHERE created_at < ?", [cutoff]);
  await run("DELETE FROM wishes WHERE created_at < ?", [cutoff]);
  return { deleted: true, retentionDays: days };
}
