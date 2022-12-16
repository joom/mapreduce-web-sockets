let filePath
if(process.argv.length > 2) {
  filePath = process.argv[2]
} else {
  throw new Error("No file path")
}
let numDocs
let numWordsInDoc = 100
if(process.argv.length > 3) {
  numDocs = process.argv[3]
} else {
  throw new Error("No number of document")
}

const words = require("./cupcake.json")
const fillers = require("./filler.json")
const fs = require("fs")

const random = arr => arr[Math.floor(Math.random() * arr.length)] 

const stream = fs.createWriteStream(filePath)
// stream.write(`[`)

for (let i = 1; i <= numDocs; i++) {
  stream.write(`"`)
  for (let j = 1; j <= numWordsInDoc; j++) {
    stream.write(random(j % 5 === 0 ? fillers : words))
    if (j != numWordsInDoc) {stream.write(` `)}
  }
  stream.write(`"`)
  if (i != numDocs) {stream.write(`\n`)}
}

// stream.write(`]`)
stream.end()
