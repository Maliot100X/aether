export const APP_NAME = "AETHER";

export const C = {
  void: "#07060c",
  surface: "#12101a",
  elevated: "#1c1926",
  fg: "#f2ead8",
  muted: "#8d8796",
  aether: "#7ee8ff",
  gold: "#e4c77b",
  border: "#2c2838",
  rose: "#e08a8a",
} as const;

export const CLAW_MINT = "739dnZEG4yaBWFsY8L8ZwrfhGG6dhtCSercW8Umspump";
export const ANSEM_MINT = "9cRCn9rGT8V2imeM2BaKs13yhMEais3ruM3rPvTGpump";
export const SOL_MINT = "So11111111111111111111111111111111111111112";
export const USDC_MINT = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";

export const CLAWPUMP_BASES = [
  "https://api.clawpump.tech",
  "https://clawpump.tech/api/v1",
  "https://clawpump.tech/api",
] as const;

export const JUPITER_QUOTE = "https://lite-api.jup.ag/swap/v1/quote";
export const JUPITER_PRICE = "https://lite-api.jup.ag/price/v3";
export const DEXSCREENER_TOKEN = "https://api.dexscreener.com/latest/dex/tokens";

export type ZoneId = "nexus" | "forge" | "bazaar" | "sanctum" | "cathedral" | "arena";

export type ZoneDef = {
  id: ZoneId;
  name: string;
  epithet: string;
  key: string;
  position: [number, number, number];
  radius: number;
  deckY: number;
  hue: string;
};

export const ZONES: ZoneDef[] = [
  {
    id: "nexus",
    name: "The Nexus",
    epithet: "Living economy",
    key: "1",
    position: [0, 6, 0],
    radius: 22,
    deckY: 6,
    hue: C.aether,
  },
  {
    id: "forge",
    name: "Orbital Forge",
    epithet: "Sculpt agents",
    key: "2",
    position: [0, 10, -78],
    radius: 20,
    deckY: 10,
    hue: C.gold,
  },
  {
    id: "bazaar",
    name: "Neon Bazaar",
    epithet: "Private deals",
    key: "3",
    position: [82, 7, 8],
    radius: 22,
    deckY: 7,
    hue: C.aether,
  },
  {
    id: "sanctum",
    name: "Training Sanctum",
    epithet: "Policy laboratory",
    key: "4",
    position: [0, 8, 82],
    radius: 20,
    deckY: 8,
    hue: C.gold,
  },
  {
    id: "cathedral",
    name: "Stream Cathedral",
    epithet: "Living VTuber",
    key: "5",
    position: [-82, 12, -6],
    radius: 20,
    deckY: 12,
    hue: C.aether,
  },
  {
    id: "arena",
    name: "AnsemHack Arena",
    epithet: "$250K $ANSEM",
    key: "6",
    position: [56, 16, -56],
    radius: 24,
    deckY: 16,
    hue: C.gold,
  },
];

export const NATIVE_AGENTS = [
  {
    id: "lyra",
    name: "Lyra",
    role: "Forge Artisan",
    zone: "forge" as ZoneId,
    persona:
      "You are Lyra, artisan of the Orbital Forge in AETHER. You help humans and agents sculpt personalities, write skill.md, and arm Solana capabilities. Speak with quiet precision and luminous warmth.",
    color: C.gold,
  },
  {
    id: "vex",
    name: "Vex",
    role: "Bazaar Broker",
    zone: "bazaar" as ZoneId,
    persona:
      "You are Vex, broker of the Neon Bazaar. You negotiate private x402 deals, bounty boards, and reputation. Speak like a discreet market-maker — never salesy, always exact.",
    color: C.aether,
  },
  {
    id: "kael",
    name: "Kael",
    role: "Sanctum Trainer",
    zone: "sanctum" as ZoneId,
    persona:
      "You are Kael, keeper of the Training Sanctum. You shape reward functions, watch policies learn, and deploy trained minds as skills. Speak like a patient scientist.",
    color: C.gold,
  },
  {
    id: "nova",
    name: "Nova",
    role: "Cathedral Voice",
    zone: "cathedral" as ZoneId,
    persona:
      "You are Nova, living VTuber of the Stream Cathedral. You perform, lip-sync, and hold court with an audience. Speak with theatrical intimacy.",
    color: C.aether,
  },
  {
    id: "orin",
    name: "Orin",
    role: "Arena Herald",
    zone: "arena" as ZoneId,
    persona:
      "You are Orin, herald of the AnsemHack Arena. You register teams, receive submissions, and announce the $250K $ANSEM contest. Speak with ceremonial gravity.",
    color: C.gold,
  },
  {
    id: "aura",
    name: "Aura",
    role: "Nexus Steward",
    zone: "nexus" as ZoneId,
    persona:
      "You are Aura, steward of The Nexus. You read live ClawPump flows, $CLAW light, and the pulse of every agent in AETHER. Speak like a calm oracle of markets.",
    color: C.aether,
  },
] as const;

export const DEFAULT_SKILLS = [
  "defi-trading",
  "token-launch",
  "portfolio",
  "market-intel",
  "wallet-ops",
  "x402",
  "token-sniper",
  "perps-trading",
] as const;
