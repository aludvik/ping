import assert from "assert"
import express from 'express'
import fs from 'fs'

const public_port = 8080
const state_path = "./state.json"

const app = express()
app.use(express.json())

function loadState() {
  return JSON.parse(fs.readFileSync(state_path))
}

let state = loadState()

function findMatch(state, alarm) {
  return state.findIndex(a => a["h"] == alarm["h"] && a["m"] == alarm["m"])
}

function compare(a, b) {
  if (a["h"] < b["h"]) return -1
  if (a["h"] > b["h"]) return 1
  if (a["m"] < b["m"]) return -1
  if (a["m"] > b["m"]) return 1
  return 0
}

function assertIsTime(obj) {
  assert(obj.hasOwnProperty("h") && obj.hasOwnProperty("m"))
}

app.get("/list", (req, res) => {
  res.json(state)
})

// Is there an alarm at this time?
app.post("/now", (req, res) => {
  const time = req.body
  assertIsTime(time)
  for (let i = 0; i < state.length; i++) {
    const alarm = state[i]
    if (compare(alarm, time) == 0) {
      res.json(true)
      return
    }
  }
  res.json(false)
})

function backupState(state) {
  fs.writeFile(state_path, JSON.stringify(state), {flag: "w+"}, (err) => {
    if (err) throw err
  })
}

app.post("/add", (req, res) => {
  const alarm = req.body
  if (findMatch(state, alarm) !== -1) {
    return
  }
  state.push(alarm)
  state.sort(compare)
  backupState(state)
  res.json(state)
})

app.post("/delete", (req, res) => {
  const alarm = req.body
  const index = findMatch(state, alarm)
  if (index !== -1) {
    state.splice(index, 1)
  }
  backupState(state)
  res.json(state)
})

app.listen(public_port, () =>
  console.log(`listening at http://localhost:${public_port}`))

