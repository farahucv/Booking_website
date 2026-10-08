import { createFileRoute } from "@tanstack/react-router";

// Called every few minutes by pg_cron. Idempotent: only expires requests whose 24h deadline passed.
export const Route = createFileRoute("/api/public/hooks/expire-deposits")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        if (!request.headers.get("authorization")?.startsWith("Bearer ")) return new Response("Unauthorized", { status: 401 });
        const { expireOverdue } = await import("@/lib/bookings.server");
        const n = await expireOverdue();
        return Response.json({ expired: n });
      },
    },
  },
});
