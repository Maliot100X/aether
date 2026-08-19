import { Desk, signOutToLogin } from "@/components/desk/Desk";
import { authClient, getBearerToken } from "@/lib/auth/client";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";

export const Route = createFileRoute("/dashboard")({ component: Dashboard });

function Dashboard() {
  const { user, isPending } = useCurrentUserState();
  const [grace, setGrace] = useState(true);

  useEffect(() => {
    if (user) {
      setGrace(false);
      return;
    }
    if (isPending) return;
    void authClient.getSession();
    const wait = getBearerToken() ? 2400 : 500;
    const t = window.setTimeout(() => setGrace(false), wait);
    return () => window.clearTimeout(t);
  }, [user, isPending]);

  if (isPending || grace) {
    return (
      <main className="grid min-h-dvh place-items-center bg-void text-muted">
        <p className="text-sm tracking-[0.3em] uppercase">Opening your desk\u2026</p>
      </main>
    );
  }

  // Guest mode: show desk without auth when auth isn't configured
  if (!user) {
    return (
      <Desk
        title="Guest"
        email={null}
        onSignOut={undefined}
      />
    );
  }

  return (
    <Desk
      title={user.displayName ?? "Citizen"}
      email={user.primaryEmail}
      onSignOut={() => void signOutToLogin()}
    />
  );
}
