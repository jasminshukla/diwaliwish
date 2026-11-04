import type { PublicWish } from "@/lib/public-wish";
import { createPublicId, sha256Hex, wishPath, type WishInput } from "@/lib/wish-rules";
import { first, getDb } from "./db";

type WishRow = {
  public_id: string;
  sender_name: string;
  language: "gu" | "hi" | "en";
  template: string;
  custom_message: string | null;
  created_at: string;
};

export type { PublicWish };

function toPublic(row: WishRow): PublicWish {
  return {
    id: row.public_id,
    senderName: row.sender_name,
    language: row.language,
    template: row.template,
    customMessage: row.custom_message,
    createdAt: row.created_at,
  };
}

export async function findWishByPublicId(publicId: string): Promise<PublicWish | null> {
  const row = await first<WishRow>(
    `SELECT public_id, sender_name, language, template, custom_message, created_at
     FROM wishes WHERE public_id = ?`,
    [publicId],
  );
  return row ? toPublic(row) : null;
}

export async function findInternalId(publicId: string): Promise<string | null> {
  const row = await first<{ id: string }>("SELECT id FROM wishes WHERE public_id = ?", [publicId]);
  return row?.id ?? null;
}

async function payloadHashFor(value: WishInput): Promise<string> {
  return sha256Hex(JSON.stringify([value.senderName, value.language, value.template, value.customMessage]));
}

export async function findReusableWish(input: {
  sessionId: string;
  idempotencyKey: string;
  value: WishInput;
}): Promise<PublicWish | null> {
  const existingKey = await first<{ wish_public_id: string }>(
    "SELECT wish_public_id FROM idempotency_keys WHERE key = ? AND session_id = ?",
    [input.idempotencyKey, input.sessionId],
  );
  if (existingKey) return findWishByPublicId(existingKey.wish_public_id);
  const payloadHash = await payloadHashFor(input.value);
  const recentCutoff = new Date(Date.now() - 15_000).toISOString();
  const recent = await first<{ wish_public_id: string }>(
    `SELECT wish_public_id FROM idempotency_keys
     WHERE session_id = ? AND payload_hash = ? AND created_at >= ?
     ORDER BY created_at DESC LIMIT 1`,
    [input.sessionId, payloadHash, recentCutoff],
  );
  return recent ? findWishByPublicId(recent.wish_public_id) : null;
}

export async function createWish(input: {
  sessionId: string;
  idempotencyKey: string;
  value: WishInput;
}): Promise<PublicWish> {
  const reusable = await findReusableWish(input);
  if (reusable) return reusable;
  const payloadHash = await payloadHashFor(input.value);

  for (let attempt = 0; attempt < 5; attempt++) {
    const id = crypto.randomUUID();
    const publicId = createPublicId();
    const now = new Date().toISOString();
    try {
      await getDb().batch([
        getDb()
          .prepare(
            `INSERT INTO wishes (id, public_id, sender_name, language, template, custom_message, share_count, view_count, created_at)
             VALUES (?, ?, ?, ?, ?, ?, 0, 0, ?)`,
          )
          .bind(id, publicId, input.value.senderName, input.value.language, input.value.template, input.value.customMessage, now),
        getDb()
          .prepare(
            `INSERT INTO idempotency_keys (key, session_id, payload_hash, wish_public_id, created_at)
             VALUES (?, ?, ?, ?, ?)`,
          )
          .bind(input.idempotencyKey, input.sessionId, payloadHash, publicId, now),
      ]);
      return {
        id: publicId,
        senderName: input.value.senderName,
        language: input.value.language,
        template: input.value.template,
        customMessage: input.value.customMessage,
        createdAt: now,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (!/UNIQUE|constraint/i.test(message)) throw error;
      const raced = await first<{ wish_public_id: string }>(
        "SELECT wish_public_id FROM idempotency_keys WHERE key = ? AND session_id = ?",
        [input.idempotencyKey, input.sessionId],
      );
      if (raced) {
        const existing = await findWishByPublicId(raced.wish_public_id);
        if (existing) return existing;
      }
    }
  }
  throw new Error("Could not allocate a greeting link");
}

export function createdWishResponse(request: Request, wish: PublicWish): { id: string; url: string } {
  return { id: wish.id, url: new URL(wishPath(wish.id), request.url).toString() };
}
