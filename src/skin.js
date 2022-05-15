const MemoryInputStream = require('./stream');

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
     * @property {number[]} bones - 4 bones that influence these vertices
     */

    /** @type {SkinData} - Bones for vertex ranges */
    skins = [];

    /**
     * Loads a skin from a data source.
     * @param {MemoryInputStream|string|Buffer} data - Data to load
     * @returns {Skin} Parsed skin
     */
    static load = data => {
        const stream = new MemoryInputStream(data);
        const skin = new Skin();
        
        const count = stream.u32();
        for (let i = 0; i < count; ++i) {
            const [unk1, unk2] = [stream.u32(), stream.u32()];
            const [vertexType, numVerts, boneCount] =
                [stream.u32(), stream.u32(), stream.u32()];

            skin.skins.push({
                vertexType,
                numVerts,
                bones: [stream.s32(), stream.s32(), stream.s32(), stream.s32()]
            })
        }
        
        // I ain't know what this is
        const [x, y, z, w] = [stream.f32(), stream.f32(), stream.f32(), stream.f32()];

        return skin;
    }
}

module.exports = Skin;