let watchlist: string[] = ["NVDA", "MSFT"]

export function getWatchlist() {
  return watchlist
}

export function addToWatchlist(symbol: string) {
  if (!watchlist.includes(symbol)) {
    watchlist.push(symbol)
  }
  return watchlist
}

export function removeFromWatchlist(symbol: string) {
  watchlist = watchlist.filter(s => s !== symbol)
  return watchlist
}
