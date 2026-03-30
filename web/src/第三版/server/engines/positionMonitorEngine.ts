import {
  getOpenPositions,
  closePosition,
  Position,
} from "./positionEngine";

export interface MonitorEvent {
  time: string;
  symbol: string;
  currentPrice: number;
  stopLoss: number;
  action: string;
  message: string;
}

let monitorStarted = false;
let monitorTimer: NodeJS.Timeout | null = null;
let monitorLogs: MonitorEvent[] = [];

function nowText() {
  return new Date().toISOString();
}

function createLog(position: Position, action: string, message: string): MonitorEvent {
  return {
    time: nowText(),
    symbol: position.symbol,
    currentPrice: Number(position.currentPrice.toFixed(2)),
    stopLoss: Number(position.stopLoss.toFixed(2)),
    action,
    message,
  };
}

function scanPositions() {
  const openPositions = getOpenPositions();

  openPositions.forEach((position) => {
    if (position.currentPrice <= position.stopLoss) {
      closePosition(position.symbol, "AUTO_STOP_LOSS");

      const log = createLog(
        position,
        "AUTO_CLOSE",
        `${position.symbol} triggered stop loss: currentPrice ${position.currentPrice} <= stopLoss ${position.stopLoss}`
      );

      monitorLogs.unshift(log);
      console.log("🛑 STOP LOSS TRIGGERED:", log.message);
    }
  });

  if (monitorLogs.length > 100) {
    monitorLogs = monitorLogs.slice(0, 100);
  }
}

export function startPositionMonitor(intervalMs = 5000) {
  if (monitorStarted) {
    return {
      success: true,
      message: "position monitor already started",
      intervalMs,
    };
  }

  monitorStarted = true;
  monitorTimer = setInterval(scanPositions, intervalMs);

  console.log(`🛡️ Position Monitor started, interval=${intervalMs}ms`);

  return {
    success: true,
    message: "position monitor started",
    intervalMs,
  };
}

export function stopPositionMonitor() {
  if (monitorTimer) {
    clearInterval(monitorTimer);
    monitorTimer = null;
  }

  monitorStarted = false;

  console.log("🛡️ Position Monitor stopped");

  return {
    success: true,
    message: "position monitor stopped",
  };
}

export function getPositionMonitorStatus() {
  return {
    started: monitorStarted,
    intervalRunning: !!monitorTimer,
    openPositionCount: getOpenPositions().length,
    recentLogs: monitorLogs.slice(0, 20),
  };
}
