import fs from "fs";
import path from "path";

const DATA_DIR = path.join(__dirname, "../data");
const FILE_PATH = path.join(DATA_DIR, "positions.json");

function ensureDataFile() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  if (!fs.existsSync(FILE_PATH)) {
    fs.writeFileSync(FILE_PATH, JSON.stringify([]));
  }
}

function readData() {
  ensureDataFile();
  const raw = fs.readFileSync(FILE_PATH, "utf-8");
  return JSON.parse(raw || "[]");
}
function writeData(data: any[]) {
  ensureDataFile();
  fs.writeFileSync(FILE_PATH, JSON.stringify(data, null, 2));
}

function generateId() {
  return (
    Date.now().toString(36) +
    Math.random().toString(36).substring(2, 8)
  );
}
function writeData(data: any[]) {
  ensureDataFile();
  fs.writeFileSync(FILE_PATH, JSON.stringify(data, null, 2));
}

export function saveAllPositions(positions: any[]) {
  writeData(positions);
}

export function loadAllPositions(): any[] {
  return readData();
}
export function appendPosition(position: any) {
  const data = readData();
  data.push(position);
  writeData(data);
}

export function updatePosition(symbol: string, updated: any) {
  const data = readData();
  const index = data.findIndex((p: any) => p.symbol === symbol);
  if (index !== -1) {
    data[index] = { ...data[index], ...updated };
    writeData(data);
  }
}
export function deletePosition(symbol: string) {
  const data = readData();
  const newData = data.filter((p: any) => p.symbol !== symbol);
  writeData(newData);
}

export default {
  saveAllPositions,
  loadAllPositions,
  appendPosition,
  updatePosition,
  deletePosition,
};

