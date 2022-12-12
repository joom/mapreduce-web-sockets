function map(key, value) {
    const result = []
    let val = 1
    for (i of value) {
        let key = i
        result.push({key, val})
    }

    return result
}

/*
    map produces an array with all encountered words (keys) and a count of 1

    master then takes this input and applies a combiner/merge function on all
    results from all mappers so that each key/word is associated with a value 
    that is an array of 1s of length === number of occurrences of that key/word

    master then uses a partition function to send work to reducer
    reducer then sorts the input by key, and calls reduce(key, value) for all key/value
    pairs sent to it by the master
*/

function reduce(key, values) {
    let count = 0
    for (i of values) {
        count+=i
    }
    return [count]
}

/* 

reduce() counts all ones and outputs a js key/value object
with the key (word) and its count back to the calling reduce worker

*/

console.log(map("docname", ["this", "this", "word", "word", "done", "right", "right"]))
/*
 OUTPUT
[
  { key: 'this', val: 1 },
  { key: 'this', val: 1 },
  { key: 'word', val: 1 },
  { key: 'word', val: 1 },
  { key: 'done', val: 1 },
  { key: 'right', val: 1 },
]

*/

let test = {key: "this", arr:[1,1,1,1,1,1,1,1]}
console.log(reduce(test.key, test.arr))
/*
OUTPUT
{ this: [8] }
*/
