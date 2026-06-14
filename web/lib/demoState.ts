// Demo / recording helpers — local unlock state for paywall + ENS cache.

import { ensStorageKey } from "@/lib/ens";

export function paidStorageKey(address?: string): string {
  return `chatter:paid:${(address ?? "anon").toLowerCase()}`;
}

export function lastPaymentStorageKey(address?: string): string {
  return `chatter:lastPaymentTx:${(address ?? "anon").toLowerCase()}`;
}

export function isPaid(address?: string): boolean {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(paidStorageKey(address)) === "1";
}

export function markPaid(address: string): void {
  window.localStorage.setItem(paidStorageKey(address), "1");
}

export function saveLastPaymentTx(address: string, txHash: string): void {
  window.localStorage.setItem(lastPaymentStorageKey(address), txHash);
}

export function readLastPaymentTx(address?: string): string | null {
  if (typeof window === "undefined" || !address) return null;
  return window.localStorage.getItem(lastPaymentStorageKey(address));
}

export function clearDemoUnlock(address: string): void {
  window.localStorage.removeItem(paidStorageKey(address));
  window.localStorage.removeItem(ensStorageKey(address));
  window.localStorage.removeItem(lastPaymentStorageKey(address));
}

export const DEMO_RESET_ENABLED = process.env.NODE_ENV === "development";
