export const LANGUAGES = ["gu", "hi", "en"] as const;
export type WishLanguage = (typeof LANGUAGES)[number];

export const TEMPLATES = ["royal", "traditional", "minimal", "purple", "family", "corporate"] as const;
export type WishTemplate = (typeof TEMPLATES)[number];

export const EVENT_TYPES = [
  "share_clicked",
  "whatsapp_share_clicked",
  "copy_link_clicked",
  "greeting_opened",
  "download_clicked",
  "create_wish_started",
  "language_changed",
  "music_played",
] as const;
export type WishEventType = (typeof EVENT_TYPES)[number];

export const SHARE_ACTIONS = ["native", "whatsapp", "whatsapp-fallback", "copy", "download", "other"] as const;

const PUBLIC_ID_ALPHABET = "23456789abcdefghjkmnpqrstuvwxyz";
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const TEMPLATE_ALIASES: Record<string, WishTemplate> = {
  royal: "royal",
  "royal-gold": "royal",
  royal_gold: "royal",
  royalgold: "royal",
  traditional: "traditional",
  minimal: "minimal",
  "modern-minimal": "minimal",
  purple: "purple",
  "luxury-purple": "purple",
  family: "family",
  corporate: "corporate",
};

export type WishInput = {
  senderName: string;
  language: WishLanguage;
  template: WishTemplate;
  customMessage: string | null;
};

export type WishInputResult =
  | { ok: true; value: WishInput }
  | { ok: false; error: string; code: string };

export function normalizeLanguage(value: unknown): WishLanguage | null {
  if (typeof value !== "string") return null;
  const v = value.trim().toLowerCase();
  if (v === "gu" || v === "gujarati" || v === "ગુજરાતી") return "gu";
  if (v === "hi" || v === "hindi" || v === "हिंदी" || v === "हिन्दी") return "hi";
  if (v === "en" || v === "english") return "en";
  return null;
}

export function normalizeTemplate(value: unknown): WishTemplate | null {
  if (typeof value !== "string") return null;
  return TEMPLATE_ALIASES[value.trim().toLowerCase()] ?? null;
}

export function cleanSenderName(value: unknown): string {
  if (typeof value !== "string") return "";
  return value
    .replace(/[<>{}[\]\\]/g, "")
    .replace(/[\u0000-\u001F\u007F]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 40);
}

export function cleanMessage(value: unknown): string | null {
  if (value == null) return null;
  if (typeof value !== "string") return null;
  const text = value
    .replace(/[<>]/g, "")
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
    .trim()
    .slice(0, 280);
  return text.length > 0 ? text : null;
}

export function validateWishInput(body: unknown): WishInputResult {
  if (body == null || typeof body !== "object" || Array.isArray(body)) {
    return { ok: false, error: "Request body must be a JSON object.", code: "invalid_body" };
  }
  const record = body as Record<string, unknown>;
  const senderName = cleanSenderName(record["senderName"]);
  if (!senderName) {
    return { ok: false, error: "Enter a sender name up to 40 characters.", code: "invalid_name" };
  }
  const language = normalizeLanguage(record["language"]);
  if (!language) {
    return { ok: false, error: "Language must be Gujarati, Hindi, or English.", code: "invalid_language" };
  }
  const template = normalizeTemplate(record["template"]);
  if (!template) {
    return { ok: false, error: "Choose a supported greeting design.", code: "invalid_template" };
  }
  if ("customMessage" in record && record["customMessage"] != null && typeof record["customMessage"] !== "string") {
    return { ok: false, error: "The greeting message must be text.", code: "invalid_message" };
  }
  const customMessage = cleanMessage(record["customMessage"]);
  if (typeof record["customMessage"] === "string" && record["customMessage"].trim().length > 280) {
    return { ok: false, error: "The greeting message must be 280 characters or fewer.", code: "invalid_message" };
  }
  return { ok: true, value: { senderName, language, template, customMessage } };
}

export function isUuid(value: string): boolean {
  return UUID_RE.test(value);
}

export function isPublicId(value: string): boolean {
  if (value.length !== 8) return false;
  for (const char of value) {
    if (!PUBLIC_ID_ALPHABET.includes(char)) return false;
  }
  return true;
}

export function createPublicId(): string {
  const chars: string[] = [];
  while (chars.length < 8) {
    const bytes = crypto.getRandomValues(new Uint8Array(8));
    for (const byte of bytes) {
      if (byte >= 248) continue;
      chars.push(PUBLIC_ID_ALPHABET[byte % PUBLIC_ID_ALPHABET.length]!);
      if (chars.length === 8) break;
    }
  }
  return chars.join("");
}

