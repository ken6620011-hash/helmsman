import { createBackup } from "../server/backupEngine"

const snapshot = {
  date: new Date(),
  message: "Helmsman manual backup"
}

const file = createBackup(snapshot)

console.log("Backup created:", file)
