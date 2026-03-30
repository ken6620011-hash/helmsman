type Memory = {
  viewedStocks: string[]
  favoriteStocks: string[]
}

const memory: Memory = {
  viewedStocks: [],
  favoriteStocks: []
}

export function rememberView(symbol: string) {

  if (!memory.viewedStocks.includes(symbol)) {

    memory.viewedStocks.push(symbol)
  }
}

export function rememberFavorite(symbol: string) {

  if (!memory.favoriteStocks.includes(symbol)) {

    memory.favoriteStocks.push(symbol)
  }
}

export function getMemory() {
  return memory
}
