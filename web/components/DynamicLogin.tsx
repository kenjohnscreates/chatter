"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, type ReactNode } from "react";
import {
  DynamicContextProvider,
  useDynamicContext,
  useDynamicWaas,
} from "@dynamic-labs/sdk-react-core";
import { ChainEnum } from "@dynamic-labs/sdk-api-core";
import { EthereumWalletConnectors } from "@dynamic-labs/ethereum";

const environmentId = process.env.NEXT_PUBLIC_DYNAMIC_ENVIRONMENT_ID;

function truncateAddress(address: string) {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
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
  const { handleLogOut, primaryWallet, sdkHasLoaded, user } =
    useDynamicContext();
  const { setShowAuthFlow } = useDynamicContext();
  const email = user?.email;

  return (
    <header className="border-b border-zinc-800 bg-zinc-950/80 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-4">
        <Link href="/" className="text-sm font-semibold tracking-tight text-white">
          Chatter
        </Link>
        <div className="flex items-center gap-3">
          {sdkHasLoaded && user ? (
            <>
              <span className="rounded-full border border-zinc-700 px-3 py-1 text-xs text-zinc-300">
                Base Sepolia
              </span>
              <span className="text-sm text-zinc-300">
                {accountLabel(primaryWallet, email)}
              </span>
              <button
                type="button"
                onClick={() => void handleLogOut()}
                className="text-sm text-zinc-500 transition hover:text-white"
              >
                Sign out
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => setShowAuthFlow(true)}
              className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-500"
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
      <main className="mx-auto max-w-6xl px-6 py-10 text-sm text-zinc-400">
        Redirecting to sign in...
      </main>
    );
  }

  return children;
}

function EmbeddedWalletAutoCreate() {
  const attempted = useRef(false);
  const { user } = useDynamicContext();
  const {
    createWalletAccount,
    dynamicWaasIsEnabled,
    getWaasWallets,
  } = useDynamicWaas();

  useEffect(() => {
    if (
      attempted.current ||
      !user ||
      !dynamicWaasIsEnabled ||
      getWaasWallets().length > 0
    ) {
      return;
    }

    attempted.current = true;
    void createWalletAccount([ChainEnum.Evm]);
  }, [
    createWalletAccount,
    dynamicWaasIsEnabled,
    getWaasWallets,
    user,
  ]);

  return null;
}

export default function DynamicLogin({ children }: { children: ReactNode }) {
  return (
    <DynamicContextProvider
      settings={{
        environmentId: environmentId || "",
        walletConnectors: [EthereumWalletConnectors],
      }}
      theme="dark"
    >
      <AuthHeader />
      <EmbeddedWalletAutoCreate />
      {!environmentId && (
        <div className="border-b border-amber-500/30 bg-amber-500/10 px-6 py-2 text-center text-xs text-amber-200">
          Set NEXT_PUBLIC_DYNAMIC_ENVIRONMENT_ID to enable Dynamic login.
        </div>
      )}
      <AuthGate>{children}</AuthGate>
    </DynamicContextProvider>
  );
}
