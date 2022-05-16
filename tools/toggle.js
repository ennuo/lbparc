const { XOR } = require('../index');
const { readFileSync, writeFileSync, existsSync } = require('fs');

const main = () => {
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
}

main();