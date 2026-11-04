import { env } from "cloudflare:workers";

export type AppEnv = {
  DB: D1Database;
  ENVIRONMENT?: string;
  DATA_RETENTION_DAYS?: string;
  GA_MEASUREMENT_ID?: string;
  TURNSTILE_SITE_KEY?: string;
  TURNSTILE_SECRET_KEY?: string;
  CF_BEACON_TOKEN?: string;
  CF_ACCESS_TEAM_DOMAIN?: string;
  CF_ACCESS_AUD?: string;
  GA4_PROPERTY_ID?: string;
  GA4_CLIENT_EMAIL?: string;
  GA4_PRIVATE_KEY?: string;
  ADMIN_API_TOKEN?: string;
  RATE_LIMIT_SALT?: string;
  SITE_CONTACT_EMAIL?: string;
};

export function bindings(): AppEnv {
  return env as unknown as AppEnv;
}

export function blank(value: string | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

export function isProduction(): boolean {
  return blank(bindings().ENVIRONMENT) !== "development";
}

export function retentionDays(): number {
  const raw = blank(bindings().DATA_RETENTION_DAYS);
  if (!raw || raw === "0") return 0;
  const days = Number(raw);
  if (!Number.isFinite(days) || days < 30 || days > 3650) return 365;
  return Math.floor(days);
}
