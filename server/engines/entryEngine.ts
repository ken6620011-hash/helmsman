import { Quote } from "./marketDataEngine";
import { SupportResult } from "./supportEngine";
import { analyzeTailWindow } from "./timeEngine";

export type EntryResult = {
  entrySignal: boolean;
  entryType: "尾盤" | "突破" | "回踩" | "禁止";
  entryTime: string;
  entryReason: string;
  tailWindowOnly: boolean;
};

export function analyzeEntry(q: Quote, support: SupportResult): EntryResult {
  const pct = q.changePercent;
  const vol = q.volume;
  const tail = analyzeTailWindow();

  const isTailSessionCandidate =
    support.isHolding &&
    !support.breakDown &&
    !support.fakeBreakout &&
    support.holdDays >= 3 &&
    pct > 0 &&
    pct <= 3.5 &&
    vol >= 5000;

  if (isTailSessionCandidate && tail.canConfirmEntry) {
    return {
      entrySignal: true,
      entryType: "尾盤",
      entryTime: tail.timeLabel,
      entryReason: "支撐守穩且尾盤確認完成，可執行尾盤進場。",
      tailWindowOnly: true,
    };
  }

  if (isTailSessionCandidate && !tail.canConfirmEntry) {
    return {
      entrySignal: false,
      entryType: "禁止",
      entryTime: tail.timeLabel,
      entryReason: `尾盤型進場需等 13:26-13:30。${tail.reason}`,
      tailWindowOnly: true,
    };
  }

  const isBreakoutCandidate =
    support.isHolding &&
    !support.breakDown &&
    !support.fakeBreakout &&
    support.holdDays >= 3 &&
    pct >= 1 &&
    pct <= 4 &&
    vol >= 20000;

  if (isBreakoutCandidate) {
    return {
      entrySignal: true,
      entryType: "突破",
      entryTime: "盤中突破當下",
      entryReason: "平台守穩後放量轉強，突破條件成立。",
      tailWindowOnly: false,
    };
  }

  const isPullbackCandidate =
    support.isHolding &&
    !support.breakDown &&
    !support.fakeBreakout &&
    support.holdDays >= 4 &&
    pct >= -0.5 &&
    pct <= 1.5 &&
    vol >= 5000 &&
    vol < 30000;

  if (isPullbackCandidate) {
    return {
      entrySignal: true,
      entryType: "回踩",
      entryTime: "回踩不破時",
      entryReason: "突破後回踩守住平台，屬低風險進場區。",
      tailWindowOnly: false,
    };
  }

  return {
    entrySignal: false,
    entryType: "禁止",
    entryTime: "暫不進場",
    entryReason: "條件未完成，先等待更明確的出手時機。",
    tailWindowOnly: false,
  };
}
