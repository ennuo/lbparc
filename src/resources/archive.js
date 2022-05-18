const { readFileSync, existsSync, mkdirSync, writeFileSync } = require('fs');
const { join, dirname, basename } = require('path');
const { XOR } = require('../util/xor');
const { decompress } = require('lzo');

const hstr = require('crc-32').str;
const crypto = require('crypto');
const paths = require(join(__dirname, '../data/paths.json'));

const md5 = data => {
    const hasher = crypto.createHash('md5');
    hasher.update(data);
    return hasher.digest();
}

const crc32 = string => {
    return (~hstr(string.toLowerCase())) >>> 0;
}

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
        const read = (size, keyOffset = 0) => {
            const buffer = this.#data.slice(offset, offset + size);
            offset += size;
            return XOR(buffer, keyOffset);
        }

        const header = read(0xC);
        const nameHash = header.readUInt32LE(0);
        if (nameHash != crc32(basename(path)))
            console.log(`Filename CRC32 hash mismatch! Continuing anyway, but the game will fail to load this!`);
        this.version = header.readUInt32LE(4);
        const entryCount = header.readUInt32LE(8);
        const headerMD5 = read(0x10);
        if (headerMD5.toString('hex') != md5(header).toString('hex'))
            console.log(`Header MD5 hash mismatch! Continuing anyway, but the game will fail to load this!`);
        
        const entryTable = read(entryCount * 0xC, 0x10);
        const entryTableMD5 = read(0x10, Math.ceil((offset - 0xC) / 0x10) * 0x10);
        if (md5(entryTable).toString('hex') != entryTableMD5.toString('hex'))
            console.log(`Entry Table MD5 hash mismatch! Continuing anyway, but the game will fail to load this!`);
        
        for (let i = 0; i < entryCount; ++i) {
            let offset = i * 0xC;
            this.entries.push({
                UID: entryTable.readUInt32LE(offset),
                offset: entryTable.readUInt32LE(offset + 4),
                size: entryTable.readUInt32LE(offset + 8)
            });
        }

        const SIGCHECK = true;
        for (const entry of this.entries) {
            const data = this.#data.slice(entry.offset, entry.offset + entry.size);
            const magic = data.slice(0, data.length >= 4 ? 4 : data.length).toString('utf-8');
            // These resources don't get XOR'd
            if (!(magic == 'RIFF' || magic == '~SCE')) {
                XOR(data);
                entry.data = data.slice(0, data.length - 0x19);
                const info = data.slice(data.length - 0x19, data.length);
                const realSize = info.readUInt32LE(0);
                const isCompressed = info[0x4] == 1;
                const pathHash = info.slice(0x5, 0x9).readUint32LE(0);
                const MD5 = info.slice(0x9, 0x19);

                if (SIGCHECK) {
                    const path = paths[entry.UID];
                    if (path) {
                        if (pathHash.toString('16') != crc32(basename(path)).toString('16'))
                            throw new Error('Filename CRC32 mismatch!');
                    }
                    if (MD5.toString('hex') != md5(data.slice(0, data.length - 0x10)).toString('hex'))
                        throw new Error('MD5 mismatch!');
                }
                
                if (isCompressed)
                    entry.data = decompress(entry.data, realSize);
            } else entry.data = data;
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
            query = crc32(fixed);
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