const { existsSync, readFileSync } = require('fs');

/**
 * Utilities for reading binary data from a data source.
 */
class MemoryInputStream {
    /**
     * @type {Buffer} Underlying data source carried by this stream.
     */
    #buffer;

    /**
     * @type {boolean} Whether or not this stream is reading in little endian.
     */
    #isLittleEndian = true;

    /**
     * @type {number} Current offset in the buffer.
     */
    #offset = 0;

    /**
     * Creates a memory input stream from a data source.
     * @param {string|Buffer} input  - Data source
     */
    constructor(input) {
        if (!input) 
            throw new Error('Some form of data must be provided to MemoryInputStream constructor!');
        if (typeof input === 'string') {
            if (!existsSync(input))
                throw new Error(`File at location ${input} does not exist!`);
            this.#buffer = readFileSync(input);
        } else if (Buffer.isBuffer(input))
            this.#buffer = input;
    }

    /**
     * Skips forward a specified number of bytes.
     * @param {number} offset - Number of bytes to skip
     * @returns {number} - New offset
     */
    forward = offset => this.#offset += offset;

    /**
     * Aligns the stream to a boundary.
     * @param {4} boundary - Boundary to align against.
     * @param {number} [start] - Point to relatively align to, defaults to origin.
     */
    align = (boundary, start = 0) => {
        let modulo = (this.#offset - start) % boundary;
        if (modulo != 0)
            this.#offset += (boundary - modulo);
    }

    /**
     * Reads either a fixed or null terminated string from the stream.
     * @param {number?} - Optional length of stream, reads null terminated if not present
     * @returns {string} - String read from the stream
     */
    str = (size) => {
        if (size)
            return this.bytes(size).toString('utf-8');
        const value = this.bytes(this.#buffer.indexOf('\0', this.#offset) - this.#offset).toString('utf-8');
        this.#offset++; // Skip past null terminator
        return value;
    }

    /**
     * Reads a length-prefixed byte array from the stream.
     * @returns {Buffer} - Bytes read from the stream
     */
    bytearray = () => this.bytes(this.u32());

    /**
     * Reads a specified number of bytes from the stream.
     * @param {number} size - Number of bytes to read
     * @returns {Buffer} - Bytes read from the stream
     */
    bytes = size => this.#buffer.slice(this.#offset, this.#offset += size);

    /**
     * Reads a 32-bit floating point number from the stream.
     * @returns {import('./types').float} - Floating point read from the stream
     */
    f32 = () => {
        const value = this.#isLittleEndian ? 
            this.#buffer.readFloatLE(this.#offset) : this.#buffer.readFloatBE(this.#offset);
        this.#offset += 4;
        return value;
    }

    /**
     * Reads a 4x4 matrix from the stream.
     * @returns {import('./types').m44} - 4x4 matrix read from the stream
     */
    m44 = () => {
        const value = [];
        for (let i = 0; i < 16; ++i)
            value.push(this.f32());
        return value;
    }

    /**
     * Reads an unsigned 32-bit integer from the stream.
     * @returns {number} - 32-bit unsigned integer read from the stream
     */
    u32 = () => {
        const value = this.#isLittleEndian ? 
            this.#buffer.readUint32LE(this.#offset) : this.#buffer.readUint32BE(this.#offset);
        this.#offset += 4;
        return value;
    }

    /**
     * Reads a signed 32-bit integer from the stream.
     * @returns {number} - 32-bit signed integer read from the stream
     */
    s32 = () => {
        const value = this.#isLittleEndian ? 
            this.#buffer.readInt32LE(this.#offset) : this.#buffer.readInt32BE(this.#offset);
        this.#offset += 4;
        return value;
    }


    /**
     * Reads an unsigned short from the stream.
     * @returns {number} - Unsigned short read from the stream
     */
    u16 = () => {
        const value = this.#isLittleEndian ? 
            this.#buffer.readUint16LE(this.#offset) : this.#buffer.readUint16BE(this.#offset);
        this.#offset += 2;
        return value;
    }

    /**
     * Reads a signed short from the stream.
     * @returns {number} - Signed short read from the stream
     */
    s16 = () => {
        const value = this.#isLittleEndian ? 
            this.#buffer.readInt16LE(this.#offset) : this.#buffer.readInt16BE(this.#offset);
        this.#offset += 2;
        return value;
    }

    /**
     * Reads an unsigned byte from the stream.
     * @returns {number} - Unsigned byte read from the stream
     */
    u8 = () => this.#buffer[this.#offset++];

    /**
     * Reads a signed byte from the stream.
     * @returns {number} - Signed byte read from the stream
     */
    s8 = () => this.#buffer.readInt8(this.#offset++);

    /**
     * @returns {number} - Current offset in the stream.
     */
    get offset() { return this.#offset; }
}

module.exports = MemoryInputStream;