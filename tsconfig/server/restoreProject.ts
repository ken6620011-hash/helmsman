import { restoreBackup } from "../server/backupEngine"

const file = process.argv[2]

if (!file) {
  console.log("Usage: npm run restore <file>")
  process.exit()
}

const data = restoreBackup(file)

console.log("Restored backup:")
console.log(data)
