const GLB = require("./glb");

module.expots = class Scene {
    #glb;
    #skeletons = [];
    
    constructor() { this.#glb = new GLB(); }
    
    add = (mesh, { translation, rotation, scale }) => {
        
    }
}