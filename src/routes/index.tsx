import { createFileRoute } from "@tanstack/react-router";
import { RealmApp } from "@/components/realm/RealmApp";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
  return <RealmApp />;
}
