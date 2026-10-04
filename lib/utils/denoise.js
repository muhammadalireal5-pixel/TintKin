import "server-only";
import sharp from "sharp";

// Longest side kept for the cleaned copy. The simulation face-crops to
// 1200x1200, so anything much above that only costs time.
const MAX_SIDE = 2400;

const clamp = (v) => (v < 0 ? 0 : v > 255 ? 255 : Math.round(v));

/**
 * Reduces sensor grain in a selfie (typical of front cameras in dim light) so
 * the skin simulation's subtle changes aren't drowned in noise.
 *
 * Works in YCbCr: a 3px median on luma removes speckle while keeping edges
 * (eyes, lips, hair), and a soft blur on chroma removes the colour blotches.
 * On real uploads this roughly halves measured noise.
 *
 * @param {Buffer} input - Any image sharp can read
 * @returns {Promise<Buffer>} JPEG
 */
export async function denoiseSelfie(input) {
  const { data, info } = await sharp(input)
    .rotate()
    .resize({ width: MAX_SIDE, height: MAX_SIDE, fit: "inside", withoutEnlargement: true })
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const { width, height } = info;
  const n = width * height;
  const Y = Buffer.alloc(n);
  const Cb = Buffer.alloc(n);
  const Cr = Buffer.alloc(n);
  for (let i = 0, j = 0; i < n; i++, j += 3) {
    const r = data[j], g = data[j + 1], b = data[j + 2];
    Y[i] = clamp(0.299 * r + 0.587 * g + 0.114 * b);
    Cb[i] = clamp(128 - 0.168736 * r - 0.331264 * g + 0.5 * b);
    Cr[i] = clamp(128 + 0.5 * r - 0.418688 * g - 0.081312 * b);
  }

  const plane = { raw: { width, height, channels: 1 } };
  // toColourspace("b-w") keeps the output single-channel; sharp otherwise
  // expands it to sRGB.
  const toPlane = (img) => img.toColourspace("b-w").raw().toBuffer();
  const [Y2, Cb2, Cr2] = await Promise.all([
    toPlane(sharp(Y, plane).median(3)),
    toPlane(sharp(Cb, plane).blur(2.5)),
    toPlane(sharp(Cr, plane).blur(2.5)),
  ]);

  const out = Buffer.alloc(n * 3);
  for (let i = 0, j = 0; i < n; i++, j += 3) {
    const y = Y2[i], cb = Cb2[i] - 128, cr = Cr2[i] - 128;
    out[j] = clamp(y + 1.402 * cr);
    out[j + 1] = clamp(y - 0.344136 * cb - 0.714136 * cr);
    out[j + 2] = clamp(y + 1.772 * cb);
  }

  return sharp(out, { raw: { width, height, channels: 3 } })
    .jpeg({ quality: 92, chromaSubsampling: "4:4:4" })
    .toBuffer();
}
