const MemoryOutputStream = require('./output');

/**
 * Container for 3D scenes and models.
 */
class GLB {
    static ComponentType = {
        BYTE: 5120,
        UNSIGNED_BYTE: 5121,
        SHORT: 5122,
        UNSIGNED_SHORT: 5123,
        UNSIGNED_INT: 5125,
        FLOAT: 5126
    }

    /**
     * @type {Buffer} - Primary buffer for this resource.
     */
    #bin;

    asset = {
        generator: "CWPSP v1.0",
        version: "2.0"
    }

    /**
     * @type {number} - Scene in-use by this resource.
     */
    scene = 0

    /**
     * @typedef Scene
     * @type {object}
     * @property {string} name - Name of the scene
     * @property {number} nodes - Indices of nodes present in this scene
     */

    /**
     * @type {Scene[]} - Scenes present in this resource.
     */
    scenes = [{
        name: "Scene",
        nodes: []
    }];


    /**
     * @typedef Node
     * @type {object}
     * @property {string?} name - Name of this node
     * @property {number?} skin - Index of skin used by this node
     * @property {number?} mesh - Index of mesh used by this node
     * @property {(import('./types').float)[]?} rotation - Quaternion rotation of object
     * @property {(import('./types').float)[]?} transation - Relative position of object
     * @property {(import('./types').float)[]?} scale - Relative scale of object
     */

    /**
     * @type {Node} - Nodes contained in this resource
     */
    nodes = [];

    materials = [];

    /**
     * @typedef Primitive - Defines geometry to be rendered.
     * @type {object}
     * @property {object} attributes - Key/Value attribute pairs
     * @property {number?} indices - Index of indices accessor
     * @property {number?} mode - Optional mode type, defaults to triangles
     */

    /**
     * @typedef Mesh - An object rendered in the scene
     * @type {object}
     * @property {string} - Name of this object
     * @property {Primitive[]} - Primitives defining how geometry is rendered
     */
    meshes = [];

    /**
     * @typedef Accessor - Property that defines the type and layout of a buffer view
     * @type {object}
     * @property {number} bufferView - Index of buffer view used by this accessor
     * @property {number} componentType - Specifies the type of the components of the type elements.
     * @property {string} type - The type of elements in this accessor
     * @property {number} count - Number of elements contained by this accessor
     */

    /**
     * @type {Accessor[]} - List of accessors used by this resource.
     */
    accessors = [];

    #bufferViewLookup = {};

    /**
     * @typedef BufferView - A view into a vbuffer
     * @type {object}
     * @property {number} buffer - Index of buffer
     * @property {number?} byteOffset - The offset into the buffer
     * @property {number} byteLength - Length of the view
     */

    /**
     * @type {BufferView[]} - Buffer views used by this resource.
     */
    bufferViews = [];

    /**
     * @typedef Skin
     * @type {object} 
     * @property {number?} inverseBindMatrices - Index of accessor containing inverse bind matrices
     * @property {number[]} joints - Indices of skeleton nodes
     */

    /**
     * @type {Skin[]} - Skins used by this resource.
     */
    skins = [];

    buffers = [{ byteLength: 0 }];

    animations = [];
    textures = [];
    images = [];

    /**
     * Creates and returns an empty mesh
     * @param {string} name - Name of mesh
     * @returns {Mesh} - Mesh created
     */
    createMesh = name => {
        const mesh = {
            name,
            primitives: []
        }
        this.meshes.push(mesh);
        return mesh;
    }

    /**
     * Gets a buffer view either by its name or index.
     * @param {number|string} nameOrIndex - Name or index of buffer view to lookup
     * @returns 
     */
    getNamedBufferView = nameOrIndex => {
        if (typeof nameOrIndex === 'number')
            return nameOrIndex;
        return this.#bufferViewLookup[nameOrIndex];
    }

    /**
     * Creates and returns the index of an accessor.
     * @param {number|string} view - Index of buffer view used by this accessor, or name of buffer view to lookup
     * @param {number} componentType - Type of the components of the type elements.
     * @param {number} count - Number of elements contained by this accessor
     * @param {string} type - The type of elements in this accessor
     * @returns {number} - Index of accessor created
     */
    createAccessor = (view, componentType, count, type) => {
        const accessor = {
            bufferView: this.getNamedBufferView(view),
            componentType,
            count,
            type
        }
        let index = this.accessors.length;
        this.accessors.push(accessor);
        return index;
    }

    /**
     * Creates and returns the index of a buffer view
     * @param {string} name - Name of buffer view used for lookup
     * @param {number} offset - Offset of view in buffer
     * @param {number} length - Length of view
     * @returns {number} - Index of buffer view created
     */
    createBufferView = (name, offset, length) => {
        const view = {
            buffer: 0,
            byteLength: length,
            byteOffset: offset
        }
        let index = this.bufferViews.length;
        this.#bufferViewLookup[name] = index;
        this.bufferViews.push(view);
        return index;
    }

    /**
     * Sets the buffer for this container
     * @param {Buffer} buffer - Buffer to be set for this resource
     */
    setBuffer = buffer => {
        this.#bin = buffer;
        this.buffers[0].byteLength = buffer.length;
    }

    /**
     * Pushes a node to the current collection and scene, returns index.
     * @param {Node} node - Node to push
     * @returns 
     */
    pushNode = node => {
        const index = this.nodes.length;
        this.scenes[0].nodes.push(index);
        this.nodes.push(node);
        return index;
    }

    /**
     * Builds the current state of the scene to GLB.
     * @returns {Buffer} - Built GLB resource
     */
    build = () => {
        const json = JSON.stringify(this);
        const size = 0x14 + json.length + this.#bin.length + 0x8;
        const output = new MemoryOutputStream(size);
        output.u32(0x46546C67);
        output.u32(2); // glTF version
        output.u32(size);
        output.u32(json.length);
        output.u32(0x4E4F534A);
        output.bytes(Buffer.from(json, 'utf-8'));
        output.u32(this.#bin.length);
        output.u32(0x4E4942);
        output.bytes(this.#bin);
        return output.buffer;
    }
}

module.exports = GLB;