export type HciInput = {
  price: number;
  prevClose: number;
  volume: number;
  supportDays?: number;
};

export type HciResult = {
  score: number;

  pointZone: number;
  heatZone: number;
  deltaTrend: number;
  resonanceState: number;
  breakoutState: number;

  structure: "上升" | "盤整" | "下降";
  platform: "平台上" | "平台附近" | "平台外";
  supportStatus: "穩定" | "不穩";
  supportReason: string;

  volumeLabel: "量縮" | "正常" | "放量";
  breakoutLabel: "未爆" | "接近起爆" | "起爆成立";
};

function clamp(v: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, Math.round(v)));
}

function round2(v: number): number {
  return Number(v.toFixed(2));
}

export function runHciEngine(input: HciInput): HciResult {
  const price = Number(input.price ?? 0);
  const prevClose = Number(input.prevClose ?? 0);
  const volume = Number(input.volume ?? 0);
  const supportDays = Number(input.supportDays ?? 1);

  const change = prevClose > 0 ? round2(price - prevClose) : 0;
  const changePercent = prevClose > 0 ? round2((change / prevClose) * 100) : 0;

  // 1) pointZone：價格所在區
  let pointZone = 50;
  if (price >= prevClose * 1.02) pointZone = 85;
  else if (price >= prevClose * 1.005) pointZone = 70;
  else if (price >= prevClose * 0.99) pointZone = 55;
  else if (price >= prevClose * 0.97) pointZone = 35;
  else pointZone = 20;

  // 2) heatZone：強弱溫度
  let heatZone = 50;
  if (changePercent >= 4) heatZone = 90;
  else if (changePercent >= 2) heatZone = 75;
  else if (changePercent >= 0) heatZone = 58;
  else if (changePercent > -2) heatZone = 40;
  else heatZone = 20;

  // 3) deltaTrend：變化斜率
  let deltaTrend = 50;
  if (changePercent >= 3) deltaTrend = 85;
  else if (changePercent >= 1) deltaTrend = 68;
  else if (changePercent > -1) deltaTrend = 50;
  else if (changePercent > -3) deltaTrend = 32;
  else deltaTrend = 15;

  // 4) resonanceState：支撐 + 價格共振
  let resonanceState = 35;
  if (supportDays >= 4 && price >= prevClose) resonanceState = 85;
  else if (supportDays >= 3 && price >= prevClose * 0.995) resonanceState = 70;
  else if (supportDays >= 2 && price >= prevClose * 0.985) resonanceState = 55;
  else if (price < prevClose * 0.97) resonanceState = 20;

  // 5) breakoutState：起爆品質
  let breakoutState = 35;
  if (changePercent >= 2 && volume >= 20000) breakoutState = 80;
  else if (changePercent >= 1 && volume >= 10000) breakoutState = 65;
  else if (changePercent >= 0 && volume >= 5000) breakoutState = 52;
  else if (changePercent < 0) breakoutState = 30;

  const score = clamp(
    pointZone * 0.24 +
      heatZone * 0.18 +
      deltaTrend * 0.18 +
      resonanceState * 0.20 +
      breakoutState * 0.20
  );

  const structure: HciResult["structure"] =
    changePercent >= 1.5 ? "上升" : changePercent <= -1.5 ? "下降" : "盤整";

  const platform: HciResult["platform"] =
    price >= prevClose * 1.005
      ? "平台上"
      : price >= prevClose * 0.985
      ? "平台附近"
      : "平台外";

  const supportStatus: HciResult["supportStatus"] =
    supportDays >= 3 && price >= prevClose * 0.985 ? "穩定" : "不穩";

  const supportReason =
    supportStatus === "穩定"
      ? `支撐守穩 ${supportDays} 天，主力測試通過`
      : "支撐尚未成立";

  const volumeLabel: HciResult["volumeLabel"] =
    volume >= 20000 ? "放量" : volume >= 5000 ? "正常" : "量縮";

  const breakoutLabel: HciResult["breakoutLabel"] =
    breakoutState >= 70 ? "起爆成立" : breakoutState >= 60 ? "接近起爆" : "未爆";

  return {
    score,

    pointZone,
    heatZone,
    deltaTrend,
    resonanceState,
    breakoutState,

    structure,
    platform,
    supportStatus,
    supportReason,

    volumeLabel,
    breakoutLabel,
  };
}
