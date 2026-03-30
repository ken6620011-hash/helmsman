// server/engines/scannerEngine.ts

import { getRealStockSnapshot } from "../market/finmindProvider";
import { runEventRadar } from "./eventRadarEngine";
import { calculatePositionPlan } from "./positionEngine";
import { runDecisionEngine } from "./decisionEngine";
import { getMarketState } from "./marketStateEngine";
import { runRiskEngine } from "./riskEngine";
import { runStopLossEngine } from "./stopLossEngine";

const STOCK_MAP: Record<string, string> = {
  "3016": "嘉晶",
  "6187": "萬潤",
  "3707": "漢磊",
};

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v));
}

function calcTech(snapshot: {
  currentPrice: number;
  prevClose: number;
  closes20: number[];
}) {
  const ma20 =
    snapshot.closes20.reduce((a, b) => a + b, 0) / snapshot.closes20.length;

  const hci = snapshot.currentPrice > ma20 ? 80 : 50;

  const momentum =
    snapshot.prevClose > 0
      ? (snapshot.currentPrice - snapshot.prevClose) / snapshot.prevClose
      : 0;

  const hrs = clamp(Math.round((momentum + 0.1) * 300), 0, 99);
  const techScore = Math.round(hci * 0.6 + hrs * 0.4);

  return { hci, hrs, techScore };
}

function applyMarketStateToDecision(
  decision: "BUY" | "PREPARE" | "WATCH" | "EXIT",
  marketState: "ATTACK" | "ROTATION" | "TEST" | "DEFENSE" | "CORRECTION" | "CRASH"
): "BUY" | "PREPARE" | "WATCH" | "EXIT" {
  if (marketState === "CRASH") return "EXIT";

  if (marketState === "CORRECTION") {
    if (decision === "BUY") return "WATCH";
    if (decision === "PREPARE") return "WATCH";
    return decision;
  }

  if (marketState === "DEFENSE") {
    if (decision === "BUY") return "PREPARE";
    return decision;
  }

  return decision;
}

function applyMarketStateToPosition(
  positionPct: number,
  marketState: "ATTACK" | "ROTATION" | "TEST" | "DEFENSE" | "CORRECTION" | "CRASH"
) {
  if (marketState === "CRASH") return 0;
  if (marketState === "CORRECTION") return Math.min(positionPct, 10);
  if (marketState === "DEFENSE") return Math.min(positionPct, 30);
  if (marketState === "TEST") return Math.min(positionPct, 50);
  return positionPct;
}

export async function runScanner() {
  const symbols = ["3016", "6187", "3707"];
  const list: any[] = [];

  const market = await getMarketState();
  for (const symbol of symbols) {
    const snapshot = await getRealStockSnapshot(symbol);
    const { hci, hrs, techScore } = calcTech(snapshot);

    const event = await runEventRadar(symbol);
    const eventScore = event.eventScore;

    const totalScore = techScore + eventScore;

    const decisionResult = runDecisionEngine({
      techScore,
      eventScore,
      totalScore,
      eventTags: event.eventTags,
    });

    const adjustedDecision = applyMarketStateToDecision(
      decisionResult.decision,
      market.marketState
    );

    const marketAdjustedRiskLevel =
      totalScore > 80 ? "LOW" : totalScore > 65 ? "MEDIUM" : "HIGH";

    const basePositionPlan = calculatePositionPlan({
      decision: adjustedDecision,
      totalScore,
      eventScore,
      riskLevel: marketAdjustedRiskLevel,
      eventTags: event.eventTags,
    });

    const adjustedPositionPct = applyMarketStateToPosition(
      basePositionPlan.positionPct,
      market.marketState
    );

    const finalPositionPlan = {
      ...basePositionPlan,
      positionPct: adjustedPositionPct,
      cashPct: 100 - adjustedPositionPct,
      note: `${basePositionPlan.note}｜盤勢：${market.summary}`,
    };

    const risk = runRiskEngine({
      decision: adjustedDecision,
      totalScore,
      confidence: decisionResult.confidence,
      marketState: market.marketState,
    });

    const entryPrice = snapshot.currentPrice;
    const stopLossBase = snapshot.recentLow;
    const targetPrice = snapshot.recentHigh;

    const stopLossPlan = runStopLossEngine({
      currentPrice: snapshot.currentPrice,
      entryPrice,
      stopLossBase,
      targetPrice,
      decision: adjustedDecision,
      riskLevel: risk.riskLevel,
      marketState: market.marketState,
    });

    list.push({
      symbol,
      name: STOCK_MAP[symbol],

      hci,
      hti: hrs,

      techScore,
      eventScore,
      totalScore,

      decision: adjustedDecision,
      confidence: decisionResult.confidence,
      decisionReason: `${decisionResult.reason}｜盤勢：${market.marketState}`,

      riskLevel: risk.riskLevel,
      riskMeta: risk,

      marketState: market.marketState,
      marketScore: market.score,
      marketSummary: market.summary,

      positionPlan: finalPositionPlan,
      stopLossPlan,

      eventTags: event.eventTags,
      eventReasons: event.eventReasons,
      breakdown: event.breakdown,
      rawSignals: event.rawSignals,

      score: totalScore,
      successRate: Math.min(95, 60 + Math.round(totalScore / 2)),

      entryPlan: {
        entryPrice,
        stopLoss: stopLossBase,
        target1: targetPrice,
      },
    });
  }
  return list.sort((a, b) => b.totalScore - a.totalScore);
}
