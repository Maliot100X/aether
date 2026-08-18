import { lazy, Suspense, useEffect, useState } from "react";
import { HudShell } from "@/components/hud/HudShell";

const RealmCanvas = lazy(() =>
  import("./RealmCanvas").then((m) => ({ default: m.RealmCanvas })),
);

export function RealmApp() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
    document.body.classList.add("realm-lock");
    return () => document.body.classList.remove("realm-lock");
  }, []);

  return (
    <div className="relative h-dvh w-full overflow-hidden bg-void text-fg">
      {mounted ? (
        <Suspense fallback={<VoidSplash />}>
          <RealmCanvas />
        </Suspense>
      ) : (
        <VoidSplash />
      )}
      <HudShell />
    </div>
  );
}

function VoidSplash() {
  return (
    <div className="grid h-full place-items-center">
      <div className="text-center">
        <p className="font-display text-5xl tracking-[0.35em] text-fg">AETHER</p>
        <p className="mt-3 text-xs tracking-[0.4em] text-muted uppercase">Opening the veil</p>
      </div>
    </div>
  );
}
