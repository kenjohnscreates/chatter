// ENS client helpers (ENS prize — live mainnet resolution + server brief publish).
// Reads text records from Ethereum mainnet PublicResolver; brief updates are
// signed by the server signer (users lack mainnet ETH for setText).

import { createPublicClient, http, namehash, parseAbi } from "viem";
import { mainnet } from "viem/chains";

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://127.0.0.1:8765";

const PUBLIC_RESOLVER =
  "0xF29100983E058B709F3D539b0c765937B804AC15" as const;

const RESOLVER_ABI = parseAbi([
  "function text(bytes32 node, string key) view returns (string)",
]);

const publicClient = createPublicClient({
  chain: mainnet,
  transport: http(
    process.env.NEXT_PUBLIC_ETH_MAINNET_RPC_URL ??
      "https://ethereum-rpc.publicnode.com",
  ),
});

export interface EnsMintResult {
  subname: string;
  label: string;
  node: string;
  owner: string;
  ensAppUrl: string;
  txHashes: string[];
  existing?: boolean;
  pendingTransfer?: boolean;
}

export interface EnsRecords {
  description?: string;
  "com.chatter.brief"?: string;
  "com.chatter.paymentTx"?: string;
  "com.chatter.version"?: string;
}

export function ensStorageKey(address?: string): string {
  return `chatter:ens:${(address ?? "anon").toLowerCase()}`;
}

export async function mintEnsSubname(
  ownerAddress: string,
  paymentTxHash?: string,
): Promise<EnsMintResult> {
  const res = await fetch(`${API_BASE}/ens/mint`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      ownerAddress,
      paymentTxHash: paymentTxHash || undefined,
    }),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(
      `ENS mint failed (${res.status})${detail ? `: ${detail}` : ""}`,
    );
  }
  return res.json() as Promise<EnsMintResult>;
}

export async function publishEnsBrief(params: {
  ownerAddress: string;
  subname: string;
  brief: unknown;
}): Promise<{ txHashes: string[] }> {
  const res = await fetch(`${API_BASE}/ens/brief`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      ownerAddress: params.ownerAddress,
      subname: params.subname,
      brief: params.brief,
    }),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(
      `ENS brief publish failed (${res.status})${detail ? `: ${detail}` : ""}`,
    );
  }
  return res.json() as Promise<{ txHashes: string[] }>;
}

export async function readEnsRecords(subname: string): Promise<EnsRecords> {
  const node = namehash(subname);
  const keys = [
    "description",
    "com.chatter.brief",
    "com.chatter.paymentTx",
    "com.chatter.version",
  ] as const;
  const entries = await Promise.all(
    keys.map(async (key) => {
      try {
        const value = await publicClient.readContract({
          address: PUBLIC_RESOLVER,
          abi: RESOLVER_ABI,
          functionName: "text",
          args: [node, key],
        });
        return [key, value] as const;
      } catch {
        return [key, ""] as const;
      }
    }),
  );
  const records: EnsRecords = {};
  for (const [key, value] of entries) {
    if (value) records[key] = value;
  }
  return records;
}
