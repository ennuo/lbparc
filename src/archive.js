const { readFileSync, existsSync, mkdirSync, writeFileSync } = require('fs');
const { join } = require('path');
const { XOR } = require('./xor');
const { decompress } = require('lzo');
module.exports = class Archive {
    version = 1;
    entries = [];

    constructor(path) {
        if (!existsSync(path)) return;
        const archive = readFileSync(path);
        let offset = 0;
        const read = (size, rounds = 0) => {
            const buffer = archive.slice(offset, offset + size);
            offset += size;
            return XOR(buffer, rounds);
        }

        const header = read(0xC);
        header.readUInt32LE(0); // Unknown
        this.version = header.readUInt32LE(4);
        const entryCount = header.readUInt32LE(8);

        const hash = read(0x10);

        const entryTable = read(entryCount * 0xC, 1);
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
            const data = XOR(archive.slice(entry.offset, entry.offset + entry.size));
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
        for (const entry of this.entries)
            writeFileSync(join(path, String(entry.UID)), entry.data);
    }

}