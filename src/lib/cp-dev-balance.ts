const STORAGE_KEY = "chuchoter-cp-dev-balance";

type DevCpBalances = Record<string, number>;

function readBalances(): DevCpBalances {
  if (typeof window === "undefined") return {};

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as DevCpBalances;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function writeBalances(balances: DevCpBalances): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(balances));
}

export function getDevCpBalance(userKey: string): number {
  return readBalances()[userKey] ?? 0;
}

export function addDevCpBalance(userKey: string, amount: number): number {
  const balances = readBalances();
  const nextBalance = (balances[userKey] ?? 0) + amount;
  balances[userKey] = nextBalance;
  writeBalances(balances);
  return nextBalance;
}

export function hasDevCpBalance(userKey: string): boolean {
  return userKey in readBalances();
}
