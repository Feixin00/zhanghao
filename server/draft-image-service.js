import { randomUUID } from "node:crypto";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";

const MAX_BYTES = 15 * 1024 * 1024;
const MAX_EDIT_BYTES = 4 * 1024 * 1024;
const parse = (value) => { try { return JSON.parse(value || "{}"); } catch { return {}; } };

// Old generated images did not save their prompt. Reconstruct from the generation
// snapshot and AI version, not the user's subsequently edited draft text.
export function originalImagePrompt(database, media, draft) {
  if (media.generation_prompt) return media.generation_prompt;
  if (media.source_url) return "";
  const version = database.prepare("SELECT * FROM draft_versions WHERE draft_id = ? AND generation_job_id = ? AND origin = 'ai' ORDER BY version_no DESC LIMIT 1").get(draft.id, draft.generation_job_id);
  if (!version) return "";
  const job = database.prepare("SELECT * FROM ai_generation_jobs WHERE id = ?").get(draft.generation_job_id);
  const source = parse(job?.source_snapshot_json || draft.source_snapshot_json);
  const revision = parse(job?.revision_context_json);
  return "为下列社交媒体稿件生成一张清晰、美观、主题相关的配图。忠于提供的事实，不虚构新闻现场或数据；适合用作文章配图。\n"
    + `原帖：${Array.from(source.text || "").slice(0, 6000).join("")}\n`
    + `稿件标题：${version.title}\n稿件正文：${Array.from(version.body || "").slice(0, 6000).join("")}\n`
    + `用户调整方向：${Array.from(revision.direction || "").slice(0, 4000).join("")}`;
}

