const MemoryInputStream = require("../streams/input");
const jimp = require('jimp');

/**
 * Bitmap textures
 */
class Texture {
    /**
     * @type {number} - Width of the texture.
     */
    width;

    /**
     * @type {number} - Height of the texture
     */
    height;


    /**
     * @type {boolean} - Whether or not alpha blend is enabled for this texture.
     */
    alpha;

    /**
     * @type {Buffer} - PNG buffer for texture
     */
    data;

    /**
     * Loads a texture from a data source.
     * @param {string|Buffer} data - Data to load
     * @returns {Texture} - Parsed texture
     */
    static load = data => {
        const stream = new MemoryInputStream(data);
        const clutOffset = stream.u32();
        const [width, height] = [stream.u32(), stream.u32()];
        const bpp = stream.u8();
        const numBlocks = stream.u8(); // Not entirely sure, but doesn't matter regardless
        const swizzle = stream.u8();
        const alpha = stream.u8() == 1;
        const dataOffset = stream.u32();

        stream.forward(clutOffset - stream.offset);

        const clut = [];
        while (stream.offset != dataOffset)
            clut.push(jimp.rgbaToInt(stream.u8(), stream.u8(), stream.u8(), stream.u8()));

        let texData = stream.bytes(stream.length - stream.offset);
        const image = new jimp(width, height);


        const log2w = Math.log((width * bpp) >> 3) / Math.log(2);
        // http://homebrew.pixelbath.com/wiki/PSP_texture_swizzling
        const unswizzle = offset => {
            if (!swizzle) return offset;
            const wMask = (1 << log2w) - 1;
            const mx = offset & 0xf;
            const by = offset & (~7 << log2w);
            const bx = offset & wMask & ~0xf;
            const my = offset & (7 << log2w);
            return by | (bx << 3) | (my >> (log2w - 4)) | mx;
        }

        let offset = 0;
        if (bpp == 4) {
            for (let y = 0; y < height; ++y)
                for (let x = 0; x < width; x += 2) {
                    let index = texData[unswizzle(offset++)];
                    image.setPixelColor(clut[index & 0xf], x, y);
                    image.setPixelColor(clut[index >> 4], x + 1, y);
                }
        } else if (bpp == 8) {
            for (let y = 0; y < height; ++y)
                for (let x = 0; x < width; ++x)
                    image.setPixelColor(clut[texData[unswizzle(offset++)]], x, y);
        } else throw new Error('Unhandled BPP!');


        const texture = new Texture();

        texture.width = width;
        texture.height = height;
        texture.alpha = alpha;
        texture.data = jimp.encoders['image/png'](image);

        return texture;
    }
}

module.exports = Texture;