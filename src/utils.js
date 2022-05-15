const { VertexDecl } = require('./flags');

module.exports = {
    toPrimitiveString: type => {
        switch (type) {
            case 0: return 'POINTS';
            case 1: return 'LINES';
            case 2: return 'LINE_STRIP';
            case 3: return 'TRIANGLES';
            case 4: return 'TRIANGLE_STRIPS';
            case 5: return 'TRIANGLE_FAN';
            case 6: return 'SPRITES';
        }
        return 'INVALID';
    },
    toVertexString: type => {
        const types = [];
    
        const find = value => {
            const keys = Object.keys(VertexDecl);
            const values = Object.values(VertexDecl);
            for (let i = 0; i < values.length; ++i)
                if (values[i] == value)
                    return keys[i];
        }
    
        if (type & VertexDecl.GU_WEIGHT_BITS) types.push(find(type & VertexDecl.GU_WEIGHT_BITS));
        if (type & VertexDecl.GU_TEXTURE_BITS) types.push(find(type & VertexDecl.GU_TEXTURE_BITS));
        if (type & VertexDecl.GU_COLOR_BITS) types.push(find(type & VertexDecl.GU_COLOR_BITS));
        if (type & VertexDecl.GU_NORMAL_BITS) types.push(find(type & VertexDecl.GU_NORMAL_BITS));
        if (type & VertexDecl.GU_VERTEX_BITS) types.push(find(type & VertexDecl.GU_VERTEX_BITS));
        if (type & VertexDecl.GU_INDEX_BITS) types.push(find(type & VertexDecl.GU_INDEX_BITS));
        if (type & VertexDecl.GU_VERTICES_BITS) {
            for (let i = 1; i <= 8; ++i)
                if ((type & VertexDecl.GU_VERTICES_BITS) == VertexDecl.GU_VERTICES(i)) {
                    types.push(`GU_VERTEX_` + i);
                    break;
                }
        }
        if (type & VertexDecl.GU_WEIGHTS_BITS) {
            for (let i = 1; i <= 8; ++i)
                if ((type & VertexDecl.GU_WEIGHTS_BITS) == VertexDecl.GU_WEIGHTS(i)) {
                    types.push(`GU_WEIGHTS_` + i);
                    break;
                }
        }

        return types.join(' | ');
    },
    getWeightCount: type => {
        type = type & VertexDecl.GU_WEIGHTS_BITS;
        for (let i = 1; i <= 8; ++i)
            if (type == VertexDecl.GU_WEIGHTS(i))
                return i;
        return 0;
    },
    getVertexCount: type => {
        type = type & VertexDecl.GU_VERTICES_BITS;
        for (let i = 1; i <= 8; ++i)
            if (type == VertexDecl.GU_VERTICES(i))
                return i;
        return 0;
    }
}