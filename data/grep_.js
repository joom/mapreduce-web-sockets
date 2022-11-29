function map(key, value, pattern) {
    // key is the map split name 
    // value is the collection of words we are evaluating that are part of this split
    // pattern is the regex we are trying to grep

    let intermediateKV = {};        // k-V store for output
    for (i in value) {
        if (value[i].match(pattern)) {
            intermediateKV[value[i]] = 1;  // value is just a dummy value
        }
    }
    return intermediateKV;
}

/*
After Mapper phase is complete, and master has gotten a list of key value stores
it should first:
- do a merge step, where each key has all of its values added to one list
- it should then partition the keys across the reducers hash(key) % |reducers|
- finally send to the reducer <hash(key)%|reducers|, list(mergedKeyVals)>

or use the described sorting and shuffling API in Hadoop
*/

function reduce(key, values) {
    // key is going to be the word that has been grepped
    // values will be dummy values (1) in an array of size == no. of occurrences of key

    const matches = [];
    for (i of values) {
        matches.push(key);  // push the matched word into matches |values| number of times
    }
    return matches;
}

/*
master ought to merge all values of a particular key into one set
before sending reducer its set of keys that its working on

output to reducer: 
key (hash(key) % |reducers|), 
val = js k-v object with keys that mapped to this hash, along with a set of all their grouped values in an array
*/

/*
reducer pseudocode

first sort the list of keys so that they are grouped together
call reduce() with each key in the object
append output to the final output file being maintained by reduce worker
*/

//var map1 = map("key", ["ward", "word", "wurd", "volvo", "bmw", "max", "time", "done", "wone", "pone", "one"], /w.rd/g)
//var map2 = map("key", ["ward", "word", "wurd", "volvo", "bmw", "max", "time", "done", "wone", "pone", "one"], /.*one/g)

//console.log(map1)
//console.log(map2)

//console.log(reduce("ten", [1,1,1,1,1]))

