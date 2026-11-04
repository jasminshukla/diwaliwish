import { isUuid } from "./wish-rules";

const SESSION_KEY = "diwali-session";

export function getSessionId(): string {
  const existing = sessionStorage.getItem(SESSION_KEY);
  if (existing && isUuid(existing)) return existing;
  const id = crypto.randomUUID();
  sessionStorage.setItem(SESSION_KEY, id);
  return id;
}
