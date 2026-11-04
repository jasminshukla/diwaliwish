import { createFileRoute } from "@tanstack/react-router";
import { isUuid, validateEventInput } from "@/lib/wish-rules";
import { json, readJson, sameOrigin } from "@/server/http";
import { recordEvent } from "@/server/events";
import { enforceRateLimit } from "@/server/rate-limit";

export const Route = createFileRoute("/api/events")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        if (!sameOrigin(request)) return json({ error: "Forbidden", code: "forbidden" }, 403);
        const sessionId = request.headers.get("x-session-id")?.trim() ?? "";
        if (!isUuid(sessionId)) return json({ error: "A session id is required.", code: "invalid_session" }, 400);
        const body = await readJson(request);
        if (!body.ok) return body.response;
        const parsed = validateEventInput(body.value);
        if (!parsed.ok) return json({ error: parsed.error, code: parsed.code }, 400);
        const limited = await enforceRateLimit(request, "event", sessionId);
        if (!limited.ok) {
          return json({ error: "Too many events. Please wait and try again.", code: "rate_limited" }, 429, {
            "retry-after": String(limited.retryAfter),
          });
        }
        try {
          const result = await recordEvent({
            type: parsed.value.type,
            publicWishId: parsed.value.wishId,
            action: parsed.value.action,
            language: parsed.value.language,
            template: parsed.value.template,
            sessionId,
          });
          if (parsed.value.type === "greeting_opened" && parsed.value.wishId && !result.recorded && !result.duplicate) {
            return json({ error: "Greeting not found.", code: "not_found" }, 404);
          }
          return json({ recorded: result.recorded, duplicate: result.duplicate });
        } catch (error) {
          console.error(JSON.stringify({ level: "error", message: "event_write_failed" }));
          void error;
          return json({ error: "The event could not be saved.", code: "database_error" }, 500);
        }
      },
    },
  },
});
