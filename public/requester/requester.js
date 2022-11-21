import {CodeJar} from '../codejar.js'

const highlight = editor => {
  editor.innerHTML = Prism.highlight(editor.textContent, Prism.languages.javascript, 'javascript')
}

const jarOptions = { tab: '  ' }
let mapJar = CodeJar(document.querySelector("#map"), highlight, jarOptions)
let reduceJar = CodeJar(document.querySelector("#reduce"), highlight, jarOptions)

// from https://stackoverflow.com/a/18650828/2016295
const formatBytes = (bytes, decimals = 2) => {
    if (!+bytes) return '0 Bytes'
    const k = 1024
    const dm = decimals < 0 ? 0 : decimals
    const sizes = ['bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`
}

// destructively remove the first element for which fn returns true
const findAndRemove = (array, fn) => {
  for (let i in array) {
    if (fn(array[i])) {
        array.splice(i, 1)
        break
    }
  }
}

let fileInput = document.querySelector("#file")
const showFileSize = () => {
  let file = fileInput.files[0]
  document.querySelector('#fileSize').innerHTML = `${file.name} is ${formatBytes(file.size)}.`
}
fileInput.addEventListener("change", showFileSize)
if (fileInput.files.length === 1) { showFileSize() }

var socket = io()
let id
if (localStorage.requesterId) {
  id = localStorage.requesterId
} else {
  id = crypto.randomUUID()
  localStorage.requesterId = id
}
socket.emit("requesterId", id)

const renderJobs = () => {
  let temp = ``

  myJobs.forEach(job => {
    let status
    let results = ``
    let error = ``
    switch (job.status) {
      case -1:
        status = `<small class="text-nowrap" style="color:var(--bs-danger);">Failed</small>`
        results = `<hr>`
        break;
      case 0:
        status = `<small class="text-nowrap" style="color:var(--bs-warning);">In progress</small>`
        break;
      case 1:
        status = `<small class="text-nowrap" style="color:var(--bs-success);">Success!</small>`
        results = `<hr>`
        break;
      default:
        console.error("Unknown status!")
        return
    }

    job.results.forEach((result, i) => {
      results += `<p class="mb-0 opacity-75"><a href="#">Result ${i}</a>: ${result}</p>`
    })
    if (job.error) {
      error = `<p class="mb-0" style="color:var(--bs-danger); font-weight: bold;">${job.error}</p>`
    }
    temp += `<div class="list-group-item list-group-item-action d-flex gap-3 py-3" aria-current="true">
                <div class="d-flex gap-2 w-100 justify-content-between">
                  <div>
                    <h6 class="mb-0">${job.fileName}</h6>
                    ${results}
                    ${error}
                  </div>
                  ${status}
                  <small class="text-nowrap delete" style="color:var(--bs-danger); cursor: pointer;" data-id="${job.jobId}">×</small>
                </div>
              </div> `
  })

  document.querySelector('#myJobs').innerHTML = temp
  let deletes =  document.querySelectorAll('small.delete')
  for (let adelete of deletes) {
    adelete.addEventListener("click", e => {
      let jobId = e.target.attributes["data-id"].value
      findAndRemove(myJobs, job => job.jobId === jobId)
      localStorage.jobs = JSON.stringify(myJobs)
      renderJobs()
    })
  }
}

let myJobs
if (localStorage.jobs) {
  myJobs = JSON.parse(localStorage.jobs)
  renderJobs()
} else {
  localStorage.jobs = []
  myJobs = []
}

document.querySelector(`button[type="submit"]`).addEventListener("click", e => {
  e.preventDefault()
  if (document.querySelector("#file").files.length !== 1) {
    alert("Please select only one data file.")
    return
  }
  let file = document.querySelector("#file").files[0]

  let job = {
    requesterId: id,
    jobId: crypto.randomUUID(),
    fileName: file.name,
    fileContent: file,
    map: document.querySelector("#map").innerText,
    reduce: document.querySelector("#reduce").innerText
  }
  socket.emit("job", job)
  job.status = 0 // in progress
  job.results = []
  delete job.fileContent
  myJobs.push(job)
  localStorage.jobs = JSON.stringify(myJobs)
  renderJobs()
})

socket.on("jobFinished", jobResult => {
  let i = myJobs.findIndex(job => job.jobId === jobResult.jobId)
  if (i === -1) { console.error("Job cannot be found locally") }
  if (jobResult.result.success) {
    myJobs[i].status = 1
    myJobs[i].results.push(jobResult.result.body)
  } else {
    myJobs[i].status = -1
    myJobs[i].error = jobResult.result.error
  }
  localStorage.jobs = JSON.stringify(myJobs)
  renderJobs()
})
