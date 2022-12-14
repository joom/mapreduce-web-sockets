const { exec } = require("child_process")
const express = require("express")
const app = express()
const http = require("http").Server(app)
const base64id = require("base64id")
const io = require("socket.io")(http, {
    maxHttpBufferSize: 1e18, pingTimeout: 60000
})
const port = process.env.PORT || 3000
const fs = require("fs").promises
const ndb = require('node-json-db')
const glob = require("glob")

// dictionary of requesters
// map requester IDs (UUID) to a requester object (requester socket ID, an array of job IDs)
let requesters = {}

// dictionary of workers
// maps worker socket IDs to booleans
let busyWorkers = {}

// dictionary of jobs
// maps job IDs (UUID) to job object (requester ID, map, reduce)
// keep an array of map task IDs, and an array of reduce task IDs
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

const manageTaskQueue = async (attempt = 0) => {
  // Assign tasks to workers
  // console.log(`Managing task queue`);
  for (const taskId of taskQueue) {
    if (tasks[taskId].assigned) {
      continue
    }
    const activeWorkers = await io.in("worker").fetchSockets()
    let pickedIndex = activeWorkers.findIndex(worker => !busyWorkers[worker.id])
    if (pickedIndex === -1) {
      // console.error("No available workers!")
      return setTimeout(() => {manageTaskQueue(attempt + 1)}, 10 * Math.pow(1.5, attempt))
    } else {
      let picked = activeWorkers[pickedIndex]
      tasks[taskId].assigned = picked.id
      busyWorkers[picked.id] = true
      let data
      if (tasks[taskId].type === "map") {
        data = Buffer.from(await fs.readFile(`./tmp/${taskId}.jsonl`)).toString()
      } else if (tasks[taskId].type === "reduce") {
        let db = new ndb.JsonDB(new ndb.Config(`storage/${tasks[taskId].jobId}`, true, false, '/'))
        data = await db.getData(`/`)
      } else {
        console.error("Unrecognized kind of task")
        continue
      }
      console.log(`Sending ${tasks[taskId].type} task to worker`);
      picked.emit("task", { ...tasks[taskId], data })
    }
  }
}

const manageQueues = async () => {
  // Break the job into multiple tasks
  for (const jobId of jobQueue) {
    if (!jobs[jobId].divided) {
      exec(`gsplit --numeric-suffixes=1 -a 6 -C ${jobs[jobId].taskSize}K ./tmp/${jobId}.jsonl ./split/${jobId}`, async (err, stdout, stderr) => {
        console.log("Json split")
        if(err) {
          console.error(jobId, err)
        } else {
          jobs[jobId].divided = true
          jobs[jobId].mapTasks = []
          console.log(stderr);
          // const numTasks = parseInt(stdout.match(/Total files to be written: ([0-9]+)/)[1])
          // console.log(`${numTasks} tasks to create`)
          console.log("Removing job file")
          // try { fs.unlink(`./tmp/${jobId}.jsonl`) } catch (e) {}
          glob(`./split/${jobId}*`, {}, async (err, files) => {
            for (let i in files) {
              let taskId = base64id.generateId()
              console.log("Renaming task file")
              console.log(`job id: ${jobId}`);
              console.log(`task id: ${taskId}`);
              await fs.rename(files[i], `./tmp/${taskId}.jsonl`)
              console.log("After rename")
              let task = {
                taskId: taskId,
                jobId: jobId,
                taskSize: jobs[jobId].taskSize,
                assigned: false,
                result: false,
                type: "map",
                mapFn: jobs[jobId].map,
                reduceFn: jobs[jobId].reduce,
                data: []
              }
              tasks[taskId] = task
              jobs[jobId].mapTasks.push(taskId)
              taskQueue.push(taskId)
              console.log("Should manage task queue now")
              manageTaskQueue()
            }
          })
        }
      })
    }
  }
}

const allTasksFinished = (jobId, taskType) => {
  return !jobs[jobId] || jobs[jobId][taskType].every(taskId => tasks[taskId].result)
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
    console.log("Job received")
    await fs.writeFile(`./tmp/${job.jobId}.jsonl`, job.fileContent)
    console.log("Wrote to file")
    job.divided = false
    jobs[job.jobId] = job
    requesters[job.requesterId].jobs.push(job.jobId)
    jobQueue.push(job.jobId)
    await manageQueues()
  })

  socket.on("taskFinished", async taskResult => {
    busyWorkers[socket.id] = false
    tasks[taskResult.taskId].result = true
    let db = new ndb.JsonDB(new ndb.Config(`storage/${taskResult.jobId}`, true, false, '/'))
    await db.push(`/`, taskResult.result, false)
    await db.save()
    removeItem(taskQueue, taskResult.taskId)
    // try { fs.unlink(`./tmp/${taskResult.taskId}.jsonl`) } catch(e) {}

    if (tasks[taskResult.taskId].type === "map") {
      // check if this is map result, if it is, then save it to storage, 
      // and check if all the map tasks are finished, if they are all finished, then divide into (multiple) reduce tasks
      tasks[taskResult.taskId].result = taskResult.result
      if (allTasksFinished(taskResult.jobId, "mapTasks")) {
        let taskId = base64id.generateId()
        let task = {
          taskId: taskId,
          jobId: taskResult.jobId,
          taskSize: jobs[taskResult.jobId].taskSize,
          assigned: false,
          result: false,
          type: "reduce",
          reduceFn: jobs[taskResult.jobId].reduce,
          data: [] // initial!
        }
        tasks[taskId] = task
        jobs[taskResult.jobId].reduceTasks.push(taskId)
        taskQueue.push(taskId)
        manageTaskQueue()
        return
      }

    } else if (tasks[taskResult.taskId].type === "reduce") {
      // check if it is a reduce result, if it is, then save it to storage, 
      // and check if all the reduce tasks are finished, if they are, send result to requester
      if (allTasksFinished(taskResult.jobId, "reduceTasks")) {
        if (!jobs[taskResult.jobId]) { return }
        let requesterId = jobs[taskResult.jobId].requesterId
        let requesterSocketId = requesters[requesterId].socketId
        let requesterSocket = Array.from(await io.in("requester").fetchSockets()).find(socket => socket.id == requesterSocketId)
        delete jobs[taskResult.jobId]
        removeItem(jobQueue, taskResult.jobId)
        if (requesterSocket) {
          io.emit("jobFinished", taskResult)
          // try { fs.unlink(`./storage/${jobId}.json`) } catch(e) {}
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
    for (let taskId in tasks) {
      if (tasks[taskId].assigned === socket.id) {
        tasks[taskId].assigned = false
      }
    }
    manageQueues()
  })
})

http.listen(port, () => {
  console.log(`Socket.IO server running at http://localhost:${port}/`)
})
