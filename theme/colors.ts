export const HelmsmanColors = {
  bg: "#081a25",
  panel: "#102c3b",
  card: "#123344",
  border: "#1d4a61",

  primary: "#4fd1c5",

  text: "#ffffff",
  textSoft: "#d7e3f1",
  textMuted: "#8ea5bb",
  textDim: "#6f879d",

  success: "#22c55e",
  warning: "#eab308",
  danger: "#f97316"
};

export function getSignalColor(signal?: string) {
  if (!signal) return HelmsmanColors.textMuted;

  const value = signal.toLowerCase();

  if (
    value.includes("strong") ||
    value.includes("buy") ||
    value.includes("risk on") ||
    value.includes("leader")
  ) {
    return HelmsmanColors.success;
  }

  if (
    value.includes("watch") ||
    value.includes("building") ||
    value.includes("selective") ||
    value.includes("recovery")
  ) {
    return HelmsmanColors.warning;
  }

  if (
    value.includes("reduce") ||
    value.includes("exit") ||
    value.includes("risk off") ||
    value.includes("danger")
  ) {
    return HelmsmanColors.danger;
  }

  return HelmsmanColors.textMuted;
}

export function getScoreColor(score: number) {
  if (score >= 90) return HelmsmanColors.success;
  if (score >= 80) return HelmsmanColors.warning;
  return HelmsmanColors.danger;
}
