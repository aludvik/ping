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
    audioProcess = playAudio("./alert.wav", 100, _ => { audioProcess = null })
  }
}

function playNoise() {
  playAudio("./noise.wav", 1, _ => {})
}

// play an audio file in a separate process and return the process
function playAudio(file, volume, cb) {
  const command = "ffplay"
  const flags = `-loop 0 -nodisp -volume ${volume} ${file}`.split(" ")
  let audioProcess = spawn(command, flags, {
    stdio: 'ignore'
  })
  audioProcess.on('close', cb)
  return audioProcess
}

function shouldAlert(now, cb) {
  if (snoozeUntil !== null && now > snoozeUntil) {
    snooozeUntil = null
    cb(true)
    return
  }
  checkApiForAlert(now, cb)
}

function checkApiForAlert(now, cb) {
  postRequest("/now", JSON.stringify({"now": now}), cb)
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

const millisInOneMinute = 60 * 1000
const snoozeButtons = [1, 2, 3, 4, 5, 6, 7, 8, 9]
function handleKeyPress(key, data) {
  if (audioProcess !== null) {
    if (key in snoozeButtons) {
      const delay = key
      const now = Date.now()
      snoozeUntil = Date(now + delay * millisInOneMinute).getTime()
      console.log(`Snoozed at ${Date(now)} until ${Date(snoozeUntil)}`)
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
  const now = Date.now()
  shouldAlert(now, (should) => {
    if (should) {
      console.log(`Alarm at ${Date(now)}`)
      playAlert()
    }
  })
  setMainLoop()
}

function main() {
  setUpStdin()
  setMainLoop()
  playNoise()
  console.log(`Started at ${Date()}`)
}

main()
