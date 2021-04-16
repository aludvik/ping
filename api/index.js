import express from 'express'

const public_port = 8080

const app = express()
app.use(express.json())

let state = [
  {h: 1, m: 2},
  {h: 4, m: 0}
]

app.get("/list", (req, res) => {
  res.json(state)
})

app.listen(public_port, () =>
  console.log(`listening at http://localhost:${public_port}`))

