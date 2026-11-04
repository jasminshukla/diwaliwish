import { timingSafeEqual } from "@/lib/wish-rules";
import { bindings, blank } from "./env";
import { json } from "./http";

type AccessResult = "valid" | "invalid" | "absent";

type Certs = { keys?: JsonWebKey[]; expires: number };
let certCache: { team: string; certs: Certs } | null = null;

function b64urlToBytes(value: string): Uint8Array<ArrayBuffer> {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat((4 - (value.length % 4)) % 4);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)!;
  return bytes;
}

function decodePart(part: string): Record<string, unknown> | null {
  try {
    return JSON.parse(new TextDecoder().decode(b64urlToBytes(part))) as Record<string, unknown>;
  } catch {
    return null;
  }
}

async function accessCerts(team: string): Promise<JsonWebKey[]> {
  if (certCache && certCache.team === team && certCache.certs.expires > Date.now()) return certCache.certs.keys ?? [];
  const response = await fetch(`https://${team}/cdn-cgi/access/certs`);
  if (!response.ok) throw new Error("access_certs_unavailable");
  const body = (await response.json()) as { keys?: JsonWebKey[] };
  certCache = { team, certs: { keys: body.keys ?? [], expires: Date.now() + 60 * 60 * 1000 } };
  return certCache.certs.keys ?? [];
}

async function verifyAccessJwt(token: string, team: string, aud: string): Promise<boolean> {
  const parts = token.split(".");
  if (parts.length !== 3) return false;
  const [headerPart, payloadPart, signaturePart] = parts as [string, string, string];
  const header = decodePart(headerPart);
  const payload = decodePart(payloadPart);
  if (!header || !payload || header["alg"] !== "RS256") return false;
  const now = Math.floor(Date.now() / 1000);
  const exp = payload["exp"];
  const iss = payload["iss"];
  const audience = payload["aud"];
  if (typeof exp !== "number" || exp < now) return false;
  if (iss !== `https://${team}`) return false;
  const audiences = Array.isArray(audience) ? audience : [audience];
  if (!audiences.includes(aud)) return false;
  const keys = await accessCerts(team);
  const kid = header["kid"];
  const jwk = keys.find((key) => "kid" in key && key.kid === kid && key.kty === "RSA");
  if (!jwk) return false;
  const cryptoKey = await crypto.subtle.importKey("jwk", jwk, { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["verify"]);
  const data = new TextEncoder().encode(`${headerPart}.${payloadPart}`);
  return crypto.subtle.verify("RSASSA-PKCS1-v1_5", cryptoKey, b64urlToBytes(signaturePart), data);
}

async function accessStatus(request: Request): Promise<AccessResult> {
  const team = blank(bindings().CF_ACCESS_TEAM_DOMAIN)?.replace(/^https?:\/\//, "").replace(/\/$/, "") ?? null;
  const aud = blank(bindings().CF_ACCESS_AUD);
  const jwt = request.headers.get("cf-access-jwt-assertion");
  if (!jwt) return "absent";
  if (!team || !aud) return "invalid";
  try {
    return (await verifyAccessJwt(jwt, team, aud)) ? "valid" : "invalid";
  } catch (error) {
    console.error(JSON.stringify({ level: "error", message: "access_jwt_check_failed" }));
    void error;
    return "invalid";
  }
}

export async function requireAdmin(request: Request): Promise<Response | null> {
  const access = await accessStatus(request);
  if (access === "valid") return null;
  if (access === "invalid") return json({ error: "Unauthorized", code: "unauthorized" }, 401);

  const expected = blank(bindings().ADMIN_API_TOKEN);
  if (!expected || expected.length < 16) {
    return json({ error: "Admin authentication is not configured.", code: "admin_not_configured" }, 503);
  }
  const header = request.headers.get("authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
  if (!token || !(await timingSafeEqual(token, expected))) {
    return json({ error: "Unauthorized", code: "unauthorized" }, 401);
  }
  return null;
}
