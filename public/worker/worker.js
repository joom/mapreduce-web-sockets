var socket = io()

let id
socket.on("welcome", socketId => {
  id = socketId
  console.log(id)
})

socket.on("task", task => {
  // console.log(`new task!: ${task}`)
  console.log(task);

  let result = {}
  if (task.type === "map") {
    // freq example: task.data is an array of arrays
    const fn = eval(fn)
    for (const p in task.data) {
      let intermediate = fn(task.taskId, task.data[p]) // returns an array of {key, val}
      for (const q of intermediate) {
        if (result[q.key]) {
          result[q.key].push(q.val)
        } else {
          result[q.key] = [q.val]
        }
      }
    }
  } else if (task.type === "reduce") {
    /* {"candy": 1, "cake": [1,1]} */
    const fn = eval(fn)
    for (const p in task.data) {
      result[p] = fn(p, task.data[p])
    }
  } else {
    console.error("A task that's neither map nor reduce?!")
    // FIXME send a failure message
    return
  }
  socket.emit("taskFinished", {
    workerId: id,
    jobId: task.jobId,
    taskId: task.taskId,
    result: {success: true, body: result} 
  })
})
