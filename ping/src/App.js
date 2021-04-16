import React from 'react';

function App() {
  return <AlarmsView />
}

/* Alarm is minute-precision. */ 
class Alarm {
  constructor(hours, minutes) {
    this._hours = hours
    this._minutes = minutes
  }

  get minutes_since_start_of_day() {
    return this._hours * 60 + this._minutes
  }

  get clock24_str() {
    const hours = this._hours.toString().padStart(2, "0")
    const minutes = this._minutes.toString().padStart(2, "0")
    return `${hours}:${minutes}`
  }
}

class AlarmsView extends React.Component {
  constructor(props) {
    super(props)
    this.state = {alarms: []}
    this.addAlarm = this.addAlarm.bind(this)
    this.deleteAlarm = this.deleteAlarm.bind(this)
  }

  componentDidMount() {
    fetch("/list")
      .then(response => {
         console.log(response)
         return response.json()
      })
      .then(data => {
        const alarms = data.map(obj => new Alarm(obj["h"], obj["m"]))
        this.setState({alarms})
      })
  }

  addAlarm(alarm) {
    this.setState((state, _) => {
      return {alarms: state.alarms.concat([alarm])
    }})
  }

  deleteAlarm(alarmToRemove) {
    this.setState((state, _) => {
      return {
        alarms: state.alarms.filter(
          alarm => alarm !== alarmToRemove
        )
      }
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
    <li>{props.alarm.clock24_str}<button onClick={() => props.onDelete(props.alarm)}>delete</button></li>
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
    return new Alarm(Number(hours), Number(minutes))
  }

  handleSubmit(e) {
    e.preventDefault()
    const value = this.state.value
    const alarm = this.parseNewAlarm(value)
    if (alarm === null) {
      alert("Invalid time. Use 24-hour time in the form \"XX:XX\"")
      return
    }
    this.setState({value: ''})
    this.props.onNewAlarm(alarm)
  }

  render() {
    return (
      <form onSubmit={this.handleSubmit}>
        <label>
          <input type="text" value={this.state.value} onChange={this.handleChange} />
          (24-hour)
        </label>
        <input type="submit" value="add" />
      </form>
    )
  }
}

export default App;
