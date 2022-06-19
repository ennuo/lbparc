const { writeFileSync } = require('fs');
const { dirname, basename } = require('path');
const MemoryInputStream = require('../streams/input');
const ResourceType = require('../util/types');
const hstr = require('crc-32').str;
const crc32 = string => (~hstr(string.toLowerCase())) >>> 0;

const InventoryObjectType = {
    MATERIAL: 0x5,
    SOUND: 0x9,
    COSTUME_MATERIAL: 0xd,
    COSTUME_HEAD: 0xe,
    COSTUME_HAIR: 0xf,
    COSTUME_EYES: 0x10,
    COSTUME_GLASSES: 0x11,
    COSTUME_MOUTH: 0x12,
    COSTUME_MOUSTACHE: 0x13,
    COSTUME_NECK: 0x14,
    COSTUME_TORSO: 0x15,
    COSTUME_WAIST: 0x16,
    COSTUME_HANDS: 0x17,
    COSTUME_LEGS: 0x18,
    COSTUME_FEET: 0x19
}

const InventoryGroup = {
    "911": 3163029370,
    "ALPS": 4208974769,
    "APOLLO": 1116401439,
    "AUDIO_ANIMALS": 1771279906,
    "AUDIO_COMEDY": 1948746266,
    "AUDIO_ENVIRONMENTAL": 1075668288,
    "AUDIO_GIBBERISH": 668789995,
    "AUDIO_HUMAN": 1520249354,
    "AUDIO_MECHANICAL": 424859342,
    "AUDIO_MISCELLANEOUS": 3179592193,
    "AUDIO_MONSTERS": 1577408567,
    "AUDIO_MUSIC": 850255285,
    "AUDIO_MUSICAL": 1496494508,
    "AUDIO_TRANSPORT": 2572476113,
    "AUSTRALIA": 883094670,
    "BACKGROUNDS_BACKGROUNDS": 2401634740,
    "BRAZIL": 2731852767,
    "CANYONS": 1521051278,
    "CHINA": 2668641755,
    "CIRCUS": 1151108815,
    "COLLECTED_OBJECTS_BALLS": 406620864,
    "COLLECTED_OBJECTS_BITS_AND_BOBS": 2000423233,
    "COLLECTED_OBJECTS_CONCEPTS": 2407344992,
    "COLLECTED_OBJECTS_CONTRAPTIONS": 2310572997,
    "COLLECTED_OBJECTS_CREATURES": 1577806491,
    "COLLECTED_OBJECTS_DANGEROUS_CREATURES": 3724744807,
    "COLLECTED_OBJECTS_FOOD": 734516744,
    "COLLECTED_OBJECTS_SCENIC": 858533305,
    "COLLECTED_OBJECTS_STORY_CHARACTERS": 3794617697,
    "COLLECTED_OBJECTS_VEHICLES": 3761346053,
    "COLLECTED_OBJECTS_WHEELS": 3019396478,
    "COMMON": 437489582,
    "COMMUNITY_OBJECTS_DUMMY": 2953514432,
    "COMMUNITY_PHOTOS_DUMMY": 2953514432,
    "COSTUME_BODIES_FEET": 3238570800,
    "COSTUME_BODIES_HANDS": 2580663303,
    "COSTUME_BODIES_LEGS": 48741493,
    "COSTUME_BODIES_NECK": 3756927404,
    "COSTUME_BODIES_TORSO": 3634381690,
    "COSTUME_BODIES_WAIST": 3855207396,
    "COSTUME_HEADS_EYES": 1491454825,
    "COSTUME_HEADS_GLASSES": 157132073,
    "COSTUME_HEADS_HAIR": 1661509350,
    "COSTUME_HEADS_HEAD": 1477183843,
    "COSTUME_HEADS_MOUSTACHE": 3679610942,
    "COSTUME_HEADS_MOUTH": 1631232872,
    "COSTUME_MATERIALS_DUMMY": 2953514432,
    "CREDITS": 3202887297,
    "DESERT": 4051518405,
    "DISCO": 3593204546,
    "EASTER": 1051057732,
    "FANTASY": 4024187388,
    "FRUITSALAD": 1055397474,
    "GADGETS_DUMMY": 2953514432,
    "GAMEPLAYKITS_DUMMY": 2953514432,
    "GARDENS": 2752656010,
    "HIPHOP": 2703489543,
    "HOLLYWOOD": 767416293,
    "ISLANDS": 2760324349,
    "JUNGLE": 3029463350,
    "KILLZONE": 2871648059,
    "KINGARTHUR": 1084407987,
    "LAUNCHDAY": 162499217,
    "LURVE": 708195737,
    "MARVEL": 2478953025,
    "MATERIALS_BASIC_MATERIAL": 2870793774,
    "MATERIALS_CARDBOARD": 2488149154,
    "MATERIALS_DEFAULT": 3541878460,
    "MATERIALS_GLASS": 653619108,
    "MATERIALS_METAL": 4267451442,
    "MATERIALS_POLYSTYRENE": 891257148,
    "MATERIALS_SPONGE": 194882818,
    "MATERIALS_STONE": 656332241,
    "MATERIALS_WOOD": 1666206156,
    "METROPOLIS": 582941427,
    "MHUNTER": 1944526946,
    "MONSTERHUNTER": 1239982915,
    "MOTORSTORM": 2669051592,
    "MSTORM2": 631385029,
    "MY_OBJECTS_DUMMY": 2953514432,
    "MY_PICTURES_DUMMY": 2953514432,
    "PERSIA": 231117982,
    "RARE": 1984522048,
    "ROBINHOOD": 3457939903,
    "SAVANNAH": 1255511043,
    "STICKERS_ANIMALS": 1771279906,
    "STICKERS_ARCHITECTURE": 2338758917,
    "STICKERS_BODY": 609743949,
    "STICKERS_COLOURS": 2564237094,
    "STICKERS_CONCEPTS": 2407344992,
    "STICKERS_DECORATIVE": 4098429640,
    "STICKERS_DOODLES": 3685087248,
    "STICKERS_FACE": 4209738904,
    "STICKERS_FOLIAGE": 935989172,
    "STICKERS_NUMBERS": 2288071942,
    "STICKERS_OBJECTS": 1306866444,
    "STICKERS_REALISTIC": 3549109347,
    "STICKERS_SCENIC": 858533305,
    "STICKERS_SIGNS": 3194720638,
    "STICKERS_TEXT": 3295959096,
    "SUBURBAN": 785770855,
    "TEMPLES": 3093025808,
    "TIMEFORGOT": 2098931864,
    "TOOLS_DUMMY": 2953514432,
    "UNCHARTED": 1553189064,
    "USO": 2342247082,
    "WEDDING": 2755502953,
    "WILDERNESS": 2202881435,
    "WILDWEST": 3664552315,
    "YULETIDE": 644128429,
    "OCTODAD": 2281528440
}

