import {CodeJar} from '../codejar.js'

const highlight = editor => {
  editor.innerHTML = Prism.highlight(editor.textContent, Prism.languages.javascript, 'javascript')
}

const jarOptions = { tab: '  ' }
let mapJar = CodeJar(document.querySelector("#map"), highlight, jarOptions)
let reduceJar = CodeJar(document.querySelector("#reduce"), highlight, jarOptions)

var socket = io()
// socket.emit("introduction", { kind: "requester" })

document.querySelector(`button[type="submit"]`).addEventListener("click", e => {
  e.preventDefault()
  socket.emit("job", "i have a job for you")
})

socket.on("jobFinished", result => {
  alert(`job finished with result ${result}`)
})
