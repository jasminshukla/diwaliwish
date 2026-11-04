import type { VisitorStats } from "@/lib/stats-types";
import type { StatsRange } from "@/lib/wish-rules";
import { bindings, blank } from "./env";

type TokenCache = { token: string; expires: number };
let tokenCache: TokenCache | null = null;

function pemToBytes(pem: string): Uint8Array<ArrayBuffer> {
  const body = pem
    .replace(/\\n/g, "\n")
    .replace(/-----BEGIN PRIVATE KEY-----/g, "")
    .replace(/-----END PRIVATE KEY-----/g, "")
    .replace(/\s+/g, "");
  const binary = atob(body);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)!;
  return bytes;
}

function base64url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function gaRange(range: StatsRange): { startDate: string; endDate: string } {
  if (range === "today") return { startDate: "today", endDate: "today" };
  if (range === "7d") return { startDate: "7daysAgo", endDate: "today" };
  if (range === "30d") return { startDate: "30daysAgo", endDate: "today" };
  return { startDate: "2026-01-01", endDate: "today" };
}

async function accessToken(clientEmail: string, privateKeyPem: string): Promise<string> {
  if (tokenCache && tokenCache.expires > Date.now() + 60_000) return tokenCache.token;
  const key = await crypto.subtle.importKey(
    "pkcs8",
    pemToBytes(privateKeyPem),
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const now = Math.floor(Date.now() / 1000);
  const header = base64url(new TextEncoder().encode(JSON.stringify({ alg: "RS256", typ: "JWT" })));
  const payload = base64url(
    new TextEncoder().encode(
      JSON.stringify({
        iss: clientEmail,
        scope: "https://www.googleapis.com/auth/analytics.readonly",
        aud: "https://oauth2.googleapis.com/token",
        iat: now,
        exp: now + 3600,
      }),
    ),
  );
  const signature = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", key, new TextEncoder().encode(`${header}.${payload}`));
  const assertion = `${header}.${payload}.${base64url(new Uint8Array(signature))}`;
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }),
  });
  if (!response.ok) throw new Error("ga4_token_failed");
  const body = (await response.json()) as { access_token?: string; expires_in?: number };
  if (!body.access_token) throw new Error("ga4_token_missing");
  tokenCache = { token: body.access_token, expires: Date.now() + (body.expires_in ?? 3600) * 1000 };
  return body.access_token;
}

export async function ga4Visitors(range: StatsRange): Promise<VisitorStats> {
  const property = blank(bindings().GA4_PROPERTY_ID)?.replace(/^properties\//, "") ?? null;
  const email = blank(bindings().GA4_CLIENT_EMAIL);
  const privateKey = blank(bindings().GA4_PRIVATE_KEY);
  if (!property || !email || !privateKey) {
    return {
      available: false,
      source: null,
      totalUsers: null,
      sessions: null,
      reason: "Google Analytics Data API is not configured.",
    };
  }
  try {
    const token = await accessToken(email, privateKey);
    const response = await fetch(`https://analyticsdata.googleapis.com/v1beta/properties/${property}:runReport`, {
      method: "POST",
      headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
      body: JSON.stringify({
        dateRanges: [gaRange(range)],
        metrics: [{ name: "totalUsers" }, { name: "sessions" }],
      }),
    });
    if (!response.ok) throw new Error("ga4_report_failed");
    const body = (await response.json()) as {
      rows?: { metricValues?: { value?: string }[] }[];
    };
    const metrics = body.rows?.[0]?.metricValues ?? [];
    return {
      available: true,
      source: "ga4",
      totalUsers: Number(metrics[0]?.value ?? 0),
      sessions: Number(metrics[1]?.value ?? 0),
      reason: null,
    };
  } catch (error) {
    console.error(JSON.stringify({ level: "error", message: "ga4_visitors_failed" }));
    void error;
    return {
      available: false,
      source: null,
      totalUsers: null,
      sessions: null,
      reason: "Google Analytics could not be reached.",
    };
  }
}
