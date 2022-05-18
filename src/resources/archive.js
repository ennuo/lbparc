const { readFileSync, existsSync, mkdirSync, writeFileSync, createWriteStream, fstat, open, openSync, writeSync, truncateSync, closeSync, appendFileSync } = require('fs');
const { join, dirname, basename } = require('path');
const { XOR } = require('../util/xor');
const { decompress, compress } = require('lzo');

const hstr = require('crc-32').str;
const crypto = require('crypto');

// List of UID->Paths for base game files.
const paths = require(join(__dirname, '../data/paths.json'));

// When a user packs their own files, keep track of their names,
// since the archive doesn't store them.
const custom = require(join(__dirname, '../data/custom.json'));

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
 * @property {number} nameHash - Hash of file name
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

    /** @type {Map<Number, ArchiveEntry>} - Entries stored in archive */
    #entries = new Map();
    
    /**
     * Parses an archive from path on disk.
     * @param {string} path - Path of resource 
     */
    constructor(path) {
        if (!existsSync(path)) return;
        const archive = readFileSync(path);

        let offset = 0;
        const read = (size, keyOffset = 0) => {
            const buffer = archive.slice(offset, offset + size);
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
        
        this.#entries = new Map();
        for (let i = 0; i < entryCount; ++i) {
            const offset = i * 0xC;
            const entry = {
                UID: entryTable.readUInt32LE(offset),
                offset: entryTable.readUInt32LE(offset + 4),
                size: entryTable.readUInt32LE(offset + 8)
            }
            this.#entries.set(entry.UID, entry);
        }

        const SIGCHECK = true;
        for (const entry of this.#entries.values()) {
            const data = archive.slice(entry.offset, entry.offset + entry.size);
            const magic = data.slice(0, data.length >= 4 ? 4 : data.length).toString('utf-8');
            // These resources don't get XOR'd
            if (!(magic == 'RIFF' || magic == '~SCE')) {
                XOR(data);
                entry.data = data.slice(0, data.length - 0x19);
                const info = data.slice(data.length - 0x19, data.length);
                const realSize = info.readUInt32LE(0);
                const isCompressed = info[0x4] == 1;
                entry.nameHash = info.slice(0x5, 0x9).readUint32LE(0);
                const MD5 = info.slice(0x9, 0x19);

                if (SIGCHECK) {
                    const path = paths[entry.UID] || custom[entry.UID];
                    if (path) {
                        if (entry.nameHash.toString('16') != crc32(basename(path)).toString('16'))
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
     * Patches another archive's data into this one.
     * @param {Archive} archive 
     */
    patch = archive => {
        for (const entry of archive.#entries.values())
            this.#entries.set(entry.UID, entry);
    }

    /**
     * Adds an entry to the archive.
     * @param {string} path - Path of file in archive 
     * @param {Buffer} data - Data to add to archive
     * @returns {ArchiveEntry} - Entry created
     */
    add = (path, data) => {
        path = path.replaceAll('\\', '/').toLowerCase();
        if (!path.startsWith('/')) path = '/' + path;

        // On unpack, if a path was unresolved, we use UNARCxUIDxHASH
        if (path.startsWith('/unarc')) {
            const [UID, nameHash] = path.substring(7).split('x').map(x => Number(x));
            const entry = {
                nameHash,
                UID,
                data
            }
            this.#entries.set(UID, entry);
            return entry;
        }

        const UID = crc32(path);
        const nameHash = crc32(basename(path));
        const entry = {
            nameHash,
            UID,
            data
        }
        this.#entries.set(UID, entry);
        return entry;
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

        const entry = this.#entries.get(query);
        if (entry) return entry.data;
        return null;
    }

    /**
     * Packs an archive from this instance
     * @param {string} path - Path to save this archive 
     */
    pack = path => {
        const header = Buffer.alloc(0xC);
        const entryTable = Buffer.alloc(this.#entries.size * 0xC);

        header.writeUint32LE(crc32(basename(path)), 0);
        header.writeUint32LE(this.version, 0x4);
        header.writeUint32LE(this.#entries.size, 0x8);

        const headerMD5 = md5(header);

        const archive = openSync(path, "w");
        truncateSync(path, 0x2C + entryTable.length);
        writeSync(archive, XOR(header), 0, header.length, 0);
        writeSync(archive, XOR(headerMD5), 0, headerMD5.length, 0xC);
        
        const entries = Array.from(this.#entries.values());
        let dataOffset = 0x2c + entryTable.length;
        const info = Buffer.alloc(0x19); // Temporary cache for file info data
        const SHOULD_COMPRESS = false;
        for (let i = 0; i < entries.length; ++i) {
            const entry = entries[i];
            const tableOffset = i * 0xC;

            let data = entry.data;
            const magic = data.slice(0, data.length >= 4 ? 4 : data.length).toString('utf-8');
            if (!(magic == 'RIFF' || magic == '~SCE')) {
                info.writeUint32LE(data.length, 0x0);
                info[0x4] = SHOULD_COMPRESS;
                info.writeUint32LE(entry.nameHash, 0x5);
    
                if (SHOULD_COMPRESS)
                    data = compress(data);
                
                data = Buffer.concat([ data, info ]);
    
                const hash = md5(data.slice(0, data.length - 0x10));
                for (let i = data.length - 0x10, j = 0; j < 0x10; ++i, ++j)
                    data[i] = hash[j];
                    
                appendFileSync(path, XOR(data));
            } else appendFileSync(path, data);

            entryTable.writeUint32LE(entry.UID, tableOffset + 0x0);
            entryTable.writeUint32LE(dataOffset, tableOffset + 0x4);
            entryTable.writeUInt32LE(data.length, tableOffset + 0x8);

            dataOffset += data.length;
        }

        const tableMD5 = md5(entryTable);

        writeSync(archive, XOR(entryTable, 0x10), 0, entryTable.length, 0x1c);
        writeSync(archive, XOR(tableMD5, Math.ceil((entryTable.length + 0x10) / 0x10) * 0x10), 0, tableMD5.length, entryTable.length + 0x1c);
        
        closeSync(archive);
    }

    /**
     * Unpacks this archive to a folder on disk.
     * @param {string} path - Folder to unpack to
     */
    unpack = path => {
        if (!existsSync(path))
            mkdirSync(path, { recursive: true });
        for (const entry of this.#entries.values()) {
            const translated = (paths[entry.UID] || custom[entry.UID]) ?? `UNARCx${entry.UID}x${entry.nameHash}`;
            if (paths[entry.UID] || custom[entry.UID]) 
                mkdirSync(join(path, dirname(translated)), { recursive: true })
            writeFileSync(join(path, String(translated)), entry.data, { recursive: true });
        }
    }
}

module.exports = Archive;