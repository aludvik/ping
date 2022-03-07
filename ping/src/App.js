import React from 'react';

function App() {
  return <AlarmsView />
}

/* Alarm is minute-precision. */
class Alarm {
  // minutes since start of the day
  constructor(time) {
    this._time = time
  }

  get minutes_since_start_of_day() {
    return this._minutes
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
    fetch("/api/list")
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
    <li>{props.alarm.clock12_str}<button onClick={() => props.onDelete(props.alarm)}>delete</button></li>
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

export default App;
