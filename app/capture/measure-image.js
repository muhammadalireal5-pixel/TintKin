import { assessImagePixels } from "@/lib/utils/image-quality";

const ANALYSIS_WIDTH = 256;

export async function measureImageQuality(file) {
  try {
    const bitmap = await createImageBitmap(file);
    const width = Math.min(ANALYSIS_WIDTH, bitmap.width);
    const height = Math.max(1, Math.round((bitmap.height / bitmap.width) * width));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    ctx.drawImage(bitmap, 0, 0, width, height);
    bitmap.close?.();
    const { data } = ctx.getImageData(0, 0, width, height);
    return assessImagePixels({ data, width, height });
  } catch {
    return null;
  }
}
