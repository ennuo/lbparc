
const MemoryInputStream = require('./stream');
const { VertexDecl } = require('./flags');
const { toPrimitiveString, toVertexString } = require('./utils');

class VertexData {
    /** 
     * Vertex weights, each vertex can contain up to 8
     * weights for each vertex.
     * @type {(import('./types').float)[][]}
     */
    weights = [];

    /**
     * @type {(import('./types').v3)[]} - Vertex normals
     */
    normals = [];

    /**
     * @type {(import('./types').v2)[]} - Vertex UVs, only one channel.
     */
    texCoords = [];

    /**
     * @type {(import('./types').color)[]} - Vertex colors
     */
    colors = [];

    /**
     * @type {(import('./types').v3)[]} - Vertex positions
     */
    positions = [];
}

/**
 * Represents a mesh contained by a model.
 */
class Mesh {
    /**
     * @type {string} - Name of this mesh
     */
    name;

    /**
     * Vertex data, first index is primary mesh data,
     * any following contain morph data.
     * @type {VertexData[]} 
     */
    streams = [];

    /**
     * Triangle list indices of this mesh, based from 0
     * @type {number[]}
     */
    indices = [];

    /**
     * @returns {number} - Number of verts contained in this model.
     */
    get numVerts() { return this.streams[0]?.positions.length ?? 0 };

    /**
     * @returns {boolean} - Whether or not this mesh contains any morph data.
     */
    get hasMorphs() { return this.streams.length > 1; }
}



/**
 * Main format used for representing
 * 3D geometry, either static or skinned.
 */
class Model {
    /**
     * @type {string[]} - Textures used by this model.
     */
    textures = [];

    /**
     * @type {Mesh[]} - Meshes contained in this model
     */
    meshes = [];

    /**
     * Materials used by the meshes of this model,
     * might move this into mesh once I figure out
     * actually what it does
     * @type {any[]}
     */
    materials = [];

    /**
     * @param {string[]} - Skeletons used by this model.
     */
    skeletons = [];

    /**
     * Skin pose matrices for bones in this model.
     * @type {(import('./types').m44)[]}
     */
    bones = [];

    /**
     * @type {string[]} - Skins used by this model
     */
    skins = [];

