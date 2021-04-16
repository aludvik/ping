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

function AlarmsView() {
  const alarms = [new Alarm(1,20), new Alarm(4,0)]
  return (
    <div>
      <h1>Alarms</h1>
      <AlarmsList alarms={alarms}/>
      <AlarmAdder />
    </div>
  )
}

function AlarmsList(props) {
  const items = props.alarms.map((alarm) =>
    <AlarmEntry key={alarm.minutes_since_start_of_day} time={alarm.clock24_str} />
  )
  return <ul>{items}</ul>
}

function AlarmEntry(props) {
  return (
    <li>{props.time}<button>delete</button></li>
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

  handleSubmit(e) {
    e.preventDefault()
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
