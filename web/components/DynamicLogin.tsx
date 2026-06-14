"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import {
  DynamicContextProvider,
  mergeNetworks,
  useDynamicContext,
} from "@dynamic-labs/sdk-react-core";
import { EthereumWalletConnectors } from "@dynamic-labs/ethereum";
import {
  DYNAMIC_CSS_OVERRIDES,
  DYNAMIC_LOCALE,
} from "@/lib/dynamicBrand";

const environmentId = process.env.NEXT_PUBLIC_DYNAMIC_ENVIRONMENT_ID;

const customEvmNetworks = [
  {
    blockExplorerUrls: ["https://sepolia.basescan.org"],
    chainId: 84532,
    chainName: "Base Sepolia",
    iconUrls: ["https://app.dynamic.xyz/assets/networks/base.svg"],
    name: "Base Sepolia",
    nativeCurrency: {
      decimals: 18,
      name: "Ether",
      symbol: "ETH",
      iconUrl: "https://app.dynamic.xyz/assets/networks/eth.svg",
    },
    networkId: 84532,
    rpcUrls: ["https://sepolia.base.org"],
    vanityName: "Base Sepolia",
  },
  {
    blockExplorerUrls: ["https://sepolia.etherscan.io"],
    chainId: 11155111,
    chainName: "Ethereum Sepolia",
    iconUrls: ["https://app.dynamic.xyz/assets/networks/eth.svg"],
    name: "Ethereum Sepolia",
    nativeCurrency: {
      decimals: 18,
      name: "Ether",
      symbol: "ETH",
      iconUrl: "https://app.dynamic.xyz/assets/networks/eth.svg",
    },
    networkId: 11155111,
    rpcUrls: ["https://ethereum-sepolia-rpc.publicnode.com"],
    vanityName: "Ethereum Sepolia",
  },
];

function truncateAddress(address: string) {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

function CopyAddressButton({ address }: { address: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard unavailable
    }
  }

  return (
    <button
      type="button"
      onClick={() => void copy()}
      title={copied ? "Copied!" : "Copy address"}
      aria-label={copied ? "Copied" : "Copy address"}
      className="rounded border-2 border-ink bg-paper p-1 text-ink transition hover:bg-ink hover:text-white"
    >
      {copied ? (
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden>
          <path d="M20 6 9 17l-5-5" />
        </svg>
      ) : (
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden>
          <rect x="9" y="9" width="13" height="13" rx="2" />
          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
        </svg>
      )}
    </button>
  );
}

function accountLabel(
  primaryWallet: ReturnType<typeof useDynamicContext>["primaryWallet"],
  email?: string,
) {
  return primaryWallet?.address
    ? truncateAddress(primaryWallet.address)
    : email || "Connected";
}

function AuthHeader() {
  const pathname = usePathname();
  const { handleLogOut, primaryWallet, sdkHasLoaded, user } =
    useDynamicContext();
  const { setShowAuthFlow } = useDynamicContext();
  const email = user?.email;

  return (
    <header className="border-b-[3px] border-ink bg-signal text-ink">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-3">
        <div className="flex items-center gap-4">
          <Link href="/" className="flex items-center gap-1.5 font-display text-xl font-black tracking-tight uppercase text-ink">
            <span className="text-ink">&#10022;</span> Chatter<sup className="text-[9px] align-super opacity-50">&copy;</sup>
          </Link>
        </div>
        <div className="flex items-center gap-3">
          {sdkHasLoaded && user ? (
            <>
              <Link
                href="/research"
                className={`rounded border-2 border-ink px-3 py-1 font-mono text-[11px] font-bold uppercase tracking-[0.15em] transition hover:bg-ink hover:text-white ${
                  pathname === "/research"
                    ? "bg-white text-ink"
                    : "bg-paper text-ink/80"
                }`}
              >
                Dashboard
              </Link>
              <span className="rounded border-2 border-ink bg-paper px-2.5 py-0.5 font-mono text-[11px] font-bold uppercase tracking-wider text-ink">
                Base Sepolia
              </span>
              <span className="flex items-center gap-1.5">
                <span className="font-mono text-sm text-ink/80">
                  {accountLabel(primaryWallet, email)}
                </span>
                {primaryWallet?.address ? (
                  <CopyAddressButton address={primaryWallet.address} />
                ) : null}
              </span>
              <button
                type="button"
                onClick={() => void handleLogOut()}
                className="border-b-2 border-ink/40 text-sm font-medium text-ink/70 transition hover:text-ink"
              >
                Sign out
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => setShowAuthFlow(true)}
              className="rounded border-2 border-ink bg-ink px-4 py-1.5 text-sm font-bold text-white transition hover:bg-ink/80"
            >
              Sign in
            </button>
          )}
        </div>
      </div>
    </header>
  );
}

function AuthGate({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { sdkHasLoaded, setShowAuthFlow, user } = useDynamicContext();

  useEffect(() => {
    if (pathname !== "/research" || !sdkHasLoaded || user) return;
    setShowAuthFlow(true);
    router.replace("/");
  }, [pathname, router, sdkHasLoaded, setShowAuthFlow, user]);

  if (pathname === "/research" && sdkHasLoaded && !user) {
    return (
      <main className="mx-auto max-w-6xl px-6 py-10 text-sm text-ink/60">
        Redirecting to sign in...
      </main>
    );
  }

  return children;
}

export default function DynamicLogin({ children }: { children: ReactNode }) {
  return (
    <DynamicContextProvider
      settings={{
        environmentId: environmentId || "",
        walletConnectors: [EthereumWalletConnectors],
        cssOverrides: DYNAMIC_CSS_OVERRIDES,
        overrides: {
          evmNetworks: (networks) => mergeNetworks(customEvmNetworks, networks),
        },
      }}
      locale={DYNAMIC_LOCALE}
      theme="light"
    >
      <AuthHeader />
      {!environmentId && (
        <div className="border-b border-amber-500/30 bg-amber-500/10 px-6 py-2 text-center text-xs text-amber-200">
          Set NEXT_PUBLIC_DYNAMIC_ENVIRONMENT_ID to enable Dynamic login.
        </div>
      )}
      <AuthGate>{children}</AuthGate>
    </DynamicContextProvider>
  );
}