/**
 * General resource container that stores a variety of information,
 * including object/level structure, metadata, costume information, etc.
 */
class Biff {
    ATG = {};



    static generate = (path, { subtype, properties }) => {
        const folder = basename(dirname(path)).toLowerCase();
        switch (subtype.toUpperCase()) {
            case "META": {
                const nameTranslations = new Array(0x11).fill(properties.name ?? "");
                const descTranslations = new Array(0x11).fill(properties.description ?? "");
                const creatorTranslations = new Array(0x11).fill(properties.creator ?? "");

                
                const createStringTable = strings => {
                    let size = 0x22 + 0x22;
                    for (const string of strings)
                        size += (string.length * 2);
                    const buffer = Buffer.alloc(size);
                    let offset = 0;
                    for (let i = 0; i < strings.length; ++i) {
                        const string = strings[i];
                        buffer.writeUint16LE(offset / 0x2, i * 2);
                        for (let j = 0; j < string.length; ++j, offset += 2)
                            buffer.writeUint16LE(string.charCodeAt(j), 0x22 + offset);
                        offset += 2; // Null terminator
                    }
                    return buffer;
                }

                const nameTable = createStringTable(nameTranslations);
                const descTable = createStringTable(descTranslations);
                const creatorTable = createStringTable(creatorTranslations);
                // Math.ceil(properties.resource.length / 0x4) * 0x4
                const resource = Buffer.alloc(properties.resource.length + 1);
                resource.write(properties.resource);

                const category = typeof properties.category === 'string' ?
                    (InventoryGroup[properties.category.toUpperCase()] ?? 0) : properties.category;

                const theme = typeof properties.theme === 'string' ?
                    (InventoryGroup[properties.theme.toUpperCase()] ?? 0) : properties.theme;

                const header = Buffer.alloc(0x44);
                header[0] = 0x8; // Unknown
                header.writeUint32LE(crc32(folder), 0x4);
                header.writeUint32LE(category, 0x8);
                header.writeUint32LE(theme, 0xC);
                header.writeUInt32LE(InventoryObjectType[properties.type.toUpperCase()], 0x10);

                if (properties.dlc && properties.dlc != 0)
                    header[0x18] = 0x1;
                
                header[0x24] = properties.dlc ?? 0;
                header[0x28] = properties.archive ?? 0;

                header[0x34] = 0x44; // Name table offset
                header.writeUint32LE(0x44 + nameTable.length, 0x38)
                header.writeUint32LE(0x44 + nameTable.length + descTable.length, 0x3C);
                header.writeUint32LE(0x44 + nameTable.length + descTable.length + creatorTable.length, 0x40);

                const MET0 = Buffer.concat([
                    header,
                    nameTable,
                    descTable,
                    creatorTable,
                    resource
                ]);

                let biff = MET0;
                if (biff.length % 4 != 0)
                    biff = Buffer.concat([ MET0, Buffer.alloc(4 - (MET0.length % 4))]);

                // Manually create tag buffer
                const ATG = Buffer.alloc(0x1c);
                ATG.write('ATG ');
                ATG.writeInt32LE(-1, 0x4);
                ATG.writeInt32LE(0xC, 0x8);
                ATG.write('MET0', 0xC);
                ATG.writeInt32LE(0, 0x10);
                ATG.writeInt32LE(MET0.length, 0x14);

                // Technically not part of ATG, but better to write it here
                ATG.writeInt32LE(biff.length, 0x18); 

                biff = Buffer.concat([ biff, ATG ]);
                
                return biff;
            }
        }

        return Buffer.from('BALLS', 'utf-8');
    }

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

