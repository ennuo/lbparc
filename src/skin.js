const MemoryInputStream = require('./input');

/**
 * Resource that controls which bones influence
 * which sections of a mesh's vertices.
 */
class Skin {
    /**
     * @typedef SkinData
     * @type {object}
     * @property {number} vertexType - Flags for vertex block
     * @property {number} numVerts - Number of verts in this skin
     * @property {number} numBones - Number of bones that influence these vertices
     * @property {number[]} bones - 4 bones that influence these vertices
     */

    /** @type {SkinData} - Bones for vertex ranges */
    skins = [];

    /**
     * @type {(import('./types').float)[]} - Texture UV offsets
     */
    uvOffsets = [0, 0];

    /**
     * @type {(import('./types').float)[]} - Texture UV scales
     */
    uvScales = [1, 1];

    /**
     * Loads a skin from a data source.
     * @param {string|Buffer} data - Data to load
     * @returns {Skin} - Parsed skin
     */
    static load = data => {
        const stream = new MemoryInputStream(data);
        const skin = new Skin();
        
        const count = stream.u32();
        for (let i = 0; i < count; ++i) {
            const [unk1, unk2] = [stream.u32(), stream.u32()];
            const [vertexType, numVerts, numBones] =
                [stream.u32(), stream.u32(), stream.u32()];

            skin.skins.push({
                vertexType,
                numVerts,
                numBones,
                bones: [stream.s32(), stream.s32(), stream.s32(), stream.s32()]
            })
        }


        skin.uvOffsets = [stream.f32(), stream.f32()];
        skin.uvScales = [stream.f32(), stream.f32()];

        return skin;
    }
}

module.exports = Skin;