var socket = io()

socket.on("task", task => {
  console.log(`new task!: ${task}`)
  socket.emit("taskFinished", 42);
})
