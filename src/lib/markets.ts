import { ANSEM_MINT, CLAW_MINT, DEXSCREENER_TOKEN, JUPITER_PRICE, JUPITER_QUOTE, SOL_MINT } from "@/lib/constants";

export type TokenTicker = {
  mint: string;
  symbol: string;
  priceUsd: number | null;
  change24h: number | null;
  volume24h: number | null;
  liquidity: number | null;
  marketCap: number | null;
};

async function dexscreener(mint: string): Promise<TokenTicker> {
  const empty: TokenTicker = {
    mint,
    symbol: mint === CLAW_MINT ? "CLAW" : mint === ANSEM_MINT ? "ANSEM" : "TOKEN",
    priceUsd: null,
    change24h: null,
    volume24h: null,
    liquidity: null,
    marketCap: null,
  };
  try {
    const res = await fetch(`${DEXSCREENER_TOKEN}/${mint}`, {
      signal: AbortSignal.timeout(8000),
    });
    if (res.ok) {
      const body = (await res.json()) as {
        pairs?: Array<{
          baseToken?: { symbol?: string };
          priceUsd?: string;
          priceChange?: { h24?: number };
          volume?: { h24?: number };
          liquidity?: { usd?: number };
          marketCap?: number;
          fdv?: number;
        }>;
      };
      const pair = body.pairs?.[0];
      if (pair?.priceUsd) {
        return {
          mint,
          symbol: pair.baseToken?.symbol ?? empty.symbol,
          priceUsd: Number(pair.priceUsd),
          change24h: pair.priceChange?.h24 ?? null,
          volume24h: pair.volume?.h24 ?? null,
          liquidity: pair.liquidity?.usd ?? null,
          marketCap: pair.marketCap ?? pair.fdv ?? null,
        };
      }
    }
  } catch {
    /* fall through to Jupiter */
  }
  try {
    const res = await fetch(`${JUPITER_PRICE}?ids=${mint}`, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) return empty;
    const body = (await res.json()) as Record<string, { usdPrice?: number } | undefined>;
    const row = body[mint] ?? Object.values(body)[0];
    if (row?.usdPrice != null) {
      return { ...empty, priceUsd: row.usdPrice };
    }
  } catch {
    /* empty */
  }
  return empty;
}

export async function fetchRealmTickers(): Promise<{ claw: TokenTicker; ansem: TokenTicker }> {
  const [claw, ansem] = await Promise.all([dexscreener(CLAW_MINT), dexscreener(ANSEM_MINT)]);
  return { claw, ansem };
}

export async function jupiterQuote(input: {
  inputMint: string;
  outputMint: string;
  amount: string;
  slippageBps?: number;
}) {
  const params = new URLSearchParams({
    inputMint: input.inputMint,
    outputMint: input.outputMint,
    amount: input.amount,
    slippageBps: String(input.slippageBps ?? 50),
  });
  const res = await fetch(`${JUPITER_QUOTE}?${params}`, { signal: AbortSignal.timeout(10000) });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Jupiter quote failed (${res.status}): ${text.slice(0, 200)}`);
  }
  return (await res.json()) as {
    inputMint: string;
    outputMint: string;
    inAmount: string;
    outAmount: string;
    otherAmountThreshold: string;
    swapMode: string;
    slippageBps: number;
    priceImpactPct?: string;
    routePlan?: unknown[];
  };
}

export async function heliusRpc<T>(rpcUrl: string, method: string, params: unknown[]): Promise<T> {
  const res = await fetch(rpcUrl, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
    signal: AbortSignal.timeout(10000),
  });
  const body = (await res.json()) as { result?: T; error?: { message: string } };
  if (body.error) throw new Error(body.error.message);
  return body.result as T;
}

export function defaultRpc(heliusKey?: string | null): string {
  if (heliusKey?.startsWith("http")) return heliusKey;
  if (heliusKey) return `https://mainnet.helius-rpc.com/?api-key=${heliusKey}`;
  return "https://api.mainnet-beta.solana.com";
}

export async function walletSolBalance(address: string, heliusKey?: string | null) {
  const result = await heliusRpc<{ value?: number } | number>(defaultRpc(heliusKey), "getBalance", [address]);
  const lamports = typeof result === "number" ? result : (result?.value ?? 0);
  return { lamports, sol: lamports / 1_000_000_000 };
}

export { SOL_MINT };
