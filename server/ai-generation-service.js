import { randomUUID } from "node:crypto";
import { createReadStream } from "node:fs";
import { mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { deduplicateLinkCards } from "../shared/link-cards.js";
import { createDraftImageService, originalImagePrompt } from "./draft-image-service.js";

const currentDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectDirectory = path.resolve(currentDirectory, "..");
const workerDirectory = path.join(projectDirectory, "ai");
const workerFile = path.join(workerDirectory, "generate_draft.py");
const mediaRoot = path.join(projectDirectory, "data", "draft-media");
const ACTIVE_STATUSES = new Set(["queued", "running", "retry_wait"]);
const RETRY_DELAYS_MS = [5_000, 20_000, 60_000];
const MAX_IMAGE_BYTES = 15 * 1024 * 1024;
const AI_REQUEST_TIMEOUT_SECONDS = Math.min(
  Math.max(Number(process.env.AI_REQUEST_TIMEOUT_SECONDS) || 60, 15),
  300,
);
const AI_GENERATION_CONCURRENCY = Math.min(
  Math.max(Math.floor(Number(process.env.AI_GENERATION_CONCURRENCY) || 3), 1),
  6,
);

function nowIso() {
  return new Date().toISOString();
}

function parseJson(value, fallback) {
  try {
    return JSON.parse(value || "");
  } catch {
    return fallback;
  }
}

function normalizeBaseUrl(value) {
  return String(value || "").trim().replace(/\/+$/, "");
}

function contentFromRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    accountId: row.account_id,
    accountName: row.account_name,
    accountRegion: row.account_region,
    platform: row.platform,
    platformPostId: row.platform_post_id,
    sourceUrl: row.source_url,
    authorHandle: row.author_handle,
    authorName: row.author_name,
    text: row.text,
    imageUrls: parseJson(row.image_urls, []),
    videoUrls: parseJson(row.video_urls, []),
    videoThumbnailUrls: parseJson(row.video_thumbnail_urls, []),
    linkCards: deduplicateLinkCards(parseJson(row.link_cards, [])),
    promptId: row.prompt_id || null,
    generateImages: row.generate_images !== 0,
    imageSizes: parseJson(row.image_sizes_json, ["auto"]),
    imageCount: row.image_count || 1,
    publishedAt: row.published_at,
    status: row.status,
    createdAt: row.created_at,
  };
}

function safeSnapshot(value) {
  return JSON.stringify(value ?? {});
}

function serializeJob(row, attempts = []) {
  if (!row) return null;
  const source = parseJson(row.source_snapshot_json, {});
  const account = parseJson(row.account_snapshot_json, {});
  const prompt = parseJson(row.prompt_snapshot_json, {});
  const ai = parseJson(row.ai_snapshot_json, {});
  return {
    id: row.id,
    contentId: row.content_id,
    draftId: row.draft_id,
    accountId: row.account_id,
    accountName: account.name || source.accountName || "未知账号",
    promptId: row.prompt_id,
    promptTitle: prompt.title || "",
    modelName: ai.modelName || "",
    status: row.status,
    stage: row.stage,
    progress: row.progress,
    message: row.message,
    attemptCount: row.attempt_count,
    maxAttempts: row.max_attempts,
    errorCode: row.error_code,
    errorMessage: row.error_message,
    sourceUrl: source.sourceUrl || "",
    nextRetryAt: row.next_retry_at,
    startedAt: row.started_at,
    completedAt: row.completed_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    attempts,
  };
}

function serializeAttempt(row) {
  return {
    id: row.id,
    attemptNumber: row.attempt_number,
    status: row.status,
    responseExcerpt: row.response_excerpt,
    errorCode: row.error_code,
    errorMessage: row.error_message,
    durationMs: row.duration_ms,
    tokenUsage: parseJson(row.token_usage_json, {}),
    startedAt: row.started_at,
    completedAt: row.completed_at,
  };
}

function extensionFor(contentType, sourceUrl) {
  const normalized = String(contentType || "").toLowerCase();
  if (normalized.includes("png")) return ".png";
  if (normalized.includes("webp")) return ".webp";
  if (normalized.includes("gif")) return ".gif";
  if (normalized.includes("avif")) return ".avif";
  if (normalized.includes("jpeg") || normalized.includes("jpg")) return ".jpg";
  try {
    const ext = path.extname(new URL(sourceUrl).pathname).toLowerCase();
    if ([".jpg", ".jpeg", ".png", ".webp", ".gif", ".avif"].includes(ext)) return ext;
  } catch {
    // 使用默认扩展名。
  }
  return ".jpg";
}

async function downloadDraftImage(sourceUrl, targetDirectory, index) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20_000);
  try {
    const response = await fetch(sourceUrl, {
      signal: controller.signal,
      headers: { "user-agent": "Mozilla/5.0 FlexibleFox/1.0" },
    });
    if (!response.ok) throw new Error(`图片请求返回 ${response.status}`);
    const declaredLength = Number(response.headers.get("content-length") || 0);
    if (declaredLength > MAX_IMAGE_BYTES) throw new Error("图片超过 15MB 限制");
    const bytes = Buffer.from(await response.arrayBuffer());
    if (bytes.byteLength > MAX_IMAGE_BYTES) throw new Error("图片超过 15MB 限制");
    const mimeType = response.headers.get("content-type")?.split(";")[0] || "image/jpeg";
    const fileName = `${String(index + 1).padStart(2, "0")}${extensionFor(mimeType, sourceUrl)}`;
    const absolutePath = path.join(targetDirectory, fileName);
    await writeFile(absolutePath, bytes);
    return { localPath: absolutePath, mimeType, status: "ready", errorMessage: "" };
  } catch (error) {
    const message = error?.name === "AbortError" ? "下载图片超时" : error.message;
    return { localPath: "", mimeType: "", status: "failed", errorMessage: message };
  } finally {
    clearTimeout(timeout);
  }
}

