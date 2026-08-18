import { authEnabled, GROK_PROVIDERS, signIn } from "@/lib/auth/client";
import { useState } from "react";

export function AuthButtons({
  callbackURL = "/login",
}: {
  callbackURL?: string;
}) {
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function oauth(id: string, label: string) {
    setError(null);
    setBusy(label);
    try {
      await signIn(id, { callbackURL, errorCallbackURL: "/login" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign-in failed");
      setBusy(null);
    }
  }

  if (!authEnabled) {
    return <p className="text-sm text-muted">Sign-in is disabled in this instance.</p>;
  }

  return (
    <div className="space-y-3">
      {GROK_PROVIDERS.map((p) => (
        <button
          key={p.providerId}
          type="button"
          disabled={Boolean(busy)}
          onClick={() => void oauth(p.providerId, p.label)}
          className="flex min-h-12 w-full items-center justify-center gap-3 rounded-full border border-border bg-elevated px-4 text-sm tracking-wide text-fg transition hover:border-fg/40 hover:bg-surface disabled:opacity-50"
        >
          {p.label === "Google" ? <GoogleMark /> : <XMark />}
          {busy === p.label ? "Opening…" : `Continue with ${p.label}`}
        </button>
      ))}
      {error && <p className="text-sm text-rose">{error}</p>}
    </div>
  );
}

function GoogleMark() {
  return (
    <svg viewBox="0 0 24 24" className="size-4" aria-hidden>
      <path
        fill="#EA4335"
        d="M12 10.2v3.9h5.5c-.2 1.3-1.6 3.8-5.5 3.8-3.3 0-6-2.7-6-6s2.7-6 6-6c1.9 0 3.1.8 3.8 1.5l2.6-2.5C16.8 3.2 14.6 2.2 12 2.2 6.9 2.2 2.7 6.4 2.7 11.5S6.9 20.8 12 20.8c6.1 0 8.1-4.3 8.1-6.5 0-.4 0-.8-.1-1.1H12z"
      />
    </svg>
  );
}

function XMark() {
  return (
    <svg viewBox="0 0 24 24" className="size-4 fill-fg" aria-hidden>
      <path d="M14.7 10.3 22 2h-2.2l-6.4 7.2L8.3 2H2l7.7 11L2 22h2.2l7-7.9L15.7 22H22l-7.3-11.7Zm-2.5 2.8-.8-1.1L5 3.6h2.7l5.1 7.2.8 1.1 6.7 9.5h-2.7l-5.4-7.3Z" />
    </svg>
  );
}
