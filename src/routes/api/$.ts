import { createFileRoute } from "@tanstack/react-router";
import { handleAetherApi } from "@/lib/api-handlers";

export const Route = createFileRoute("/api/$")({
  server: {
    handlers: {
      GET: ({ request }) => handleAetherApi(request),
      POST: ({ request }) => handleAetherApi(request),
      PUT: ({ request }) => handleAetherApi(request),
      DELETE: ({ request }) => handleAetherApi(request),
      OPTIONS: ({ request }) => handleAetherApi(request),
    },
  },
});
