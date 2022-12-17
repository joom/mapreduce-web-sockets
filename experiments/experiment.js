const puppeteer = require('puppeteer')

// let workerOptions = [3,5,7]
// let fileSizeOptions = [7,22,58] // megabytes
// let taskSizeOptions = [1000, 5000, 10000] // kilobytes
// let failureChances = [0, 0.01, 0.1]
let workerOptions = [5]
let fileSizeOptions = [14] // megabytes
let taskSizeOptions = [1000] // kilobytes
let failureChances = [0, 0.01, 0.05, 0.1, 0.2, 0.3]

// let experiments = [{workers: 3, fileSize: 7, taskSize: 100, failureChance: 0.4}]
let experiments = []

for (let workers of workerOptions) {
  for (let fileSize of fileSizeOptions) {
    for (let taskSize of taskSizeOptions) {
      for (let failureChance of failureChances) {
        experiments.push({workers, fileSize, taskSize, failureChance})
      }
    }
  }
}

// const rand = Math.random() < 0.5

const run = async (experiment) => {
  const browser = await puppeteer.launch({headless: true})
  let workers = []
  let intervals = []
  for (let i = 0; i < experiment.workers; i++) {
    let page = await browser.newPage()
    await page.goto('http://localhost:3000/worker/')
    intervals.push(setInterval(async () => { 
      if (Math.random() < experiment.failureChance) {
        page.reload()
      }
    }, 1000))
    workers.push(page)
  }

  let requester = await browser.newPage()
  await requester.goto('http://localhost:3000/requester/')

  const input = await requester.$('input[type="file"]')
  await input.uploadFile(`/Users/joomy/mapreduce/data/size${experiment.fileSize}.jsonl`)

  await requester.$eval('input[type="number"]', (el, taskSize) => el.value = taskSize, experiment.taskSize)

  await requester.click('button')
  await requester.waitForSelector('.time', {timeout: 0})

  const time = await requester.evaluate(sel => {
    return document.querySelector(sel).innerText
  }, '.time')

  for (let interval of intervals) { clearInterval(interval) }
  try{ await requester.close() } catch(e) {}
  for (let worker of workers) { try{ await worker.close() } catch(e) {} }

  try { await browser.close() } catch(e) {}
  // console.log(`It took ${time} seconds!!!`)
  return parseFloat(time)
  

}

(async () => {
  for(let i in experiments) {
    // console.log(`Starting experiment ${i}`)
    experiments[i].result = await run(experiments[i])
    console.log(experiments[i])
  }
  // console.log(`Finished all experiments`)
  // console.log(JSON.stringify(experiments))
})()