async function limitedBytes(response, limit) {
  if (!response.ok) throw new Error(`图像接口请求失败（HTTP ${response.status}），请检查模型配置或稍后重试`);
  const chunks = []; let length = 0;
  for await (const chunk of response.body) {
    length += chunk.length;
    if (length > limit) throw new Error("图像接口返回的数据过大");
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

export function createDraftImageService({ database, mediaRoot }) {
  const tasks = new Map();
  let stopping = false;
  database.prepare("UPDATE draft_media SET image_status = 'failed', image_error = '服务重启，图片操作已中断，请重试' WHERE image_status = 'running'").run();
  const getMedia = (id) => database.prepare("SELECT * FROM draft_media WHERE id = ?").get(id);
  const busy = (draftId) => Boolean(database.prepare("SELECT 1 FROM draft_media WHERE draft_id = ? AND image_status = 'running'").get(draftId));

  async function generate(media, draft, ai, mode, prompt, originalPrompt, signal) {
    let requestBody; let headers = { Authorization: `Bearer ${ai.api_key}` };
    if (mode === "edit") {
      const filename = path.resolve(media.local_path);
      if (!filename.startsWith(`${path.resolve(mediaRoot)}${path.sep}`)) throw new Error("底图路径无效");
      const bytes = await readFile(filename);
      if (!bytes.length || bytes.length >= MAX_EDIT_BYTES) throw new Error("编辑底图必须小于 4MB，请先压缩图片后再修改");
      requestBody = new FormData();
      requestBody.set("model", ai.model_name);
      requestBody.set("prompt", prompt);
      requestBody.set("n", "1");
      requestBody.set("size", media.generation_size || "auto");
      requestBody.set("image", new Blob([bytes], { type: media.mime_type }), path.basename(filename));
    } else {
      headers["Content-Type"] = "application/json";
      requestBody = JSON.stringify({ model: ai.model_name, prompt, n: 1, size: media.generation_size || "auto" });
    }
    const result = await fetch(`${ai.base_url.replace(/\/+$/, "")}/images/${mode === "edit" ? "edits" : "generations"}`, {
      method: "POST", headers, body: requestBody, signal,
    });
    const data = JSON.parse((await limitedBytes(result, MAX_BYTES * 1.5)).toString("utf8")).data?.[0];
    let bytes;
    if (data?.b64_json) bytes = Buffer.from(data.b64_json, "base64");
    else if (data?.url) {
      const url = new URL(data.url);
      if (!["https:", "http:"].includes(url.protocol)) throw new Error("图片下载地址无效");
      bytes = await limitedBytes(await fetch(url, { signal }), MAX_BYTES);
    }
    if (!bytes?.length || bytes.length > MAX_BYTES) throw new Error("模型没有返回有效图片，或图片超过 15MB");
    const extension = bytes.subarray(0, 8).equals(Buffer.from("89504e470d0a1a0a", "hex")) ? "png"
      : bytes.subarray(0, 3).equals(Buffer.from("ffd8ff", "hex")) ? "jpg"
      : bytes.toString("ascii", 0, 4) === "RIFF" && bytes.toString("ascii", 8, 12) === "WEBP" ? "webp" : "";
    if (!extension) throw new Error("模型返回的文件不是 PNG、JPEG 或 WebP 图片");
    if (signal.aborted || !getMedia(media.id)) throw new Error("图片操作已中断");
    const directory = path.join(mediaRoot, draft.id);
    await mkdir(directory, { recursive: true });
    const localPath = path.join(directory, `${randomUUID()}.${extension}`);
    await writeFile(localPath, bytes, { flag: "wx" });
    // Keep the previous file. Only switch the displayed image after successful saving.
    database.prepare(`UPDATE draft_media SET local_path = ?, mime_type = ?, generation_prompt = ?,
      download_status = 'ready', image_status = 'idle', image_error = '', updated_at = ? WHERE id = ?`)
      .run(localPath, `image/${extension === "jpg" ? "jpeg" : extension}`, originalPrompt || prompt, new Date().toISOString(), media.id);
  }

  function registerRoutes(app) {
    app.post("/api/draft-media/:id/generate", (request, response) => {
      const media = getMedia(request.params.id);
      if (!media) return response.status(404).json({ message: "图片不存在" });
      const draft = database.prepare("SELECT * FROM drafts WHERE id = ?").get(media.draft_id);
      const mode = request.body?.mode;
      const direction = typeof request.body?.direction === "string" ? request.body.direction.trim() : "";
      if (!["regenerate", "edit"].includes(mode) || (mode === "edit" && (!direction || Array.from(direction).length > 1000))) {
        return response.status(400).json({ message: "请选择操作；修改图片时需要填写 1–1000 个字符的修改要求" });
      }
      if (stopping || busy(draft.id) || database.prepare("SELECT 1 FROM ai_generation_jobs WHERE content_id = ? AND status IN ('queued','running','retry_wait')").get(draft.source_content_id)) {
        return response.status(409).json({ message: "这篇稿件或配图正在生成，请完成后再操作" });
      }
      if (mode === "edit" && (!media.local_path || media.download_status !== "ready")) return response.status(400).json({ message: "底图尚未成功缓存，暂时无法修改" });
      const originalPrompt = originalImagePrompt(database, media, draft);
      if (mode === "regenerate" && !originalPrompt) return response.status(400).json({ message: "这张原帖图片没有生图提示词，请使用“修改图片”" });
      if (mode === "regenerate" && Array.from(originalPrompt).length > 1000) return response.status(400).json({ message: "这张旧图片的原提示词超过 1000 字符，请使用“修改图片”填写新的要求，或重新生成整篇稿件" });
      const ai = database.prepare("SELECT * FROM ai_configurations WHERE model_type = 'image' AND is_selected = 1").get();
      if (!ai) return response.status(409).json({ message: "请先在设置中启用图像模型" });
      database.prepare("UPDATE draft_media SET image_status = 'running', image_error = '' WHERE id = ?").run(media.id);
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 180_000);
      const task = generate(media, draft, ai, mode, mode === "edit" ? direction : originalPrompt, originalPrompt, controller.signal)
        .catch((error) => {
          database.prepare("UPDATE draft_media SET image_status = 'failed', image_error = ? WHERE id = ?")
            .run(controller.signal.aborted ? "图片生成超时或已停止，请重试" : String(error.message).slice(0, 300), media.id);
        }).finally(() => { clearTimeout(timer); tasks.delete(media.id); });
      tasks.set(media.id, { task, controller });
      response.status(202).json({ message: "已开始生成图片" });
    });
  }
  async function stop() {
    stopping = true;
    const running = [...tasks.values()];
    running.forEach(({ controller }) => controller.abort());
    await Promise.allSettled(running.map(({ task }) => task));
  }
  return { registerRoutes, busy, stop };
}
