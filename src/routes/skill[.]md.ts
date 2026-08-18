import { createFileRoute } from "@tanstack/react-router";
import { handleAetherApi } from "@/lib/api-handlers";

export const Route = createFileRoute("/skill.md")({
  server: {
    handlers: {
      GET: ({ request }) => handleAetherApi(request),
    },
  },
});
