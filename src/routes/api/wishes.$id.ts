import { createFileRoute } from "@tanstack/react-router";
import { isPublicId } from "@/lib/wish-rules";
import { json } from "@/server/http";
import { findWishByPublicId } from "@/server/wishes";

export const Route = createFileRoute("/api/wishes/$id")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        if (!isPublicId(params.id)) return json({ error: "Greeting not found.", code: "not_found" }, 404);
        try {
          const wish = await findWishByPublicId(params.id);
          if (!wish) return json({ error: "Greeting not found.", code: "not_found" }, 404);
          return json(wish);
        } catch (error) {
          console.error(JSON.stringify({ level: "error", message: "wish_read_failed" }));
          void error;
          return json({ error: "The greeting could not be loaded.", code: "database_error" }, 500);
        }
      },
    },
  },
});