    /**
     * Loads a mesh from a data source.
     * @param {MemoryInputStream|string|Buffer} data - Data to load
     * @returns {Mesh} Parsed mesh
     */
    static load = data => {
        const debug = process.env.NODE_ENV == 'development';

        const stream = new MemoryInputStream(data);
        const model = new Model();

        const textureCount = stream.u32();
        for (let i = 0; i < textureCount; ++i)
            model.textures.push(stream.str());
        
        const meshCount = stream.u32();
        for (let i = 0; i < meshCount; ++i) {
            const mesh = new Mesh();
            
            let [primitiveType, vertexType, vertexCount, morphCount] = 
                [stream.u32(), stream.u32(), stream.u32(), stream.u32()];

            // When the type is VertexDecl.GU_WEIGHT_32BITF,
            // the vertex types of the mesh are actually taken
            // from the skin, although for the most part, they're
            // the same, so we can just use this.
            const originalVertexType = vertexType;
            if (vertexType == VertexDecl.GU_WEIGHT_32BITF)
                vertexType = VertexDecl.GU_WEIGHT_8BIT | VertexDecl.GU_TEXTURE_8BIT | VertexDecl.GU_NORMAL_8BIT | VertexDecl.GU_VERTEX_32BITF;
    
            if (primitiveType != VertexDecl.GU_TRIANGLE_STRIP && primitiveType != VertexDecl.GU_TRIANGLES)
                throw new Error('Unhandled primitive type!');
    
            const [minVertX, minVertY, minVertZ] = [stream.f32(), stream.f32(), stream.f32()];
            const [maxVertX, maxVertY, maxVertZ] = [stream.f32(), stream.f32(), stream.f32()];
    
            const bufferSize = stream.u32(); // if we parse correctly, this is irrelevant
            stream.u32(); // unk u32
            stream.u32(); // unk u32
            stream.u32(); // unk u32
            stream.u32(); // unk u32
            stream.f32(); // unk f32
            stream.f32();// unk f32
            stream.f32();// unk f32
            stream.f32();// unk f32
            stream.u8(); // unk u8
    
            const indices = [];
            let lastIndex = 0;
            while (true) {
                const indexCount = stream.u16();
                const cullingBehavior = stream.u16();
                if (indexCount == 0) break;
                if (primitiveType == VertexDecl.GU_TRIANGLES) {
                    for (let i = lastIndex; i < lastIndex + indexCount; ++i)
                        indices.push(i);
                } else if (primitiveType == VertexDecl.GU_TRIANGLE_STRIP) {
                    for (let i = lastIndex, j = 0; i < lastIndex + (indexCount - 2); ++i, ++j) {
                        if (j & 1) indices.push(i, i + 2, i + 1);
                        else indices.push(i, i + 1, i + 2);
                    }
                }
                lastIndex += indexCount;
            }

            mesh.indices = indices;

            // Initialize vertex streams
            for (let i = 0; i < morphCount + 1; ++i)
                mesh.streams[i] = new VertexData();
    
            const start = stream.offset;
            for (let i = 0; i < vertexCount; ++i) {
                // Each vertex's morph is stored sequentially.
                for (let j = 0; j < morphCount + 1; ++j) {                    
                    const data = mesh.streams[j];
                    switch (vertexType & VertexDecl.GU_WEIGHT_BITS) {
                        case VertexDecl.GU_WEIGHT_8BIT: {
                            if (j == 0) {
                                let weight = stream.u8();
                                while (weight < 0x7d) {
                                    weight += stream.u8();
                                }
                            } else stream.forward(0x1);
                            break;
                        }
                        case 0: break;
                        default: throw new Error('Unhandled weight type!');
                    }
    
                    switch (vertexType & VertexDecl.GU_TEXTURE_BITS) {
                        case VertexDecl.GU_TEXTURE_8BIT: {
                            data.texCoords.push([
                                stream.s8() / 0x7f,
                                stream.s8() / 0x7f
                            ]);
                            break;
                        }
                        case VertexDecl.GU_TEXTURE_16BIT: {
                            stream.align(2, start);
                            data.texCoords.push([
                                stream.s16() / 0x7fff,
                                stream.s16() / 0x7fff
                            ]);
                            break;
                        }
                        case VertexDecl.GU_TEXTURE_32BITF: {
                            stream.align(4, start);
                            data.texCoords.push([ stream.f32(), stream.f32() ]);
                            break;
                        }
                    }
        
                    // Not actually parsing these yet
                    switch (vertexType & VertexDecl.GU_COLOR_BITS) {
                        case VertexDecl.GU_COLOR_5650:
                        case VertexDecl.GU_COLOR_5551:
                        case VertexDecl.GU_COLOR_4444:
                            stream.align(2, start);
                            const c = stream.u16();
                            //data.colors.push(stream.u16());
                            break;
                        case VertexDecl.GU_COLOR_8888:
                            stream.align(4, start);
                            const c32 = stream.u32();
                            //data.colors.push(stream.u32());
                            break;
                    }
        
                    switch (vertexType & VertexDecl.GU_NORMAL_BITS) {
                        case VertexDecl.GU_NORMAL_8BIT: {
                            data.normals.push([
                                stream.s8() / 0x7f,
                                stream.s8() / 0x7F,
                                stream.s8() / 0x7F
                            ]);
                            break;
                        }
                        case VertexDecl.GU_NORMAL_16BIT: {
                            stream.align(2, start);
                            data.normals.push([
                                stream.u16() / 0xFFFF,
                                stream.u16() / 0xFFFF,
                                stream.u16() / 0xFFFF,
                            ]);
                            break;
                        }
                        case VertexDecl.GU_NORMAL_32BITF: {
                            stream.align(4, start);
                            data.normals.push([
                                stream.f32(),
                                stream.f32(),
                                stream.f32()
                            ]);
                            break;
                        }
                    }
        
                    switch (vertexType & VertexDecl.GU_VERTEX_BITS) {
                        case VertexDecl.GU_VERTEX_8BIT: {
                            data.positions.push([
                                stream.s8() / 0x7f,
                                stream.s8() / 0x7f,
                                stream.s8() / 0x7f
                            ]);
                            break;
                        }
                        case VertexDecl.GU_VERTEX_16BIT: {
                            stream.align(2, start);
                            data.positions.push([
                                stream.s16() / 0x7fff,
                                stream.s16() / 0x7fff,
                                stream.s16() / 0x7fff
                            ]);
                            break;
                        }
                        case VertexDecl.GU_VERTEX_32BITF: {
                            stream.align(4, start);
                            data.positions.push([
                                stream.f32(),
                                stream.f32(),
                                stream.f32()
                            ]);
                            break;
                        }
                    }            
                }
            }
            const size = stream.offset - start;
    
            mesh.name = stream.str();
    
            if (debug) {
                console.log(`[${i}] Name: ${mesh.name}`);
                console.log(`Primitive Type: ${toPrimitiveString(primitiveType)}`);
                if (vertexType != originalVertexType)
                    console.log(`Original Vertex Type: ${toVertexString(originalVertexType)}`);
                console.log(`Vertex Type: ${toVertexString(vertexType)}`);
                console.log(`Verts: ${vertexCount}`);
                console.log(`Morphs: ${morphCount}`);
                console.log(`Vertex Block Size: 0x${size.toString(16).padStart(8, '0')}\n`);
            }
    
            stream.forward(0x8 * morphCount);
            model.meshes.push(mesh);
        }
    
        // No idea what this is, texturing? no idea
        const unknownCount = stream.u32();
        // u32 unk
        // u32 textureIndex
        for (let i = 0; i < unknownCount; ++i)
            stream.forward(0x24);
    
        const skeletonCount = stream.u32();
        for (let i = 0; i < skeletonCount; ++i)
            model.skeletons.push(stream.str());
    
        const boneCount = stream.u32();
        for (let i = 0; i < boneCount; ++i)
            model.bones.push(stream.m44());
    
        const skinCount = stream.u32();
        for (let i = 0; i < skinCount; ++i)
            model.skins.push(stream.str());
    
        return model;
    }

    /**
     * Converts this moddel into a wavefront object file.
     * @returns {string} Wavefront object in string form
     */
    toOBJ = () => {
        let obj = '';
        for (const mesh of this.meshes) {
            const stream = mesh.streams[0];
            for (const vertex of stream.positions) 
                obj += `v ${vertex[0]} ${vertex[1]} ${vertex[2]}\n`;
            for (const normal of stream.normals) 
                obj += `vn ${normal[0]} ${normal[1]} ${normal[2]}\n`;
            for (const uv of stream.texCoords) 
                obj += `vt ${uv[0]} ${uv[1]}\n`;
        }
        // Keep track of the last vertex since shapes
        // don't all use the same index pool
        let lastIndex = 0;
        // Second loop for indices and object names.
        for (const mesh of this.meshes) {
            obj += `o ${mesh.name}\n`;
            for (let i = 0; i < mesh.indices.length; i += 3) {
                const make = i => {
                    const index = lastIndex + mesh.indices[i] + 1;
                    return `${index}/${index}/${index}`;
                }
                obj += `f ${make(i)} ${make(i + 1)} ${make(i + 2)}\n`;
            }
            lastIndex += mesh.numVerts;
        }
        return obj;
    }
}

module.exports = Model;