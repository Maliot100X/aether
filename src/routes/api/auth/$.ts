import { createFileRoute } from "@tanstack/react-router";
import { issueToken, verifyToken, verifyPassword } from "@/lib/auth/jwt-auth";
import { hashToken } from "@/lib/crypto";

function jsonResp(data: unknown, status = 200) {
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

async function handleAuth(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const path = url.pathname.replace(/\/$/, "");
  const method = request.method;

  if (method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "access-control-allow-origin": "*",
        "access-control-allow-headers": "Authorization, Content-Type",
        "access-control-allow-methods": "GET, POST, PUT, DELETE, OPTIONS",
      },
    });
  }

  // GET /api/auth/get-session — verify JWT from Authorization header
  if (path.endsWith("/get-session") && method === "GET") {
    const auth = request.headers.get("authorization") ?? "";
    const token = auth.toLowerCase().startsWith("bearer ") ? auth.slice(7).trim() : "";
    if (!token) return jsonResp({ session: null, user: null });
    
    const user = verifyToken(token);
    if (!user) return jsonResp({ session: null, user: null });
    
    return jsonResp({
      session: { token, userId: user.id, expiresAt: new Date(Date.now() + 7 * 86400000).toISOString() },
      user: { id: user.id, name: user.name, email: user.email, emailVerified: false, image: null },
    });
  }

  // POST /api/auth/sign-up/email
  if (path.endsWith("/sign-up/email") && method === "POST") {
    const body = await request.json() as { name?: string; email?: string; password?: string };
    if (!body.email || !body.password) {
      return jsonResp({ error: { message: "Email and password required" } }, 400);
    }
    if (body.password.length < 8) {
      return jsonResp({ message: "Password too short", code: "PASSWORD_TOO_SHORT" }, 400);
    }
    const name = body.name || body.email.split("@")[0] || "Wanderer";
    const { token, user } = issueToken(name, body.email, body.password);
    return jsonResp({
      token,
      user: { id: user.id, name: user.name, email: user.email, emailVerified: false, image: null, createdAt: user.createdAt, updatedAt: user.createdAt },
    });
  }

  // POST /api/auth/sign-in/email
  if (path.endsWith("/sign-in/email") && method === "POST") {
    const body = await request.json() as { email?: string; password?: string };
    if (!body.email || !body.password) {
      return jsonResp({ error: { message: "Email and password required" } }, 400);
    }
    // For JWT auth, the client sends the token as part of the request
    // We verify the password against the token's embedded hash
    const auth = request.headers.get("authorization") ?? "";
    const clientToken = auth.toLowerCase().startsWith("bearer ") ? auth.slice(7).trim() : "";
    
    if (clientToken && verifyPassword(clientToken, body.password)) {
      const user = verifyToken(clientToken);
      if (user && user.email === body.email.toLowerCase()) {
        return jsonResp({ redirect: false, token: clientToken, user: { id: user.id, name: user.name, email: user.email } });
      }
    }
    
    // If no token provided, issue a new one (first sign-in after sign-up)
    // This allows sign-up → sign-in flow
    const { token, user } = issueToken(body.email.split("@")[0] || "Wanderer", body.email, body.password);
    return jsonResp({ redirect: false, token, user: { id: user.id, name: user.name, email: user.email } });
  }

  // POST /api/auth/sign-out
  if (path.endsWith("/sign-out") && method === "POST") {
    return jsonResp({ ok: true });
  }

  // Default: return empty
  return jsonResp({ error: "Unknown auth path" }, 404);
}

export const Route = createFileRoute("/api/auth/$")({
  server: {
    handlers: {
      GET: ({ request }) => handleAuth(request),
      POST: ({ request }) => handleAuth(request),
    },
  },
});
