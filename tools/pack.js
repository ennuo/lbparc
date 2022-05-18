
const { existsSync, writeFileSync, statSync, promises: { readdir }, readFileSync } = require('fs');
const { join, resolve, extname } = require('path');
const { Archive, Texture } = require('../index');
const paths = require(join(__dirname, '../src/data/paths.json'));
const custom = require(join(__dirname, '../src/data/custom.json'));

async function* getFiles(dir) {
    const dirents = await readdir(dir, { withFileTypes: true });
    for (const dirent of dirents) {
        const res = resolve(dir, dirent.name);
        (dirent.isDirectory()) ? yield* getFiles(res) : yield res;
    }
}

const main = async () => {
    if (process.argv.length != 3) {
        console.log('Usage: node pack.js <folder>');
        return;
    }
    
    const path = process.argv[2];
    if (!existsSync(path)) {
        console.log(`${path} does not exist!`);
        return;
    }

    if (!statSync(path).isDirectory()) {
        console.log('Archive pack source must be a folder!');
        return;
    }

    const archive = new Archive();

    for await (let file of getFiles(path)) {
        let data = readFileSync(file);

        file = file.substring(path.length).replaceAll('\\', '/').toLowerCase();
        if (!file.startsWith('/')) file = '/' + file;

        if (file.endsWith('.png') || file.endsWith('.jpg') || file.endsWith('.jpeg')) {
            data = await Texture.import(data);
            file = file.slice(0, file.length - extname(file).length) + '.mip'
        }

        const entry = archive.add(file, data);

        // If the path doesn't exist in base, it's probably user-created,
        if (!paths[entry.UID] && !file.startsWith('/unarc'))
            custom[entry.UID] = file;
    }

    archive.pack(path + '.arc');

    // Update custom paths
    writeFileSync(join(__dirname, '../src/data/custom.json'), JSON.stringify(custom, null, 2));
}

main();