import { createFileRoute } from "@tanstack/react-router";
import { json } from "@/server/http";
import { publicConfig } from "@/server/public-config";

export const Route = createFileRoute("/api/config")({
  server: {
    handlers: {
      GET: () => json(publicConfig()),
    },
  },
});
