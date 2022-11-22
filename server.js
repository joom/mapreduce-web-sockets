const express = require("express")
const app = express()
const http = require("http").Server(app)
const base64id = require("base64id")
const io = require("socket.io")(http)
const port = process.env.PORT || 3000
const fs = require("fs").promises

// dictionary of requesters
// map requester IDs (UUID) to a requester object (requester socket ID, an array of job IDs)
let requesters = {}

// dictionary of workers
// maps worker socket IDs to booleans
let busyWorkers = {}

// dictionary of jobs
// maps job IDs (UUID) to job object (requester ID, map, reduce)
let jobs = {}

// dictionary of tasks
// maps task IDs (base64id) to task object (job ID, current status, worker ID if a worker is working on it)
let tasks = {}

// queue of jobs
jobQueue = []
// queue of tasks
taskQueue = []

app.use(express.static("public"))

app.get("/", (req, res) => {
  app.use(express.static("public"))
})

const removeItem = (array, item) => {
  for (let i in array) {
    if (array[i] == item) {
        array.splice(i, 1)
        break
    }
  }
}

const manageQueues = async () => {
  // Break the job into multiple tasks
  for (const jobId of jobQueue) {
    if (!jobs[jobId].divided) {
      // FIXME break the job
      let taskId = base64id.generateId()
      let task = {
        taskId: taskId,
        jobId: jobId,
        assigned: false,
        result: false
      }
      tasks[taskId] = task
      taskQueue.push(taskId)
    }
  }

  // Assign tasks to workers
  for (const taskId of taskQueue) {
    const activeWorkers = await io.in("worker").fetchSockets()
    let pickedIndex = activeWorkers.findIndex(worker => !busyWorkers[worker.id])
    if (pickedIndex === -1) {
      console.error("No available workers!")
    } else {
      let picked = activeWorkers[pickedIndex]
      tasks[taskId].assigned = picked.id
      picked.emit("task", tasks[taskId])
    }
  }
}

io.on("connection", async socket => {
  if (socket.handshake.headers.referer.indexOf("/worker/") !== -1) {
    console.log("New worker!")
    socket.join("worker")
    busyWorkers[socket.id] = false
    socket.emit("welcome", socket.id)
  }

  socket.on("requesterId", async requesterId => {
    if (socket.handshake.headers.referer.indexOf("/requester/") !== -1) {
      console.log("New requester!")
      socket.join("requester")
      if (requesters[requesterId]) {
        requesters[requesterId].socketId = socket.id
      } else {
        requesters[requesterId] = { socketId: socket.id, jobs: [] }
      }
    }
  })

  socket.on("job", async job => {
    await fs.writeFile(`${job.jobId}.json`, job.fileContent)
    job.divided = false
    jobs[job.jobId] = job
    requesters[job.requesterId].jobs.push(job.jobId)
    jobQueue.push(job.jobId)
    await manageQueues()
  })

  socket.on("taskFinished", async taskResult => {
    busyWorkers[socket.id] = false
    tasks[taskResult.taskId].result = taskResult.result
    removeItem(taskQueue, taskResult.taskId)

    // if the entire job is finished
    let requesterId = jobs[taskResult.jobId].requesterId
    let requesterSocketId = requesters[requesterId].socketId
    let requesterSocket = Array.from(await io.in("requester").fetchSockets()).find(socket => socket.id == requesterSocketId)
    delete jobs[taskResult.jobId]
    removeItem(jobQueue, taskResult.jobId)
    if (requesterSocket) {
      io.emit("jobFinished", taskResult)
    }
    await manageQueues()
  })

  socket.on("disconnect", async () => {
    delete busyWorkers[socket.id]
    for (let i in requesters) {
      if (requesters[i].socketId == socket.id) {
        requesters[i].socketId = null
      } 
    }
    await manageQueues()
  });
})

http.listen(port, () => {
  console.log(`Socket.IO server running at http://localhost:${port}/`)
})
