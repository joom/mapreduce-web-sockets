const express = require("express")
const app = express()
const http = require("http").Server(app)
const io = require("socket.io")(http)
const port = process.env.PORT || 3000

// dictionary of workers
// dictionary of requesters
// queue of workers
// queue of jobs
// queue of tasks

app.use(express.static("public"))

app.get("/", (req, res) => {
  app.use(express.static("public"))
})

io.on("connection", socket => {
  // socket.emit("welcome")

  socket.on("job", job => {
    io.emit("new job!", job)
    io.emit("task", job)
  })

  socket.on("taskFinished", result => {
    io.emit("jobFinished", result)
    console.log(result)
  })

  socket.on("disconnect", () => {
    console.log("user disconnected");
  });
})

http.listen(port, () => {
  console.log(`Socket.IO server running at http://localhost:${port}/`)
})
