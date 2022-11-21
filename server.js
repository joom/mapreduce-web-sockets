const express = require("express")
const app = express()
const http = require("http").Server(app)
const io = require("socket.io")(http)
const port = process.env.PORT || 3000

// dictionary of workers
// maps worker socket IDs to booleans
let busyWorkers = {}

// dictionary of requesters
// maps job IDs (UUID) to requester socket IDs
let jobToRequester = {}

// queue of workers
// queue of jobs
// queue of tasks

app.use(express.static("public"))

app.get("/", (req, res) => {
  app.use(express.static("public"))
})

io.on("connection", async socket => {
  if (socket.handshake.headers.referer.indexOf("/requester/") !== -1) {
    socket.join("requester")
  } else if (socket.handshake.headers.referer.indexOf("/worker/") !== -1) {
    socket.join("worker")
    busyWorkers[socket.id] = false
  } else {
    console.error("A connection that is neither a requester nor a worker!")
  }
  socket.emit("welcome", socket.id)

  socket.on("job", async job => {
    console.log("new job!", job)
    jobToRequester[job.jobId] = job.requesterId
    // console.log(job.file.toString())

    const activeWorkers = await io.in("worker").fetchSockets()
    let pickedIndex = activeWorkers.findIndex(worker => !busyWorkers[worker.id])
    if (pickedIndex === -1) {
      // It shouldn't fail, it should be added to the queue

      // socket.emit("jobFinished", {
      //   jobId: job.jobId,
      //   result: {
      //     success: false,
      //     error: "No available workers"
      //   }
      // })
    } else {
      let picked = activeWorkers[pickedIndex]
      picked.emit("task", job)
    }
  })

  socket.on("taskFinished", taskResult => {
    console.log(taskResult)
    busyWorkers[socket.id] = false

    // if the entire job is finished
    delete jobToRequester[taskResult.jobId]
    io.emit("jobFinished", taskResult)
  })

  socket.on("disconnect", () => {
    delete busyWorkers[socket.id]
    console.log("user disconnected")
  });
})

http.listen(port, () => {
  console.log(`Socket.IO server running at http://localhost:${port}/`)
})
