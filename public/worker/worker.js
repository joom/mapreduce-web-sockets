var socket = io()

let id
socket.on("welcome", socketId => {
  id = socketId
  console.log(id)
})

socket.on("task", task => {
  console.log(`new task!: ${task}`)
  socket.emit("taskFinished", {
    workerId: id,
    jobId: task.jobId,
    result: {success: true, body: 42} 
  });
})
