const { XOR } = require('./src/xor');
const { readFileSync, writeFileSync, existsSync } = require('fs');

if (process.argv.length != 3) {
    console.log('Usage: node toggle.js <data>');
    return;
}

const path = process.argv[2];
if (!existsSync(path)) {
    console.log(`${path} does not exist!`);
    return;
}

const data = readFileSync(path);
writeFileSync(path, XOR(data));
