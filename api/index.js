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

// list of alarm objects
let alarms = loadAlarmsFromDisk()
// single integer, minutes since start of today
let snooze = null;

function findMatch(alarms, alarm) {
  return alarms.findIndex(a => a["t"] == alarm["t"])
}

function compare(a, b) {
  if (a["t"] < b["t"]) return -1
  if (a["t"] > b["t"]) return 1
  return 0
}

app.get("/list", (req, res) => {
  res.json(alarms)
})

function dateToClockTime(date) {
  return {"t": date.getHours() * 60 + date.getMinutes()}
}

// Is there an alarm at this time?
app.post("/now", (req, res) => {
  assert(req.body.hasOwnProperty("now"))
  assert(Number.isInteger(req.body["now"]))
  const date = new Date(req.body["now"])
  const time = dateToClockTime(date)
  for (let i = 0; i < alarms.length; i++) {
    const alarm = alarms[i]
    if (compare(alarm, time) == 0) {
      console.log("matches scheduled alarm")
      res.json(true)
      return
    }
  }
  if (snooze !== null && compare(dateToClockTime(snooze), time) == 0) {
    console.log("matches snoozed alarm")
    res.json(true)
    return
  }
  res.json(false)
})

function backupState(alarms) {
  fs.writeFile(alarms_path, JSON.stringify(alarms), {flag: "w+"}, (err) => {
    if (err) throw err
  })
}

// Set a one-time alarm at the given time
app.post("/snooze", (req, res) => {
  assert(req.body.hasOwnProperty("snooze"))
  assert(Number.isInteger(req.body["snooze"]))
  snooze = new Date(req.body["snooze"])
  console.log(`setting snooze for ${snooze}`)
  res.json(true)
})

app.post("/addalarm", (req, res) => {
  const alarm = req.body
  if (findMatch(alarms, alarm) !== -1) {
    return
  }
  alarms.push(alarm)
  alarms.sort(compare)
  backupState(alarms)
  res.json(alarms)
})

app.post("/deletealarm", (req, res) => {
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

const millisInOneMinute = 60 * 1000
function cleanUpExpired() {
  if (snooze !== null && Date.now() > snooze.getTime() + millisInOneMinute) {
    console.log(`clearing snooze at ${snooze}`)
    snooze = null;
  }
}

function millisUntilTopOfMinute() {
  const date = new Date()
  const millisAfter = date.getMilliseconds() + date.getSeconds() * 1000
  return millisInOneMinute - millisAfter
}

function startCleanUp() {
  setInterval(cleanUpExpired, millisInOneMinute)
}

setTimeout(startCleanUp, millisUntilTopOfMinute() + millisInOneMinute / 2)
