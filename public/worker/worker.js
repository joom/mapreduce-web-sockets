var socket = io()

let id
socket.on("welcome", socketId => {
  id = socketId
  console.log(id)
})

socket.on("task", task => {
  console.log("new task!", task)

  let result = {}
  let data = task.data
  if (task.type === "map") {
    // freq example: task.data is an array of arrays
    const mapFn = eval(`(${task.mapFn})`)
    const reduceFn = eval(`(${task.reduceFn})`)
    for (const p in data) {
      let intermediate = mapFn(task.taskId, data[p]) // returns an array of {key, val}
      for (const q of intermediate) {
        if (result[q.key]) {
          result[q.key].push(q.val)
        } else {
          result[q.key] = [q.val]
        }
      }
    }
    for (const p in result) {
      result[p] = reduceFn(p, result[p])
    }
    console.log(result)
  } else if (task.type === "reduce") {
    const reduceFn = eval(`(${task.reduceFn})`)
    /* {"candy": 1, "cake": [1,1]} */
    for (const p in data) {
      result[p] = reduceFn(p, data[p])
    }
    console.log(result)
  } else {
    console.error("A task that's neither map nor reduce?!")
    // FIXME send a failure message
    return
  }
  console.log("Sending result!");
  socket.emit("taskFinished", {
    workerId: id,
    jobId: task.jobId,
    taskId: task.taskId,
    status: 1,
    result
  })
})
