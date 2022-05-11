const { readFileSync, existsSync, mkdirSync, writeFileSync } = require('fs');
const { join, dirname } = require('path');
const { XOR } = require('./xor');
const { decompress } = require('lzo');
const paths = require(join(__dirname, 'paths.json'));

module.exports = class Archive {
    version = 1;
    entries = [];
    #data;

    constructor(path) {
        if (!existsSync(path)) return;
        this.#data = readFileSync(path);
        let offset = 0;
        const read = (size, rounds = 0) => {
            const buffer = this.#data .slice(offset, offset + size);
            offset += size;
            return XOR(buffer, rounds);
        }

        const header = read(0xC);
        header.readUInt32LE(0); // Unknown
        this.version = header.readUInt32LE(4);
        const entryCount = header.readUInt32LE(8);

        let entryTable = read(0x10 + (entryCount * 0xC));
        const hash = entryTable.slice(0, 0x10);
        entryTable = entryTable.slice(0x10, entryTable.length);
        this.entries = [];
        
        for (let i = 0; i < entryCount; ++i) {
            let offset = i * 0xC;
            this.entries.push({
                UID: entryTable.readUInt32LE(offset),
                offset: entryTable.readUInt32LE(offset + 4),
                size: entryTable.readUInt32LE(offset + 8)
            });
        }

        for (const entry of this.entries) {
            const data = XOR(this.#data .slice(entry.offset, entry.offset + entry.size));
            entry.data = data.slice(0, data.length - 0x19);
            const info = data.slice(data.length - 0x19, data.length);
            const realSize = info.readUInt32LE(0);
            const isCompressed = info[0x4] == 1;
            const SHA1 = info.slice(0x5, 0x19)
            if (isCompressed)
                entry.data = decompress(entry.data, realSize);
        }
    }

    unpack = path => {
        if (!existsSync(path))
            mkdirSync(path, { recursive: true });
        for (const entry of this.entries) {
            const translated = paths[entry.UID] ?? entry.UID;
            if (paths[entry.UID]) 
                mkdirSync(join(path, dirname(translated)), { recursive: true })
            writeFileSync(join(path, String(translated)), entry.data, { recursive: true });
        }
    }

    save = path => writeFileSync(path + '.arc.dec', this.#data);

}