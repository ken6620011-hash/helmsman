import React, { useEffect, useState, useRef } from "react";
import "./App.css";

function App() {
  const [positions, setPositions] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [running, setRunning] = useState(false);

  // 🔊 聲音控制（避免重複觸發）
  const lastAlertRef = useRef(null);

  // ======================
  // Fetch
  // ======================

  const fetchAll = async () => {
    const [pRes, aRes] = await Promise.all([
      fetch("http://localhost:3000/api/positions"),
      fetch("http://localhost:3000/api/alerts"),
    ]);

    const p = await pRes.json();
    const a = await aRes.json();

    setPositions(p);
    setAlerts(a);

    handleAlertSound(a);
  };

  // ======================
  // 🔔 聲音 + AI觸發
  // ======================

  const handleAlertSound = (alerts) => {
    if (!alerts.length) return;

    const latest = alerts[0];

    // 避免重複播放
    if (lastAlertRef.current === latest.time) return;
    lastAlertRef.current = latest.time;

    if (latest.level === "CRITICAL") {
      playSound();
    }
  };

  const playSound = () => {
    const audio = new Audio(
      "https://actions.google.com/sounds/v1/alarms/alarm_clock.ogg"
    );
    audio.play();
  };

  // ======================
  // AI 解釋
  // ======================

  const explainAlert = (a) => {
    if (a.type === "TRAILING_STOP_HIT") {
      return "📉 主力撤退 / 跌破結構 → 風控強制出場";
    }
    if (a.type === "RISK_WARNING") {
      return "⚠️ 接近停損 → 籌碼開始鬆動";
    }
    if (a.type === "BREAKOUT") {
      return "🚀 突破前高 → 可能主升段啟動";
    }
    return "市場波動";
  };

  // ======================
  // Monitor
  // ======================

  const startMonitor = async () => {
    await fetch("http://localhost:3000/api/monitor/start", {
      method: "POST",
    });
    setRunning(true);
  };

  const stopMonitor = async () => {
    await fetch("http://localhost:3000/api/monitor/stop", {
      method: "POST",
    });
    setRunning(false);
  };

  useEffect(() => {
    fetchAll();
    const t = setInterval(fetchAll, 2000);
    return () => clearInterval(t);
  }, []);
  return (
    <div className="app">
      <h1>🚀 Helmsman AI Terminal</h1>

      {/* ===== 系統狀態 ===== */}
      <div className="status-bar">
        <span>
          狀態：
          <b style={{ color: running ? "#4caf50" : "#aaa" }}>
            {running ? "運行中" : "已停止"}
          </b>
        </span>

        <span>持倉數：{positions.length}</span>
      </div>

      {/* ===== 控制區 ===== */}
      <div className="control-panel">
        <button onClick={startMonitor} className="btn start">
          ▶ 啟動監控
        </button>

        <button onClick={stopMonitor} className="btn stop">
          ■ 停止監控
        </button>
      </div>

      {/* ===== 持倉 ===== */}
      <div className="card">
        <h2>📊 Positions</h2>

        <table>
          <thead>
            <tr>
              <th>Symbol</th>
              <th>Entry</th>
              <th>Current</th>
              <th>StopLoss</th>
              <th>Status</th>
            </tr>
          </thead>

          <tbody>
            {positions.map((p, i) => (
              <tr key={i}>
                <td>{p.symbol}</td>
                <td>{p.entryPrice.toFixed(2)}</td>
                <td>{p.currentPrice.toFixed(2)}</td>
                <td>{p.stopLoss.toFixed(2)}</td>
                <td
                  style={{
                    color: p.status === "OPEN" ? "#4caf50" : "#ff3b30",
                  }}
                >
                  {p.status}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {/* ===== 🚨 Alert Panel（AI + 聲音）===== */}
      <div className="card">
        <h2>🚨 Alert Center</h2>

        <div className="alert-list">
          {alerts.length === 0 && (
            <div className="empty">No Alerts</div>
          )}

          {alerts.map((a, i) => (
            <div
              key={i}
              className="alert-item"
              style={{
                borderLeft:
                  a.level === "CRITICAL"
                    ? "6px solid #ff3b30"
                    : a.level === "WARN"
                    ? "6px solid #ffcc00"
                    : "6px solid #34c759",
                boxShadow:
                  a.level === "CRITICAL"
                    ? "0 0 12px #ff3b30"
                    : a.level === "WARN"
                    ? "0 0 8px #ffcc00"
                    : "0 0 6px #34c759",
              }}
            >
              {/* 上層 */}
              <div className="alert-top">
                <span className="symbol">{a.symbol}</span>

                <span
                  className="level"
                  style={{
                    color:
                      a.level === "CRITICAL"
                        ? "#ff3b30"
                        : a.level === "WARN"
                        ? "#ffcc00"
                        : "#34c759",
                  }}
                >
                  {a.level}
                </span>
              </div>

              {/* 類型 */}
              <div className="type">{a.type}</div>

              {/* 原始訊息 */}
              <div className="message">{a.message}</div>

              {/* 🤖 AI 解釋（核心升級） */}
              <div
                className="ai-explain"
                style={{
                  marginTop: "6px",
                  fontSize: "12px",
                  opacity: 0.8,
                  color: "#9ecbff",
                }}
              >
                {explainAlert(a)}
              </div>

              {/* 時間 */}
              <div className="time">{a.time}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default App;
