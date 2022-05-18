const { readFileSync } = require('fs');
const { join } = require('path');

// NOTE: Keys are preloaded to save time when unpacking.
const KEYS = readFileSync(join(__dirname, '../data/keys'));

module.exports = {
    XOR: (buffer, keyOffset = 0) => {
        let offset = 0;
        while (offset < buffer.length) {
            buffer[offset] ^= KEYS[offset + keyOffset];
            offset++;
        }
        return buffer;
    }
}