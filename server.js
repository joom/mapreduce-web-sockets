const express = require("express")
const app = express()
const http = require("http").Server(app)
const base64id = require("base64id")
const io = require("socket.io")(http)
const port = process.env.PORT || 3000
const fs = require("fs").promises


// dictionary of workers
// maps worker socket IDs to booleans
let busyWorkers = {}

// dictionary of requesters
// maps job IDs (UUID) to job object
let jobs = {}

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
    jobs[job.jobId] = job
    await fs.writeFile(`${job.jobId}.json`, job.fileContent)

    const activeWorkers = await io.in("worker").fetchSockets()
    // picks the first available worker (TODO maybe try random?)
    let pickedIndex = activeWorkers.findIndex(worker => !busyWorkers[worker.id])
    if (pickedIndex === -1) {
      console.error("No available workers!")
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
      let task = {
        taskId: base64id.generateId(),
        jobId: job.jobId
      }
      picked.emit("task", task)
    }
  })

  socket.on("taskFinished", taskResult => {
    console.log(taskResult)
    busyWorkers[socket.id] = false

    // if the entire job is finished
    delete jobs[taskResult.jobId]
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
