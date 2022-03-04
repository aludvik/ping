import assert from "assert"
import express from 'express'
import fs from 'fs'

const public_port = 8080
const alarms_path = "./state.json"

const app = express()
app.use(express.json())

function loadAlarmsFromDisk() {
  return JSON.parse(fs.readFileSync(alarms_path))
}

let alarms = loadAlarmsFromDisk()

function findMatch(alarms, alarm) {
  return alarms.findIndex(a => a["t"] == alarm["t"])
}

function compare(a, b) {
  if (a["t"] < b["t"]) return -1
  if (a["t"] > b["t"]) return 1
  return 0
}

function assertIsTime(obj) {
  assert(obj.hasOwnProperty("t"))
}

app.get("/list", (req, res) => {
  res.json(alarms)
})

// Is there an alarm at this time?
app.post("/now", (req, res) => {
  const time = req.body
  assertIsTime(time)
  for (let i = 0; i < alarms.length; i++) {
    const alarm = alarms[i]
    if (compare(alarm, time) == 0) {
      res.json(true)
      return
    }
  }
  res.json(false)
})

function backupState(alarms) {
  fs.writeFile(alarms_path, JSON.stringify(alarms), {flag: "w+"}, (err) => {
    if (err) throw err
  })
}

app.post("/add", (req, res) => {
  const alarm = req.body
  if (findMatch(alarms, alarm) !== -1) {
    return
  }
  alarms.push(alarm)
  alarms.sort(compare)
  backupState(alarms)
  res.json(alarms)
})

app.post("/delete", (req, res) => {
  const alarm = req.body
  const index = findMatch(alarms, alarm)
  if (index !== -1) {
    alarms.splice(index, 1)
  }
  backupState(alarms)
  res.json(alarms)
})

app.listen(public_port, () =>
  console.log(`listening at http://localhost:${public_port}`))
