import { useEffect, useMemo, useState } from "react";

function getDecisionColor(decision) {
  if (decision === "BUY") return "#22c55e";
  if (decision === "PREPARE") return "#38bdf8";
  if (decision === "WATCH") return "#f59e0b";
  if (decision === "EXIT") return "#ef4444";
  return "#94a3b8";
}

function getRiskColor(risk) {
  if (risk === "LOW") return "#22c55e";
  if (risk === "MEDIUM") return "#f59e0b";
  if (risk === "HIGH") return "#ef4444";
  return "#94a3b8";
}

function getStageLabel(stage) {
  if (stage === "ATTACK") return "攻擊";
  if (stage === "ROTATION") return "輪動";
  if (stage === "TEST") return "測試";
  if (stage === "DEFENSE") return "防守";
  if (stage === "CORRECTION") return "修正";
  return stage || "-";
}

function getActionLabel(action) {
  if (action === "BUY") return "進場";
  if (action === "PREPARE") return "準備";
  if (action === "WATCH") return "觀察";
  if (action === "REDUCE") return "減碼";
  if (action === "EXIT") return "退出";
  if (action === "SKIP") return "略過";
  return action || "-";
}

function GlowDot({ color = "#38bdf8", speed = "1.8s" }) {
  return (
    <>
      <style>{`
        @keyframes helmsmanPulse {
          0% { transform: scale(0.92); opacity: 0.45; box-shadow: 0 0 0px currentColor; }
          50% { transform: scale(1.08); opacity: 1; box-shadow: 0 0 16px currentColor; }
          100% { transform: scale(0.92); opacity: 0.45; box-shadow: 0 0 0px currentColor; }
        }
      `}</style>
      <div
        style={{
          width: 12,
          height: 12,
          borderRadius: 999,
          background: color,
          color,
          animation: `helmsmanPulse ${speed} ease-in-out infinite`,
        }}
      />
    </>
  );
}

function Panel({ title, subtitle, right, children }) {
  return (
    <div
      style={{
        background: "rgba(15,23,42,0.82)",
        border: "1px solid rgba(148,163,184,0.14)",
        borderRadius: 20,
        padding: 18,
        boxShadow: "0 12px 36px rgba(0,0,0,0.24)",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          gap: 12,
          marginBottom: 14,
        }}
      >
        <div>
          <div style={{ color: "#e2e8f0", fontSize: 17, fontWeight: 900 }}>
            {title}
          </div>
          {subtitle ? (
            <div style={{ color: "#64748b", fontSize: 12, marginTop: 4 }}>
              {subtitle}
            </div>
          ) : null}
        </div>
        {right || null}
      </div>
      {children}
    </div>
  );
}

function StatCard({ title, value, subvalue, color = "#38bdf8", speed = "1.8s" }) {
  return (
    <div
      style={{
        position: "relative",
        minHeight: 132,
        background: "rgba(255,255,255,0.03)",
        border: "1px solid rgba(148,163,184,0.10)",
        borderRadius: 18,
        padding: 16,
      }}
    >
      <div style={{ position: "absolute", top: 14, right: 14 }}>
        <GlowDot color={color} speed={speed} />
      </div>

      <div style={{ color: "#64748b", fontSize: 12 }}>{title}</div>
      <div
        style={{
          marginTop: 18,
          color,
          fontSize: 22,
          fontWeight: 900,
          letterSpacing: 0.3,
        }}
      >
        {value || "-"}
      </div>
      <div
        style={{
          marginTop: 10,
          color: "#cbd5e1",
          fontSize: 13,
          lineHeight: 1.6,
          whiteSpace: "pre-wrap",
        }}
      >
        {subvalue || "-"}
      </div>
    </div>
  );
}
function ReasonList({ reasons = [] }) {
  if (!reasons.length) {
    return <div style={{ color: "#64748b", fontSize: 13 }}>無理由資料</div>;
  }

  return (
    <div style={{ display: "grid", gap: 8 }}>
      {reasons.map((reason, idx) => (
        <div
          key={`${reason}-${idx}`}
          style={{
            padding: "10px 12px",
            borderRadius: 12,
            background: "rgba(255,255,255,0.03)",
            border: "1px solid rgba(148,163,184,0.10)",
            color: "#cbd5e1",
            fontSize: 13,
          }}
        >
          {reason}
        </div>
      ))}
    </div>
  );
}

