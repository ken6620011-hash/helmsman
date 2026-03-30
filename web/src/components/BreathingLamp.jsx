import React from "react";

const toneMap = {
  green: {
    glow: "rgba(34,197,94,0.55)",
    solid: "#22c55e",
    soft: "rgba(34,197,94,0.18)",
  },
  yellow: {
    glow: "rgba(245,158,11,0.55)",
    solid: "#f59e0b",
    soft: "rgba(245,158,11,0.18)",
  },
  red: {
    glow: "rgba(239,68,68,0.55)",
    solid: "#ef4444",
    soft: "rgba(239,68,68,0.18)",
  },
  blue: {
    glow: "rgba(56,189,248,0.55)",
    solid: "#38bdf8",
    soft: "rgba(56,189,248,0.18)",
  },
  purple: {
    glow: "rgba(168,85,247,0.55)",
    solid: "#a855f7",
    soft: "rgba(168,85,247,0.18)",
  },
};

const speedMap = {
  none: "0s",
  slow: "2.4s",
  medium: "1.6s",
  fast: "0.9s",
};

export default function BreathingLamp({
  tone = "blue",
  pulse = "medium",
  label = "",
  sublabel = "",
  value = "",
}) {
  const palette = toneMap[tone] || toneMap.blue;
  const duration = speedMap[pulse] || speedMap.medium;

  return (
    <>
      <style>{`
        @keyframes helmsmanBreath {
          0% {
            transform: scale(0.96);
            opacity: 0.55;
            box-shadow: 0 0 0px transparent;
          }
          50% {
            transform: scale(1.04);
            opacity: 1;
            box-shadow: 0 0 26px currentColor;
          }
          100% {
            transform: scale(0.96);
            opacity: 0.55;
            box-shadow: 0 0 0px transparent;
          }
        }
      `}</style>

      <div
        style={{
          background: "rgba(15,23,42,0.82)",
          border: `1px solid ${palette.soft}`,
          borderRadius: 18,
          padding: 16,
          minHeight: 116,
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: 14,
            right: 14,
            width: 14,
            height: 14,
            borderRadius: "50%",
            background: palette.solid,
            color: palette.glow,
            animation:
              pulse === "none"
                ? "none"
                : `helmsmanBreath ${duration} ease-in-out infinite`,
          }}
        />

        <div style={{ color: "#94a3b8", fontSize: 12 }}>{label}</div>

        <div
          style={{
            marginTop: 12,
            fontSize: 28,
            fontWeight: 900,
            color: palette.solid,
          }}
        >
          {value}
        </div>

        <div
          style={{
            marginTop: 8,
            color: "#cbd5e1",
            fontSize: 13,
            lineHeight: 1.5,
          }}
        >
          {sublabel}
        </div>
      </div>
    </>
  );
}
