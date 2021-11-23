const Archive = require('./src/archive');
const { existsSync } = require('fs');
const { parse } = require('path');

if (process.argv.length != 3) {
    console.log('Usage: node unpack.js <archive>');
    return;
}

const path = process.argv[2];
if (!existsSync(path)) {
    console.log(`${path} does not exist!`);
    return;
}

console.log('Decrypting and parsing archive...');
const archive = new Archive(path);
const folder = parse(path).name;
console.log(`Unpacking archive to ${folder}`);
archive.unpack(folder);
console.log('Unpack complete!');