import { AuthButtons } from "@/components/auth/AuthButtons";
import { authClient } from "@/lib/auth/client";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { createFileRoute, Link, Navigate } from "@tanstack/react-router";
import { useState } from "react";

export const Route = createFileRoute("/login")({ component: Login });

function Login() {
  const { user, isPending } = useCurrentUserState();
  const [emailOpen, setEmailOpen] = useState(false);
  const [mode, setMode] = useState<"in" | "up">("in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (isPending) {
    return (
      <main className="grid min-h-dvh place-items-center bg-void text-muted">
        <p className="text-sm tracking-[0.3em] uppercase">Opening the veil…</p>
      </main>
    );
  }
  if (user) return <Navigate to="/dashboard" />;

  async function quickAccess() {
    setError(null);
    setBusy(true);
    try {
      const res = await fetch("/api/register/human", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim() || "Wanderer",
          email: email.trim() || `wanderer-${Date.now()}@aether.local`,
        }),
      });
      const data = await res.json();
      if (data.authToken || data.token) {
        const t = data.authToken || data.token;
        // Store token so auth client picks it up
        try { sessionStorage.setItem("grok-auth.bearer-token", t); } catch {}
        window.location.assign("/dashboard");
      } else {
        throw new Error(data.error ?? "Quick access failed");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Quick access failed");
      setBusy(false);
    }
  }

  async function emailAuth(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      if (mode === "up") {
        const created = await authClient.signUp.email({
          email: email.trim(),
          password,
          name: name.trim() || email.split("@")[0] || "Wanderer",
        });
        if (created.error) throw new Error(created.error.message ?? "Could not create account");
      }
      // Try Better Auth first, fall back to JWT
      try {
        const signed = await authClient.signIn.email({ email: email.trim(), password });
        if (!signed.error) {
          window.location.assign("/dashboard");
          return;
        }
      } catch {
        // Better Auth failed (no DB on Vercel), use JWT fallback
      }
      // JWT fallback: sign-up + store token
      const signUpRes = await fetch("/api/auth/sign-up/email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim() || email.split("@")[0] || "Wanderer", email: email.trim(), password }),
      });
      const signUpData = await signUpRes.json();
      if (signUpData.token) {
        try { sessionStorage.setItem("grok-auth.bearer-token", signUpData.token); } catch {}
        window.location.assign("/dashboard");
        return;
      }
      throw new Error(signUpData.error?.message ?? signUpData.message ?? "Sign-in failed");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Email sign-in failed");
      setBusy(false);
    }
  }

  return (
    <main className="relative grid min-h-dvh place-items-center overflow-y-auto bg-void px-5 py-12 text-fg">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,color-mix(in_oklab,var(--color-aether)_10%,transparent),transparent_55%)]" />
      <div className="holo-panel w-full max-w-md animate-[rise_0.5s_ease] p-px">
        <div className="holo-inner space-y-7 px-7 py-9">
          <div className="text-center">
            <p className="text-xs tracking-[0.4em] text-aether uppercase">Aether</p>
            <h1 className="mt-2 font-display text-5xl font-medium text-fg">Sign in</h1>
            <p className="mx-auto mt-3 max-w-sm text-sm leading-relaxed text-muted">
              Google or X. After you return, you land on your dashboard — not this page.
            </p>
          </div>

          <button
            type="button"
            onClick={() => void quickAccess()}
            disabled={busy}
            className="w-full rounded-full bg-aether px-7 py-3 text-sm font-medium text-void disabled:opacity-50"
          >
            {busy ? "Opening…" : "⚡ Quick Access — No Account Needed"}
          </button>

          <div className="text-center text-[11px] text-muted">or sign in below</div>

          <AuthButtons callbackURL="/login" />

          <button
            type="button"
            onClick={() => setEmailOpen((v) => !v)}
            className="w-full text-center text-xs tracking-[0.18em] text-muted uppercase hover:text-fg"
          >
            {emailOpen ? "Hide email" : "Use email instead"}
          </button>

          {emailOpen && (
            <form onSubmit={(e) => void emailAuth(e)} className="space-y-3">
              {mode === "up" && (
                <input
                  className="h-11 w-full rounded-xl border border-border bg-void px-3 text-sm text-fg outline-none focus:border-aether"
                  placeholder="Display name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              )}
              <input
                className="h-11 w-full rounded-xl border border-border bg-void px-3 text-sm text-fg outline-none focus:border-aether"
                type="email"
                required
                autoComplete="email"
                placeholder="you@domain"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <input
                className="h-11 w-full rounded-xl border border-border bg-void px-3 text-sm text-fg outline-none focus:border-aether"
                type="password"
                required
                minLength={8}
                autoComplete={mode === "up" ? "new-password" : "current-password"}
                placeholder="Password (8+)"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <button
                type="submit"
                disabled={busy}
                className="h-11 w-full rounded-full bg-fg text-sm font-medium text-void disabled:opacity-50"
              >
                {busy ? "Sealing…" : mode === "up" ? "Create account" : "Enter with email"}
              </button>
              <button
                type="button"
                className="w-full text-xs text-muted hover:text-fg"
                onClick={() => setMode(mode === "up" ? "in" : "up")}
              >
                {mode === "up" ? "Already have an account? Sign in" : "New here? Create an account"}
              </button>
              {error && <p className="text-sm text-rose">{error}</p>}
            </form>
          )}

          <div className="flex justify-between text-sm">
            <Link to="/" className="text-muted hover:text-fg">
              Walk the realm
            </Link>
            <Link to="/guide" className="text-muted hover:text-fg">
              Guide
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
