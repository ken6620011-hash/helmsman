import React, { useEffect, useMemo, useState } from "react";

const API_BASE = "http://localhost:3000";

function toneColor(tone) {
  if (tone === "green") return "#22c55e";
  if (tone === "yellow") return "#f59e0b";
  if (tone === "red") return "#ef4444";
  if (tone === "blue") return "#38bdf8";
  return "#94a3b8";
}

function LightCard({ title, color, line1, line2 }) {
  const c = toneColor(color);

  return (
    <div
      style={{
        background: "rgba(15,23,42,0.88)",
        border: `1px solid ${c}33`,
        borderRadius: 18,
        padding: 16,
        minHeight: 96,
        boxShadow: `0 0 18px ${c}22`,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <span
          style={{
            width: 12,
            height: 12,
            borderRadius: "50%",
            background: c,
            boxShadow: `0 0 12px ${c}`,
            display: "inline-block",
          }}
        />
        <span style={{ color: "#e2e8f0", fontWeight: 700, fontSize: 18 }}>
          {title}
        </span>
      </div>

      <div style={{ marginTop: 12, color: "#cbd5e1", fontSize: 13 }}>{line1}</div>
      <div style={{ marginTop: 6, color: "#94a3b8", fontSize: 12 }}>{line2}</div>
    </div>
  );
}

function Panel({ title, subtitle, right, children }) {
  return (
    <div
      style={{
        background: "rgba(15,23,42,0.78)",
        border: "1px solid rgba(148,163,184,0.14)",
        borderRadius: 20,
        padding: 18,
        boxShadow: "0 10px 30px rgba(0,0,0,0.25)",
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
          <div style={{ color: "#e2e8f0", fontWeight: 800, fontSize: 16 }}>
            {title}
          </div>
          {subtitle ? (
            <div style={{ color: "#94a3b8", fontSize: 12, marginTop: 4 }}>
              {subtitle}
            </div>
          ) : null}
        </div>
        {right}
      </div>
      {children}
    </div>
  );
}

function MainButton({ label, onClick, tone = "neutral" }) {
  const bg =
    tone === "green"
      ? "linear-gradient(135deg, #22c55e, #16a34a)"
      : tone === "yellow"
      ? "linear-gradient(135deg, #f59e0b, #d97706)"
      : tone === "red"
      ? "linear-gradient(135deg, #fb7185, #ef4444)"
      : tone === "blue"
      ? "linear-gradient(135deg, #38bdf8, #2563eb)"
      : "linear-gradient(135deg, #334155, #1e293b)";

  const shadow =
    tone === "green"
      ? "0 0 20px rgba(34,197,94,0.25)"
      : tone === "yellow"
      ? "0 0 20px rgba(245,158,11,0.25)"
      : tone === "red"
      ? "0 0 20px rgba(239,68,68,0.25)"
      : tone === "blue"
      ? "0 0 20px rgba(56,189,248,0.25)"
      : "none";

  return (
    <button
      onClick={onClick}
      style={{
        width: "100%",
        border: "none",
        borderRadius: 14,
        padding: "14px 16px",
        background: bg,
        color: "#fff",
        fontWeight: 800,
        fontSize: 15,
        cursor: "pointer",
        boxShadow: shadow,
      }}
    >
      {label}
    </button>
  );
}

function MinorButton({ label, onClick, tone = "neutral" }) {
  const color =
    tone === "green"
      ? "#22c55e"
      : tone === "yellow"
      ? "#f59e0b"
      : tone === "red"
      ? "#ef4444"
      : "#64748b";

  return (
    <button
      onClick={onClick}
      style={{
        borderRadius: 12,
        padding: "8px 12px",
        cursor: "pointer",
        background: "rgba(15,23,42,0.9)",
        color: "#e2e8f0",
        border: `1px solid ${color}55`,
        fontWeight: 700,
      }}
    >
      {label}
    </button>
  );
}

function numberOrDash(v, digits = 2) {
  if (v === undefined || v === null || Number.isNaN(Number(v))) return "-";
  return Number(v).toFixed(digits);
}

function percentOrDash(v, digits = 2) {
  if (v === undefined || v === null || Number.isNaN(Number(v))) return "-";
  return `${Number(v).toFixed(digits)}%`;
}

function getRiskColor(distancePct) {
  if (distancePct === null) return "blue";
  if (distancePct > 5) return "green";
  if (distancePct > 2) return "yellow";
  return "red";
}

function getRiskText(distancePct) {
  if (distancePct === null) return "未知";
  if (distancePct > 5) return "安全";
  if (distancePct > 2) return "警戒";
  return "危險";
}

export default function App() {
  const [health, setHealth] = useState(null);
  const [scanner, setScanner] = useState([]);
  const [watchlist, setWatchlist] = useState([]);
  const [positions, setPositions] = useState([]);
  const [monitorStatus, setMonitorStatus] = useState(null);
  const [banner, setBanner] = useState("");

  const fetchJson = async (url, options) => {
    const res = await fetch(url, options);
    if (!res.ok) {
      throw new Error(`${url} failed: ${res.status}`);
    }
    return res.json();
  };

  const loadHealth = async () => {
    try {
      const data = await fetchJson(`${API_BASE}/api/health`);
      setHealth(data);
    } catch (e) {
      console.error(e);
      setHealth(null);
    }
  };

  const loadScanner = async () => {
    try {
      const data = await fetchJson(`${API_BASE}/api/scanner`);
      setScanner(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error(e);
      setScanner([]);
    }
  };

  const loadWatchlist = async () => {
    try {
      const data = await fetchJson(`${API_BASE}/api/watchlist`);
      setWatchlist(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error(e);
      setWatchlist([]);
    }
  };

  const loadPositions = async () => {
    try {
      const data = await fetchJson(`${API_BASE}/api/positions`);
      setPositions(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error(e);
      setPositions([]);
    }
  };

  const loadMonitorStatus = async () => {
    try {
      const data = await fetchJson(`${API_BASE}/api/monitor/status`);
      setMonitorStatus(data);
    } catch (e) {
      console.error(e);
      setMonitorStatus(null);
    }
  };

  const refreshAll = async () => {
    await Promise.all([
      loadHealth(),
      loadScanner(),
      loadWatchlist(),
      loadPositions(),
      loadMonitorStatus(),
    ]);
  };

  useEffect(() => {
    refreshAll();
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      loadPositions();
      loadMonitorStatus();
      loadScanner();
      loadWatchlist();
      loadHealth();
    }, 4000);

    return () => clearInterval(timer);
  }, []);

  const startMonitor = async () => {
    try {
      const data = await fetchJson(`${API_BASE}/api/monitor/start`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      setBanner(`監控已啟動｜interval=${data.intervalMs ?? "-"}ms`);
      await refreshAll();
    } catch (e) {
      console.error(e);
      setBanner("監控啟動失敗");
    }
  };

  const stopMonitor = async () => {
    try {
      await fetchJson(`${API_BASE}/api/monitor/stop`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      setBanner("監控已停止");
      await refreshAll();
    } catch (e) {
      console.error(e);
      setBanner("監控停止失敗");
    }
  };

  const emergencyStop = async () => {
    const ok = window.confirm("確認執行緊急停止？這將停止監控。");
    if (!ok) return;
    await stopMonitor();
    setBanner("🚨 緊急停止已執行");
  };

  const addWatchlist = async (symbol) => {
    try {
      await fetchJson(`${API_BASE}/api/watchlist`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ symbol }),
      });
      setBanner(`已加入觀察：${symbol}`);
      await loadWatchlist();
    } catch (e) {
      console.error(e);
      setBanner(`加入觀察失敗：${symbol}`);
    }
  };

  const removeWatchlist = async (symbol) => {
    try {
      await fetchJson(`${API_BASE}/api/watchlist/${symbol}`, {
        method: "DELETE",
      });
      setBanner(`已移除觀察：${symbol}`);
      await loadWatchlist();
    } catch (e) {
      console.error(e);
      setBanner(`移除觀察失敗：${symbol}`);
    }
  };

  const openPosition = async (item) => {
    try {
      const entryPriceText = window.prompt(`輸入 ${item.symbol} 進場價格`, "100");
      if (!entryPriceText) return;

      const quantityText = window.prompt(`輸入 ${item.symbol} 股數`, "1");
      if (!quantityText) return;

      const trailingText = window.prompt(`輸入 ${item.symbol} trailing 百分比（例 0.1 = 10%）`, "0.1");
      if (!trailingText) return;

      const entryPrice = Number(entryPriceText);
      const quantity = Number(quantityText);
      const trailingPercent = Number(trailingText);

      if (
        Number.isNaN(entryPrice) ||
        Number.isNaN(quantity) ||
        Number.isNaN(trailingPercent)
      ) {
        alert("輸入格式錯誤");
        return;
      }
      await fetchJson(`${API_BASE}/api/positions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          symbol: item.symbol,
          name: item.name || item.symbol,
          entryPrice,
          quantity,
          currentPrice: entryPrice,
          trailingPercent,
        }),
      });

      setBanner(`已建立持倉：${item.symbol}`);
      await loadPositions();
      await loadMonitorStatus();
    } catch (e) {
      console.error(e);
      setBanner(`建立持倉失敗：${item.symbol}`);
    }
  };

  const updatePositionPrice = async (symbol) => {
    try {
      const text = window.prompt(`輸入 ${symbol} 新價格`, "100");
      if (!text) return;

      const price = Number(text);
      if (Number.isNaN(price)) {
        alert("價格格式錯誤");
        return;
      }

      await fetchJson(`${API_BASE}/api/positions/${symbol}/price`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ price }),
      });

      setBanner(`已更新價格：${symbol}`);
      await loadPositions();
    } catch (e) {
      console.error(e);
      setBanner(`更新價格失敗：${symbol}`);
    }
  };

  const updatePositionStopLoss = async (symbol) => {
    try {
      const text = window.prompt(`輸入 ${symbol} 新停損`, "90");
      if (!text) return;

      const stopLoss = Number(text);
      if (Number.isNaN(stopLoss)) {
        alert("停損格式錯誤");
        return;
      }

      await fetchJson(`${API_BASE}/api/positions/${symbol}/stoploss`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stopLoss }),
      });

      setBanner(`已更新停損：${symbol}`);
      await loadPositions();
    } catch (e) {
      console.error(e);
      setBanner(`更新停損失敗：${symbol}`);
    }
  };

  const closePosition = async (symbol) => {
    try {
      const ok = window.confirm(`確認手動平倉 ${symbol}？`);
      if (!ok) return;

      await fetchJson(`${API_BASE}/api/positions/${symbol}`, {
        method: "DELETE",
      });

      setBanner(`已平倉：${symbol}`);
      await loadPositions();
      await loadMonitorStatus();
    } catch (e) {
      console.error(e);
      setBanner(`平倉失敗：${symbol}`);
    }
  };

  const openPositions = positions.filter((p) => p.status === "OPEN");
  const closedPositions = positions.filter((p) => p.status === "CLOSED");

  const totalPnl = positions.reduce((sum, p) => sum + (Number(p.pnl) || 0), 0);

  const monitorStarted = !!monitorStatus?.started;
  const monitorRunning = !!monitorStatus?.intervalRunning;
  const logs = monitorStatus?.recentLogs || [];

  const lights = useMemo(() => {
    return [
      {
        title: "前端",
        color: "green",
        line1: "控制台在線",
        line2: "UI已接線",
      },
      {
        title: "後端",
        color: health?.status === "ok" ? "green" : "red",
        line1: health?.status === "ok" ? "健康正常" : "健康失敗",
        line2: health?.apiKeyLoaded ? "apiKeyLoaded: true" : "apiKeyLoaded: -",
      },
      {
        title: "掃描器 API",
        color: Array.isArray(scanner) ? "green" : "red",
        line1: `${scanner.length} 檔`,
        line2: "掃描資料可讀",
      },
      {
        title: "監視清單 API",
        color: Array.isArray(watchlist) ? "green" : "red",
        line1: `${watchlist.length} 檔`,
        line2: "觀察資料可讀",
      },
      {
        title: "位置 API",
        color: Array.isArray(positions) ? "green" : "red",
        line1: `${positions.length} 筆`,
        line2: "持倉資料可讀",
      },
      {
        title: "監控引擎",
        color: !monitorStatus ? "red" : monitorStarted ? "green" : "yellow",
        line1: monitorStarted ? "運行中" : "停止中",
        line2: monitorRunning ? "intervalRunning: 是" : "狀態待命",
      },
    ];
  }, [health, scanner, watchlist, positions, monitorStatus, monitorStarted, monitorRunning]);

  return (
    <div
      style={{
        minHeight: "100vh",
        background:
          "radial-gradient(circle at top, rgba(59,130,246,0.14), transparent 20%), linear-gradient(180deg, #020617 0%, #0f172a 100%)",
        color: "#e2e8f0",
        padding: 20,
        fontFamily:
          "Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      }}
    >
      <div style={{ maxWidth: 1500, margin: "0 auto" }}>
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 38, fontWeight: 900, color: "#f8fafc" }}>
            舵手儀錶板 v2.1
          </div>
          <div style={{ marginTop: 8, color: "#94a3b8", fontSize: 14 }}>
            艦橋控制台｜燈號 + 操作按鍵｜資料對齊模式
          </div>
        </div>

        {banner ? (
          <div
            style={{
              marginBottom: 16,
              padding: "12px 14px",
              borderRadius: 14,
              background: "rgba(15,23,42,0.9)",
              border: "1px solid rgba(56,189,248,0.25)",
              color: "#dbeafe",
            }}
          >
            {banner}
          </div>
        ) : null}

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(6, minmax(0, 1fr))",
            gap: 12,
            marginBottom: 18,
          }}
        >
          {lights.map((l) => (
            <LightCard
              key={l.title}
              title={l.title}
              color={l.color}
              line1={l.line1}
              line2={l.line2}
            />
          ))}
        </div>

        <Panel
          title="主控層｜指令核心"
          subtitle="高風險操作集中，不與特定重點混放"
          right={<span style={{ color: "#94a3b8", fontSize: 12 }}>艦橋模式</span>}
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr 1fr 1fr",
              gap: 14,
              marginBottom: 16,
            }}
          >
            <MainButton label="▶ 啟動監控器" onClick={startMonitor} tone="green" />
            <MainButton label="■ 停止監控" onClick={stopMonitor} tone="yellow" />
            <MainButton label="! 緊急警告" onClick={emergencyStop} tone="red" />
            <MainButton label="↻ 全域刷新" onClick={refreshAll} tone="blue" />
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr 1fr 1fr",
              gap: 14,
            }}
          >
            <div
              style={{
                background: "rgba(255,255,255,0.03)",
                borderRadius: 16,
                padding: 16,
                border: "1px solid rgba(148,163,184,0.10)",
              }}
            >
              <div style={{ color: "#94a3b8", fontSize: 12 }}>監控狀態</div>
              <div
                style={{
                  marginTop: 10,
                  fontSize: 34,
                  fontWeight: 900,
                  color: monitorStarted ? "#22c55e" : "#f59e0b",
                }}
              >
                {monitorStarted ? "運行" : "停止"}
              </div>
            </div>

            <div
              style={{
                background: "rgba(255,255,255,0.03)",
                borderRadius: 16,
                padding: 16,
                border: "1px solid rgba(148,163,184,0.10)",
              }}
            >
              <div style={{ color: "#94a3b8", fontSize: 12 }}>招募倉位</div>
              <div style={{ marginTop: 10, fontSize: 34, fontWeight: 900 }}>{openPositions.length}</div>
            </div>

            <div
              style={{
                background: "rgba(255,255,255,0.03)",
                borderRadius: 16,
                padding: 16,
                border: "1px solid rgba(148,163,184,0.10)",
              }}
            >
              <div style={{ color: "#94a3b8", fontSize: 12 }}>已平倉位</div>
              <div style={{ marginTop: 10, fontSize: 34, fontWeight: 900 }}>{closedPositions.length}</div>
            </div>

            <div
              style={{
                background: "rgba(255,255,255,0.03)",
                borderRadius: 16,
                padding: 16,
                border: "1px solid rgba(148,163,184,0.10)",
              }}
            >
              <div style={{ color: "#94a3b8", fontSize: 12 }}>總損益</div>
              <div
                style={{
                  marginTop: 10,
                  fontSize: 34,
                  fontWeight: 900,
                  color: totalPnl >= 0 ? "#22c55e" : "#ef4444",
                }}
              >
                {Number(totalPnl.toFixed(2))}
              </div>
            </div>
          </div>
        </Panel>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "2fr 1fr",
            gap: 18,
            marginTop: 18,
          }}
        >
          <Panel
            title="區域層｜掃描板"
            subtitle="市場掃描 / 勝率 / 電動車EV / 戰號"
            right={<MinorButton label="重新整理掃描儀" onClick={loadScanner} />}
          >
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr>
                    {["股票", "勝率", "電動車 / EV", "動作", "觀察加入", "進場"].map((h) => (
                      <th
                        key={h}
                        style={{
                          textAlign: "left",
                          color: "#94a3b8",
                          fontSize: 13,
                          padding: "10px 8px",
                          borderBottom: "1px solid rgba(148,163,184,0.10)",
                        }}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {scanner.map((s, i) => (
                    <tr key={`${s.symbol}_${i}`}>
                      <td style={{ padding: "14px 8px", borderBottom: "1px solid rgba(148,163,184,0.06)" }}>
                        {s.symbol}
                      </td>
                      <td style={{ padding: "14px 8px", borderBottom: "1px solid rgba(148,163,184,0.06)" }}>
                        {percentOrDash(s.winRate, 1)}
                      </td>
                      <td style={{ padding: "14px 8px", borderBottom: "1px solid rgba(148,163,184,0.06)" }}>
                        {numberOrDash(s.ev, 2)}
                      </td>
                      <td style={{ padding: "14px 8px", borderBottom: "1px solid rgba(148,163,184,0.06)" }}>
                        {s.action || "-"}
                      </td>
                      <td style={{ padding: "14px 8px", borderBottom: "1px solid rgba(148,163,184,0.06)" }}>
                        <MinorButton label="加入" onClick={() => addWatchlist(s.symbol)} />
                      </td>
                      <td style={{ padding: "14px 8px", borderBottom: "1px solid rgba(148,163,184,0.06)" }}>
                        <MinorButton label="上戰場" onClick={() => openPosition(s)} tone="green" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>

          <div style={{ display: "grid", gap: 18 }}>
            <Panel
              title="工具層｜監控狀態"
              subtitle="具核心數據的監視器狀態"
            >
              <div style={{ display: "grid", gap: 12, fontSize: 14 }}>
                <div>已開始： <b style={{ color: monitorStarted ? "#22c55e" : "#f59e0b" }}>{monitorStarted ? "是" : "否"}</b></div>
                <div>intervalRunning： <b>{monitorRunning ? "是" : "否"}</b></div>
                <div>模式： <b>{monitorStatus?.mode || "-"}</b></div>
                <div>intervalMs： <b>{monitorStatus?.intervalMs ?? "-"}</b></div>
                <div>尾隨百分比： <b>{monitorStatus?.trailingPercent ?? "-"}</b></div>
                <div>openPositionCount： <b>{monitorStatus?.openPositionCount ?? openPositions.length}</b></div>
              </div>
            </Panel>

            <Panel
              title="工具層｜觀察列表"
              subtitle="可更換控制台，不動核心引擎"
            >
              {watchlist.length === 0 ? (
                <div style={{ color: "#94a3b8" }}>目前沒有觀察標的</div>
              ) : (
                <div style={{ display: "grid", gap: 10 }}>
                  {watchlist.map((w) => (
                    <div
                      key={w}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        padding: 12,
                        borderRadius: 14,
                        background: "rgba(255,255,255,0.03)",
                        border: "1px solid rgba(148,163,184,0.08)",
                      }}
                    >
                      <span style={{ fontWeight: 700 }}>{w}</span>
                      <MinorButton label="移除" onClick={() => removeWatchlist(w)} tone="red" />
                    </div>
                  ))}
                </div>
              )}
            </Panel>
          </div>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "2fr 1fr",
            gap: 18,
            marginTop: 18,
          }}
        >
          <Panel
            title="戰術層｜立場板"
            subtitle="追蹤持倉資訊與風控狀態"
          >
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr>
                    {[
                      "股票",
                      "狀態",
                      "進場",
                      "現價",
                      "最高價",
                      "拖停",
                      "距離停損%",
                      "風險",
                      "價格",
                      "拖停",
                      "平倉",
                    ].map((h) => (
                      <th
                        key={h}
                        style={{
                          textAlign: "left",
                          color: "#94a3b8",
                          fontSize: 13,
                          padding: "10px 8px",
                          borderBottom: "1px solid rgba(148,163,184,0.10)",
                        }}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {positions.map((p, i) => {
                    const distancePct =
                      p.currentPrice !== undefined &&
                      p.stopLoss !== undefined &&
                      Number(p.stopLoss) !== 0
                        ? ((Number(p.currentPrice) - Number(p.stopLoss)) / Number(p.stopLoss)) * 100
                        : null;

                    const riskColor = getRiskColor(distancePct);
                    const riskText = getRiskText(distancePct);
                    const riskDot = toneColor(riskColor);

                    return (
                      <tr key={`${p.symbol}_${i}`}>
                        <td style={{ padding: "14px 8px", borderBottom: "1px solid rgba(148,163,184,0.06)" }}>
                          {p.symbol}
                        </td>
                        <td style={{ padding: "14px 8px", borderBottom: "1px solid rgba(148,163,184,0.06)" }}>
                          <span
                            style={{
                              color: p.status === "OPEN" ? "#22c55e" : "#f59e0b",
                              fontWeight: 800,
                            }}
                          >
                            {p.status}
                          </span>
                        </td>
                        <td style={{ padding: "14px 8px", borderBottom: "1px solid rgba(148,163,184,0.06)" }}>
                          {numberOrDash(p.entryPrice)}
                        </td>
                        <td style={{ padding: "14px 8px", borderBottom: "1px solid rgba(148,163,184,0.06)" }}>
                          {numberOrDash(p.currentPrice)}
                        </td>
                        <td style={{ padding: "14px 8px", borderBottom: "1px solid rgba(148,163,184,0.06)" }}>
                          {numberOrDash(p.highestPrice)}
                        </td>
                        <td style={{ padding: "14px 8px", borderBottom: "1px solid rgba(148,163,184,0.06)" }}>
                          {numberOrDash(p.stopLoss)}
                        </td>
                        <td style={{ padding: "14px 8px", borderBottom: "1px solid rgba(148,163,184,0.06)" }}>
                          {distancePct === null ? "-" : `${distancePct.toFixed(2)}%`}
                        </td>
                        <td style={{ padding: "14px 8px", borderBottom: "1px solid rgba(148,163,184,0.06)" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <span
                              style={{
                                width: 12,
                                height: 12,
                                borderRadius: "50%",
                                background: riskDot,
                                boxShadow: `0 0 10px ${riskDot}`,
                                display: "inline-block",
                              }}
                            />
                            <span>{riskText}</span>
                          </div>
                        </td>
                        <td style={{ padding: "14px 8px", borderBottom: "1px solid rgba(148,163,184,0.06)" }}>
                          {p.status === "OPEN" ? (
                            <MinorButton label="更新價格" onClick={() => updatePositionPrice(p.symbol)} />
                          ) : (
                            "-"
                          )}
                        </td>
                        <td style={{ padding: "14px 8px", borderBottom: "1px solid rgba(148,163,184,0.06)" }}>
                          {p.status === "OPEN" ? (
                            <MinorButton label="更新拖停" onClick={() => updatePositionStopLoss(p.symbol)} tone="yellow" />
                          ) : (
                            "-"
                          )}
                        </td>
                        <td style={{ padding: "14px 8px", borderBottom: "1px solid rgba(148,163,184,0.06)" }}>
                          {p.status === "OPEN" ? (
                            <MinorButton label="平倉" onClick={() => closePosition(p.symbol)} tone="red" />
                          ) : (
                            <span style={{ color: "#94a3b8", fontSize: 12 }}>
                              {p.closedReason || "-"}
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Panel>

          <Panel
            title="工具層｜近期日誌"
            subtitle="系統最近行為"
          >
            {logs.length === 0 ? (
              <div style={{ color: "#94a3b8" }}>目前沒有最新事件</div>
            ) : (
              <div style={{ display: "grid", gap: 12 }}>
                {logs
                  .slice()
                  .reverse()
                  .map((log, idx) => {
                    const type = log.type || "INFO";
                    const color =
                      type === "TRAILING_STOP_TRIGGERED"
                        ? "red"
                        : type === "TRAILING_UPDATE"
                        ? "green"
                        : "blue";
                    const c = toneColor(color);

                    return (
                      <div
                        key={`${log.time}_${idx}`}
                        style={{
                          borderRadius: 14,
                          padding: 12,
                          background: "rgba(255,255,255,0.03)",
                          border: `1px solid ${c}33`,
                        }}
                      >
                        <div style={{ fontSize: 12, color: "#94a3b8" }}>{log.time}</div>
                        <div style={{ marginTop: 6, fontWeight: 800, color: c }}>
                          {log.symbol} ｜ {type}
                        </div>
                        <div style={{ marginTop: 6, color: "#e2e8f0", fontSize: 13 }}>
                          {log.message}
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}
          </Panel>
        </div>
      </div>
    </div>
  );
}

