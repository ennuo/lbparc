/**
 * Utilities for writing binary data to a byte array.
 */
class MemoryOutputStream {
    /**
     * @type {Buffer} Underlying data source carried by this stream.
     */
    buffer;

    /**
     * @type {number} Size of the underlying buffer.
     */
    size;

    /**
     * @type {boolean} Whether or not this stream is reading in little endian.
     */
    #isLittleEndian = true;

    /**
     * @type {number} Current offset in the buffer.
     */
    #offset = 0;

    /**
     * Creates a memory output stream of specified size.
     * @param {number} size - Size of buffer
     */
    constructor(size) {
        this.buffer = Buffer.alloc(size);
        this.size = size;
    }

    /**
     * Writes an arbitrary number of bytes to the stream.
     * @param {Buffer} value - Bytes to write
     */
    bytes = value => {
        for (let i = 0; i < value.length; ++i, this.#offset++)
            this.buffer[this.#offset] = value[i];
    }

    /**
     * Writes a 16-bit unsigned integer to the stream.
     * @param {number} value - Unsigned short to write
     */
    u16 = value => {
        if (this.#isLittleEndian)
            this.buffer.writeUInt16LE(value, this.#offset);
        else
            this.buffer.writeUint16BE(value, this.#offset);
        this.#offset += 2;
    }

    /**
     * Writes a 32-bit unsigned integer to the stream.
     * @param {number} value - Unsigned integer to write
     */
    u32 = value => {
        if (this.#isLittleEndian)
            this.buffer.writeUInt32LE(value, this.#offset);
        else
            this.buffer.writeUInt32BE(value, this.#offset);
        this.#offset += 4;
    }

    /**
     * Writes a 32-bit signed integer to the stream.
     * @param {number} value - Signed integer to write
     */
    s32 = value => {
        if (this.#isLittleEndian)
            this.buffer.writeInt32LE(value, this.#offset);
        else
            this.buffer.writeInt32BE(value, this.#offset);
        this.#offset += 4;
    }

    /**
     * Writes a 32-bit floating point number to the stream.
     * @param {import('./types').float} value - Floating point number to write
     */
    f32 = value => {
        if (this.#isLittleEndian)
            this.buffer.writeFloatLE(value, this.#offset);
        else
            this.buffer.writeFloatBE(value, this.#offset);
        this.#offset += 4;
    }

    /**
     * Writes an arbitrary number of 32-bit floating point numbers to the stream.
     * @param {(import('./types').float)[]} value - Floating point numbers to write
     */
    vector = value => {
        for (const element of value)
            this.f32(element);
    }

    /**
     * @returns {number} - Current offset in the stream.
     */
    get offset() { return this.#offset; }
}

module.exports = MemoryOutputStream;