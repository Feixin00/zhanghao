import assert from "node:assert/strict";
import { randomBytes, createHash } from "node:crypto";
import { mkdtemp, mkdir, readFile, writeFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import sharp from "sharp";
import { preparePublishingImage, IMAGE_UPLOAD_TARGET } from "../server/publishing-images.js";

const directory = await mkdtemp(path.join(os.tmpdir(), "publishing-images-test-"));
const output = path.join(directory, "upload");
await mkdir(output);
const hash = (buffer) => createHash("sha256").update(buffer).digest("hex");
try {
  const small = path.join(directory, "small.png");
  await sharp({ create: { width: 64, height: 64, channels: 3, background: "#aa88dd" } }).png().toFile(small);
  const original = await readFile(small);
  const copy = await preparePublishingImage(small, output);
  assert.notEqual(copy, small);
  assert.deepEqual(await readFile(copy), original, "small images must remain byte-identical");

  for (const [width, height] of [[1800, 1200], [2600, 2000]]) {
    const source = path.join(directory, `noise-${width}.png`);
    await sharp(randomBytes(width * height * 3), { raw: { width, height, channels: 3 } }).png().toFile(source);
    const before = await readFile(source);
    assert.ok(before.length > 5_000_000);
    const compressed = await preparePublishingImage(source, output);
    const bytes = await readFile(compressed);
    const metadata = await sharp(bytes).metadata();
    assert.ok(bytes.length <= IMAGE_UPLOAD_TARGET);
    assert.equal(metadata.format, "jpeg");
    assert.equal(path.extname(compressed), ".jpg");
    assert.equal(hash(await readFile(source)), hash(before), "original must not change");
    if (width === 1800) assert.equal(metadata.width, width, "retain original dimensions when possible");
    else assert.ok(metadata.width < width, "oversized noisy image exercises resizing fallback");
    console.log(JSON.stringify({ originalBytes: before.length, uploadBytes: bytes.length, width: metadata.width, height: metadata.height }));
  }
  const invalid = path.join(directory, "invalid.png");
  await writeFile(invalid, "not an image");
  await assert.rejects(preparePublishingImage(invalid, output));
  const controller = new AbortController(); controller.abort();
  await assert.rejects(preparePublishingImage(small, output, { signal: controller.signal }));
  console.log("publishing image compression tests passed");
} finally {
  await rm(directory, { recursive: true, force: true });
}
