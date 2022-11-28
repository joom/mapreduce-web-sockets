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
    // key is the hash for all keys that this reducer will reduce
    // values are merged lists of all such keys and their values (the "1") dummy value

    // e.g key = hash(key) % |reducers|,
    // val = javascript object with some number of keys that mapped to this hash:
        // "word": [1,1,1,1]    // if word was seen 4 times
        // "ward": [1,1]        // if ward was seen 2 times

    // SORTING is not necessary here because this is an identity function
    // output should just be all the keys included by the number of times they were included

    const matches = [];
    for (var key of Object.keys(values)) {
        let frequencies = values[key];
        // now push the word into matches for each occurrence of 1 in frequencies
        for (i in frequencies) {
            matches.push(key);
        }
    }
    return matches;

    /*
    const matches = [];
    for (i in values) {
        matches.push(key);  // push the matched word into matches |values| number of times
    }
    return matches;
    */
}

//var map1 = map("key", ["ward", "word", "wurd", "volvo", "bmw", "max", "time", "done", "wone", "pone", "one"], /w.rd/g)
//var map2 = map("key", ["ward", "word", "wurd", "volvo", "bmw", "max", "time", "done", "wone", "pone", "one"], /.*one/g)

//console.log(map1)
//console.log(map2)

