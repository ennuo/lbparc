/**
 * @typedef {number} float - Floating point number
 * @typedef {float[]} v3 - Three component float vector
 * @typedef {float[]} v2 - Two component float vector
 * @typedef {float[]} m44 - 4x4 floating point matrix
 */

/**
 * @typedef color
 * @type {object}
 * @property {float} r - Red
 * @property {float} g - Green
 * @property {float} b - Blue
 * @property {float} a - Alpha 
 */

module.exports = {
    ANIMATION: 0x1,
    SKELETON: 0x2,
    SKIN: 0x3,
    MESH: 0x4,
    MODEL: 0x5,
    TEXTURE: 0x6,
    FONT: 0x7,
    SFX_CROSSFADE: 0x8,
    SFX_BANK: 0x9,
    LEVEL_BIFF: 0xa,
    OBJECT_BIFF: 0xb,
    MATERIAL_BIFF: 0xc,
    CATALOG_BIFF: 0xd,
    BACKGROUND_BIFF: 0xe,
    GUI_BIFF: 0xf,
    AUDIO_BIFF: 0x10,
    MUSIC_BIFF: 0x11,
    FRONTEND_BIFF: 0x12,
    FRONTEND_RES: 0x13,
    LAMS: 0x14,
    POPIT_GROUP: 0x15,
    POPIT_METADATA: 0x16,
    COSTUME_DATA: 0x17,
    COSTUME_MATERIAL: 0x18,
    BINARY_FILE: 0x19,
    ARCHIVE: 0x1a
};