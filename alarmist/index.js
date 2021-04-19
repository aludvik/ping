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
const volume = 10
const hostname = "localhost"
const port = 8080

function setUpStdin() {
  readline.emitKeypressEvents(process.stdin)
  process.stdin.setRawMode(true)
  process.stdin.on("keypress", handleKeyPress)
}

function playAlert() {
  const command = "ffplay"
  const flags = `-loop 0 -nodisp -volume ${volume} ./alert.wav`.split(" ")
  if (audioProcess === null) {
    audioProcess = spawn(command, flags, {
      stdio: 'ignore'
    })
    audioProcess.on('close', _ => { audioProcess = null })
  }
}

function dateToClockTime(date) {
  return {"h": date.getHours(), "m": date.getMinutes()}
}

function shouldAlert(currentClockTime, cb) {
  const reqData = JSON.stringify(currentClockTime)
  let resDataBuffer = []
  const options = {
    "hostname": hostname,
    "headers": {
      "Content-Type": "application/json",
      "Content-Length": reqData.length
    },
    "path": "/now",
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

function handleKeyPress(key, data) {
  if (audioProcess !== null) {
    audioProcess.kill()
  }
}

const millisInOneMinute = 60 * 1000
function millisUntilTopOfMinute() {
  const date = new Date()
  const millisAfter = date.getMilliseconds() + date.getSeconds() * 1000
  return millisInOneMinute - millisAfter
}

function setLoopTimeout() {
  setTimeout(loop, millisUntilTopOfMinute())
}

function loop() {
  const date = new Date()
  const clockTime = dateToClockTime(date)
  shouldAlert(clockTime, (should) => {
    if (should) {
      console.log(`Alarm at ${date}`)
      playAlert()
    }
  })
  setLoopTimeout()
}

function main() {
  setUpStdin()
  setLoopTimeout()
}

main()
