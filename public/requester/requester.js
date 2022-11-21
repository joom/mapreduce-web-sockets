import {CodeJar} from '../codejar.js'

const highlight = editor => {
  editor.innerHTML = Prism.highlight(editor.textContent, Prism.languages.javascript, 'javascript')
}

const jarOptions = { tab: '  ' }
let mapJar = CodeJar(document.querySelector("#map"), highlight, jarOptions)
let reduceJar = CodeJar(document.querySelector("#reduce"), highlight, jarOptions)

var socket = io()
let id
socket.on("welcome", socketId => {
  id = socketId
  console.log(id)
})

document.querySelector(`button[type="submit"]`).addEventListener("click", e => {
  e.preventDefault()
  if (document.querySelector("#file").files.length !== 1) {
    alert("Please select only one data file.")
    return
  }

  let job = {
    requesterId: id,
    jobId: crypto.randomUUID(),
    file: document.querySelector("#file").files[0],
    map: document.querySelector("#map").innerText,
    reduce: document.querySelector("#reduce").innerText
  }
  socket.emit("job", job)
})

socket.on("jobFinished", jobResult => {
  if (jobResult.result.success) {
    alert(`job succeeded with result ${jobResult.result}`)
  } else {
    alert(`job failed with result ${jobResult.result}`)
  }
})
