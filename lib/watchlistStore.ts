import AsyncStorage from "@react-native-async-storage/async-storage";

const WATCHLIST_KEY = "helmsman_watchlist_v5";

export async function getWatchlist(): Promise<string[]> {
  const raw = await AsyncStorage.getItem(WATCHLIST_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function toggleWatchlist(symbol: string): Promise<string[]> {
  const current = await getWatchlist();
  const next = current.includes(symbol)
    ? current.filter((s) => s !== symbol)
    : [...current, symbol];

  await AsyncStorage.setItem(WATCHLIST_KEY, JSON.stringify(next));
  return next;
}
