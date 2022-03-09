import React from 'react';

function App() {
  return (
    <div>
    <MutesView />
    <AlarmsView />
    </div>
  )
}

/* Alarm is minute-precision. */
class Alarm {
  // minutes since start of the day
  constructor(time) {
    this._time = time
  }

  get minutes_since_start_of_day() {
    return this._time
  }

  get clock12_str() {
    const hours = Math.floor(this._time / 60)
    const minutes = this._time % 60
    let date = new Date()
    date.setHours(hours)
    date.setMinutes(minutes)
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
  }

  toObj() {
    return {"t": this._time}
  }

  static fromObj(obj) {
    return new Alarm(obj["t"])
  }

  static fromHoursAndMinutes(hours, minutes) {
    return new Alarm(Number(hours) * 60 + Number(minutes))
  }
}

function postData(route, data) {
  return fetch(`/api/${route}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: data
  })
}

class AlarmsView extends React.Component {
  constructor(props) {
    super(props)
    this.state = {alarms: []}
    this.addAlarm = this.addAlarm.bind(this)
    this.deleteAlarm = this.deleteAlarm.bind(this)
  }

  componentDidMount() {
    fetch("/api/listalarms")
      .then(response => {
         return response.json()
      })
      .then(data => {
        const alarms = data.map(Alarm.fromObj)
        this.setState({alarms})
      })
  }

  addAlarm(alarm) {
    postData("/addalarm", JSON.stringify(alarm.toObj()))
      .then(response => {
         return response.json()
      })
      .then(data => {
        const alarms = data.map(Alarm.fromObj)
        this.setState({alarms})
      })
  }

  deleteAlarm(alarm) {
    postData("/deletealarm", JSON.stringify(alarm.toObj()))
      .then(response => {
         return response.json()
      })
      .then(data => {
        const alarms = data.map(Alarm.fromObj)
        this.setState({alarms})
      })
  }

  render() {
    return (
      <div>
        <h1>Alarms</h1>
        <AlarmsList alarms={this.state.alarms} onDeleteAlarm={this.deleteAlarm} />
        <AlarmAdder onNewAlarm={this.addAlarm} />
      </div>
    )
  }
}

function AlarmsList(props) {
  const items = props.alarms.map((alarm, index) =>
    <AlarmEntry
      key={alarm.minutes_since_start_of_day}
      alarm={alarm}
      onDelete={props.onDeleteAlarm}
    />
  )
  return <ul>{items}</ul>
}

function AlarmEntry(props) {
  return (
    <li key={props.alarm.minutes_since_start_of_day.toString()}>
      {props.alarm.clock12_str}
      <button onClick={() => props.onDelete(props.alarm)}>delete</button>
    </li>
  )
}

class AlarmAdder extends React.Component {
  constructor(props) {
    super(props)
    this.state = {value: ''}
    this.handleChange = this.handleChange.bind(this)
    this.handleSubmit = this.handleSubmit.bind(this)
  }

  handleChange(e) {
    this.setState({value: e.target.value})
  }

  parseNewAlarm(value) {
    const pattern = /^\d\d:\d\d$/
    if (!pattern.test(value)) {
      return null
    }
    const [hours, minutes] = value.split(":")
    if (hours > 23 || hours < 0 || minutes > 59 || minutes < 0) {
      return null
    }
    return Alarm.fromHoursAndMinutes(hours, minutes)
  }

  handleSubmit(e) {
    e.preventDefault()
    const value = this.state.value
    const alarm = this.parseNewAlarm(value)
    if (alarm === null) {
      alert(`Enter time first!`)
      return
    }
    this.setState({value: ''})
    this.props.onNewAlarm(alarm)
  }

  render() {
    return (
      <form onSubmit={this.handleSubmit}>
        <label>
          <input type="time" value={this.state.value} onChange={this.handleChange} />
        </label>
        <input type="submit" value="add" />
      </form>
    )
  }
}

class MutesView extends React.Component {
  constructor(props) {
    super(props)
    this.state = {mutes: []}
    this.addMute = this.addMute.bind(this)
    this.deleteMute = this.deleteMute.bind(this)
  }

  componentDidMount() {
    fetch("/api/listmutes")
      .then(response => {
         return response.json()
      })
      .then(data => {
        const mutes = data.map(Mute.fromObj)
        this.setState({mutes})
      })
  }

  addMute(mute) {
    postData("/addmute", JSON.stringify(mute.toObj()))
      .then(response => {
         return response.json()
      })
      .then(data => {
        const mutes = data.map(Mute.fromObj)
        this.setState({mutes})
      })
  }

  deleteMute(mute) {
    postData("/deletemute", JSON.stringify(mute.toObj()))
      .then(response => {
         return response.json()
      })
      .then(data => {
        const mutes = data.map(Mute.fromObj)
        this.setState({mutes})
      })
  }

  render() {
    return (
      <div>
        <h1>Mutes</h1>
        <MutesList mutes={this.state.mutes} onDeleteMute={this.deleteMute}/>
        <MuteAdder onNewMute={this.addMute} />
      </div>
    )
  }
}

class Mute {
  constructor(start, end) {
    this._start = new Date(start) // Date object
    this._end = new Date(end) // Date object
  }

  get interval_str() {
    return `${this._start.toLocaleString()} -> ${this._end.toLocaleString()}`
  }

  toObj() {
    return {"s": this._start.getTime(), "e": this._end.getTime()}
  }

  static fromObj(obj) {
    return new Mute(new Date(obj["s"]), new Date(obj["e"]))
  }
}

function MutesList(props) {
  const items = props.mutes.map((mute, index) =>
    <li key={mute.interval_str}>
      {mute.interval_str}
      <button onClick={() => props.onDeleteMute(mute)}>delete</button>
    </li>
  )
  return <ul>{items}</ul>
}

class MuteAdder extends React.Component {
  constructor(props) {
    super(props)
    this.state = {start: Date(), end: Date()}
    this.handleStartChange = this.handleStartChange.bind(this)
    this.handleEndChange = this.handleEndChange.bind(this)
    this.handleSubmit = this.handleSubmit.bind(this)
  }

  handleStartChange(e) {
    this.setState({start: e.target.value})
  }

  handleEndChange(e) {
    this.setState({end: e.target.value})
  }

  handleSubmit(e) {
    e.preventDefault()
    const mute = new Mute(this.state.start, this.state.end)
    this.setState({start: Date(), end: Date()})
    this.props.onNewMute(mute)
  }

  render() {
    return (
      <form onSubmit={this.handleSubmit}>
        <label>
          Start
          <input
            type="datetime-local"
            value={this.state.start}
            onChange={this.handleStartChange} />
        </label>
        <label>
          End
          <input
            type="datetime-local"
            value={this.state.end}
            onChange={this.handleEndChange} />
        </label>
        <input type="submit" value="add" />
      </form>
    )
  }
}

export default App;
