function map(key, value) {
    const myKeys = func()
    var myKeysObject = {}
    // myKeys.sort() already sorted

    for (var i = 0; i < myKeys.length; i++) {
        myKeysObject[myKeys[i]] = i
    }

    // output keys will be the indices of the k-gram that starts the word
    var intermediateKeys = []
    for (i in value) {
        if (value[i].length == 1) {
            let key = myKeysObject[value[i]]
            let word = value[i]
            intermediateKeys.push({key, word}) // just equal to the word
        }
        else {
            // in this case the word is of length greater than one, so find the 2-gram it starts with
            let twoGram = value[i].slice(0, 2)
            let key = myKeysObject[twoGram]
            let word = value[i]
            intermediateKeys.push({key, word})
        }
    }

    return intermediateKeys
}

/* partition function by the master should take appropriate key ranges and send them
    to the corresponding reducer so that reduce worker #i has all the words that are less than
    those sent to reduce worker #i+1
*/

function reduce(key, value) {
    // key will be some index label, and value will be a collection of all words that mapped to that key

    let result = []
    for (i of value) {
        result.push(i)
    }
    return result.sort()    // an n log n sort

    // Q: what about the case where value is too large to fit into memory at once??
}

// gives us all <= 2-grams in the alphabet
function func() {
    let alphabet = "abcdefghijklmnopqrstuvwxyz"
    const myArray = alphabet.split("")

    //console.log(myArray)

    for (var i = 0; i < 26; i++) {
        for (var j = 0; j < 26; j++) {
            let str = alphabet[i] + alphabet[j]
            myArray.push(str)
        }
    }

    //console.log(myArray)
    console.log(myArray.length)
    return myArray
}

let ex = map("somekey", ["i", "had", "a", "good", "day", "today", "good", "good"])
console.log(ex)

let reduceEx = reduce(1, ["time", "done", "words", "behind", "me"])
console.log(reduceEx)