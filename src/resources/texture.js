const MemoryInputStream = require("../streams/input");
const Jimp = require('jimp');
const RgbQuant = require('rgbquant');

// http://homebrew.pixelbath.com/wiki/PSP_texture_swizzling
const unswizzle = (offset, log2w) => {
    const wMask = (1 << log2w) - 1;
    const mx = offset & 0xf;
    const by = offset & (~7 << log2w);
    const bx = offset & wMask & ~0xf;
    const my = offset & (7 << log2w);
    return by | (bx << 3) | (my >> (log2w - 4)) | mx;
}

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
     * @param {boolean} [flip] - Whether or not to flip the image, defaults to false 
     * @returns {Texture} - Parsed texture
     */
    static load = (data, flip=false) => {
        const stream = new MemoryInputStream(data);
        const clutOffset = stream.u32();
        const [width, height] = [stream.u32(), stream.u32()];
        const bpp = stream.u8();
        const numBlocks = stream.u8(); // Not entirely sure, but doesn't matter regardless
        const texMode = stream.u8();
        const alpha = stream.u8() == 1;
        const dataOffset = stream.u32();

        stream.forward(clutOffset - stream.offset);

        const clut = [];
        while (stream.offset != dataOffset)
            clut.push(Jimp.rgbaToInt(stream.u8(), stream.u8(), stream.u8(), stream.u8()));

        let texData = stream.bytes(stream.length - stream.offset);
        const image = new Jimp(width, height);


        const log2w = Math.log((width * bpp) >> 3) / Math.log(2);
        let offset = 0;
        if (bpp == 4) {
            for (let y = 0; y < height; ++y)
                for (let x = 0; x < width; x += 2) {
                    let index = texData[unswizzle(offset++, log2w)];
                    image.setPixelColor(clut[index & 0xf], x, y);
                    image.setPixelColor(clut[index >> 4], x + 1, y);
                }
        } else if (bpp == 8) {
            for (let y = 0; y < height; ++y)
                for (let x = 0; x < width; ++x)
                    image.setPixelColor(clut[texData[unswizzle(offset++, log2w)]], x, y);
        } else throw new Error('Unhandled BPP!');


        if (flip) image.flip(true, true);

        const texture = new Texture();

        texture.width = width;
        texture.height = height;
        texture.alpha = alpha;
        texture.data = Jimp.encoders['image/png'](image);

        return texture;
    }

    /**
     * Converts either a PNG or JPEG to MIP and returns the buffer.
     * @param {Buffer|string} input - PNG/JPG data/path
     * @returns {Buffer} - Mip data
     */
    static import = async input => {
        const image = await Jimp.read(input);
        const dimensions = (image.bitmap.width < 128) ? 64 : 128;
        const texture = Buffer.alloc(0x480 + (dimensions * dimensions));

        image.resize(dimensions, dimensions);

        // PSP expects flipped bitmaps
        image.flip(true, true);

        // Reduce and index colors
        const quant = new RgbQuant();
        quant.sample(image.bitmap.data, image.bitmap.width);
        const palette = quant.palette(true);
        const indexed = quant.reduce(image.bitmap.data, 2);

        texture.writeUint32LE(0x30, 0x0); // Offset of CLUT
        texture.writeUint32LE(dimensions, 0x4);
        texture.writeUInt32LE(dimensions, 0x8);
        texture[0xC] = 8; // CLUT8
        texture[0xD] = 2; 
        texture[0xE] = 1; // texMode?
        texture[0xF] = 0; // Alpha isn't currently supported
        texture.writeUint32LE(0x480, 0x10);

        const CLUT_BASE = 0x30;
        const IMAGE_BASE = 0x480;

        // Write CLUT to buffer
        let offset = CLUT_BASE;
        for (const color of palette) {
            texture[offset++] = color[0];
            texture[offset++] = color[1];
            texture[offset++] = color[2];
            texture[offset++] = 0xFF;
        }

        let pixelOffset = 0x0;
        const log2w = Math.log((dimensions * 8) >> 3) / Math.log(2);
        for (let y = 0; y < dimensions; ++y)
            for (let x = 0; x < dimensions; ++x) {
                const index = pixelOffset++;
                texture[IMAGE_BASE + unswizzle(index, log2w)] = 
                    indexed[index];
            }

        return texture;
    }
}

module.exports = Texture;