import type { StatsRange } from "./wish-rules";

export type VisitorStats = {
  available: boolean;
  source: "ga4" | null;
  totalUsers: number | null;
  sessions: number | null;
  reason: string | null;
};

export type AdminStats = {
  range: StatsRange;
  generatedAt: string;
  wishesCreated: number;
  shareClicks: number;
  whatsappShareClicks: number;
  copiedLinks: number;
  greetingOpens: number;
  downloads: number;
  languages: { gu: number; hi: number; en: number };
  templates: { template: string; count: number }[];
  daily: { date: string; wishes: number }[];
  shareMethods: { method: string; count: number }[];
  recent: { type: string; language: string; template: string; action: string; createdAt: string }[];
  visitors: VisitorStats;
};

export type PublicConfig = {
  gaMeasurementId: string | null;
  turnstileSiteKey: string | null;
  cfBeaconToken: string | null;
  turnstileRequired: boolean;
  contactEmail: string | null;
  retentionDays: number;
};
