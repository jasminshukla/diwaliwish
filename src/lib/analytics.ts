import { sanitizeGaParams } from "./wish-rules";
import { loadPublicConfig } from "./wish-client";

const CONSENT_KEY = "diwali-analytics-consent";
const sent = new Set<string>();
const queue: { event: string; params: Record<string, string> }[] = [];
let gaReady = false;
let beaconReady = false;
let enabling: Promise<void> | null = null;

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

export type Consent = "unknown" | "granted" | "denied";

export function consentState(): Consent {
  if (typeof localStorage === "undefined") return "unknown";
  const value = localStorage.getItem(CONSENT_KEY);
  return value === "granted" || value === "denied" ? value : "unknown";
}

function sendNow(event: string, params: Record<string, string>) {
  window.gtag?.("event", event, params);
}

async function enableAnalytics() {
  if (enabling) return enabling;
  enabling = (async () => {
    const config = await loadPublicConfig();
    if (config.gaMeasurementId && !gaReady) {
      window.dataLayer = window.dataLayer ?? [];
      window.gtag = function gtag(...args: unknown[]) {
        window.dataLayer?.push(args);
      };
      window.gtag("js", new Date());
      window.gtag("config", config.gaMeasurementId, { send_page_view: false });
      const script = document.createElement("script");
      script.async = true;
      script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(config.gaMeasurementId)}`;
      document.head.appendChild(script);
      gaReady = true;
    }
    if (config.cfBeaconToken && !beaconReady) {
      const script = document.createElement("script");
      script.defer = true;
      script.src = "https://static.cloudflareinsights.com/beacon.min.js";
      script.dataset["cfBeacon"] = JSON.stringify({ token: config.cfBeaconToken });
      document.head.appendChild(script);
      beaconReady = true;
    }
    if (gaReady) {
      for (const item of queue) sendNow(item.event, item.params);
    }
    queue.length = 0;
  })();
  return enabling;
}

export function setConsent(value: Exclude<Consent, "unknown">) {
  localStorage.setItem(CONSENT_KEY, value);
  if (value === "granted") void enableAnalytics();
  else queue.length = 0;
}

export function track(event: string, params: Record<string, string | null | undefined> = {}, onceKey?: string) {
  if (onceKey) {
    if (sent.has(onceKey)) return;
    sent.add(onceKey);
  }
  const clean = sanitizeGaParams(params);
  if (consentState() !== "granted") {
    if (consentState() === "unknown" && queue.length < 30) queue.push({ event, params: clean });
    return;
  }
  if (!gaReady) {
    queue.push({ event, params: clean });
    void enableAnalytics();
    return;
  }
  sendNow(event, clean);
}

export function trackPageView(path: string) {
  track("page_view", { page_path: path }, `page:${path}`);
}

if (typeof window !== "undefined" && consentState() === "granted") {
  void enableAnalytics();
}
