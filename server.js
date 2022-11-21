const express = require("express")
const app = express()
const http = require("http").Server(app)
const base64id = require("base64id")
const io = require("socket.io")(http)
const port = process.env.PORT || 3000
const fs = require("fs").promises

// dictionary of requesters
// map requester socket IDs to an array of job IDs
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
  if (socket.handshake.headers.referer.indexOf("/requester/") !== -1) {
    socket.join("requester")
    requesters[socket.id] = []
  } else if (socket.handshake.headers.referer.indexOf("/worker/") !== -1) {
    socket.join("worker")
    busyWorkers[socket.id] = false
  } else {
    console.error("A connection that is neither a requester nor a worker!")
  }
  socket.emit("welcome", socket.id)

  socket.on("job", async job => {
    await fs.writeFile(`${job.jobId}.json`, job.fileContent)
    job.divided = false
    jobs[job.jobId] = job
    requesters[socket.id].push(job.jobId)
    jobQueue.push(job.jobId)
    await manageQueues()
  })

  socket.on("taskFinished", async taskResult => {
    busyWorkers[socket.id] = false
    tasks[taskResult.taskId].result = taskResult.result
    removeItem(taskQueue, taskResult.taskId)

    // if the entire job is finished
    let requester = jobs[taskResult.jobId].requesterId
    delete jobs[taskResult.jobId]
    removeItem(jobQueue, taskResult.jobId)
    io.emit("jobFinished", taskResult)
    await manageQueues()
  })

  socket.on("disconnect", async () => {
    delete busyWorkers[socket.id]
    delete requesters[socket.id]
    await manageQueues()
  });
})

http.listen(port, () => {
  console.log(`Socket.IO server running at http://localhost:${port}/`)
})
