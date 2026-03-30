import React, { useEffect, useState } from "react";

const API = "http://localhost:3000";

export default function App() {
  const [alerts, setAlerts] = useState([]);
  const [positions, setPositions] = useState([]);
  const [status, setStatus] = useState({
    running: false,
    openPositionCount: 0,
  });

  useEffect(() => {
    fetchAll();
    const t = setInterval(fetchAll, 3000);
    return () => clearInterval(t);
  }, []);

  async function fetchAll() {
    try {
      const [a, p, s] = await Promise.all([
        fetch(`${API}/api/alerts`).then((r) => r.json()),
        fetch(`${API}/api/positions`).then((r) => r.json()),
        fetch(`${API}/api/monitor/status`).then((r) => r.json()),
      ]);

      setAlerts(a || []);
      setPositions(p || []);
      setStatus(s || {});
    } catch (e) {
      console.log("fetch error", e);
    }
  }

  function levelColor(level) {
    if (level === "CRITICAL") return "#ff3b30";
    if (level === "WARN") return "#ffcc00";
    return "#34c759";
  }

  function levelGlow(level) {
    if (level === "CRITICAL") return "0 0 12px #ff3b30";
    if (level === "WARN") return "0 0 8px #ffcc00";
    return "0 0 6px #34c759";
  }

  function latestAlerts() {
    return alerts.slice(0, 5);
  }

  return (
    <div style={styles.container}>
      <h1 style={styles.title}>Helmsman AI Terminal</h1>

      {/* ===== 系統狀態 ===== */}
      <div style={styles.statusBar}>
        <div>🟢 Monitor: {status.running ? "RUNNING" : "STOPPED"}</div>
        <div>📦 Positions: {status.openPositionCount || 0}</div>
      </div>
      {/* ===== 🚨 Alert Panel v2 ===== */}
      <div style={styles.alertPanel}>
        <div style={styles.alertHeader}>
          🚨 Alert Center
        </div>

        <div style={styles.alertList}>
          {latestAlerts().map((a, i) => (
            <div
              key={i}
              style={{
                ...styles.alertItem,
                borderLeft: `6px solid ${levelColor(a.level)}`,
                boxShadow: levelGlow(a.level),
              }}
            >
              <div style={styles.alertTop}>
                <span style={styles.symbol}>{a.symbol}</span>
                <span
                  style={{
                    ...styles.level,
                    color: levelColor(a.level),
                  }}
                >
                  {a.level}
                </span>
              </div>

              <div style={styles.type}>{a.type}</div>

              <div style={styles.message}>{a.message}</div>

              <div style={styles.time}>
                {new Date(a.time).toLocaleTimeString()}
              </div>
            </div>
          ))}

          {latestAlerts().length === 0 && (
            <div style={styles.noAlert}>No Alerts</div>
          )}
        </div>
      </div>

      {/* ===== 持倉區 ===== */}
      <div style={styles.positionPanel}>
        <div style={styles.panelTitle}>📊 Positions</div>

        {positions.map((p, i) => (
          <div key={i} style={styles.positionRow}>
            <div>{p.symbol}</div>
            <div>{p.entryPrice}</div>
            <div>{p.currentPrice}</div>
            <div>{p.stopLoss}</div>
            <div style={{ color: "#34c759" }}>{p.status}</div>
          </div>
        ))}

        {positions.length === 0 && (
          <div style={styles.noAlert}>No Positions</div>
        )}
      </div>
    </div>
  );
}

/* ===== Styles（產品級 UI）===== */
const styles = {
  container: {
    background: "#0c0f14",
    color: "#fff",
    minHeight: "100vh",
    padding: "20px",
    fontFamily: "system-ui",
  },

  title: {
    fontSize: "26px",
    fontWeight: "600",
    marginBottom: "20px",
  },

  statusBar: {
    display: "flex",
    gap: "30px",
    marginBottom: "20px",
    opacity: 0.8,
  },

  /* ===== Alert Panel ===== */
  alertPanel: {
    background: "#151a22",
    borderRadius: "12px",
    padding: "16px",
    marginBottom: "20px",
  },

  alertHeader: {
    fontSize: "18px",
    marginBottom: "12px",
    fontWeight: "600",
  },

  alertList: {
    display: "flex",
    flexDirection: "column",
    gap: "10px",
  },

  alertItem: {
    background: "#0f141b",
    borderRadius: "10px",
    padding: "12px",
    transition: "all 0.2s ease",
  },

  alertTop: {
    display: "flex",
    justifyContent: "space-between",
    marginBottom: "6px",
  },

  symbol: {
    fontWeight: "600",
    fontSize: "14px",
  },

  level: {
    fontWeight: "700",
    fontSize: "12px",
  },

  type: {
    fontSize: "12px",
    opacity: 0.7,
    marginBottom: "4px",
  },

  message: {
    fontSize: "13px",
    marginBottom: "6px",
  },

  time: {
    fontSize: "11px",
    opacity: 0.5,
  },

  noAlert: {
    textAlign: "center",
    opacity: 0.4,
    padding: "10px",
  },

  /* ===== Position Panel ===== */
  positionPanel: {
    background: "#151a22",
    borderRadius: "12px",
    padding: "16px",
  },

  panelTitle: {
    fontSize: "18px",
    marginBottom: "12px",
    fontWeight: "600",
  },

  positionRow: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr 1fr 1fr 1fr",
    padding: "8px 0",
    borderBottom: "1px solid #222",
    fontSize: "13px",
  },
};
