import { counterDeltas, type WishEventType, type WishLanguage, type WishTemplate } from "@/lib/wish-rules";
import { first, run } from "./db";
import { findInternalId } from "./wishes";

const DEDUPE_MS = 2_000;

export async function recordEvent(input: {
  type: WishEventType;
  publicWishId: string | null;
  action: string | null;
  language: WishLanguage | null;
  template: WishTemplate | null;
  sessionId: string;
}): Promise<{ recorded: boolean; duplicate: boolean }> {
  const wishId = input.publicWishId ? await findInternalId(input.publicWishId) : null;
  if (input.publicWishId && !wishId) return { recorded: false, duplicate: false };

  if (input.type === "greeting_opened" && wishId) {
    const prior = await first<{ id: string }>(
      `SELECT id FROM events
       WHERE event_type = 'greeting_opened' AND wish_id = ? AND session_id = ?
       LIMIT 1`,
      [wishId, input.sessionId],
    );
    if (prior) return { recorded: false, duplicate: true };
  } else {
    const cutoff = new Date(Date.now() - DEDUPE_MS).toISOString();
    const burst = await first<{ id: string }>(
      `SELECT id FROM events
       WHERE event_type = ? AND session_id = ? AND ifnull(wish_id, '') = ? AND ifnull(action, '') = ?
         AND created_at >= ?
       LIMIT 1`,
      [input.type, input.sessionId, wishId ?? "", input.action ?? "", cutoff],
    );
    if (burst) return { recorded: false, duplicate: true };
  }

  const now = new Date().toISOString();
  try {
    await run(
      `INSERT INTO events (id, wish_id, event_type, created_at, session_id, action, language, template)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        crypto.randomUUID(),
        wishId,
        input.type,
        now,
        input.sessionId,
        input.action,
        input.language,
        input.template,
      ],
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (input.type === "greeting_opened" && /UNIQUE|constraint/i.test(message)) {
      return { recorded: false, duplicate: true };
    }
    throw error;
  }
  const delta = counterDeltas(input.type);
  if (wishId && (delta.share > 0 || delta.view > 0)) {
    await run("UPDATE wishes SET share_count = share_count + ?, view_count = view_count + ? WHERE id = ?", [
      delta.share,
      delta.view,
      wishId,
    ]);
  }
  return { recorded: true, duplicate: false };
}
