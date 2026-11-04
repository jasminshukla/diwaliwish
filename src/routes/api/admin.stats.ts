import { createFileRoute } from "@tanstack/react-router";
import { parseStatsRange } from "@/lib/wish-rules";
import { requireAdmin } from "@/server/auth";
import { json } from "@/server/http";
import { loadAdminStats } from "@/server/stats";

export const Route = createFileRoute("/api/admin/stats")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const denied = await requireAdmin(request);
        if (denied) return denied;
        const range = parseStatsRange(new URL(request.url).searchParams.get("range"));
        try {
          return json(await loadAdminStats(range));
        } catch (error) {
          console.error(JSON.stringify({ level: "error", message: "admin_stats_failed" }));
          void error;
          return json({ error: "Statistics could not be loaded.", code: "database_error" }, 500);
        }
      },
    },
  },
});
