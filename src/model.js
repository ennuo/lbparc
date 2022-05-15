
const MemoryInputStream = require('./input');
const { VertexDecl } = require('./flags');
const { getWeightCount } = require('./utils');
const Archive = require('./archive');
const Skin = require('./skin');
const Skeleton = require('./skeleton');
const GLB = require('./glb');
const MemoryOutputStream = require('./output');
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

    get morphCount() {
        if (this.hasMorphs)
            return this.streams.length - 1;
        return 0;
    }
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
     * Inverse skin pose matrices for bones in this model.
     * @type {(import('./types').m44)[]}
     */
    bones = [];

    /**
     * @type {Skin[]} - Skins used by this model
     */
    skins = [];

    /**
     * Loads a mesh from a data source.
     * @param {string|Buffer} data - Data to load
     * @param {Archive} archive - Archive to extract skins, textures, and skeletons.
     * @returns {Mesh} Parsed mesh
     */
    static load = (data, archive) => {
        if (!archive) throw new Error('Can\'t process model without archive!');

        let stream = new MemoryInputStream(data);
        const model = new Model();

        const textureCount = stream.u32();
        for (let i = 0; i < textureCount; ++i)
            model.textures.push(stream.str());
        
        const meshCount = stream.u32();

        // We'll actually parse and store the data globally later,
        // we can't parse it right now because we need the skin if it's
        // a  skinned mesh.
        const meshes = [];
        for (let i = 0; i < meshCount; ++i) {
            meshes.push({
                primitiveType: stream.u32(),
                vertexType: stream.u32(),
                vertexCount: stream.u32(),
                morphCount: stream.u32(),
                minVert: [stream.f32(), stream.f32(), stream.f32()],
                maxVert: [stream.f32(), stream.f32(), stream.f32()],
                unknown: stream.u8(),
                buffer: stream.bytearray(),
                name: stream.str()
            });

            for (let j = 0; j < meshes[i].morphCount; ++j) {
                const morphID = stream.u32();
                const morphIndex = stream.u32();
            }
        }

        // No idea what this is, texturing? no idea
        const unknownCount = stream.u32();
        // u32 unk
        // u32 textureIndex
        for (let i = 0; i < unknownCount; ++i)
            stream.forward(0x24);
    
        const skeletonCount = stream.u32();
        for (let i = 0; i < skeletonCount; ++i)
            model.skeletons.push(Skeleton.load(archive.extract(stream.str())));
    
        const boneCount = stream.u32();
        for (let i = 0; i < boneCount; ++i)
            model.bones.push(stream.m44());
    
        const skinCount = stream.u32();
        for (let i = 0; i < skinCount; ++i) {
            const path = stream.str();
            const data = archive.extract(path);
            if (!data) throw new Error('Can\'t load mesh due to missing skin file: ' + path);
            model.skins.push(Skin.load(data));
        }

        for (let i = 0; i < meshCount; ++i) {
            const data = meshes[i];
            
            const mesh = new Mesh();

            model.meshes.push(mesh);
            mesh.name = data.name;
            stream = new MemoryInputStream(data.buffer);

            stream.forward(0x20); // Unknown data

            const indices = [];
            let lastIndex = 0;
            while (true) {
                const indexCount = stream.u16();
                const cullingBehaviour = stream.u16();
                if (indexCount == 0) break;
                if (data.primitiveType == VertexDecl.GU_TRIANGLES) {
                    for (let i = lastIndex; i < lastIndex + indexCount; ++i)
                        indices.push(i);
                } else if (data.primitiveType == VertexDecl.GU_TRIANGLE_STRIP) {
                    for (let i = lastIndex, j = 0; i < lastIndex + (indexCount - 2); ++i, ++j) {
                        if (j & 1) indices.push(i, i + 2, i + 1);
                        else indices.push(i, i + 1, i + 2);
                    }
                }
                lastIndex += indexCount;
            }

            mesh.indices = indices;

            const numVertsPerVertex = data.morphCount + 1;

            // Initialize vertex streams
            for (let i = 0; i < numVertsPerVertex; ++i)
                mesh.streams[i] = new VertexData();

            // Skins override vertex types, so we'll use
            // these as infos.
            let vertexInfos = [];
            if (data.vertexType != VertexDecl.GU_WEIGHT_32BITF)
                vertexInfos.push({ numVerts: data.vertexCount, vertexType: data.vertexType });
            else vertexInfos = model.skins[i].skins;

            const start = stream.offset;
            for (const info of vertexInfos) {
                for (let i = 0; i < info.numVerts; ++i) {
                    for (let j = 0; j < numVertsPerVertex; ++j) {
                        const data = mesh.streams[j];

                        const weightCount = getWeightCount(info.vertexType);
                        switch (info.vertexType & VertexDecl.GU_WEIGHT_BITS) {
                            case VertexDecl.GU_WEIGHT_8BIT: {
                                const weights = [];
                                for (let w = 0; w < weightCount; ++w)
                                    weights.push(stream.s8() / 0x7f);
                                data.weights.push(weights);
                                break;
                            }
                            case 0: break;
                            default: throw new Error('Unhandled weight type!');
                        }
        
                        switch (info.vertexType & VertexDecl.GU_TEXTURE_BITS) {
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
                        switch (info.vertexType & VertexDecl.GU_COLOR_BITS) {
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
            
                        switch (info.vertexType & VertexDecl.GU_NORMAL_BITS) {
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
            
                        switch (info.vertexType & VertexDecl.GU_VERTEX_BITS) {
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
            }
        }

        return model;
    }

    /**
     * Converts this model into a GLB file.
     * @param {Skeleton?} skeleton - Optional skeleton for costume meshes that don't reference a skeleton file.
     * @returns {Buffer} Built GLB file binary
     */
    toGLB = skeleton => {
        const glb = new GLB();
        let buffer = Buffer.alloc(0);
        let meshIndex = 0;

        skeleton = (this.skeletons.length != 0) ? this.skeletons[0] : skeleton;
        for (const mesh of this.meshes) {
            const vertexHandle = new MemoryOutputStream(mesh.numVerts * 0xC);
            const texHandle = new MemoryOutputStream(mesh.numVerts * 0x8);
            const normalHandle = new MemoryOutputStream(mesh.numVerts * 0xC);

            for (let i = 0; i < mesh.numVerts; ++i) {
                vertexHandle.vector(mesh.streams[0].positions[i]);
                texHandle.vector(mesh.streams[0].texCoords[i]);
                normalHandle.vector(mesh.streams[0].normals[i]);
            }

            glb.createBufferView('POSITION', buffer.length, vertexHandle.size);
            buffer = Buffer.concat([buffer, vertexHandle.buffer]);
            glb.createBufferView('TEXCOORD', buffer.length, texHandle.size);
            buffer = Buffer.concat([buffer, texHandle.buffer]);
            glb.createBufferView('NORMAL', buffer.length, normalHandle.size);
            buffer = Buffer.concat([buffer, normalHandle.buffer]);

            const indexHandle = new MemoryOutputStream(mesh.indices.length * 0x2);
            for (const index of mesh.indices)
                indexHandle.u16(index);
            glb.createBufferView('INDEX', buffer.length, indexHandle.size);
            buffer = Buffer.concat([buffer, indexHandle.buffer]);

            if (mesh.hasMorphs) {
                for (let i = 0; i < mesh.morphCount; ++i) {
                    const morph = mesh.streams[i + 1];
                    const morphHandle = new MemoryOutputStream(0xC * mesh.numVerts);
                    for (let j = 0; j < mesh.numVerts; ++j)
                        morphHandle.vector(morph.positions[j]);
                    glb.createBufferView(`MORPHS_${i}`, buffer.length, morphHandle.size);
                    buffer = Buffer.concat([buffer, morphHandle.buffer]);
                }   
            }

            if (skeleton) {
                const skin = this.skins[meshIndex];
                const jointStream = new MemoryOutputStream(0x10 * mesh.numVerts);
                for (const data of skin.skins) {
                    const fixed = [0, 0, 0, 0];
                    for (let b = 0; b < data.numBones; ++b)
                        fixed[b] = data.bones[b];
                    for (let i = 0; i < data.numVerts; ++i)
                        for (const b of fixed) jointStream.u32(b);
                }
                glb.createBufferView('JOINTS', buffer.length, jointStream.size);
                buffer = Buffer.concat([buffer, jointStream.buffer]);
                
                const weightStream = new MemoryOutputStream(0x10 * mesh.numVerts);
                for (const weight of mesh.streams[0].weights) {
                    const fixed = [0, 0, 0, 0];
                    for (let w = 0; w < weight.length; ++w) 
                        fixed[w] = weight[w];
                    weightStream.vector(fixed);
                }
                glb.createBufferView('WEIGHTS', buffer.length, weightStream.size);
                buffer = Buffer.concat([buffer, weightStream.buffer]);
            }

            const glMesh = glb.createMesh(mesh.name);
            glMesh.primitives.push({
                attributes: {
                    POSITION: glb.createAccessor('POSITION', GLB.ComponentType.FLOAT, mesh.numVerts, 'VEC3'),
                    TEXCOORD_0: glb.createAccessor('TEXCOORD', GLB.ComponentType.FLOAT, mesh.numVerts, 'VEC2'),
                    NORMAL: glb.createAccessor('NORMAL', GLB.ComponentType.FLOAT, mesh.numVerts, 'VEC3'),
                    JOINTS_0: (() => {
                        if (!skeleton) return undefined;
                        return glb.createAccessor('JOINTS', GLB.ComponentType.UNSIGNED_INT, mesh.numVerts, 'VEC4');
                    })(),
                    WEIGHTS_0: (() => {
                        if (!skeleton) return undefined;
                        return glb.createAccessor('WEIGHTS', GLB.ComponentType.FLOAT, mesh.numVerts, 'VEC4');
                    })()
                },
                targets: (() => {
                    const targets = [];
                    for (let i = 0; i < mesh.morphCount; ++i)
                        targets.push({
                            POSITION: glb.createAccessor(`MORPHS_${i}`, GLB.ComponentType.FLOAT, mesh.numVerts, 'VEC3')
                        })
                    return targets;
                })(),
                indices: glb.createAccessor('INDEX', GLB.ComponentType.UNSIGNED_SHORT, mesh.indices.length, 'SCALAR')
            })

            glb.pushNode({
                name: mesh.name,
                mesh: meshIndex,
                skin: (skeleton) ? 0 : undefined
            });

            meshIndex++;
        }

        if (skeleton) {
            const matrixHandle = new MemoryOutputStream(0x40 * this.bones.length);
            for (const bone of this.bones) 
                matrixHandle.vector(bone);
            glb.createBufferView('MATRIX', buffer.length, matrixHandle.size);
            buffer = Buffer.concat([buffer, matrixHandle.buffer]);

            const skin = { 
                joints: [],
                inverseBindMatrices: glb.createAccessor('MATRIX', GLB.ComponentType.FLOAT, this.bones.length, 'MAT4')
            };

            let start = glb.nodes.length;
            for (let i = 0; i < this.bones.length; ++i)
                skin.joints.push(start + i);

            const bones = skeleton.bones;

            const getChildren = parent => {
                const children = [];
                for (const bone of bones)
                    if (bone.parent == parent.index)
                        children.push(bone);
                return children;
            }

            const createChildren = bone => {
                const node = {
                    name: `bone_${bone.ID}`,
                    ...bone.transform,
                    children: []
                };
                let index = glb.pushNode(node);
                for (const child of getChildren(bone))
                    node.children.push(createChildren(child));
                return index;
            }

            for (const bone of bones)
                if (bone.parent == -1)
                    createChildren(bone);

            glb.skins = [skin];
        }

        glb.setBuffer(buffer);
        return glb.build();
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