export default function StrategyAnalysis() {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("http://localhost:3000/api/scanner")
      .then((res) => res.json())
      .then((res) => {
        setData(res);
        setError("");
      })
      .catch((err) => {
        console.error(err);
        setError("讀取 API 失敗");
      });
  }, []);

  const marketState = data?.marketState || null;
  const scanner = data?.scanner || [];

  const topPick = useMemo(() => {
    if (!scanner.length) return null;
    return [...scanner].sort((a, b) => Number(b.score || 0) - Number(a.score || 0))[0];
  }, [scanner]);

  if (error) {
    return (
      <div style={{ padding: 24, color: "#fff", background: "#020617", minHeight: "100vh" }}>
        {error}
      </div>
    );
  }

  if (!data) {
    return (
      <div style={{ padding: 24, color: "#fff", background: "#020617", minHeight: "100vh" }}>
        Loading...
      </div>
    );
  }

  const stageText = getStageLabel(marketState?.state);
  const marketActionText = getActionLabel(marketState?.action);
  const marketRiskText = marketState?.riskLevel || "-";

  const decisionColor = getDecisionColor(topPick?.decision);
  const riskColor = getRiskColor(marketState?.riskLevel);

  const commandText =
    topPick?.decision === "BUY"
      ? "【現在要做的事】\n1. 可進場\n2. 嚴守停損\n3. 不追第二根"
      : topPick?.decision === "PREPARE"
      ? "【現在要做的事】\n1. 先等突破確認\n2. 不提前追價\n3. 保持現金優先"
      : topPick?.decision === "WATCH"
      ? "【現在要做的事】\n1. 只觀察\n2. 不進場\n3. 等共振明朗"
      : "【現在要做的事】\n1. 不操作\n2. 保護資金";

  return (
    <div
      style={{
        minHeight: "100vh",
        padding: 22,
        color: "#e2e8f0",
        background:
          "radial-gradient(circle at top, rgba(56,189,248,0.08), transparent 24%), linear-gradient(180deg, #020617 0%, #0f172a 100%)",
      }}
    >
      <div style={{ maxWidth: 1460, margin: "0 auto" }}>
        <div style={{ marginBottom: 18 }}>
          <div style={{ fontSize: 22, fontWeight: 900 }}>舵手策略分析</div>
          <div style={{ color: "#64748b", marginTop: 6, fontSize: 13 }}>
            數學引擎 / 決策中樞 / 掃描器判斷
          </div>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
            gap: 16,
            marginBottom: 18,
          }}
        >
          <StatCard
            title="決策"
            value={topPick?.decision || "-"}
            subvalue={`行動：${getActionLabel(topPick?.decision)}`}
            color={decisionColor}
            speed="1.6s"
          />

          <StatCard
            title="最佳標的"
            value={topPick?.symbol || "-"}
            subvalue={`名稱：${topPick?.name || "-"}\n分數：${topPick?.score ?? "-"}`}
            color="#38bdf8"
            speed="1.9s"
          />

          <StatCard
            title="分數結構"
            value={topPick?.score ?? "-"}
            subvalue={`點數區：${topPick?.pointZone || "-"}\nHCI / HTI：${topPick?.HCI ?? "-"} / ${topPick?.HTI ?? "-"}`}
            color="#84cc16"
            speed="1.7s"
          />

          <StatCard
            title="狀態判讀"
            value={topPick?.heatZone || "-"}
            subvalue={`${topPick?.maState || "-"} / ${topPick?.resonanceState || "-"}`}
            color={riskColor}
            speed="1.8s"
          />
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1.05fr 0.95fr",
            gap: 16,
            marginBottom: 18,
          }}
        >
          <Panel
            title="盤勢判讀"
            subtitle="Market State（含後端結果）"
            right={<GlowDot color={riskColor} speed="2s" />}
          >
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "92px 1fr",
                rowGap: 10,
                columnGap: 10,
                fontSize: 15,
              }}
            >
              <div style={{ color: "#64748b" }}>狀態</div>
              <div style={{ fontWeight: 900 }}>{stageText}</div>

              <div style={{ color: "#64748b" }}>描述</div>
              <div>{marketState?.description || "-"}</div>

              <div style={{ color: "#64748b" }}>行動</div>
              <div style={{ color: getDecisionColor(marketState?.action), fontWeight: 900 }}>
                {marketActionText}
              </div>

              <div style={{ color: "#64748b" }}>風險</div>
              <div style={{ color: riskColor, fontWeight: 900 }}>{marketRiskText}</div>
            </div>
          </Panel>

          <Panel
            title="舵手總結"
            subtitle="自動產生（不再空白）"
            right={<GlowDot color={decisionColor} speed="1.7s" />}
          >
            <div
              style={{
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(148,163,184,0.10)",
                borderRadius: 14,
                padding: 14,
                color: "#e2e8f0",
                lineHeight: 1.8,
                fontSize: 15,
                marginBottom: 12,
              }}
            >
              {topPick?.summary || marketState?.summary || "-"}
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 10,
                fontSize: 14,
                color: "#cbd5e1",
              }}
            >
              <div>突破：{topPick?.breakoutState || "-"}</div>
              <div>差值：{topPick?.HTI ?? "-"}</div>
              <div>點數：{topPick?.HCI ?? "-"}</div>
              <div>決策：{topPick?.decision || "-"}</div>
            </div>
          </Panel>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "0.95fr 1.05fr",
            gap: 16,
            marginBottom: 18,
          }}
        >
          <Panel
            title="決策指令區"
            subtitle="現在要做的事"
            right={<GlowDot color={decisionColor} speed="1.5s" />}
          >
            <div
              style={{
                borderRadius: 14,
                padding: 16,
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(148,163,184,0.10)",
                whiteSpace: "pre-wrap",
                lineHeight: 1.9,
                fontWeight: 800,
                color: "#e2e8f0",
              }}
            >
              {commandText}
            </div>
          </Panel>

          <Panel
            title="理由展開"
            subtitle="由數學規則映射，不靠感覺"
            right={<GlowDot color="#a855f7" speed="2.1s" />}
          >
            <ReasonList reasons={topPick?.reasons || []} />
          </Panel>
        </div>
        <Panel
          title="策略掃描（ 掃描器 ）"
          subtitle="人選已出 / 人選互相比較 / 評分 / 決策"
        >
          <div style={{ overflowX: "auto" }}>
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                fontSize: 15,
              }}
            >
              <thead>
                <tr style={{ textAlign: "left", color: "#94a3b8" }}>
                  <th style={{ padding: "12px 10px" }}>#</th>
                  <th style={{ padding: "12px 10px" }}>象徵</th>
                  <th style={{ padding: "12px 10px" }}>姓名</th>
                  <th style={{ padding: "12px 10px" }}>HCI</th>
                  <th style={{ padding: "12px 10px" }}>HTI</th>
                  <th style={{ padding: "12px 10px" }}>分數</th>
                  <th style={{ padding: "12px 10px" }}>決定</th>
                  <th style={{ padding: "12px 10px" }}>摘要</th>
                </tr>
              </thead>
              <tbody>
                {scanner.map((s, idx) => (
                  <tr
                    key={`${s.symbol}-${idx}`}
                    style={{
                      borderTop: "1px solid rgba(148,163,184,0.12)",
                    }}
                  >
                    <td style={{ padding: "12px 10px", color: "#94a3b8" }}>{idx + 1}</td>
                    <td style={{ padding: "12px 10px", fontWeight: 900 }}>{s.symbol}</td>
                    <td style={{ padding: "12px 10px", color: "#cbd5e1" }}>{s.name}</td>
                    <td style={{ padding: "12px 10px" }}>{s.HCI}</td>
                    <td style={{ padding: "12px 10px" }}>{s.HTI}</td>
                    <td style={{ padding: "12px 10px", color: "#38bdf8", fontWeight: 900 }}>
                      {s.score}
                    </td>
                    <td
                      style={{
                        padding: "12px 10px",
                        color: getDecisionColor(s.decision),
                        fontWeight: 900,
                      }}
                    >
                      {getActionLabel(s.decision)}
                    </td>
                    <td style={{ padding: "12px 10px", color: "#94a3b8", fontSize: 13 }}>
                      {s.summary || "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      </div>
    </div>
  );
}
