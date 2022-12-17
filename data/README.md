Compilation: `javac JSONStringsLarge.java`

Run: `java JSONStringsLarge [filename.txt]`

Should produce `[filename.txt].json` in the same directory with two key value pairs, one for the word count in `[filename.txt]` and another with the array containing all the individual words in `[filename.txt]`.


You can generate `docs.jsonl` using `node generate.js docs.jsonl 10000`.
