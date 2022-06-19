const { Archive } = require('../index');
const { existsSync } = require('fs');
const { parse } = require('path');

const main = () => {
    if (process.argv.length < 3) {
        console.log('Usage: node unpack.js <archive>');
        return;
    }

    const paths = process.argv.slice(2, process.argv.length);
    for (const path of paths) {
        if (!existsSync(path)) {
            console.error(`${path} is missing!`);
            return;
        }
    }

    const archive = new Archive(paths[0]);
    for (let i = 1; i < paths.length; ++i)
        archive.patch(new Archive(paths[i]));
    
    
    console.log('Decrypting and parsing archive(s)...');
    const folder = parse(paths[0]).name;

    console.log(`Unpacking archive to ${folder}`);
    archive.unpack(folder, true);
    console.log('Unpack complete!');
}

main();