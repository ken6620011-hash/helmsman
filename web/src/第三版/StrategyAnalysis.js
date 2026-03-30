
import React, { useEffect, useMemo, useState } from "react";

function getDecisionColor(decision) {
  if (decision === "BUY") return "#22c55e";
  if (decision === "PREPARE") return "#38bdf8";
  if (decision === "WATCH") return "#f59e0b";
  if (decision === "EXIT") return "#ef4444";
  return "#94a3b8";
}

function getMarketStateColor(state) {
  if (state === "ATTACK") return "#22c55e";
  if (state === "ROTATION") return "#38bdf8";
  if (state === "TEST") return "#f59e0b";
  if (state === "DEFENSE") return "#f97316";
  if (state === "CORRECTION") return "#ef4444";
  if (state === "CRASH") return "#dc2626";
  return "#94a3b8";
}

function getRiskColor(risk) {
  if (risk === "LOW") return "#22c55e";
  if (risk === "MEDIUM") return "#f59e0b";
  if (risk === "HIGH") return "#ef4444";
  return "#94a3b8";
}

function getSignalColor(signal) {
  if (signal === "SAFE") return "#22c55e";
  if (signal === "WATCH") return "#f59e0b";
  if (signal === "REDUCE") return "#f97316";
  if (signal === "EXIT") return "#ef4444";
  return "#94a3b8";
}

function getRowBackground(item) {
  const signal = item?.stopLossPlan?.signal;
  const risk = item?.riskLevel;

  if (signal === "EXIT") return "rgba(239,68,68,0.16)";
  if (signal === "REDUCE") return "rgba(249,115,22,0.12)";
  if (signal === "WATCH" || risk === "HIGH") return "rgba(245,158,11,0.10)";
  return "transparent";
}

function getDistancePct(currentPrice, stopLossPrice) {
  if (!currentPrice || !stopLossPrice) return "-";
  const pct = ((stopLossPrice - currentPrice) / currentPrice) * 100;
  return `${pct.toFixed(2)}%`;
}

