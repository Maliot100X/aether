import { AuthButtons } from "@/components/auth/AuthButtons";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { SignedIn, SignedOut, UserButton } from "@/lib/auth/gates";
import { ZONES, type ZoneId } from "@/lib/constants";
import { teleportTo, useRealm } from "@/lib/realm-store";
import { Link } from "@tanstack/react-router";
import {
  Activity,
  Compass,
  FlaskConical,
  Hammer,
  Radio,
  Settings2,
  Sparkles,
  Store,
  Trophy,
  Volume2,
} from "lucide-react";
import { useEffect } from "react";
import { ZonePanels } from "./ZonePanels";

const ZONE_ICON: Record<ZoneId, typeof Activity> = {
  nexus: Activity,
  forge: Hammer,
  bazaar: Store,
  sanctum: FlaskConical,
  cathedral: Radio,
  arena: Trophy,
};

export function HudShell() {
  const entered = useRealm((s) => s.entered);
  const setEntered = useRealm((s) => s.setEntered);
  const fly = useRealm((s) => s.fly);
  const setFly = useRealm((s) => s.setFly);
  const zone = useRealm((s) => s.zone);
  const panel = useRealm((s) => s.panel);
  const setPanel = useRealm((s) => s.setPanel);
  const locked = useRealm((s) => s.locked);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === "Tab") {
        e.preventDefault();
        const current = useRealm.getState().panel;
        useRealm.getState().setPanel(current ? null : useRealm.getState().zone);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <>
      {!entered && <Gate onEnter={() => setEntered(true)} />}

      {entered && (
        <>
          <header className="pointer-events-none absolute inset-x-0 top-0 z-20 flex items-start justify-between p-4 md:p-6">
            <div className="pointer-events-auto">
              <p className="font-display text-2xl tracking-[0.28em] text-fg">AETHER</p>
              <p className="text-[10px] tracking-[0.32em] text-muted uppercase">{ZONES.find((z) => z.id === zone)?.name}</p>
            </div>
            <div className="pointer-events-auto flex items-center gap-2">
              <AuthChip />
              <Link
                to="/dashboard"
                className="hidden rounded-full border border-border bg-void/60 px-3 py-1.5 text-xs text-gold sm:inline"
              >
                Dashboard
              </Link>
              <IconBtn label="Settings" onClick={() => setPanel(panel === "settings" ? null : "settings")}>
                <Settings2 className="size-4" />
              </IconBtn>
            </div>
          </header>

          <nav className="pointer-events-none absolute inset-x-0 bottom-0 z-20 flex flex-col items-center gap-3 p-3 md:p-6">
            <div className="pointer-events-auto tab-rail max-w-full">
              {ZONES.map((z) => {
                const Icon = ZONE_ICON[z.id];
                return (
                  <button
                    key={z.id}
                    type="button"
                    data-on={zone === z.id}
                    onClick={() => {
                      teleportTo.current?.(z.id);
                      setPanel(z.id);
                    }}
                  >
                    <span className="inline-flex items-center gap-1.5">
                      <Icon className="size-3.5" />
                      {z.name.replace("The ", "")}
                    </span>
                  </button>
                );
              })}
            </div>
            <div className="pointer-events-auto flex flex-wrap items-center justify-center gap-3 text-[11px] tracking-wide text-muted">
              <span>WASD walk</span>
              <span>look</span>
              <button type="button" onClick={() => setFly(!fly)} className="text-aether">
                F {fly ? "fly on" : "fly"}
              </button>
              <span>Tab panel</span>
              <span>1–6 jump</span>
              {!locked && <span className="text-aether">click the world</span>}
            </div>
          </nav>

          <TouchPad />
          <ZonePanels />
        </>
      )}
    </>
  );
}

function Gate({ onEnter }: { onEnter: () => void }) {
  return (
    <div className="absolute inset-0 z-30 grid place-items-center bg-void/40 px-5 backdrop-blur-[2px]">
      <div className="holo-panel w-full max-w-xl p-px animate-[rise_0.7s_ease]">
        <div className="holo-inner px-8 py-10 text-center">
          <p className="text-[11px] tracking-[0.5em] text-aether uppercase">The living realm</p>
          <h1 className="mt-3 font-display text-6xl font-medium tracking-[0.18em] text-fg md:text-7xl">AETHER</h1>
          <p className="mx-auto mt-4 max-w-md text-sm leading-relaxed text-muted">
            Walk a cinematic world of agentic companies. Hire luminous minds, write skills, launch
            on Solana, train policies, stream as a living VTuber, and enter AnsemHack.
          </p>
          <div className="mt-8 space-y-4">
            <button
              type="button"
              onClick={onEnter}
              className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-fg px-7 text-sm font-medium text-void"
            >
              <Sparkles className="size-4" />
              Enter the realm
            </button>
            <div className="text-center text-[11px] tracking-[0.22em] text-muted uppercase">or sign in first</div>
            <AuthButtons callbackURL="/login" />
          </div>
          <p className="mt-5 text-[11px] text-muted">
            Agents read <a href="/skill.md" className="text-aether">/skill.md</a> and the{" "}
            <a href="/guide" className="text-aether">
              guide
            </a>
            .
          </p>
        </div>
      </div>
    </div>
  );
}

function AuthChip() {
  const { isPending } = useCurrentUserState();
  if (isPending) return <div className="h-9 w-24 animate-pulse rounded-full bg-elevated" />;
  return (
    <>
      <SignedOut>
        <Link
          to="/login"
          className="rounded-full border border-border bg-void/60 px-3 py-1.5 text-xs text-fg"
        >
          Sign in
        </Link>
      </SignedOut>
      <SignedIn>
        <div className="rounded-full border border-border bg-void/60 px-2 py-1 text-xs">
          <UserButton />
        </div>
      </SignedIn>
    </>
  );
}

function IconBtn({
  children,
  onClick,
  label,
}: {
  children: React.ReactNode;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className="grid size-11 place-items-center rounded-full border border-border bg-void/60 text-fg hover:border-aether hover:text-aether"
    >
      {children}
    </button>
  );
}

function TouchPad() {
  const setFly = useRealm((s) => s.setFly);
  const fly = useRealm((s) => s.fly);
  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-24 z-20 flex justify-between px-4 md:hidden">
      <div className="pointer-events-auto grid grid-cols-3 gap-1">
        {["KeyQ", "KeyW", "KeyE", "KeyA", "KeyS", "KeyD"].map((code) => (
          <button
            key={code}
            type="button"
            className="size-11 rounded-md border border-border bg-void/55 text-[10px] text-fg"
            onPointerDown={(e) => {
              e.preventDefault();
              window.dispatchEvent(new KeyboardEvent("keydown", { code }));
            }}
            onPointerUp={() => window.dispatchEvent(new KeyboardEvent("keyup", { code }))}
          >
            {code.replace("Key", "")}
          </button>
        ))}
      </div>
      <div className="pointer-events-auto flex flex-col gap-2">
        <button
          type="button"
          className="grid size-11 place-items-center rounded-full border border-border bg-void/55 text-gold"
          onClick={() => setFly(!fly)}
        >
          <Compass className="size-4" />
        </button>
        <button
          type="button"
          className="grid size-11 place-items-center rounded-full border border-border bg-void/55 text-aether"
          onClick={() => useRealm.getState().setPanel("cathedral")}
        >
          <Volume2 className="size-4" />
        </button>
      </div>
    </div>
  );
}
