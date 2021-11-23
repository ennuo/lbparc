const { readFileSync } = require('fs');
const { join } = require('path');

// NOTE: Keys are preloaded to save time when unpacking.
const KEYS = readFileSync(join(__dirname, './data/keys'));

const getXORKey = round => KEYS.slice(round * 0x10, (round * 0x10) + 0x10);

module.exports = {
    XOR: (buffer, rounds = 0) => {
        let offset = 0;
        while (offset < buffer.length) {
            const xor = getXORKey(rounds);
            for (let i = 0; i < 16; ++i) {
                if ((offset + i) == buffer.length)
                    break;
                buffer[offset + i] ^= xor[i];
            }
            offset += 16;
            rounds++;
        }
        return buffer;
    }
}