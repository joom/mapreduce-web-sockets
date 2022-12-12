const SIZE = 1000 // in kilobytes

const { exec } = require("child_process")
const express = require("express")
const app = express()
const http = require("http").Server(app)
const base64id = require("base64id")
const io = require("socket.io")(http)
const port = process.env.PORT || 3000
const fs = require("fs").promises
const kfs = require("key-file-storage")('./storage')

// dictionary of requesters
// map requester IDs (UUID) to a requester object (requester socket ID, an array of job IDs)
let requesters = {}

// dictionary of workers
// maps worker socket IDs to booleans
let busyWorkers = {}

// dictionary of jobs
// maps job IDs (UUID) to job object (requester ID, map, reduce)
// TODO keep an array of map task IDs, and an array of reduce task IDs
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

const manageTaskQueue = async () => {
  // Assign tasks to workers
  for (const taskId of taskQueue) {
    if (tasks[taskId].assigned) {
      continue
    }
    const activeWorkers = await io.in("worker").fetchSockets()
    let pickedIndex = activeWorkers.findIndex(worker => !busyWorkers[worker.id])
    if (pickedIndex === -1) {
      console.error("No available workers!")
    } else {
      let picked = activeWorkers[pickedIndex]
      tasks[taskId].assigned = picked.id
      busyWorkers[picked.id] = true
      // TODO add task file to the object
      picked.emit("task", tasks[taskId])
    }
  }
}

const manageQueues = async () => {
  // Break the job into multiple tasks
  for (const jobId of jobQueue) {
    if (!jobs[jobId].divided) {
      exec(`json-split -f ./tmp/${jobId}.json -s ${SIZE} -n ${jobId}`, (err, stderr, stdout) => {
        if(err || stderr) {
          console.error(jobId, err, stderr)
        } else {
          jobs[jobId].divided = true
          jobs[jobId].mapTasks = []
          const numTasks = parseInt(stdout.match(/Total files to be written: ([0-9]+)/))
          fs.unlink(`./tmp/${jobId}.json`, err => {})
          for (let i = 0; i < numTasks; i++) {
            let taskId = base64id.generateId()
            fs.rename(`./tmp/export/${jobId}-${i}.json`, `./tmp/${taskId}.json`, err => {
              let task = {
                taskId: taskId,
                jobId: jobId,
                assigned: false,
                result: false,
                type: "map",
                fn: jobs[jobId].map,
                data: []
              }
              tasks[taskId] = task
              jobs[jobId].mapTasks.push(taskId)
              taskQueue.push(taskId)
              manageTaskQueue()
            })
          }
        }
      })
    }
  }
}

const allTasksFinished = (jobId, taskType) => {
  const tasks = jobs[jobId][taskType]
  return tasks.all(taskId => tasks[taskId].result)
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
    await fs.writeFile(`./tmp/${job.jobId}.json`, job.fileContent)
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

    if (tasks[taskResult.taskId].type === "map") {
      // TODO check if this is map result, if it is, then save it to storage, 
      // and check if all the map tasks are finished, if they are all finished, then divide into (multiple) reduce tasks
      tasks[taskResult.taskId].result = taskResult.result
      if (allTasksFinished(taskResult.jobId, "mapTasks")) {
        let taskId = base64id.generateId()
        let task = {
          taskId: taskId,
          jobId: jobId,
          assigned: false,
          result: false,
          type: "reduce",
          fn: jobs[jobId].reduce,
          data: [] // FIXME
        }
        tasks[taskId] = task
        jobs[jobId].reduceTasks.push(taskId)
        taskQueue.push(taskId)
        manageTaskQueue()
      }
      

    } else if (tasks[taskResult.taskId].type === "reduce") {
      // TODO check if it is a reduce result, if it is, then save it to storage, 
      // and check if all the reduce tasks are finished, if they are, send result to requester
      if (allTasksFinished(taskResult.jobId, "reduceTasks")) {
        let requesterId = jobs[taskResult.jobId].requesterId
        let requesterSocketId = requesters[requesterId].socketId
        let requesterSocket = Array.from(await io.in("requester").fetchSockets()).find(socket => socket.id == requesterSocketId)
        delete jobs[taskResult.jobId]
        removeItem(jobQueue, taskResult.jobId)
        if (requesterSocket) {
          io.emit("jobFinished", taskResult)
        }
        await manageQueues()
      }

    }

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
