import { createFileRoute } from "@tanstack/react-router";
import { isUuid, validateWishInput } from "@/lib/wish-rules";
import { json, readJson, sameOrigin } from "@/server/http";
import { enforceRateLimit } from "@/server/rate-limit";
import { verifyTurnstile } from "@/server/turnstile";
import { createdWishResponse, createWish, findReusableWish } from "@/server/wishes";

export const Route = createFileRoute("/api/wishes")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        if (!sameOrigin(request)) return json({ error: "Forbidden", code: "forbidden" }, 403);
        const sessionId = request.headers.get("x-session-id")?.trim() ?? "";
        if (!isUuid(sessionId)) return json({ error: "A session id is required.", code: "invalid_session" }, 400);
        const idempotencyKey = request.headers.get("idempotency-key")?.trim() ?? "";
        if (!isUuid(idempotencyKey)) {
          return json({ error: "An idempotency key is required.", code: "invalid_idempotency" }, 400);
        }
        const body = await readJson(request);
        if (!body.ok) return body.response;
        const parsed = validateWishInput(body.value);
        if (!parsed.ok) return json({ error: parsed.error, code: parsed.code }, 400);
        try {
          const reusable = await findReusableWish({ sessionId, idempotencyKey, value: parsed.value });
          if (reusable) return json(createdWishResponse(request, reusable));
          const token = (body.value as Record<string, unknown>)["turnstileToken"];
          const human = await verifyTurnstile(token, request);
          if (!human.ok) return json({ error: human.error, code: human.code }, human.status);
          const limited = await enforceRateLimit(request, "wish", sessionId);
          if (!limited.ok) {
            return json(
              { error: "Too many greetings were created. Please wait and try again.", code: "rate_limited" },
              429,
              { "retry-after": String(limited.retryAfter) },
            );
          }
          const wish = await createWish({ sessionId, idempotencyKey, value: parsed.value });
          return json(createdWishResponse(request, wish), 201);
        } catch (error) {
          console.error(JSON.stringify({ level: "error", message: "wish_create_failed" }));
          void error;
          return json({ error: "The greeting could not be saved. Please try again.", code: "database_error" }, 500);
        }
      },
    },
  },
});
