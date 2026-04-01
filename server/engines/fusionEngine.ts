import { runPoint21Engine } from "./point21Engine";

export function runFusion(input: any) {
  const { quote, bars } = input;

  // ===== 防呆 =====
  if (!bars || !Array.isArray(bars) || bars.length === 0) {
    return {
      ...quote,

      point21Score: 0,
      point21Value: 0,
      diffValue: 0,
      upperBound: quote?.price || 0,
      point21State: "無資料",
      point21Reason: "bars 缺失",
    };
  }

  // ===== 核心：21點模組 =====
  const point21 = runPoint21Engine(bars);

  return {
    ...quote,

    // ===== 21點輸出 =====
    point21Score: point21.point21Score,
    point21Value: point21.point21Value,
    diffValue: point21.diffValue,
    upperBound: point21.upperBound,
    point21State: point21.point21State,
    point21Reason: point21.point21Reason,
  };
}
