let runtimeFinmindToken: string = String(process.env.FINMIND_TOKEN || "").trim();

export function getFinmindToken(): string {
  return runtimeFinmindToken;
}

export function setFinmindToken(token: string): void {
  runtimeFinmindToken = String(token || "").trim();
}

export function hasFinmindToken(): boolean {
  return runtimeFinmindToken.length > 0;
}

export function clearFinmindToken(): void {
  runtimeFinmindToken = "";
}

export function getFinmindTokenMasked(): string {
  if (!runtimeFinmindToken) return "-";
  if (runtimeFinmindToken.length <= 12) return "************";
  return `${runtimeFinmindToken.slice(0, 6)}...${runtimeFinmindToken.slice(-6)}`;
}

export function getFinmindTokenStatus() {
  return {
    hasToken: hasFinmindToken(),
    maskedToken: getFinmindTokenMasked(),
  };
}
