import type { PublicConfig } from "@/lib/stats-types";
import { bindings, blank, isProduction, retentionDays } from "./env";

const GA_ID = /^G-[A-Z0-9]+$/;
const SITE_KEY = /^[A-Za-z0-9_-]{10,128}$/;
const BEACON = /^[A-Za-z0-9_-]{8,128}$/;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function publicConfig(): PublicConfig {
  const env = bindings();
  const ga = blank(env.GA_MEASUREMENT_ID);
  const siteKey = blank(env.TURNSTILE_SITE_KEY);
  const beacon = blank(env.CF_BEACON_TOKEN);
  const email = blank(env.SITE_CONTACT_EMAIL);
  return {
    gaMeasurementId: ga && GA_ID.test(ga) ? ga : null,
    turnstileSiteKey: siteKey && SITE_KEY.test(siteKey) ? siteKey : null,
    cfBeaconToken: beacon && BEACON.test(beacon) ? beacon : null,
    turnstileRequired: isProduction(),
    contactEmail: email && EMAIL.test(email) ? email : null,
    retentionDays: retentionDays(),
  };
}
