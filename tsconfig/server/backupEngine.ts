import fs from "fs"
import path from "path"

const BACKUP_DIR = "./backup"

export function createBackup(data: any) {

  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR)
  }

  const fileName =
    "backup-" + new Date().toISOString().replace(/:/g, "-") + ".json"

  const filePath = path.join(BACKUP_DIR, fileName)

  fs.writeFileSync(filePath, JSON.stringify(data, null, 2))

  return fileName
}

export function restoreBackup(file: string) {

  const filePath = path.join(BACKUP_DIR, file)

  if (!fs.existsSync(filePath)) {
    throw new Error("Backup not found")
  }

  const raw = fs.readFileSync(filePath)

  return JSON.parse(raw.toString())
}
