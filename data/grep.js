// key is the map split name 
// value is the collection of words we are evaluating that are part of this split
// pattern is the regex we are trying to grep
function map(key, value) {
    let intermediate = []
    let words = value.split(" ")
    for (const i in words) {
        if (words[i].match(/ing/)) {
            intermediate.push({key: words[i], val: 1})
        }
    }
    return intermediate
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
    return [values.reduceRight((x,y)=>x+y, 0)]
}

//var map1 = map("key", ["ward", "word", "wurd", "volvo", "bmw", "max", "time", "done", "wone", "pone", "one"], /w.rd/g)
//var map2 = map("key", ["ward", "word", "wurd", "volvo", "bmw", "max", "time", "done", "wone", "pone", "one"], /.*one/g)

//console.log(map1)
//console.log(map2)

