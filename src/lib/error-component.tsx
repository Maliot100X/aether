import type { ErrorComponentProps } from "@tanstack/react-router";
import { TriangleAlert } from "lucide-react";

export function AppErrorComponent({ error }: ErrorComponentProps) {
  return (
    <main className="grid min-h-dvh place-items-center bg-void px-6 text-center text-fg">
      <div className="max-w-md space-y-3">
        <span className="inline-flex text-gold" aria-hidden="true">
          <TriangleAlert className="size-10" strokeWidth={1.5} />
        </span>
        <h1 className="font-display text-3xl">The veil tore</h1>
        <p className="text-sm break-words text-muted">
          {error.message || "An unexpected error occurred. Try reloading the realm."}
        </p>
      </div>
    </main>
  );
}
