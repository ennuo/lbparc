const GU_VERTICES = n => ((((n)-1)&7)<<18);
const GU_WEIGHTS = n => ((((n)-1)&7)<<14);

module.exports = {
    /**
     * PSP GU flags
     */
    VertexDecl: {
        GU_TEXTURE_8BIT: (1 << 0),
        GU_TEXTURE_16BIT: (2 << 0),
        GU_TEXTURE_32BITF: (3 << 0),
        GU_TEXTURE_BITS: (3 << 0),
    
        GU_COLOR_5650: (4 << 2),
        GU_COLOR_5551: (5 << 2),
        GU_COLOR_4444: (6 << 2),
        GU_COLOR_8888: (7 << 2),
        GU_COLOR_BITS: (7 << 2),
    
        GU_NORMAL_8BIT: (1 << 5),
        GU_NORMAL_16BIT: (2 << 5),
        GU_NORMAL_32BITF: (3 << 5),
        GU_NORMAL_BITS: (3 << 5),
    
        GU_VERTEX_8BIT: (1 << 7),
        GU_VERTEX_16BIT: (2 << 7),
        GU_VERTEX_32BITF: (3 << 7),
        GU_VERTEX_BITS: (3 << 7),
    
        GU_WEIGHT_8BIT: (1 << 9),
        GU_WEIGHT_16BIT: (2 << 9),
        GU_WEIGHT_32BITF: (3 << 9),
        GU_WEIGHT_BITS: (3 << 9),
    
        GU_INDEX_8BIT: (1 << 11),
        GU_INDEX_16BIT: (2 << 11),
        GU_INDEX_BITS: (3 << 11),
    
        GU_WEIGHTS_BITS: GU_WEIGHTS(8),
        GU_VERTICES_BITS: GU_VERTICES(8),

        GU_VERTICES,
        GU_WEIGHTS,
    
        GU_TRANSFORM_3D: (0 << 23),
        GU_TRANSFORM_2D: (1 << 23),
        GU_TRANSFORM_BITS: (1 << 23),

        GU_POINTS: 0,
        GU_LINES: 1,
        GU_LINE_STRIP: 2,
        GU_TRIANGLES: 3,
        GU_TRIANGLE_STRIP: 4,
        GU_TRIANGLE_FAN: 5,
        GU_SPRITES: 6,
    }
}