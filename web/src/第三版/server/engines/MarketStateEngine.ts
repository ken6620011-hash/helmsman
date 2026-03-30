type MarketState =
  | "ATTACK"     // 攻擊
  | "ROTATION"   // 輪動
  | "TEST"       // 測試
  | "DEFENSE"    // 防守
  | "CORRECTION" // 修正
  | "CRASH";     // 崩跌

type MarketOutput = {
  marketState: MarketState;
  score: number;
  summary: string;
};

function calcScore({
  twChange,
  nasdaqChange,
  soxChange,
}: {
  twChange: number;
  nasdaqChange: number;
  soxChange: number;
}) {
  let score = 50;

  score += twChange * 10;
  score += nasdaqChange * 6;
  score += soxChange * 8;

  return Math.max(0, Math.min(100, Math.round(score)));
}

function classify(score: number): MarketState {
  if (score >= 75) return "ATTACK";
  if (score >= 65) return "ROTATION";
  if (score >= 55) return "TEST";
  if (score >= 45) return "DEFENSE";
  if (score >= 35) return "CORRECTION";
  return "CRASH";
}

function summary(state: MarketState): string {
  switch (state) {
    case "ATTACK":
      return "多頭攻擊期（可積極進攻）";
    case "ROTATION":
      return "族群輪動（選股為主）";
    case "TEST":
      return "多空測試（試單）";
    case "DEFENSE":
      return "防守期（降低倉位）";
    case "CORRECTION":
      return "修正期（停止進場）";
    case "CRASH":
      return "崩跌（全面防守）";
  }
}

export async function getMarketState(): Promise<MarketOutput> {
  // 🔥 先用模擬（之後可接真 API）
  const mock = {
    twChange: 0.3,     // 台股
    nasdaqChange: -0.2,
    soxChange: 0.5,
  };

  const score = calcScore(mock);
  const marketState = classify(score);

  return {
    marketState,
    score,
    summary: summary(marketState),
  };
}