                // CAT1 refers to catalog
                // each offsets backwards to an offset in a DATA entry
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
                        case 'MET0': {
                            output = {};

                            stream.forward(0x4); // Always 0x8, verison?

                            output.folderHash = stream.u32();
                            output.categoryKey = stream.u32();
                            output.themeKey = stream.u32();

                            // ILIB
                            // u32 version
                            // u32 count
                            // u32 dataOffset

                            // [for count]
                            // u32 folderHash
                            // u32 metaIconSize
                            // u32 metaBiffSize
                            // char[0x40] path
                            // [/for]


                            // 0x5  = MATERIAL
                            // 0x9  = SOUND
                            // 0xD  = COSTUME_MATERIAL
                            // 0xe  = COSTUME_HEAD
                            // 0xf  = COSTUME_HAIR
                            // 0x10 = COSTUME_EYES
                            // 0x11 = COSTUME_GLASSES
                            // 0X12 = COSTUME_MOUTH
                            // 0X13 = COSTUME_MOUSTACHE
                            // 0X14 = COSTUME_NECK
                            // 0x15 = COSTUME_TORSO
                            // 0x16 = COSTUME_WAIST
                            // 0x17 = COSTUME_HANDS
                            // 0x18 = COSTUME_LEGS
                            // 0x19 = COSTUME_FEET
                            output.type = stream.u32();

                            stream.u32(); // Unknwon

                            output.isDLC = stream.u32() == 1;
                            output.themeIndex = stream.u32();
                            output.categoryIndex = stream.u32();
                            output.dlcIndex = stream.u32();
                            output.dlcArcIndex = stream.u32();

                            stream.forward(0x8);
                            
                            const [nameStart, descStart, creatorStart, resourceStart] =
                                [stream.u32(), stream.u32(), stream.u32(), stream.u32()];
                            const nameTable = stream.bytes(descStart - nameStart);
                            const descTable = stream.bytes(creatorStart - descStart);
                            const creatorTable = stream.bytes(resourceStart - creatorStart);
                            const resource = stream.bytes(data.length - resourceStart).toString('utf-8').replaceAll('\0', '');

                            const getStrings = table => {
                                // Danish, German, English, Spanish, Finnish
                                // French, Italian, Japanese, Korean, Dutch
                                // Norwegian, Polish, Portuguese, Russian, Swedish,
                                // American, Chinese
                                const STRING_COUNT = 0x11;
                                let offset = STRING_COUNT * 0x2; // Skip offsets
                                const strings = [];
                                for (let i = 0; i < STRING_COUNT; ++i) {
                                    let string = '';
                                    let character = table.readUint16LE(offset); offset += 2;
                                    while (character != 0x0) {
                                        string += String.fromCharCode(character);
                                        character = table.readUint16LE(offset); offset += 2;
                                    }
                                    strings.push(string);
                                }
                                return strings;
                            }

                            output.nameTranslations = getStrings(nameTable);
                            output.descTranslations = getStrings(descTable);
                            output.creatorTranslations = getStrings(creatorTable);
                            output.resource = resource;

                            break;
                        }
                        case 'DATA': {
                            stream.bytes(0x10); // Unknown data, skip it for now


                            // byte[0x4] unknownData
                            // u32 dataSize
                            // byte[0x8] unknownData
                            // u32 resourcePathOffset
                            // u32 archivePathOffset (Null for lbp_archive.arc)
                            // u8 resourceType 0x11 = model?, 0x5 = costume, 0x0 = texture?
                            // u8 resourcePathLength
                            // u8 archivePathLength
                            // u8 unknown

                            const [res1Offset, res2Offset] =
                                    [0x10 + dataOffset + stream.u32(),
                                    0x14 + dataOffset + stream.u32()];
                            const [uk, res1Length, res2Length] = [stream.u8(), stream.u8(), stream.u8()];

                            output = [
                                buffer.slice(res1Offset, res1Offset + res1Length).toString('utf-8'),
                                buffer.slice(res2Offset, res2Offset + res2Length).toString('utf-8')
                            ];

                            break;
                        }
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