export type TailWindowResult = {
  canConfirmEntry: boolean;
  timeLabel: string;
  reason: string;
};

export function analyzeTailWindow(): TailWindowResult {
  const now = new Date();

  const hours = now.getHours();
  const minutes = now.getMinutes();

  const current = hours * 100 + minutes;

  // 台股尾盤 13:26 ~ 13:30
  const isTailWindow = current >= 1326 && current <= 1330;

  if (isTailWindow) {
    return {
      canConfirmEntry: true,
      timeLabel: "13:26-13:30",
      reason: "尾盤確認區間",
    };
  }

  return {
    canConfirmEntry: false,
    timeLabel: "13:26-13:30",
    reason: "尚未進入尾盤確認時間",
  };
}
