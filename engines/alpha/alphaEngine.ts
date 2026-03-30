import { AlphaIndicators, AlphaResult, AlphaScores, MarketSnapshot } from "./types";
import {
  calculateHCI,
  calculateHCR,
  calculateHLV,
  calculateHMV,
  calculateHRI,
  calculateHRS,
  calculateHTE,
  calculateHTI,
} from "./indicators";

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function scoreTechnical(ind: AlphaIndicators): number {
  let score = 30;

  if (ind.HCI >= 18 && ind.HCI <= 21) score += 25;
  else if (ind.HCI >= 15) score += 15;

  if (ind.HTI >= 40 && ind.HTI <= 70) score += 25;
  else if (ind.HTI > 90) score -= 20;

  if (ind.HTE > 0) score += 10;

  return clamp(score, 0, 100);
}

function scoreCapitalFlow(ind: AlphaIndicators): number {
  let score = 35;

  if (ind.HCR > 0) score += 20;
  if (ind.HLV >= 70) score += 20;
  if (ind.HRS > 0) score += 15;

  return clamp(score, 0, 100);
}

function scoreEmotion(ind: AlphaIndicators): number {
  let score = 35;

  if (ind.HRI >= 20) score += 20;
  if (ind.HMV >= 65) score += 20;

  return clamp(score, 0, 100);
}

function scoreFundamental(snapshot: MarketSnapshot): number {
  const narrative = snapshot.narrativeScore ?? 50;
  return clamp(narrative, 0, 100);
}

function generateSignal(
  indicators: AlphaIndicators,
  radarScore: number
): AlphaResult["signal"] {
  if (indicators.HTI > 90) return "RISK_OFF";

  if (
    indicators.HCI >= 18 &&
    indicators.HTI >= 40 &&
    indicators.HTI <= 70 &&
    indicators.HTE > 0 &&
    indicators.HRI >= 20 &&
    radarScore >= 80
  ) {
    return "ACCUMULATION";
  }

  if (radarScore >= 85 && indicators.HRS > 0) {
    return "BREAKOUT";
  }

  if (radarScore >= 70) {
    return "MOMENTUM";
  }

  return "WATCH";
}

function confidenceFromRadar(radarScore: number): number {
  if (radarScore >= 90) return 92;
  if (radarScore >= 85) return 86;
  if (radarScore >= 75) return 78;
  if (radarScore >= 65) return 70;
  return 60;
}

function buildExplanation(
  signal: AlphaResult["signal"],
  indicators: AlphaIndicators,
  scores: AlphaScores
): string {
  return [
    `Signal=${signal}`,
    `HCI=${indicators.HCI}`,
    `HTI=${indicators.HTI}`,
    `HTE=${indicators.HTE}`,
    `HCR=${indicators.HCR}`,
    `HRI=${indicators.HRI}`,
    `HRS=${indicators.HRS}`,
    `HMV=${indicators.HMV}`,
    `HLV=${indicators.HLV}`,
    `Radar=${scores.radarScore}`,
  ].join(" | ");
}

export function runAlphaEngine(
  snapshot: MarketSnapshot,
  previousHTI = 0
): AlphaResult {
  const HCI = calculateHCI(snapshot);
  const HTI = calculateHTI(snapshot);
  const HTE = calculateHTE(HTI, previousHTI);
  const HCR = calculateHCR(snapshot);
  const HRI = calculateHRI(snapshot);
  const HRS = calculateHRS(snapshot);
  const HMV = calculateHMV(snapshot);
  const HLV = calculateHLV(snapshot);

  const indicators: AlphaIndicators = {
    HCI,
    HTI,
    HTE,
    HCR,
    HRI,
    HRS,
    HMV,
    HLV,
  };

  const technical = scoreTechnical(indicators);
  const capitalFlow = scoreCapitalFlow(indicators);
  const emotion = scoreEmotion(indicators);
  const fundamental = scoreFundamental(snapshot);

  const radarScore = Math.round(
    technical * 0.4 +
      capitalFlow * 0.3 +
      emotion * 0.2 +
      fundamental * 0.1
  );

  const scores: AlphaScores = {
    technical,
    capitalFlow,
    emotion,
    fundamental,
    radarScore,
  };

  const signal = generateSignal(indicators, radarScore);
  const confidence = confidenceFromRadar(radarScore);
  const explanation = buildExplanation(signal, indicators, scores);

  return {
    symbol: snapshot.symbol,
    indicators,
    scores,
    signal,
    confidence,
    explanation,
  };
}
