import { getSql } from "@/lib/db";
import { verifyToken } from "@/lib/auth/jwt-auth";
import { hashToken } from "@/lib/crypto";
import { auth } from "@/lib/auth/server";

export type Owner = {
  ownerId: string;
  profileId: string | null;
  kind: "session" | "token" | "guest";
};

export async function resolveOwner(request: Request): Promise<Owner | null> {
  const header = request.headers.get("authorization") ?? "";
  const bearer = header.toLowerCase().startsWith("bearer ")
    ? header.slice(7).trim()
    : "";

  // JWT token auth (no database needed)
  if (bearer.split(".").length === 3) {
    const jwtUser = verifyToken(bearer);
    if (jwtUser) {
      return { ownerId: jwtUser.id, profileId: null, kind: "token" as const };
    }
  }

  // Custom API token auth (needs database)
  if (bearer.startsWith("ath_")) {
    const sql = await getSql();
    const rows = await sql<{ profile_id: string; user_id: string | null }>`
      select profile_id, user_id from aether_tokens where token_hash = ${hashToken(bearer)}
    `;
    const row = rows[0];
    if (row) {
      return {
        ownerId: row.user_id || row.profile_id,
        profileId: row.profile_id,
        kind: "token",
      };
    }
  }

  try {
    const headers = new Headers(request.headers);
    if (bearer && !headers.get("authorization")) {
      headers.set("Authorization", `Bearer ${bearer}`);
    }
    const session = await auth.api.getSession({ headers });
    if (session?.user) {
      return { ownerId: session.user.id, profileId: null, kind: "session" };
    }
  } catch {
    /* no session */
  }

  return null;
}

export function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "access-control-allow-origin": "*",
      "access-control-allow-headers": "Authorization, Content-Type",
      "access-control-allow-methods": "GET, POST, PUT, DELETE, OPTIONS",
    },
  });
}

export function corsOptions(): Response {
  return json({ ok: true }, 204);
}

export async function readJson<T>(request: Request): Promise<T> {
  return (await request.json()) as T;
}
