
const { Texture } = require('../index');
const { existsSync, writeFileSync } = require('fs');
const { extname } = require('path');

const main = async () => {
    if (process.argv.length != 3) {
        console.log('Usage: node mip.js <mip>');
        return;
    }
    
    const path = process.argv[2];
    if (!existsSync(path)) {
        console.log(`${path} does not exist!`);
        return;
    }

    const texture = await Texture.import(path);

    writeFileSync(
        path.slice(0, path.length - extname(path).length) + '.mip',
        texture
    );
}

main();