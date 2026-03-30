import express from "express"

const app = express()

app.get("/api/health", (req, res) => {
  res.json({
    system: "Helmsman API",
    status: "running",
    version: "v1"
  })
})

const PORT = 4000

app.listen(PORT, () => {
  console.log(`Helmsman API running on ${PORT}`)
})
