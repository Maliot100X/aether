import { create } from "zustand";
import { persist } from "zustand/middleware";
import { NATIVE_AGENTS, type ZoneId } from "@/lib/constants";

export type HudPanel =
  | null
  | "settings"
  | "chat"
  | "forge"
  | "bazaar"
  | "sanctum"
  | "cathedral"
  | "arena"
  | "nexus";

export type LocalAgent = {
  id: string;
  name: string;
  persona: string;
  model: string;
  skills: string[];
  status: "idle" | "live" | "training" | "streaming";
  zone: ZoneId;
  color: string;
  clawpumpId?: string;
};

export type LocalSkill = {
  id: string;
  name: string;
  slug: string;
  body: string;
  tags: string[];
};

export type LocalDeal = {
  id: string;
  title: string;
  description: string;
  priceUsdc: string;
  sellerAgent: string;
  status: "open" | "accepted" | "settled";
};

export type ChatLine = { role: "user" | "assistant" | "system"; content: string };

type RealmState = {
  entered: boolean;
  fly: boolean;
  zone: ZoneId;
  panel: HudPanel;
  locked: boolean;
  speakingWith: string | null;
  agents: LocalAgent[];
  skills: LocalSkill[];
  deals: LocalDeal[];
  chat: Record<string, ChatLine[]>;
  vtuberEmote: string;
  vtuberLive: boolean;
  trainLog: string[];
  setEntered: (v: boolean) => void;
  setFly: (v: boolean) => void;
  setZone: (z: ZoneId) => void;
  setPanel: (p: HudPanel) => void;
  setLocked: (v: boolean) => void;
  setSpeakingWith: (id: string | null) => void;
  upsertAgent: (a: LocalAgent) => void;
  patchAgent: (id: string, patch: Partial<LocalAgent>) => void;
  addSkill: (s: LocalSkill) => void;
  addDeal: (d: LocalDeal) => void;
  patchDeal: (id: string, patch: Partial<LocalDeal>) => void;
  pushChat: (agentId: string, line: ChatLine) => void;
  setEmote: (e: string) => void;
  setVtuberLive: (v: boolean) => void;
  pushTrain: (line: string) => void;
};

const natives: LocalAgent[] = NATIVE_AGENTS.map((a) => ({
  id: a.id,
  name: a.name,
  persona: a.persona,
  model: "grok-4.5",
  skills: ["presence", "guide"],
  status: "live",
  zone: a.zone,
  color: a.color,
}));

export const useRealm = create<RealmState>()(
  persist(
    (set) => ({
      entered: false,
      fly: false,
      zone: "nexus",
      panel: null,
      locked: false,
      speakingWith: null,
      agents: natives,
      skills: [],
      deals: [],
      chat: {},
      vtuberEmote: "idle",
      vtuberLive: false,
      trainLog: [],
      setEntered: (entered) => set({ entered }),
      setFly: (fly) => set({ fly }),
      setZone: (zone) => set({ zone }),
      setPanel: (panel) => set({ panel }),
      setLocked: (locked) => set({ locked }),
      setSpeakingWith: (speakingWith) => set({ speakingWith }),
      upsertAgent: (agent) =>
        set((s) => ({
          agents: [agent, ...s.agents.filter((a) => a.id !== agent.id)],
        })),
      patchAgent: (id, patch) =>
        set((s) => ({
          agents: s.agents.map((a) => (a.id === id ? { ...a, ...patch } : a)),
        })),
      addSkill: (skill) => set((s) => ({ skills: [skill, ...s.skills] })),
      addDeal: (deal) => set((s) => ({ deals: [deal, ...s.deals] })),
      patchDeal: (id, patch) =>
        set((s) => ({
          deals: s.deals.map((d) => (d.id === id ? { ...d, ...patch } : d)),
        })),
      pushChat: (agentId, line) =>
        set((s) => ({
          chat: { ...s.chat, [agentId]: [...(s.chat[agentId] ?? []), line] },
        })),
      setEmote: (vtuberEmote) => set({ vtuberEmote }),
      setVtuberLive: (vtuberLive) => set({ vtuberLive }),
      pushTrain: (line) => set((s) => ({ trainLog: [...s.trainLog.slice(-40), line] })),
    }),
    {
      name: "aether.realm.v1",
      partialize: (s) => ({
        agents: s.agents,
        skills: s.skills,
        deals: s.deals,
        chat: s.chat,
      }),
    },
  ),
);

export const teleportTo = { current: null as null | ((zone: ZoneId) => void) };
export const playerPose = {
  yaw: 0,
  pitch: 0,
  x: 0,
  y: 8,
  z: 18,
  speed: 0,
  fly: false,
  keys: new Set<string>(),
};
