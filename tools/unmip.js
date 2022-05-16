
const { Texture } = require('../index');
const { existsSync, writeFileSync } = require('fs');
const { parse, basename, extname } = require('path');

const main = () => {
    if (process.argv.length != 3) {
        console.log('Usage: node unmip.js <mip>');
        return;
    }
    
    const path = process.argv[2];
    if (!existsSync(path)) {
        console.log(`${path} does not exist!`);
        return;
    }

    const texture = Texture.load(path);

    writeFileSync(
        path.slice(0, path.length - extname(path).length) + '.png',
        texture.data
    );
}

main();