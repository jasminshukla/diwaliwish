import type { PublicConfig } from "./stats-types";
import type { WishLanguage } from "./wish-rules";
import { getSessionId } from "./session";

export type SavedWish = { id: string; url: string };

const GA_ID = /^G-[A-Z0-9]+$/;
const SITE_KEY = /^[A-Za-z0-9_-]{10,128}$/;
const BEACON = /^[A-Za-z0-9_-]{8,128}$/;

let configPromise: Promise<PublicConfig> | null = null;

function fallbackConfig(): PublicConfig {
  const ga = import.meta.env.VITE_GA_MEASUREMENT_ID ?? "";
  const siteKey = import.meta.env.VITE_TURNSTILE_SITE_KEY ?? "";
  const beacon = import.meta.env.VITE_CF_BEACON_TOKEN ?? "";
  return {
    gaMeasurementId: GA_ID.test(ga) ? ga : null,
    turnstileSiteKey: SITE_KEY.test(siteKey) ? siteKey : null,
    cfBeaconToken: BEACON.test(beacon) ? beacon : null,
    turnstileRequired: false,
    contactEmail: null,
    retentionDays: 365,
  };
}

export function loadPublicConfig(): Promise<PublicConfig> {
  if (!configPromise) {
    configPromise = fetch("/api/config")
      .then(async (response) => {
        if (!response.ok) throw new Error("config");
        const remote = (await response.json()) as PublicConfig;
        const local = fallbackConfig();
        return {
          ...remote,
          gaMeasurementId: remote.gaMeasurementId ?? local.gaMeasurementId,
          turnstileSiteKey: remote.turnstileSiteKey ?? local.turnstileSiteKey,
          cfBeaconToken: remote.cfBeaconToken ?? local.cfBeaconToken,
        };
      })
      .catch(() => fallbackConfig());
  }
  return configPromise;
}

export async function createWishRequest(input: {
  senderName: string;
  language: WishLanguage;
  template: string;
  customMessage?: string | null;
  turnstileToken: string;
  idempotencyKey: string;
}): Promise<SavedWish> {
  const response = await fetch("/api/wishes", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-session-id": getSessionId(),
      "idempotency-key": input.idempotencyKey,
    },
    body: JSON.stringify({
      senderName: input.senderName,
      language: input.language,
      template: input.template,
      customMessage: input.customMessage ?? null,
      turnstileToken: input.turnstileToken,
    }),
  });
  const body = (await response.json().catch(() => null)) as { id?: string; url?: string; error?: string } | null;
  if (!response.ok || !body?.id || !body.url) {
    throw new Error(body?.error || "The greeting could not be saved.");
  }
  return { id: body.id, url: body.url };
}

export function recordEvent(input: {
  type: string;
  wishId?: string | null;
  action?: string | null;
  language?: string | null;
  template?: string | null;
}): void {
  void fetch("/api/events", {
    method: "POST",
    headers: { "content-type": "application/json", "x-session-id": getSessionId() },
    body: JSON.stringify({
      type: input.type,
      wishId: input.wishId ?? null,
      action: input.action ?? null,
      language: input.language ?? null,
      template: input.template ?? null,
    }),
  }).catch(() => undefined);
}