export default function StrategyAnalysis() {
  const [scanner, setScanner] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [expandedSymbol, setExpandedSymbol] = useState("");

  const [token, setToken] = useState("");
  const [tokenStatus, setTokenStatus] = useState({
    hasToken: false,
    maskedToken: "-",
  });

  const [market, setMarket] = useState(null);

  async function fetchTokenStatus() {
    try {
      const res = await fetch("http://localhost:3000/api/token/status");
      const json = await res.json();

      if (json.success) {
        setTokenStatus({
          hasToken: json.hasToken,
          maskedToken: json.maskedToken,
        });
      }
    } catch (err) {
      console.error(err);
    }
  }

  async function updateToken() {
    try {
      setError("");

      const res = await fetch("http://localhost:3000/api/token/set", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ token }),
      });

      const json = await res.json();

      if (!json.success) {
        setError(json.message || "token 更新失敗");
        return;
      }

      setTokenStatus({
        hasToken: json.hasToken,
        maskedToken: json.maskedToken,
      });

      alert("token 更新成功");
    } catch (err) {
      console.error(err);
      setError("token 更新失敗");
    }
  }

  async function fetchScanner() {
    try {
      setLoading(true);
      setError("");

      const res = await fetch("http://localhost:3000/api/scanner");
      const json = await res.json();

      if (!json.success) {
        setError(json.message || "掃描器錯誤");
        setScanner([]);
        setMarket(null);
        return;
      }

      const data = Array.isArray(json.scanner) ? json.scanner : [];
      setScanner(data);
      setExpandedSymbol("");

      if (data.length > 0) {
        setMarket({
          state: data[0].marketState,
          score: data[0].marketScore,
          summary: data[0].marketSummary,
        });
      } else {
        setMarket(null);
      }
    } catch (err) {
      console.error(err);
      setError("掃描器錯誤");
      setScanner([]);
      setMarket(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchTokenStatus();
    fetchScanner();
  }, []);

  const topPick = useMemo(() => {
    return scanner.length > 0 ? scanner[0] : null;
  }, [scanner]);

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#0b1020",
        color: "#fff",
        padding: 20,
      }}
    >
      <div style={pageTitleStyle}>舵手分析策略</div>

      <div style={gridTopStyle}>
        <div style={cardStyle}>
          <div style={cardTitleStyle}>FinMind 代幣面板</div>

          <div style={{ marginBottom: 8 }}>
            狀態：
            <span
              style={{
                marginLeft: 8,
                color: tokenStatus.hasToken ? "#22c55e" : "#ef4444",
                fontWeight: 700,
              }}
            >
              {tokenStatus.hasToken ? "✅ 已設定" : "❌ 未設定"}
            </span>
          </div>

          <div style={{ marginBottom: 12 }}>
            令牌：{tokenStatus.maskedToken}
          </div>

          <input
            value={token}
            onChange={(e) => setToken(e.target.value)}
            placeholder="貼上 FinMind token"
            style={inputStyle}
          />

          <button onClick={updateToken} style={greenButtonStyle}>
            更新令牌
          </button>
        </div>

        <div style={cardStyle}>
          <div style={cardTitleStyle}>盤勢狀態</div>

          {market ? (
            <>
              <div style={{ marginBottom: 8 }}>
                狀態：
                <span
                  style={{
                    marginLeft: 8,
                    color: getMarketStateColor(market.state),
                    fontWeight: 700,
                  }}
                >
                  {market.state}
                </span>
              </div>
              <div style={{ marginBottom: 8 }}>分數：{market.score}</div>
              <div>說明：{market.summary}</div>
            </>
          ) : (
            <div style={{ color: "#94a3b8" }}>尚未取得盤勢資料</div>
          )}
        </div>

        <div style={cardStyle}>
          <div style={cardTitleStyle}>目前首選</div>

          {topPick ? (
            <>
              <div style={{ fontSize: 26, fontWeight: 800, color: "#60a5fa" }}>
                {topPick.symbol}
              </div>
              <div style={{ marginTop: 4 }}>{topPick.name}</div>
              <div style={{ marginTop: 8 }}>
                決策：
                <span
                  style={{
                    marginLeft: 8,
                    color: getDecisionColor(topPick.decision),
                    fontWeight: 800,
                  }}
                >
                  {topPick.decision}
                </span>
              </div>
              <div style={{ marginTop: 8 }}>總分：{topPick.totalScore}</div>
              <div style={{ marginTop: 8 }}>信心：{topPick.confidence}%</div>
            </>
          ) : (
            <div style={{ color: "#94a3b8" }}>尚無首選</div>
          )}
        </div>
      </div>

      <div style={{ marginBottom: 16 }}>
        <button onClick={fetchScanner} style={blueButtonStyle}>
          執行掃描儀
        </button>
      </div>

      {loading && <div style={{ marginBottom: 12 }}>載入中...</div>}
      {error && <div style={{ marginBottom: 12, color: "#ef4444" }}>{error}</div>}
      <div style={tableWrapStyle}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th style={thStyle}>代號</th>
              <th style={thStyle}>名稱</th>
              <th style={thStyle}>技術分</th>
              <th style={thStyle}>事件分</th>
              <th style={thStyle}>總分</th>
              <th style={thStyle}>決策</th>
              <th style={thStyle}>風險</th>
              <th style={thStyle}>部位</th>
              <th style={thStyle}>停損燈</th>
              <th style={thStyle}>停損距離</th>
              <th style={thStyle}>原因</th>
            </tr>
          </thead>

          <tbody>
            {scanner.map((item) => (
              <React.Fragment key={item.symbol}>
                <tr style={{ background: getRowBackground(item) }}>
                  <td style={tdStyle}>{item.symbol}</td>
                  <td style={tdStyle}>{item.name}</td>
                  <td style={tdStyle}>{item.techScore}</td>
                  <td style={tdStyle}>{item.eventScore}</td>
                  <td style={tdStyle}>{item.totalScore}</td>
                  <td
                    style={{
                      ...tdStyle,
                      color: getDecisionColor(item.decision),
                      fontWeight: 800,
                    }}
                  >
                    {item.decision}
                  </td>
                  <td
                    style={{
                      ...tdStyle,
                      color: getRiskColor(item.riskLevel),
                      fontWeight: 700,
                    }}
                  >
                    {item.riskLevel}
                  </td>
                  <td style={tdStyle}>
                    {item.positionPlan ? `${item.positionPlan.positionPct}%` : "-"}
                  </td>
                  <td
                    style={{
                      ...tdStyle,
                      color: getSignalColor(item.stopLossPlan?.signal),
                      fontWeight: 800,
                    }}
                  >
                    {item.stopLossPlan?.signalLabel || "-"}
                  </td>
                  <td style={tdStyle}>
                    {item.stopLossPlan
                      ? getDistancePct(
                          item.entryPlan?.entryPrice,
                          item.stopLossPlan?.stopLossPrice
                        )
                      : "-"}
                  </td>
                  <td style={tdStyle}>
                    <button
                      onClick={() =>
                        setExpandedSymbol(
                          expandedSymbol === item.symbol ? "" : item.symbol
                        )
                      }
                      style={{
                        background:
                          expandedSymbol === item.symbol ? "#334155" : "#2563eb",
                        color: "#fff",
                        border: "none",
                        borderRadius: 8,
                        padding: "6px 10px",
                        cursor: "pointer",
                        fontWeight: 700,
                      }}
                    >
                      {expandedSymbol === item.symbol ? "收合" : "展開"}
                    </button>
                  </td>
                </tr>

                {expandedSymbol === item.symbol && (
                  <tr>
                    <td colSpan={11} style={expandTdStyle}>
                      <div style={sectionTitleStyle}>
                        🔥 決策理由：{item.decisionReason || "無"}
                      </div>

                      <div style={{ marginBottom: 8 }}>
                        📊 事件標籤：
                        {Array.isArray(item.eventTags) && item.eventTags.length > 0
                          ? item.eventTags.join(" / ")
                          : "無"}
                      </div>

                      <div style={{ marginBottom: 8, fontWeight: 700 }}>
                        🧠 詳細原因：
                      </div>

                      {Array.isArray(item.eventReasons) && item.eventReasons.length > 0 ? (
                        item.eventReasons.map((reason, idx) => (
                          <div key={`${item.symbol}-reason-${idx}`}>• {reason}</div>
                        ))
                      ) : (
                        <div>無</div>
                      )}

                      {item.stopLossPlan && (
                        <div style={sectionBoxStyle}>
                          <div style={sectionTitleStyle}>StopLoss / 停利</div>
                          <div>停損價：{item.stopLossPlan.stopLossPrice}</div>
                          <div>止盈價：{item.stopLossPlan.takeProfitPrice}</div>
                          <div>
                            追蹤停損價：{item.stopLossPlan.trailingStopPrice ?? "-"}
                          </div>
                          <div>停損百分比：{item.stopLossPlan.stopLossPct}%</div>
                          <div>獲利百分比：{item.stopLossPlan.takeProfitPct}%</div>
                          <div>信號：{item.stopLossPlan.signal}</div>
                          <div>信號標籤：{item.stopLossPlan.signalLabel}</div>
                          <div>註：{item.stopLossPlan.note}</div>
                        </div>
                      )}

                      <div style={sectionBoxStyle}>
                        <div style={sectionTitleStyle}>逃命條件</div>
                        <div>• 跌破停損價 → EXIT</div>
                        <div>• 大盤進入 CRASH → EXIT</div>
                        <div>• Decision = EXIT → 直接離場</div>
                        <div>• 高風險且轉弱 → REDUCE / WATCH</div>
                      </div>
                      {item.positionPlan && (
                        <div style={sectionBoxStyle}>
                          <div style={sectionTitleStyle}>倉位規劃</div>
                          <div>持股比例：{item.positionPlan.positionPct}%</div>
                          <div>現金比例：{item.positionPlan.cashPct}%</div>
                          <div>動作：{item.positionPlan.actionLabel}</div>
                          <div>風險：{item.positionPlan.riskLabel}</div>
                          <div>備註：{item.positionPlan.note}</div>
                        </div>
                      )}

                      {item.breakdown && (
                        <div style={sectionBoxStyle}>
                          <div style={sectionTitleStyle}>分項拆解</div>
                          <div>官方：{item.breakdown.officialScore}</div>
                          <div>新聞：{item.breakdown.newsScore}</div>
                          <div>法人：{item.breakdown.institutionalScore}</div>
                          <div>基本面：{item.breakdown.fundamentalsScore}</div>
                          <div>籌碼：{item.breakdown.chipScore}</div>
                        </div>
                      )}

                      {market && (
                        <div style={sectionBoxStyle}>
                          <div style={sectionTitleStyle}>盤勢資訊</div>
                          <div>狀態：{item.marketState}</div>
                          <div>分數：{item.marketScore}</div>
                          <div>說明：{item.marketSummary}</div>
                        </div>
                      )}

                      {Array.isArray(item.rawSignals) && item.rawSignals.length > 0 && (
                        <div style={sectionBoxStyle}>
                          <div style={sectionTitleStyle}>原始訊號</div>
                          {item.rawSignals.map((signal, idx) => (
                            <div key={`${item.symbol}-signal-${idx}`}>
                              • [{signal.source}] {signal.title}
                            </div>
                          ))}
                        </div>
                      )}
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const pageTitleStyle = {
  fontSize: 28,
  fontWeight: 800,
  marginBottom: 20,
};

const gridTopStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
  gap: 16,
  marginBottom: 20,
};

const cardStyle = {
  background: "#111827",
  border: "1px solid #334155",
  borderRadius: 12,
  padding: 16,
};

const cardTitleStyle = {
  fontSize: 20,
  fontWeight: 700,
  marginBottom: 12,
};

const inputStyle = {
  width: "100%",
  padding: 12,
  borderRadius: 8,
  border: "1px solid #475569",
  background: "#0f172a",
  color: "#fff",
  marginBottom: 12,
};

const greenButtonStyle = {
  background: "#22c55e",
  color: "#000",
  border: "none",
  borderRadius: 8,
  padding: "10px 18px",
  fontWeight: 700,
  cursor: "pointer",
};

const blueButtonStyle = {
  background: "#2563eb",
  color: "#fff",
  border: "none",
  borderRadius: 8,
  padding: "10px 18px",
  fontWeight: 700,
  cursor: "pointer",
};

const tableWrapStyle = {
  background: "#111827",
  border: "1px solid #334155",
  borderRadius: 12,
  overflow: "hidden",
};

const thStyle = {
  textAlign: "left",
  padding: 12,
  borderBottom: "1px solid #334155",
  color: "#cbd5e1",
  fontWeight: 700,
};

const tdStyle = {
  padding: 12,
  borderBottom: "1px solid #1e293b",
  color: "#e2e8f0",
};

const expandTdStyle = {
  background: "#0f172a",
  padding: 16,
  borderBottom: "1px solid #1e293b",
  lineHeight: 1.8,
};

const sectionBoxStyle = {
  marginTop: 12,
  paddingTop: 12,
  borderTop: "1px solid #334155",
};

const sectionTitleStyle = {
  fontWeight: 700,
  marginBottom: 6,
};
