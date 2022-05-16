const MemoryInputStream = require("./input");

/**
 * General resource container that stores a variety of information,
 * including object/level structure, metadata, costume information, etc.
 */
class Biff {
    ATG = {};

    /**
     * Loads a biff file from a data source
     * @param {string|Buffer} data - Data to load
     * @returns {Biff} - Parsed biff data
     */
    static load = data => {
        if (!data) throw new Error('No data provided to Biff::load');
        const buffer = Buffer.isBuffer(data) ? data : require('fs').readFileSync(data);

        const biff = new Biff();

        const tagEnd = buffer.length - 4;
        const tagOffset = buffer.readUint32LE(tagEnd);
        const tagData = buffer.slice(tagOffset, tagEnd);

        const parseGroup = tagData => {
            const tags = {};
            let offset = 0;
            while (offset != tagData.length) {
                const tagID = tagData.slice(offset, offset += 4).toString('utf-8');
                const dataOffset = tagData.readInt32LE(offset); offset += 4;
                const dataLength = tagData.readInt32LE(offset); offset += 4;

                const isGroup = dataOffset == -1;
    
                const data = isGroup ? tagData.slice(offset, offset + dataLength) : buffer.slice(dataOffset, dataOffset + dataLength);

                if (isGroup) offset += dataLength;

                const stream = new MemoryInputStream(data);

                // CAT1 used in costumes
                // component type seems to be s32
                // count seems to be RSRC/DATA count

                const getName = () => {
                    const offset = dataOffset + stream.u32();
                    return buffer.slice(offset, buffer.indexOf('\0', offset)).toString('utf-8');
                }

                let output;
                if (isGroup) output = parseGroup(data);
                else {
                    switch (tagID) {
                        case 'LAND': {
                            output = {
                                name: getName(),
                                data: stream.bytes(stream.length - stream.offset)
                            };
                            break;
                        }
                        case 'MYOB': {
                            output = {
                                name: getName(),
                                data: stream.bytes(stream.length - stream.offset)
                            };
                            break;
                        }
                        case 'MATS': {
                            output = getName();
                            break;
                        }
                        case 'TEXT': {
                            // I HATE THIS!
                            output = data.toString('utf-8');
                            break;
                        }
                        case 'VERT': {
                            const vertexCount = data.length / 0x10;
                            output = [];
                            for (let i = 0; i < vertexCount; ++i)
                                output.push([stream.f32(), stream.f32(), stream.f32(), stream.f32()]);
                            break;
                        }
                        default: output = data; break;
                    }
                }

                tags[tagID] = output;
            }

            return tags;
        }

        biff.ATG = parseGroup(tagData)['ATG '];

        return biff;
    }
}

module.exports = Biff;