export function wishPath(publicId: string): string {
  return `/w/${publicId}`;
}

export function validateEventInput(body: unknown):
  | {
      ok: true;
      value: {
        type: WishEventType;
        wishId: string | null;
        action: string | null;
        language: WishLanguage | null;
        template: WishTemplate | null;
      };
    }
  | { ok: false; error: string; code: string } {
  if (body == null || typeof body !== "object" || Array.isArray(body)) {
    return { ok: false, error: "Request body must be a JSON object.", code: "invalid_body" };
  }
  const record = body as Record<string, unknown>;
  const type = record["type"];
  if (typeof type !== "string" || !EVENT_TYPES.includes(type as WishEventType)) {
    return { ok: false, error: "That event is not tracked.", code: "invalid_event" };
  }
  const wishRaw = record["wishId"];
  let wishId: string | null = null;
  if (wishRaw != null && wishRaw !== "") {
    if (typeof wishRaw !== "string" || !isPublicId(wishRaw)) {
      return { ok: false, error: "Unknown greeting link.", code: "invalid_wish" };
    }
    wishId = wishRaw;
  }
  if (type === "greeting_opened" && !wishId) {
    return { ok: false, error: "Opening a greeting requires its link id.", code: "invalid_wish" };
  }
  const actionRaw = record["action"];
  let action: string | null = null;
  if (actionRaw != null && actionRaw !== "") {
    if (typeof actionRaw !== "string") {
      return { ok: false, error: "Invalid share method.", code: "invalid_action" };
    }
    const cleaned = actionRaw.trim().toLowerCase().slice(0, 32);
    if (!/^[a-z0-9_-]+$/.test(cleaned)) {
      return { ok: false, error: "Invalid share method.", code: "invalid_action" };
    }
    action = cleaned;
  }
  const language = record["language"] == null || record["language"] === "" ? null : normalizeLanguage(record["language"]);
  if (record["language"] != null && record["language"] !== "" && !language) {
    return { ok: false, error: "Language must be Gujarati, Hindi, or English.", code: "invalid_language" };
  }
  const template = record["template"] == null || record["template"] === "" ? null : normalizeTemplate(record["template"]);
  if (record["template"] != null && record["template"] !== "" && !template) {
    return { ok: false, error: "Choose a supported greeting design.", code: "invalid_template" };
  }
  return { ok: true, value: { type: type as WishEventType, wishId, action, language, template } };
}

const SHARE_COUNT_EVENTS = new Set<WishEventType>([
  "share_clicked",
  "whatsapp_share_clicked",
  "copy_link_clicked",
]);

export function counterDeltas(type: WishEventType): { share: number; view: number } {
  return {
    share: SHARE_COUNT_EVENTS.has(type) ? 1 : 0,
    view: type === "greeting_opened" ? 1 : 0,
  };
}

export type StatsRange = "today" | "7d" | "30d" | "all";

export function parseStatsRange(value: string | null): StatsRange {
  if (value === "today" || value === "7d" || value === "30d" || value === "all") return value;
  return "7d";
}

export function rangeStartIso(range: StatsRange, now = new Date()): string | null {
  if (range === "all") return null;
  if (range === "today") {
    return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())).toISOString();
  }
  const days = range === "7d" ? 7 : 30;
  return new Date(now.getTime() - days * 24 * 60 * 60 * 1000).toISOString();
}

export function rateWindowStart(nowMs: number, windowSec = 3600): number {
  const sec = Math.floor(nowMs / 1000);
  return sec - (sec % windowSec);
}

const GA_FORBIDDEN = ["sender", "name", "recipient", "email", "phone", "ip", "message", "address"];

export function sanitizeGaParams(params: Record<string, string | null | undefined>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(params)) {
    if (!value) continue;
    const lower = key.toLowerCase();
    if (GA_FORBIDDEN.some((word) => lower.includes(word))) continue;
    if (value.length > 80) continue;
    out[key] = value;
  }
  return out;
}

export async function sha256Hex(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function timingSafeEqual(a: string, b: string): Promise<boolean> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    crypto.getRandomValues(new Uint8Array(32)),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const [sigA, sigB] = await Promise.all([
    crypto.subtle.sign("HMAC", key, enc.encode(a)),
    crypto.subtle.sign("HMAC", key, enc.encode(b)),
  ]);
  const left = new Uint8Array(sigA);
  const right = new Uint8Array(sigB);
  let diff = left.length ^ right.length;
  const length = Math.max(left.length, right.length);
  for (let i = 0; i < length; i++) diff |= (left[i] ?? 0) ^ (right[i] ?? 0);
  return diff === 0;
}