export function createAiGenerationService({ store }) {
  const database = store.database;
  database.exec(`
    CREATE TABLE IF NOT EXISTS ai_generation_previews (
      job_id TEXT PRIMARY KEY REFERENCES ai_generation_jobs(id) ON DELETE CASCADE,
      text_json TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS ai_generation_preview_images (
      job_id TEXT NOT NULL REFERENCES ai_generation_jobs(id) ON DELETE CASCADE,
      slot INTEGER NOT NULL, mime_type TEXT, image BLOB, error TEXT,
      PRIMARY KEY (job_id, slot)
    );
  `);

  function savePartial(jobId, value) {
    if (statements.getJob.get(jobId)?.status !== "running" || cancelRequestedJobs.has(jobId)) return;
    if (value.type === "text") {
      database.prepare("INSERT OR REPLACE INTO ai_generation_previews VALUES (?, ?)").run(jobId, JSON.stringify(value));
    } else if (Number.isInteger(value.index) && value.index >= 0 && value.index < 100) {
      if (value.type === "image" && ["image/png", "image/jpeg", "image/webp"].includes(value.mimeType)) {
        const bytes = Buffer.from(value.base64 || "", "base64");
        if (!bytes.length || bytes.length > MAX_IMAGE_BYTES) return;
        database.prepare("INSERT OR REPLACE INTO ai_generation_preview_images VALUES (?, ?, ?, ?, NULL)").run(jobId, value.index, value.mimeType, bytes);
      } else if (value.type === "image_error") {
        database.prepare("INSERT OR REPLACE INTO ai_generation_preview_images VALUES (?, ?, NULL, NULL, ?)").run(jobId, value.index, "图片生成失败");
      }
    }
  }
  const imageService = createDraftImageService({ database, mediaRoot });
  let timer = null;
  let stopping = false;
  const activeTasks = new Map();
  const activeChildren = new Map();
  const cancelRequestedJobs = new Set();

  const statements = {
    getContext: database.prepare(`
      SELECT
        c.*,
        a.id AS linked_account_id,
        a.name AS linked_account_name,
        a.url AS linked_account_url,
        a.type AS linked_account_type,
        a.platform AS linked_account_platform,
        a.region AS linked_account_region,
        a.details AS linked_account_details,
        COALESCE(c.prompt_id, a.prompt_id) AS linked_prompt_id,
        p.title AS linked_prompt_title,
        p.content AS linked_prompt_content,
        p.platform AS linked_prompt_platform,
        p.enabled AS linked_prompt_enabled,
        pat.name AS linked_prompt_type_name
      FROM contents c
      LEFT JOIN accounts a ON a.id = c.account_id
      LEFT JOIN prompts p ON p.id = COALESCE(c.prompt_id, a.prompt_id)
      LEFT JOIN prompt_account_types pat ON pat.id = p.account_type_id
      WHERE c.id = ?
    `),
    getEnabledAi: database.prepare(`
      SELECT * FROM ai_configurations
      WHERE is_selected = 1 AND model_type = 'text'
      ORDER BY updated_at DESC, id DESC
      LIMIT 1
    `),
    getAi: database.prepare("SELECT * FROM ai_configurations WHERE id = ?"),
    getActiveJob: database.prepare(`
      SELECT * FROM ai_generation_jobs
      WHERE content_id = ? AND status IN ('queued', 'running', 'retry_wait')
      LIMIT 1
    `),
    listPendingContentIds: database.prepare(`
      SELECT id FROM contents
      WHERE status = '待处理'
      ORDER BY created_at ASC, rowid ASC
    `),
    getJob: database.prepare("SELECT * FROM ai_generation_jobs WHERE id = ?"),
    getNextJob: database.prepare(`
      SELECT * FROM ai_generation_jobs
      WHERE status = 'queued'
         OR (status = 'retry_wait' AND next_retry_at <= ?)
      ORDER BY created_at ASC, id ASC
      LIMIT 1
    `),
    listJobs: database.prepare(`
      SELECT * FROM ai_generation_jobs
      ORDER BY created_at DESC, id DESC
      LIMIT ?
    `),
    listAttempts: database.prepare(`
      SELECT * FROM ai_generation_attempts
      WHERE job_id = ?
      ORDER BY attempt_number DESC
    `),
    getDraft: database.prepare("SELECT * FROM drafts WHERE id = ?"),
    getDraftByContent: database.prepare("SELECT * FROM drafts WHERE source_content_id = ?"),
    listDrafts: database.prepare("SELECT * FROM drafts ORDER BY updated_at DESC, id DESC"),
    listMedia: database.prepare(`
      SELECT * FROM draft_media WHERE draft_id = ? ORDER BY sort_order ASC, id ASC
    `),
    listVersions: database.prepare(`
      SELECT * FROM draft_versions WHERE draft_id = ? ORDER BY version_no DESC
    `),
    getMedia: database.prepare("SELECT * FROM draft_media WHERE id = ?"),
    nextVersion: database.prepare(`
      SELECT COALESCE(MAX(version_no), 0) + 1 AS version_no FROM draft_versions WHERE draft_id = ?
    `),
  };

  function buildContext(row) {
    if (!row) throw Object.assign(new Error("内容不存在或已经被删除"), { status: 404, code: "CONTENT_NOT_FOUND" });
    if (!row.linked_prompt_id || !row.linked_prompt_title) {
      throw Object.assign(new Error("这条内容还没有绑定提示词，请先选择提示词"), { status: 409, code: "PROMPT_NOT_LINKED" });
    }
    if (!row.linked_prompt_enabled) {
      throw Object.assign(new Error("该账号绑定的提示词已停用，请先启用提示词"), { status: 409, code: "PROMPT_DISABLED" });
    }
    const ai = statements.getEnabledAi.get();
    if (!ai) {
      throw Object.assign(new Error("还没有启用文本模型，请先到设置中启用一项文本模型配置"), { status: 409, code: "AI_NOT_CONFIGURED" });
    }
    const source = contentFromRow(row);
    if (source.generateImages) {
      const imageAi = database.prepare("SELECT id, model_name FROM ai_configurations WHERE is_selected = 1 AND model_type = 'image' LIMIT 1").get();
      if (!imageAi) {
        throw Object.assign(new Error("请在设置中启用图像模型，或关闭这条帖子的“生成图片”"), { status: 409, code: "IMAGE_AI_NOT_CONFIGURED" });
      }
      source.imageConfigurationId = imageAi.id;
    }
    source.draftImageUrls = [...new Set([
      ...(Array.isArray(source.imageUrls) ? source.imageUrls : []),
      ...(Array.isArray(source.videoThumbnailUrls) ? source.videoThumbnailUrls : []),
      ...(Array.isArray(source.linkCards)
        ? source.linkCards.map((card) => card?.imageUrl).filter(Boolean)
        : []),
    ])];
    const account = row.linked_account_id
      ? {
          id: row.linked_account_id,
          name: row.linked_account_name,
          url: row.linked_account_url,
          type: row.linked_account_type,
          platform: row.linked_account_platform,
          region: row.linked_account_region,
          details: row.linked_account_details,
        }
      : {
          id: null,
          name: row.account_name,
          url: row.source_url,
          type: row.linked_prompt_type_name || "",
          platform: row.platform,
          region: row.account_region,
          details: "原信息账号已删除，当前使用抓取时保存的历史快照。",
        };
    const prompt = {
      id: row.linked_prompt_id,
      title: row.linked_prompt_title,
      content: row.linked_prompt_content,
      platform: row.linked_prompt_platform,
      accountTypeName: row.linked_prompt_type_name,
    };
    return { source, account, prompt, ai };
  }

  function enqueueOne(contentId, { revisionContext = null } = {}) {
    const draft = statements.getDraftByContent.get(contentId);
    if (draft && database.prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name='draft_publications'").get()
      && database.prepare("SELECT 1 FROM draft_publications WHERE draft_id=? AND status='running'").get(draft.id)) {
      throw Object.assign(new Error("稿件正在发布，请完成后再生成"), { status: 409 });
    }
    if (draft && imageService.busy(draft.id)) throw Object.assign(new Error("配图正在生成，请完成后再重新生成稿件"), { status: 409 });
    const existing = statements.getActiveJob.get(contentId);
    if (existing) return { created: false, job: serializeJob(existing), reason: "active" };
    const { source, account, prompt, ai } = buildContext(statements.getContext.get(contentId));
    const timestamp = nowIso();
    const id = randomUUID();
    database.prepare(`
      INSERT INTO ai_generation_jobs (
        id, content_id, account_id, prompt_id, ai_configuration_id,
        status, stage, progress, message, source_snapshot_json,
        account_snapshot_json, prompt_snapshot_json, ai_snapshot_json, revision_context_json,
        created_at, updated_at
      ) VALUES (
        @id, @contentId, @accountId, @promptId, @aiConfigurationId,
        'queued', 'queued', 0, '等待生成', @sourceSnapshot,
        @accountSnapshot, @promptSnapshot, @aiSnapshot, @revisionContext,
        @createdAt, @updatedAt
      )
    `).run({
      id,
      contentId,
      accountId: account.id,
      promptId: prompt.id,
      aiConfigurationId: ai.id,
      sourceSnapshot: safeSnapshot(source),
      accountSnapshot: safeSnapshot(account),
      promptSnapshot: safeSnapshot(prompt),
      aiSnapshot: safeSnapshot({ id: ai.id, modelName: ai.model_name, baseUrl: ai.base_url }),
      revisionContext: safeSnapshot(revisionContext || {}),
      createdAt: timestamp,
      updatedAt: timestamp,
    });
    database.prepare("UPDATE contents SET status = '已处理', updated_at = ? WHERE id = ?").run(timestamp, contentId);
    return { created: true, job: serializeJob(statements.getJob.get(id)) };
  }

  function enqueueMany(contentIds) {
    const results = [];
    for (const contentId of contentIds) {
      try {
        results.push({ contentId, ...enqueueOne(contentId) });
      } catch (error) {
        results.push({
          contentId,
          created: false,
          error: error.message,
          code: error.code || "VALIDATION_ERROR",
        });
      }
    }
    const createdCount = results.filter((item) => item.created).length;
    if (createdCount) setImmediate(pump);
    return { createdCount, results };
  }

  function enqueueContentIds(contentIds, { limit = 100 } = {}) {
    const safeLimit = Math.min(Math.max(Number(limit) || 100, 1), 100);
    const uniqueIds = [...new Set(Array.isArray(contentIds) ? contentIds : [])]
      .map(String)
      .slice(0, safeLimit);
    return enqueueMany(uniqueIds);
  }

  function enqueuePendingContents() {
    const contentIds = statements.listPendingContentIds.all().map((row) => row.id);
    return {
      pendingCount: contentIds.length,
      ...enqueueMany(contentIds),
    };
  }

  function updateProgress(jobId, stage, progress, message) {
    database.prepare(`
      UPDATE ai_generation_jobs
      SET stage = ?, progress = ?, message = ?, updated_at = ?
      WHERE id = ? AND status = 'running'
    `).run(stage || "generating", Math.max(1, Math.min(95, Number(progress) || 1)), message || "正在生成", nowIso(), jobId);
  }

  function runWorker(jobId, payload, onProgress) {
    return new Promise((resolve, reject) => {
      const pythonCommand = process.env.PYTHON_COMMAND || (process.platform === "win32" ? "python" : "python3");
      const child = spawn(pythonCommand, [workerFile], {
        cwd: workerDirectory,
        env: { ...process.env, PYTHONIOENCODING: "utf-8", PYTHONUTF8: "1" },
        stdio: ["pipe", "pipe", "pipe"],
        windowsHide: true,
      });
      activeChildren.set(jobId, child);
      let stdoutBuffer = "";
      let stderr = "";
      let result = null;
      let workerError = null;

      function consumeLine(line) {
        const prefixes = ["FLEXIBLEFOX_AI_PROGRESS ", "FLEXIBLEFOX_AI_RESULT ", "FLEXIBLEFOX_AI_ERROR ", "FLEXIBLEFOX_AI_PARTIAL "];
        const prefix = prefixes.find((candidate) => line.startsWith(candidate));
        if (!prefix) return;
        const value = parseJson(line.slice(prefix.length), {});
        if (prefix.includes("PARTIAL")) {
          try { savePartial(jobId, value); } catch { /* Final result remains authoritative. */ }
        }
        if (prefix.includes("PROGRESS")) onProgress(value);
        if (prefix.includes("RESULT")) result = value;
        if (prefix.includes("ERROR")) workerError = value;
      }

      child.stdout.setEncoding("utf8");
      child.stdout.on("data", (chunk) => {
        stdoutBuffer += chunk;
        const lines = stdoutBuffer.split(/\r?\n/);
        stdoutBuffer = lines.pop() || "";
        for (const line of lines) consumeLine(line.trim());
      });
      child.stderr.setEncoding("utf8");
      child.stderr.on("data", (chunk) => { stderr += chunk; });
      child.on("error", (error) => {
        activeChildren.delete(jobId);
        reject({ code: "WORKER_START_FAILED", message: error.message, retryable: false });
      });
      child.on("close", (code) => {
        activeChildren.delete(jobId);
        if (stdoutBuffer.trim()) consumeLine(stdoutBuffer.trim());
        if (code === 0 && result) return resolve(result);
        reject(workerError || {
          code: "WORKER_FAILED",
          message: stderr.trim().slice(-1_500) || `AI Worker 退出码 ${code}`,
          retryable: code !== 2,
        });
      });
      child.stdin.end(JSON.stringify(payload));
    });
  }

  async function cacheMedia(draftId, sourceUrls, selectedIndexes) {
    const directory = path.join(mediaRoot, draftId);
    await rm(directory, { recursive: true, force: true });
    await mkdir(directory, { recursive: true });
    database.prepare("DELETE FROM draft_media WHERE draft_id = ?").run(draftId);
    const selected = new Set(Array.isArray(selectedIndexes) ? selectedIndexes.map(Number) : []);
    const timestamp = nowIso();
    const records = [];
    for (let index = 0; index < sourceUrls.length; index += 1) {
      const sourceUrl = sourceUrls[index];
      const downloaded = await downloadDraftImage(sourceUrl, directory, index);
      const record = {
        id: randomUUID(),
        draftId,
        sourceUrl,
        localPath: downloaded.localPath,
        mimeType: downloaded.mimeType,
        sortOrder: index,
        enabled: selected.size === 0 || selected.has(index) ? 1 : 0,
        downloadStatus: downloaded.status,
        errorMessage: downloaded.errorMessage,
        createdAt: timestamp,
        updatedAt: timestamp,
      };
      database.prepare(`
        INSERT INTO draft_media (
          id, draft_id, source_url, local_path, mime_type, sort_order,
          is_enabled, download_status, error_message, created_at, updated_at
        ) VALUES (
          @id, @draftId, @sourceUrl, @localPath, @mimeType, @sortOrder,
          @enabled, @downloadStatus, @errorMessage, @createdAt, @updatedAt
        )
      `).run(record);
      records.push(record);
    }
    return records;
  }

  async function saveSuccess(job, result, startedAtMs) {
    const timestamp = nowIso();
    const existingDraft = statements.getDraftByContent.get(job.content_id);
    const draftId = existingDraft?.id || randomUUID();
    const title = String(result.title || "").trim();
    const body = String(result.body || "").trim();
    const hashtags = Array.isArray(result.hashtags) ? result.hashtags.map(String).filter(Boolean).slice(0, 20) : [];
    if (!title || !body) throw { code: "EMPTY_AI_RESULT", message: "模型返回的标题或正文为空", retryable: true };
    const sourceSettings = parseJson(job.source_snapshot_json, {});
    const generatedImages = [];
    if (sourceSettings.generateImages === true) {
      const images = result.generatedImages || (result.generatedImage ? [result.generatedImage] : []);
      const sizes = sourceSettings.imageSizes || ["auto"];
      const count = sourceSettings.imageCount || 1;
      if (!Array.isArray(images) || images.length !== sizes.length * count) throw { code: "INVALID_GENERATED_IMAGE", message: "生成图片数量与设置不一致", retryable: false };
      let totalBytes = 0;
      for (const [index, image] of images.entries()) {
        const extension = { "image/png": ".png", "image/jpeg": ".jpg", "image/webp": ".webp" }[image?.mimeType];
        if (!extension || (image.size || "auto") !== sizes[Math.floor(index / count)]) throw { code: "INVALID_GENERATED_IMAGE", message: "图像格式或尺寸设置不一致", retryable: false };
        const encoded = image?.base64;
        if (typeof encoded !== "string" || encoded.length > MAX_IMAGE_BYTES * 1.4) {
          throw { code: "INVALID_GENERATED_IMAGE", message: "图像模型未返回有效图片或图片超过 15MB", retryable: false };
        }
        const bytes = Buffer.from(encoded, "base64");
        totalBytes += bytes.length;
        if (!bytes.length || bytes.length > MAX_IMAGE_BYTES || totalBytes > MAX_IMAGE_BYTES * 8) {
          throw { code: "INVALID_GENERATED_IMAGE", message: "生成图片为空、单张超过 15MB 或合计超过 120MB", retryable: false };
        }
        generatedImages.push({ ...image, bytes, extension });
      }
    }

    const commitDraft = database.transaction(() => {
      if (existingDraft) {
        database.prepare(`
          UPDATE drafts SET generation_job_id = @jobId, title = @title, body = @body,
            hashtags_json = @hashtags, status = '待审核',
            source_snapshot_json = @sourceSnapshot, account_snapshot_json = @accountSnapshot,
            prompt_snapshot_json = @promptSnapshot, ai_snapshot_json = @aiSnapshot,
            updated_at = @updatedAt WHERE id = @id
        `).run({
          id: draftId,
          jobId: job.id,
          title,
          body,
          hashtags: safeSnapshot(hashtags),
          sourceSnapshot: job.source_snapshot_json,
          accountSnapshot: job.account_snapshot_json,
          promptSnapshot: job.prompt_snapshot_json,
          aiSnapshot: job.ai_snapshot_json,
          updatedAt: timestamp,
        });
      } else {
        database.prepare(`
          INSERT INTO drafts (
            id, source_content_id, account_id, prompt_id, generation_job_id,
            title, body, hashtags_json, status, source_snapshot_json,
            account_snapshot_json, prompt_snapshot_json, ai_snapshot_json,
            created_at, updated_at
          ) VALUES (
            @id, @contentId, @accountId, @promptId, @jobId,
            @title, @body, @hashtags, '待审核', @sourceSnapshot,
            @accountSnapshot, @promptSnapshot, @aiSnapshot,
            @createdAt, @updatedAt
          )
        `).run({
          id: draftId,
          contentId: job.content_id,
          accountId: job.account_id,
          promptId: job.prompt_id,
          jobId: job.id,
          title,
          body,
          hashtags: safeSnapshot(hashtags),
          sourceSnapshot: job.source_snapshot_json,
          accountSnapshot: job.account_snapshot_json,
          promptSnapshot: job.prompt_snapshot_json,
          aiSnapshot: job.ai_snapshot_json,
          createdAt: timestamp,
          updatedAt: timestamp,
        });
      }
      const versionNo = statements.nextVersion.get(draftId).version_no;
      database.prepare(`
        INSERT INTO draft_versions (
          id, draft_id, version_no, generation_job_id, title, body,
          hashtags_json, origin, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, 'ai', ?)
      `).run(randomUUID(), draftId, versionNo, job.id, title, body, safeSnapshot(hashtags), timestamp);
    });
    commitDraft();
    updateProgress(job.id, "media", 82, "正在保存生成图片");
    const draftImageUrls = [];
    await cacheMedia(draftId, draftImageUrls, []);
    for (const [index, image] of generatedImages.entries()) {
      const mimeType = image.mimeType;
      const localPath = path.join(mediaRoot, draftId, `generated-${index + 1}${image.extension}`);
      await writeFile(localPath, image.bytes);
      database.prepare(`
        INSERT INTO draft_media (id, draft_id, source_url, local_path, mime_type, sort_order,
          is_enabled, download_status, created_at, updated_at, generation_prompt, generation_size)
        VALUES (?, ?, '', ?, ?, ?, 1, 'ready', ?, ?, ?, ?)
      `).run(randomUUID(), draftId, localPath, mimeType, draftImageUrls.length + index, timestamp, timestamp, image.prompt || "", image.size || "auto");
    }
    const duration = Date.now() - startedAtMs;
    database.transaction(() => {
      database.prepare(`
        UPDATE ai_generation_jobs
        SET draft_id = ?, status = 'success', stage = 'completed', progress = 100,
            message = '稿件生成完成', error_code = '', error_message = '',
            completed_at = ?, updated_at = ? WHERE id = ?
      `).run(draftId, timestamp, timestamp, job.id);
      database.prepare(`
        UPDATE ai_generation_attempts
        SET status = 'success', response_excerpt = ?, duration_ms = ?,
            token_usage_json = ?, completed_at = ?
        WHERE job_id = ? AND attempt_number = ?
      `).run(`${title}\n${body}`.slice(0, 1_000), duration, safeSnapshot(result.usage || {}), timestamp, job.id, job.attempt_count);
      database.prepare("UPDATE contents SET status = '已处理', updated_at = ? WHERE id = ?").run(timestamp, job.content_id);
    })();
  }

  function saveFailure(job, failure, startedAtMs) {
    const timestamp = nowIso();
    const retryable = failure?.retryable !== false && job.attempt_count < job.max_attempts;
    const code = String(failure?.code || "AI_GENERATION_FAILED").slice(0, 120);
    const message = String(failure?.message || "AI 生成失败").slice(0, 2_000);
    const delay = RETRY_DELAYS_MS[Math.min(job.attempt_count - 1, RETRY_DELAYS_MS.length - 1)];
    const nextRetryAt = retryable ? new Date(Date.now() + delay).toISOString() : null;
    database.transaction(() => {
      database.prepare(`
        UPDATE ai_generation_attempts SET status = 'failed', error_code = ?,
          error_message = ?, duration_ms = ?, completed_at = ?
        WHERE job_id = ? AND attempt_number = ?
      `).run(code, message, Date.now() - startedAtMs, timestamp, job.id, job.attempt_count);
      database.prepare(`
        UPDATE ai_generation_jobs
        SET status = ?, stage = ?, progress = ?, message = ?, error_code = ?,
          error_message = ?, next_retry_at = ?, completed_at = ?, updated_at = ?
        WHERE id = ?
      `).run(
        retryable ? "retry_wait" : "failed",
        retryable ? "retry_wait" : "failed",
        retryable ? Math.max(job.progress, 10) : job.progress,
        retryable ? `${message}，稍后自动重试` : message,
        code,
        message,
        nextRetryAt,
        retryable ? null : timestamp,
        timestamp,
        job.id,
      );
      if (!retryable) {
        database.prepare(`
          UPDATE contents
          SET status = '待处理', updated_at = ?
          WHERE id = ?
            AND NOT EXISTS (
              SELECT 1 FROM drafts WHERE source_content_id = contents.id
            )
        `).run(timestamp, job.content_id);
      }
    })();
  }

  async function processJob(row) {
    const startedAt = nowIso();
    const claim = database.prepare(`
      UPDATE ai_generation_jobs
      SET status = 'running', stage = 'preparing', progress = 5,
          message = '正在准备原帖、账号和提示词', attempt_count = attempt_count + 1,
          next_retry_at = NULL, started_at = COALESCE(started_at, ?), updated_at = ?
      WHERE id = ? AND status IN ('queued', 'retry_wait')
    `).run(startedAt, startedAt, row.id);
    if (!claim.changes) return;
    database.prepare("DELETE FROM ai_generation_previews WHERE job_id = ?").run(row.id);
    database.prepare("DELETE FROM ai_generation_preview_images WHERE job_id = ?").run(row.id);
    const job = statements.getJob.get(row.id);
    database.prepare(`
      INSERT INTO ai_generation_attempts (
        id, job_id, attempt_number, status, started_at
      ) VALUES (?, ?, ?, 'running', ?)
    `).run(randomUUID(), job.id, job.attempt_count, startedAt);
    const startedAtMs = Date.now();
    const heartbeat = setInterval(() => {
      const currentJob = statements.getJob.get(job.id);
      if (!currentJob || currentJob.status !== "running") return;
      const elapsedSeconds = Math.max(1, Math.floor((Date.now() - startedAtMs) / 1_000));
      if (currentJob.stage === "connecting" || currentJob.stage === "generating") {
        updateProgress(
          job.id,
          currentJob.stage,
          currentJob.progress,
          `模型正在处理，已等待 ${elapsedSeconds} 秒（单次最多 ${AI_REQUEST_TIMEOUT_SECONDS} 秒）`,
        );
      }
    }, 5_000);
    heartbeat.unref?.();
    try {
      const ai = statements.getAi.get(job.ai_configuration_id);
      if (!ai) throw { code: "AI_CONFIGURATION_REMOVED", message: "任务使用的 AI 配置已被删除", retryable: false };
      const payload = {
        source: parseJson(job.source_snapshot_json, {}),
        account: parseJson(job.account_snapshot_json, {}),
        prompt: parseJson(job.prompt_snapshot_json, {}),
        revision: parseJson(job.revision_context_json, {}),
        ai: { modelName: ai.model_name, apiKey: ai.api_key, baseUrl: normalizeBaseUrl(ai.base_url) },
      };
      if (payload.source.generateImages === true) {
        const imageAi = statements.getAi.get(payload.source.imageConfigurationId);
        if (!imageAi || imageAi.model_type !== "image") {
          throw { code: "IMAGE_AI_CONFIGURATION_REMOVED", message: "任务使用的图像模型配置已删除，请重新生成", retryable: false };
        }
        payload.imageAi = { modelName: imageAi.model_name, apiKey: imageAi.api_key, baseUrl: normalizeBaseUrl(imageAi.base_url) };
      }
      if (cancelRequestedJobs.has(job.id)) {
        throw { code: "USER_CANCELLED", message: "任务已手动停止", retryable: false };
      }
      const result = await runWorker(job.id, payload, (progress) => {
        updateProgress(job.id, progress.stage, progress.progress, progress.message);
      });
      if (cancelRequestedJobs.has(job.id)) {
        throw { code: "USER_CANCELLED", message: "任务已手动停止", retryable: false };
      }
      await saveSuccess(statements.getJob.get(job.id), result, startedAtMs);
      database.prepare("DELETE FROM ai_generation_previews WHERE job_id = ?").run(job.id);
      database.prepare("DELETE FROM ai_generation_preview_images WHERE job_id = ?").run(job.id);
    } catch (failure) {
      const wasCancelled = cancelRequestedJobs.delete(job.id);
      saveFailure(
        statements.getJob.get(job.id),
        wasCancelled
          ? { code: "USER_CANCELLED", message: "任务已手动停止", retryable: false }
          : failure,
        startedAtMs,
      );
    } finally {
      clearInterval(heartbeat);
    }
  }

  function pump() {
    if (stopping) return;
    while (activeTasks.size < AI_GENERATION_CONCURRENCY) {
      const row = statements.getNextJob.get(nowIso());
      if (!row) break;
      const task = processJob(row)
        .catch((error) => {
          console.error(`AI 生成任务 ${row.id} 执行异常：`, error);
        })
        .finally(() => {
          activeTasks.delete(row.id);
          if (!stopping) setImmediate(pump);
        });
      activeTasks.set(row.id, task);
    }
  }

  function mediaFromRow(row) {
    return {
      id: row.id,
      sourceUrl: row.source_url,
      url: row.local_path ? `/api/draft-media/${encodeURIComponent(row.id)}?v=${encodeURIComponent(row.updated_at)}` : row.source_url,
      imageStatus: row.image_status,
      generationSize: row.generation_size,
      imageError: row.image_error,
      canRegenerate: Boolean(originalImagePrompt(database, row, statements.getDraft.get(row.draft_id))),
      mimeType: row.mime_type,
      sortOrder: row.sort_order,
      enabled: Boolean(row.is_enabled),
      downloadStatus: row.download_status,
      errorMessage: row.error_message,
    };
  }

  function versionFromRow(row) {
    return {
      id: row.id,
      versionNo: row.version_no,
      title: row.title,
      body: row.body,
      hashtags: parseJson(row.hashtags_json, []),
      origin: row.origin,
      createdAt: row.created_at,
    };
  }

  function serializeDraft(row, includeVersions = false) {
    if (!row) return null;
    const source = parseJson(row.source_snapshot_json, {});
    const account = parseJson(row.account_snapshot_json, {});
    const prompt = parseJson(row.prompt_snapshot_json, {});
    const ai = parseJson(row.ai_snapshot_json, {});
    const versions = statements.listVersions.all(row.id);
    return {
      id: row.id,
      sourceContentId: row.source_content_id,
      generationJobId: row.generation_job_id,
      title: row.title,
      body: row.body,
      hashtags: parseJson(row.hashtags_json, []),
      status: row.status,
      account: { id: row.account_id, name: account.name || source.accountName || "未知账号", ...account },
      prompt: { id: row.prompt_id, title: prompt.title || "", ...prompt },
      ai,
      source,
      media: statements.listMedia.all(row.id).filter((media) => !media.source_url || media.generation_prompt).map(mediaFromRow),
      versionCount: versions.length,
      versions: includeVersions ? versions.map(versionFromRow) : undefined,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  function registerRoutes(app) {
    imageService.registerRoutes(app);
    app.post("/api/ai-generation-jobs/pending", (_request, response) => {
      const { pendingCount, createdCount, results } = enqueuePendingContents();
      const failedCount = results.length - createdCount;
      if (!pendingCount) {
        return response.json({ pendingCount, createdCount, failedCount, results });
      }
      if (!createdCount) {
        return response.status(409).json({
          message: results[0]?.error || "待处理内容暂时无法生成",
          pendingCount,
          createdCount,
          failedCount,
          results,
        });
      }
      return response.status(202).json({ pendingCount, createdCount, failedCount, results });
    });

    app.post("/api/ai-generation-jobs", (request, response) => {
      const contentIds = Array.isArray(request.body?.contentIds) ? request.body.contentIds : [];
      if (!contentIds.length) return response.status(400).json({ message: "请选择至少一条内容" });
      const { createdCount, results } = enqueueContentIds(contentIds, { limit: 20 });
      if (!createdCount) {
        const first = results[0];
        const message = first?.error || (first?.reason === "active" ? "这条内容已经在生成队列中" : "没有创建生成任务");
        return response.status(409).json({ message, createdCount, results });
      }
      return response.status(202).json({ createdCount, results });
    });

    app.get("/api/ai-generation-jobs", (request, response) => {
      const limit = Math.min(Math.max(Number(request.query.limit) || 50, 1), 100);
      const jobs = statements.listJobs.all(limit).map((row) => serializeJob(
        row,
        statements.listAttempts.all(row.id).map(serializeAttempt),
      ));
      for (const job of jobs) {
        const preview = database.prepare("SELECT text_json FROM ai_generation_previews WHERE job_id = ?").get(job.id);
        if (!preview) continue;
        job.preview = parseJson(preview.text_json, {});
        job.preview.images = database.prepare("SELECT slot, error, mime_type FROM ai_generation_preview_images WHERE job_id = ? ORDER BY slot").all(job.id)
          .map((item) => ({ index: item.slot, error: item.error, url: item.mime_type ? `/api/ai-generation-jobs/${encodeURIComponent(job.id)}/preview-images/${item.slot}?attempt=${job.attemptCount}` : null }));
      }
      response.json(jobs);
    });

    app.get("/api/ai-generation-jobs/:id/preview-images/:slot", (request, response) => {
      const item = database.prepare("SELECT image, mime_type FROM ai_generation_preview_images WHERE job_id = ? AND slot = ?").get(request.params.id, Number(request.params.slot));
      if (!item?.image) return response.status(404).end();
      response.set("Cache-Control", "no-store").type(item.mime_type).send(item.image);
    });

    app.delete("/api/ai-generation-jobs/:id", (request, response) => {
      const job = statements.getJob.get(request.params.id);
      if (!job) return response.status(404).json({ message: "生成任务不存在" });
      if (job.status !== "failed" || activeTasks.has(job.id)) {
        return response.status(409).json({ message: "只能删除已结束的失败记录" });
      }
      database.prepare("DELETE FROM ai_generation_jobs WHERE id = ? AND status = 'failed'").run(job.id);
      return response.json({ deleted: true });
    });

    app.get("/api/ai-generation-status", (_request, response) => {
      response.json({
        concurrency: AI_GENERATION_CONCURRENCY,
        runningCount: activeTasks.size,
      });
    });

    app.post("/api/ai-generation-jobs/:id/retry", (request, response) => {
      const job = statements.getJob.get(request.params.id);
      if (!job) return response.status(404).json({ message: "生成任务不存在" });
      if (ACTIVE_STATUSES.has(job.status)) return response.status(409).json({ message: "任务仍在执行或等待重试" });
      if (job.status === "success") {
        try {
          const result = enqueueOne(job.content_id);
          setImmediate(pump);
          return response.status(202).json(result.job);
        } catch (error) {
          return response.status(error.status || 400).json({ message: error.message });
        }
      }
      const retryDraft = statements.getDraftByContent.get(job.content_id);
      if (retryDraft && imageService.busy(retryDraft.id)) return response.status(409).json({ message: "配图正在生成，请完成后再重试稿件" });
      const timestamp = nowIso();
      database.transaction(() => {
        database.prepare(`
          UPDATE ai_generation_jobs
          SET status = 'queued', stage = 'queued', progress = 0, message = '等待手动重试',
              max_attempts = attempt_count + 3, error_code = '', error_message = '', next_retry_at = NULL,
              started_at = NULL, completed_at = NULL, updated_at = ? WHERE id = ?
        `).run(timestamp, job.id);
        database.prepare("UPDATE contents SET status = '已处理', updated_at = ? WHERE id = ?")
          .run(timestamp, job.content_id);
      })();
      setImmediate(pump);
      response.status(202).json(serializeJob(statements.getJob.get(job.id)));
    });

    app.post("/api/ai-generation-jobs/:id/cancel", (request, response) => {
      const job = statements.getJob.get(request.params.id);
      if (!job) return response.status(404).json({ message: "生成任务不存在" });
      if (!ACTIVE_STATUSES.has(job.status)) {
        return response.status(409).json({ message: "任务已经结束，不需要停止" });
      }
      if (job.status === "running") {
        cancelRequestedJobs.add(job.id);
        const child = activeChildren.get(job.id);
        if (child && !child.killed) child.kill();
        return response.status(202).json({ message: "正在停止任务" });
      }
      const timestamp = nowIso();
      database.transaction(() => {
        database.prepare(`
          UPDATE ai_generation_jobs
          SET status = 'failed', stage = 'failed', message = '任务已手动停止',
              error_code = 'USER_CANCELLED', error_message = '任务已手动停止',
              next_retry_at = NULL, completed_at = ?, updated_at = ?
          WHERE id = ?
        `).run(timestamp, timestamp, job.id);
        database.prepare(`
          UPDATE contents
          SET status = '待处理', updated_at = ?
          WHERE id = ?
            AND NOT EXISTS (
              SELECT 1 FROM drafts WHERE source_content_id = contents.id
            )
        `).run(timestamp, job.content_id);
      })();
      return response.json(serializeJob(statements.getJob.get(job.id)));
    });

    app.get("/api/drafts", (_request, response) => {
      response.json(statements.listDrafts.all().map((row) => serializeDraft(row)));
    });

    app.post("/api/drafts/:id/regenerate", (request, response) => {
      const draft = statements.getDraft.get(request.params.id);
      if (!draft) return response.status(404).json({ message: "稿件不存在" });
      const direction = typeof request.body?.direction === "string" ? request.body.direction.trim() : "";
      if (direction.length > 4_000) {
        return response.status(400).json({ message: "调整方向不能超过 4000 个字符" });
      }
      const revisionContext = direction
        ? {
            direction,
            previousDraft: {
              title: draft.title,
              body: draft.body,
              hashtags: parseJson(draft.hashtags_json, []),
            },
          }
        : null;
      try {
        const result = enqueueOne(draft.source_content_id, { revisionContext });
        if (!result.created) {
          return response.status(409).json({
            message: result.reason === "active" ? "这篇稿件已经在重新生成" : "没有创建生成任务",
          });
        }
        setImmediate(pump);
        return response.status(202).json(result.job);
      } catch (error) {
        return response.status(error.status || 400).json({ message: error.message });
      }
    });

    app.get("/api/drafts/:id", (request, response) => {
      const draft = serializeDraft(statements.getDraft.get(request.params.id), true);
      if (!draft) return response.status(404).json({ message: "稿件不存在" });
      response.json(draft);
    });

    app.patch("/api/drafts/:id", (request, response) => {
      const draft = statements.getDraft.get(request.params.id);
      if (!draft) return response.status(404).json({ message: "稿件不存在" });
      const title = typeof request.body?.title === "string" ? request.body.title.trim() : draft.title;
      const body = typeof request.body?.body === "string" ? request.body.body.trim() : draft.body;
      const hashtags = Array.isArray(request.body?.hashtags)
        ? request.body.hashtags.map(String).map((tag) => tag.trim().replace(/^#+/, "")).filter(Boolean).slice(0, 20)
        : parseJson(draft.hashtags_json, []);
      const hashtagsJson = safeSnapshot(hashtags);
      if (!title || !body) return response.status(400).json({ message: "标题和正文不能为空" });
      const changedText = title !== draft.title || body !== draft.body || hashtagsJson !== draft.hashtags_json;
      const timestamp = nowIso();
      database.transaction(() => {
        database.prepare("UPDATE drafts SET title = ?, body = ?, hashtags_json = ?, updated_at = ? WHERE id = ?")
          .run(title, body, hashtagsJson, timestamp, draft.id);
        if (changedText) {
          const versionNo = statements.nextVersion.get(draft.id).version_no;
          database.prepare(`
            INSERT INTO draft_versions (
              id, draft_id, version_no, title, body, hashtags_json, origin, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, 'manual', ?)
          `).run(randomUUID(), draft.id, versionNo, title, body, hashtagsJson, timestamp);
        }
      })();
      response.json(serializeDraft(statements.getDraft.get(draft.id), true));
    });

    app.patch("/api/drafts/:id/media", (request, response) => {
      const draft = statements.getDraft.get(request.params.id);
      if (!draft) return response.status(404).json({ message: "稿件不存在" });
      const media = Array.isArray(request.body?.media) ? request.body.media : [];
      const update = database.prepare(`
        UPDATE draft_media SET is_enabled = ?, sort_order = ?, updated_at = ?
        WHERE id = ? AND draft_id = ?
      `);
      const timestamp = nowIso();
      database.transaction(() => {
        media.forEach((item, index) => update.run(item.enabled === false ? 0 : 1, Number.isFinite(item.sortOrder) ? item.sortOrder : index, timestamp, item.id, draft.id));
        database.prepare("UPDATE drafts SET updated_at = ? WHERE id = ?").run(timestamp, draft.id);
      })();
      response.json(serializeDraft(statements.getDraft.get(draft.id), true));
    });

    app.delete("/api/draft-media/:id", (request, response) => {
      const media = statements.getMedia.get(request.params.id);
      if (!media) return response.status(404).json({ message: "图片不存在或已删除" });
      const draft = statements.getDraft.get(media.draft_id);
      const generation = database.prepare(`
        SELECT 1 FROM ai_generation_jobs
        WHERE content_id = ? AND status IN ('queued', 'running', 'retry_wait')
      `).get(draft.source_content_id);
      if (imageService.busy(draft.id) || generation) {
        return response.status(409).json({ message: "稿件或配图正在生成，请完成后再删除图片" });
      }
      database.transaction(() => {
        database.prepare("DELETE FROM draft_media WHERE id = ? AND draft_id = ?").run(media.id, draft.id);
        database.prepare("UPDATE drafts SET updated_at = ? WHERE id = ?").run(nowIso(), draft.id);
      })();
      // Remove only this draft's attachment. Keep cached originals until the draft's
      // normal cleanup; another version may still use the same file.
      response.json(serializeDraft(statements.getDraft.get(draft.id), true));
    });

    app.delete("/api/drafts/:id", async (request, response, next) => {
      try {
        const draft = statements.getDraft.get(request.params.id);
        if (!draft) return response.status(404).json({ message: "稿件不存在" });
        if (imageService.busy(draft.id)) return response.status(409).json({ message: "配图正在生成，请完成后再删除稿件" });
        database.transaction(() => {
          database.prepare("UPDATE ai_generation_jobs SET draft_id = NULL WHERE draft_id = ?").run(draft.id);
          database.prepare("DELETE FROM drafts WHERE id = ?").run(draft.id);
          database.prepare("UPDATE contents SET status = '已处理', updated_at = ? WHERE id = ?")
            .run(nowIso(), draft.source_content_id);
        })();
        const directory = path.resolve(mediaRoot, draft.id);
        if (directory.startsWith(`${path.resolve(mediaRoot)}${path.sep}`)) {
          await rm(directory, { recursive: true, force: true });
        }
        return response.status(204).end();
      } catch (error) {
        return next(error);
      }
    });

    app.get("/api/draft-media/:id", (request, response) => {
      const media = statements.getMedia.get(request.params.id);
      if (!media?.local_path) return response.status(404).json({ message: "图片缓存不存在" });
      const absolutePath = path.resolve(media.local_path);
      if (!absolutePath.startsWith(`${path.resolve(mediaRoot)}${path.sep}`)) {
        return response.status(403).json({ message: "图片路径无效" });
      }
      response.type(media.mime_type || path.extname(absolutePath));
      createReadStream(absolutePath).on("error", () => {
        if (!response.headersSent) response.status(404).json({ message: "图片文件不存在" });
        else response.destroy();
      }).pipe(response);
    });
  }

  function start() {
    stopping = false;
    const timestamp = nowIso();
    database.transaction(() => {
      database.prepare(`
        UPDATE ai_generation_attempts
        SET status = 'failed', error_code = 'SERVICE_RESTARTED',
            error_message = '服务重启，本次尝试已中断', completed_at = ?
        WHERE status = 'running'
      `).run(timestamp);
      database.prepare(`
        UPDATE ai_generation_jobs
        SET status = 'queued', stage = 'queued', message = '服务重启，任务已恢复排队', updated_at = ?
        WHERE status = 'running'
      `).run(timestamp);
    })();
    timer = setInterval(pump, 1_000);
    timer.unref?.();
    setImmediate(pump);
  }

  async function stop() {
    stopping = true;
    await imageService.stop();
    if (timer) clearInterval(timer);
    timer = null;
    for (const child of activeChildren.values()) {
      if (!child.killed) child.kill();
    }
    const runningTasks = [...activeTasks.values()];
    if (runningTasks.length) {
      await Promise.race([
        Promise.allSettled(runningTasks),
        new Promise((resolve) => setTimeout(resolve, 3_000)),
      ]);
    }
  }

  return {
    registerRoutes,
    start,
    stop,
    enqueueContentIds,
    enqueuePendingContents,
    concurrency: AI_GENERATION_CONCURRENCY,
  };
}
