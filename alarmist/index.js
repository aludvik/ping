const { spawn } = require("child_process")
const http = require("http")
const readline = require("readline")

/* loop:
  get time now
  ask API if there is an alarm schedule for the time
  if scheduled,
    start alarm
  sleep for 1 minute

onInput:
  if there is an alarm playing:
    silence it
*/

let audioProcess = null
let snoozeUntil = null
const volume = 100
const hostname = "localhost"
const port = 8080

function setUpStdin() {
  readline.emitKeypressEvents(process.stdin)
  process.stdin.setRawMode(true)
  process.stdin.on("keypress", handleKeyPress)
}

// only play alert if an alert isn't already playing
function playAlert() {
  if (audioProcess === null) {
    playAudio("./alert.wav", true, _ => { audioProcess = null })
  }
}

function playHeartbeat() {
  playAudio("./silence.wav", false, _ => {})
}

// play an audio file in a separate process and return the process
function playAudio(file, shouldLoop, cb) {
  const command = "ffplay"
  const loopFlags = `-loop 0 -nodisp -volume ${volume} ${file}`.split(" ")
  const noLoopFlags = `-nodisp -volume ${volume} ${file}`.split(" ")
  let flags = (shouldLoop ? loopFlags : noLoopFlags)
  let audioProcess = spawn(command, flags, {
    stdio: 'ignore'
  })
  audioProcess.on('close', cb)
  return audioProcess
}

function compare(a, b) {
  if (a["h"] < b["h"]) return -1
  if (a["h"] > b["h"]) return 1
  if (a["m"] < b["m"]) return -1
  if (a["m"] > b["m"]) return 1
  return 0
}

function dateToClockTime(date) {
  return {"h": date.getHours(), "m": date.getMinutes()}
}

function shouldAlert(currentClockTime, cb) {
  if (snoozeUntil !== null && compare(currentClockTime, snoozeUntil) >= 0) {
    snooozeUntil = null
    cb(true)
    return
  }
  checkApiForAlert(currentClockTime, cb)
}


function checkApiForAlert(currentClockTime, cb) {
  postRequest("/now", JSON.stringify(currentClockTime), cb)
}

function postRequest(route, reqData, cb) {
  let resDataBuffer = []
  const options = {
    "hostname": hostname,
    "headers": {
      "Content-Type": "application/json",
      "Content-Length": reqData.length
    },
    "path": route,
    "port": port,
    "method": "POST"
  }
  const req = http.request(options, res => {
    res.on("data", data => resDataBuffer.push(data))
    res.on("end", () => {
      const resData = Buffer.concat(resDataBuffer)
      cb(JSON.parse(resData.toString()))
    })
  })
  req.write(reqData)
  req.end()
}

function setHeartbeatLoop() {
  setTimeout(heartbeatLoop, millisInOneMinute);
}

function heartbeatLoop() {
  playHeartbeat()
  setHeartbeatLoop()
}

const millisInOneMinute = 60 * 1000
const snoozeButtons = [1, 2, 3, 4, 5, 6, 7, 8, 9]
function handleKeyPress(key, data) {
  if (audioProcess !== null) {
    if (key in snoozeButtons) {
      const delay = key
      const now = new Date()
      const snooze = new Date(now.getTime() + delay * millisInOneMinute)
      snoozeUntil = dateToClockTime(snooze)
      console.log(`Snoozed at ${now} until ${snooze}`)
    } else {
      if (snoozeUntil !== null) {
        snoozeUntil = null
      }
      console.log(`Silenced at ${Date()}`)
    }
    audioProcess.kill()
  }
}

function millisUntilTopOfMinute() {
  const date = new Date()
  const millisAfter = date.getMilliseconds() + date.getSeconds() * 1000
  return millisInOneMinute - millisAfter
}

function setMainLoop() {
  setTimeout(mainLoop, millisUntilTopOfMinute())
}

function mainLoop() {
  const date = new Date()
  const clockTime = dateToClockTime(date)
  shouldAlert(clockTime, (should) => {
    if (should) {
      console.log(`Alarm at ${date}`)
      playAlert()
    }
  })
  setMainLoop()
}

function main() {
  setUpStdin()
  setMainLoop()
  setHeartbeatLoop()
  console.log(`Started at ${Date()}`)
}

main()
