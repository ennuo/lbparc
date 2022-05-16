const { readFileSync, existsSync, mkdirSync, writeFileSync } = require('fs');
const { join, dirname } = require('path');
const { XOR } = require('../util/xor');
const { decompress } = require('lzo');

const crc32 = require('crc-32/crc32');
const paths = require(join(__dirname, '../data/paths.json'));

/**
 * @typedef ArchiveEntry
 * @type {object}
 * @property {number} UID - CRC32 hash of path in archive
 * @property {number} offset - Offset of data in archive
 * @property {number} size - Size of data in archive.
 * @property {byte[]} data - Data extracted from archive
 */

/**
 * Main container for resources in LBP PSP.
 */
class Archive {
    /** @type {number} - Version of archive */
    version = 1;

    /** @type {ArchiveEntry[]} - Entries stored in archive */
    entries = [];

    /** @type {Buffer} - Cached archive data, maybe I should remove this, not used anymore. */
    #data;

    /**
     * Parses an archive from path on disk.
     * @param {string} path - Path of resource 
     */
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

    /**
     * Attempts to extract data from the archive.
     * @param {number|string} query - UID or path of resource 
     * @returns {Buffer|null} - Extracted data, or null if it wasn't found
     */
    extract = query => {
        if (!query) return null;

        if (typeof query === 'string') {
            let fixed = query.replaceAll('\\', '/').toLowerCase();
            if (!fixed.startsWith('/'))
                fixed = '/' + fixed;
            query = ((~crc32.str(fixed)) >>> 0);
        }

        // Maybe I should add a UID -> byte[] map
        for (const entry of this.entries) 
            if (entry.UID == query)
                return entry.data;
        
        return null;
    }

    /**
     * Unpacks this archive to a folder on disk.
     * @param {string} path - Folder to unpack to
     */
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
}

module.exports = Archive;