const MemoryInputStream = require('./input');

/**
 * Resource containing skeletal data for a skinned mesh.
 */
class Skeleton {
    /** 
     * @type {number} Unique ID for skeleton 
     * */
    ID;

    /**
     * @typedef Transform
     * @type {object}
     * @property {(import('./types').float)[]} rotation - Quaternion rotation of object
     * @property {(import('./types').float)[]} transation - Relative position of object
     * @property {(import('./types').float)[]} scale - Relative scale of object
     */

    /**
     * @typedef Bone
     * @type {object}
     * @property {number} ID - Unique ID for bone
     * @property {number} unknown - Unknown field
     * @property {number} parent - Index of this bone's parent
     * @property {number} firstSibling - Index of first sibling
     * @property {number} firstChild - Index of first child
     * @property {Transform} transform - Local transform of this bone
     * @property {number} index - Index of this bone in array
     */

    /**
     * @type {Bone[]} - Skeleton  
     */
    bones = [];

    /**
     * Loads a skeleton from a data source.
     * @param {string|Buffer} data - Data to load
     * @returns {Skeleton} - Parsed skeleton
     */
    static load = data => {
        const stream = new MemoryInputStream(data);
        const skeleton = new Skeleton();
        if (stream.u32() != 0x38304B53)
            throw new Error('Not a skeleton file!');
        skeleton.ID = stream.u32();
        stream.forward(0x2);
        const boneCount = stream.u16();
        const hierachyOffset = stream.offset + stream.u32();
        const transformOffset = stream.offset + stream.u32();
        const idOffset = stream.offset + stream.u32();
        stream.forward(hierachyOffset - stream.offset);
        for (let i = 0; i < boneCount; ++i) {
            skeleton.bones.push({
                unknown: stream.s16(),
                parent: stream.s16(),
                nextSibling: stream.s16(),
                firstChild: stream.s16()
            });
        }
        stream.forward(transformOffset - stream.offset);
        for (let i = 0; i < boneCount; ++i) {
            const bone = skeleton.bones[i];
            const rotation = [stream.f32(), stream.f32(), stream.f32(), stream.f32()];
            const translation = [stream.f32(), stream.f32(), stream.f32()]; 
            stream.f32(); // Alignment is cool, but I don't need that
            const scale = [stream.f32(), stream.f32(), stream.f32()];
            stream.f32();
            bone.transform = {
                rotation,
                translation,
                scale
            };
        }
        stream.forward(idOffset - stream.offset);
        for (let i = 0; i < boneCount; ++i) {
            const [id, index] = [stream.u32(), stream.u32()];
            skeleton.bones[index].ID = id;
            skeleton.bones[index].index = index;
        }

        return skeleton;
    }
}

module.exports = Skeleton;