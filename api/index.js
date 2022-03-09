import assert from "assert"
import express from 'express'
import fs from 'fs'

const public_port = 8080
const state_path = "./state.json"

const app = express()
app.use(express.json())

function loadStateFromDisk() {
  return JSON.parse(fs.readFileSync(state_path))
}

// {
//   alarms: list of alarm objects
//   mutes: list of mute objefts
// }
let state = loadStateFromDisk()
// single integer, minutes since start of today
let snooze = null;

function findMatch(collection, item, compare) {
  return collection.findIndex(i => compare(i, item) == 0)
}

function containsMatch(collection, item, compare) {
  return findMatch(collection, item, compare) !== -1
}

function compareAlarms(a, b) {
  if (a["t"] < b["t"]) return -1
  if (a["t"] > b["t"]) return 1
  return 0
}

function compareMutes(a, b) {
  if (a["s"] < b["s"]) return -1
  if (a["s"] === b["s"]) {
    if (a["e"] < b["e"]) return -1
    if (a["e"] > b["e"]) return 1
    return 0
  }
  return 1
}

app.get("/listalarms", (req, res) => {
  res.json(state["alarms"])
})

app.get("/listmutes", (req, res) => {
  res.json(state["mutes"])
})

function dateToClockTime(date) {
  return {"t": date.getHours() * 60 + date.getMinutes()}
}

function timeWithinMute(date, mute) {
  return date >= mute["s"] && date <= mute["e"]
}

function matchesMute(date, mutes) {
  for (let i = 0; i < mutes.length; i++) {
    if (timeWithinMute(date, mutes[i])) {
      return true
    }
  }
  return false
}

function matchesAlarm(time, alarms) {
  for (let i = 0; i < alarms.length; i++) {
    if (compareAlarms(alarms[i], time) == 0) {
      return true
    }
  }
  return false
}

function matchesSnooze(time) {
  return snooze !== null && compareAlarms(dateToClockTime(snooze), time) == 0
}

// Is there an alarm at this time?
app.post("/now", (req, res) => {
  assert(req.body.hasOwnProperty("now"))
  assert(Number.isInteger(req.body["now"]))
  const date = new Date(req.body["now"])
  if (matchesMute(date, state["mutes"])) {
    console.log("matches mute")
    res.json(false)
    return
  }
  const time = dateToClockTime(date)
  if (matchesAlarm(time, state["alarms"])) {
    console.log("matches scheduled alarm")
    res.json(true)
    return
  }
  if (matchesSnooze(time)) {
    console.log("matches snoozed alarm")
    res.json(true)
    return
  }
  res.json(false)
})

function backupState(state) {
  fs.writeFile(state_path, JSON.stringify(state), {flag: "w+"}, (err) => {
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
  let alarms = state["alarms"]
  if (containsMatch(alarms, alarm, compareAlarms)) {
    return
  }
  alarms.push(alarm)
  alarms.sort(compareAlarms)
  backupState(state)
  res.json(alarms)
})

app.post("/deletealarm", (req, res) => {
  const alarm = req.body
  let alarms = state["alarms"]
  const index = findMatch(alarms, alarm, compareAlarms)
  if (index !== -1) {
    alarms.splice(index, 1)
  }
  backupState(state)
  res.json(alarms)
})

app.post("/addmute", (req, res) => {
  const mute = req.body
  let mutes = state["mutes"]
  if (containsMatch(mutes, mute, compareMutes)) {
    return
  }
  mutes.push(mute)
  mutes.sort(compareMutes)
  backupState(state)
  res.json(mutes)
})

app.post("/deletemute", (req, res) => {
  const mute = req.body
  let mutes = state["mutes"]
  const index = findMatch(mutes, mute, compareMutes)
  if (index !== -1) {
    mutes.splice(index, 1)
  }
  backupState(state)
  res.json(mutes)
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
