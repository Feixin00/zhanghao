import { randomUUID } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

export const IMAGE_UPLOAD_LIMIT = 5_000_000;
export const IMAGE_UPLOAD_TARGET = 4_800_000;

// Only write inside the publication's temporary directory; never replace the draft original.
export async function preparePublishingImage(source, directory, { signal } = {}) {
  const checkAbort = () => signal?.throwIfAborted();
  checkAbort();
  const original = await readFile(source);
  const metadata = await sharp(original).metadata();
  if (!metadata.width || !metadata.height) throw new Error("无法读取图片尺寸");
  if (original.length < IMAGE_UPLOAD_LIMIT) {
    const destination = path.join(directory, `${randomUUID()}${path.extname(source)}`);
    checkAbort();
    await writeFile(destination, original);
    return destination;
  }
  if ((metadata.pages || 1) > 1) throw new Error("动态图超过 5MB，请先缩小文件；不会自动转换为静态图片");

  // Decode from the original on every attempt, avoiding accumulated JPEG artifacts.
  // Keep colour detail for small text; only reduce dimensions after quality 80 cannot fit.
  for (let step = 0; step < 16; step++) {
    const scale = 0.85 ** step;
    const width = Math.max(1, Math.round(metadata.width * scale));
    const height = Math.max(1, Math.round(metadata.height * scale));
    const encode = async (quality) => {
      checkAbort();
      let pipeline = sharp(original).rotate().flatten({ background: "#ffffff" });
      if (step) pipeline = pipeline.resize({ width, height, fit: "inside", withoutEnlargement: true });
      return pipeline.jpeg({ quality, mozjpeg: true, chromaSubsampling: "4:4:4" }).toBuffer();
    };
    let best = await encode(95);
    if (best.length > IMAGE_UPLOAD_TARGET) {
      best = await encode(80);
      if (best.length > IMAGE_UPLOAD_TARGET) continue;
      let low = 81, high = 94;
      while (low <= high) {
        const quality = Math.floor((low + high) / 2);
        const candidate = await encode(quality);
        if (candidate.length <= IMAGE_UPLOAD_TARGET) { best = candidate; low = quality + 1; }
        else high = quality - 1;
      }
    }
    checkAbort();
    if (best.length > IMAGE_UPLOAD_TARGET) throw new Error("压缩后图片仍超过上传限制");
    const destination = path.join(directory, `${randomUUID()}.jpg`);
    await writeFile(destination, best);
    return destination;
  }
  throw new Error("图片无法在保留合理画质的情况下压缩到 5MB 以下，请更换图片");
}
