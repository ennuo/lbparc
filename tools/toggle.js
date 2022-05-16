const { XOR } = require('../index');
const crypto = require('crypto');
const { decompress, compress } = require('lzo');
const { readFileSync, writeFileSync, existsSync } = require('fs');

const md5 = data => {
    const hasher = crypto.createHash('md5');
    hasher.update(data);
    return hasher.digest();
}

const main = () => {
    if (process.argv.length != 3) {
        console.log('Usage: node toggle.js <data>');
        return;
    }
    
    const path = process.argv[2];
    if (!existsSync(path)) {
        console.log(`${path} does not exist!`);
        return;
    }

    const data = readFileSync(path);

    let isEncrypted = false;
    if (data.length >= 0x19) {
        // We're checking if it's encrypted by checking if the 
        // signature of the XOR'd data matches as expected

        // Buffers are mutable, create a copy.
        const xored = Buffer.alloc(data.length);
        data.copy(xored);
        XOR(xored);

        // If you tampered with the data, and the signature doesn't match,
        // I dunno know what to tell you
        const signature = xored.slice(xored.length - 0x10, xored.length).toString('hex');
        isEncrypted = (signature == md5(xored.slice(0, xored.length - 0x10)).toString('hex'));
    }

    if (isEncrypted) {
        XOR(data);
        let buffer = data.slice(0, data.length - 0x19);
        let info = data.slice(data.length - 0x19, data.length);
        if (info[0x4] == 1)
            buffer = decompress(buffer, info.readUint32LE(0));
        
        writeFileSync(
            path,
            Buffer.concat([buffer, info.slice(5, 9)])
        );

        console.log(`Done! 4-byte UID has been appended to binary, don't remove it!`);
        return;
    } else {
        // UID should be appended to end of data.
        const UID = data.readUint32LE(data.length - 4);
        const buffer = data.slice(0, data.length - 4);

        // u32 size
        // bool isCompressed
        // u32 pathHash(?) 
        // byte[10] md5
        const info = Buffer.alloc(0x19);
        info.writeUint32LE(buffer.length, 0);
        info[0x4] = 1; // Let's just compress it, because why not
        info.writeUint32LE(UID, 0x5);

        const output = Buffer.concat([compress(buffer), info]);
        // Compute and write hash to buffer
        const hash = md5(output.slice(0, output.length - 0x10));
        for (let i = output.length - 0x10, j = 0; j < 0x10; ++i, ++j)
            output[i] = hash[j];

        XOR(output);

        writeFileSync(
            path,
            output
        );

        console.log('Done!');
    }
}

main();