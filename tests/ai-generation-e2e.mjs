import { rm, writeFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { createServer } from "node:http";
import path from "node:path";
import express from "express";
import { createAiGenerationService } from "../server/ai-generation-service.js";
import { createCrawlerService } from "../server/crawler-service.js";
import { openSqliteStore } from "../server/sqlite-store.js";

const projectDirectory = path.resolve(import.meta.dirname, "..");
const databasePath = path.join(projectDirectory, "data", `ai-generation-e2e-${randomUUID()}.sqlite`);
const keepArtifacts = process.env.KEEP_AI_E2E === "1";
const png = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9ZlXkAAAAASUVORK5CYII=",
  "base64",
);

function listen(server) {
  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => resolve(server.address().port));
  });
}

function close(server) {
  return new Promise((resolve) => server.close(resolve));
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function waitForGenerationJob(apiPort, jobId, timeoutMs = 15_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const jobs = await fetch(`http://127.0.0.1:${apiPort}/api/ai-generation-jobs`)
      .then((response) => response.json());
    const job = jobs.find((item) => item.id === jobId);
    if (job?.status === "success" || job?.status === "failed") return job;
    await new Promise((resolve) => setTimeout(resolve, 150));
  }
  return null;
}

await rm(databasePath, { force: true });
await rm(`${databasePath}-wal`, { force: true });
await rm(`${databasePath}-shm`, { force: true });

let upstreamCalls = 0;
let imageCalls = 0;
const imageRequests = [];
let imageResponseMode = "base64";
let slowMode = false;
let failureMode = false;
let imageFailureMode = false;
let progressiveImages = false;
let lastImagePrompt = "";
let editCalls = 0;
let expectedImageModel = "gpt-image-2";
const upstreamRequests = [];
const upstream = createServer((request, response) => {
  if (request.method === "POST" && request.url === "/v1/images/edits") {
    const chunks = [];
    request.on("data", (chunk) => chunks.push(chunk));
    request.on("end", () => {
      const body = Buffer.concat(chunks);
      editCalls += 1;
      assert(request.headers["content-type"].includes("multipart/form-data"), "图像修改未使用 multipart");
      assert(body.includes(png), "图像修改未上传底图");
      assert(body.toString().includes(expectedImageModel), "图像修改未使用选中的模型");
      assert(body.toString().includes("背景改成蓝色"), "图像修改未传递用户提示词");
      setTimeout(() => {
        response.writeHead(imageFailureMode ? 500 : 200, { "content-type": "application/json" });
        response.end(JSON.stringify(imageFailureMode ? { error: "mock failure" } : { data: [{ b64_json: png.toString("base64") }] }));
      }, 150);
    });
    return;
  }
  if (request.method === "POST" && request.url === "/v1/images/generations") {
    let body = "";
    request.on("data", (chunk) => { body += chunk; });
    request.on("end", () => {
      imageCalls += 1;
      const payload = JSON.parse(body);
      imageRequests.push(payload);
      lastImagePrompt = payload.prompt;
      assert(payload.model === expectedImageModel, "生图没有使用所选的图像模型");
      assert(Array.from(payload.prompt).length <= 1000, "生图提示词超长");
      assert(payload.prompt.includes("稿件标题") && payload.prompt.includes("原帖"), "生图没有携带原帖和稿件");
      const imageBody = JSON.stringify({ created: 1, data: Array.from({ length: imageResponseMode === "empty" ? 0 : payload.n || 1 }, () => imageResponseMode === "url"
        ? { url: `http://127.0.0.1:${upstream.address().port}/image.png` }
        : { b64_json: png.toString("base64") }) });
      setTimeout(() => {
        response.writeHead(200, { "content-type": "application/json" });
        response.end(imageBody);
      }, progressiveImages ? (payload.size === "2048x1152" ? 2000 : 400) : 0);
    });
    return;
  }
  if (request.url === "/image.png") {
    response.writeHead(200, { "content-type": "image/png", "content-length": png.length });
    response.end(png);
    return;
  }
  if (request.method === "POST" && request.url === "/v1/chat/completions") {
    let requestBody = "";
    request.setEncoding("utf8");
    request.on("data", (chunk) => { requestBody += chunk; });
    request.on("end", () => {
      upstreamCalls += 1;
      try {
        upstreamRequests.push(JSON.parse(requestBody));
      } catch {
        upstreamRequests.push({});
      }
      if (failureMode) {
        response.writeHead(401, { "content-type": "application/json" });
        response.end(JSON.stringify({ error: { message: "mock invalid api key", type: "authentication_error" } }));
        return;
      }
      if (slowMode) {
        const timer = setTimeout(() => {
          if (!response.destroyed) {
            response.writeHead(200, { "content-type": "application/json" });
            response.end(JSON.stringify({
              id: "chatcmpl-slow-test",
              object: "chat.completion",
              created: Math.floor(Date.now() / 1000),
              model: "mock-model",
              choices: [{ index: 0, finish_reason: "stop", message: { role: "assistant", content: "{}" } }],
            }));
          }
        }, 10_000);
        response.once("close", () => clearTimeout(timer));
        return;
      }
      if (upstreamCalls === 1) {
        response.writeHead(429, { "content-type": "application/json" });
        response.end(JSON.stringify({ error: { message: "mock rate limit", type: "rate_limit_error" } }));
        return;
      }
      response.writeHead(200, { "content-type": "application/json" });
      response.end(JSON.stringify({
        id: "chatcmpl-test",
        object: "chat.completion",
        created: Math.floor(Date.now() / 1000),
        model: "mock-model",
        choices: [{
          index: 0,
          finish_reason: "stop",
          message: {
            role: "assistant",
            content: JSON.stringify({
              title: "原帖：测试稿件标题",
              body: "【原帖】\n这是严格依据原帖生成的测试稿件正文。\n\n**原帖标注：** 需要保留的说明（原帖标注）。",
              hashtags: ["测试", "FlexibleFox"],
              selected_image_indexes: [0],
            }),
          },
        }],
        usage: { prompt_tokens: 20, completion_tokens: 30, total_tokens: 50 },
      }));
    });
    return;
  }
  response.writeHead(404).end();
});

const upstreamPort = await listen(upstream);
const store = openSqliteStore(databasePath);
const timestamp = new Date().toISOString();
const ids = {
  type: "test-type",
  prompt: "test-prompt",
  account: "test-account",
  content: "test-content",
  ai: "test-ai",
};

store.database.prepare(`
  INSERT INTO prompt_account_types (id, name, created_at, updated_at)
  VALUES (?, '测试类型', ?, ?)
`).run(ids.type, timestamp, timestamp);
store.database.prepare(`
  INSERT INTO prompts (id, title, content, platform, account_type_id, enabled, created_at, updated_at)
  VALUES (?, '测试提示词', '请把原帖改写成清晰的中文图文稿件。', 'X', ?, 1, ?, ?)
`).run(ids.prompt, ids.type, timestamp, timestamp);
store.database.prepare(`
  INSERT INTO accounts (id, name, url, type, platform, region, details, prompt_id, created_at, updated_at)
  VALUES (?, '测试账号', 'https://x.com/test', '测试类型', 'X', '国外', '自动化测试账号', ?, ?, ?)
`).run(ids.account, ids.prompt, timestamp, timestamp);
store.database.prepare(`
  INSERT INTO contents (
    id, account_id, account_name, account_region, platform, platform_post_id,
    source_url, author_handle, author_name, text, image_urls, video_urls,
    video_thumbnail_urls, link_cards, published_at, status, created_at, updated_at
  ) VALUES (?, ?, '测试账号', '国外', 'X', 'post-1', 'https://x.com/test/status/1',
    '@test', 'Test', '原帖事实内容', '[]', '[]', ?, ?, ?, '待处理', ?, ?)
`).run(
  ids.content,
  ids.account,
  JSON.stringify([`http://127.0.0.1:${upstreamPort}/image.png`]),
  JSON.stringify([{
    url: "https://example.com/article",
    title: "测试链接卡片",
    imageUrl: `http://127.0.0.1:${upstreamPort}/image.png`,
  }]),
  timestamp,
  timestamp,
  timestamp,
);
store.database.prepare(`
  INSERT INTO ai_configurations (id, model_name, api_key, base_url, is_selected, created_at, updated_at)
  VALUES (?, 'mock-model', 'sk-test', ?, 1, ?, ?)
`).run(ids.ai, `http://127.0.0.1:${upstreamPort}/v1`, timestamp, timestamp);

const app = express();
app.use(express.json());
const generationService = createAiGenerationService({ store });
generationService.registerRoutes(app);
const crawlerService = createCrawlerService({ store });
crawlerService.registerRoutes(app);
const apiServer = createServer(app);
const apiPort = await listen(apiServer);
generationService.start();

let draftId = null;
try {
  assert(store.contents.get(ids.content).generateImages === true, "帖子生图默认没有开启");
  const withoutModel = generationService.enqueueContentIds([ids.content]);
  assert(withoutModel.createdCount === 0 && withoutModel.results[0].code === "IMAGE_AI_NOT_CONFIGURED", "缺少图像模型时没有阻止入队");
  store.aiConfigurations.save({ modelName: "gpt-image-2", modelType: "image", apiKey: "sk-image", baseUrl: `http://127.0.0.1:${upstreamPort}/v1` }, timestamp);
  const createResponse = await fetch(`http://127.0.0.1:${apiPort}/api/ai-generation-jobs`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ contentIds: [ids.content] }),
  });
  assert(createResponse.status === 202, `创建任务失败：HTTP ${createResponse.status}`);
  assert(
    store.database.prepare("SELECT status FROM contents WHERE id = ?").pluck().get(ids.content) === "已处理",
    "生成任务入队后内容没有立即标记为已处理",
  );

  let completedJob = null;
  const deadline = Date.now() + 30_000;
  while (Date.now() < deadline) {
    const jobs = await fetch(`http://127.0.0.1:${apiPort}/api/ai-generation-jobs`).then((response) => response.json());
    completedJob = jobs.find((job) => job.contentId === ids.content);
    if (completedJob?.status === "success" || completedJob?.status === "failed") break;
    await new Promise((resolve) => setTimeout(resolve, 350));
  }
  assert(completedJob?.status === "success", `任务没有成功：${completedJob?.errorMessage || completedJob?.status}`);
  assert(completedJob.attemptCount === 2, "429 后没有按预期自动重试");
  assert(completedJob.attempts.some((attempt) => attempt.status === "failed"), "失败尝试没有留痕");

  const drafts = await fetch(`http://127.0.0.1:${apiPort}/api/drafts`).then((response) => response.json());
  assert(drafts.length === 1, "没有生成唯一稿件");
  const draft = drafts[0];
  draftId = draft.id;
  assert(draft.title === "测试稿件标题", "稿件标题不正确");
  assert(
    draft.body === "这是严格依据原帖生成的测试稿件正文。\n\n需要保留的说明。",
    "稿件中的原帖编辑标记没有自动清理，或误删了正常正文",
  );
  assert(draft.prompt.title === "测试提示词", "稿件没有保留账号绑定的提示词快照");
  assert(draft.source.videoThumbnailUrls.length === 1, "视频封面没有进入稿件来源快照");
  assert(draft.media.length === 1 && draft.media.every((media) => media.downloadStatus === "ready"), "稿件应仅包含生成图片");
  assert(imageCalls === 1, "开启开关后没有生成一张图片");
  const generatedImageResponse = await fetch(`http://127.0.0.1:${apiPort}${draft.media[0].url}`);
  assert(generatedImageResponse.ok && Buffer.from(await generatedImageResponse.arrayBuffer()).equals(png), "生成图片无法从稿件读取");
  imageResponseMode = "url";

  const imageResponse = await fetch(`http://127.0.0.1:${apiPort}${draft.media[0].url}`);
  assert(imageResponse.ok, "稿件图片接口无法读取本地缓存");

  const updateResponse = await fetch(`http://127.0.0.1:${apiPort}/api/drafts/${draft.id}`, {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      title: "修改后的标题",
      body: "修改后的正文",
      hashtags: ["新标签", "内容测试"],
      status: "已发布",
    }),
  });
  assert(updateResponse.ok, `稿件编辑失败：HTTP ${updateResponse.status}`);
  const updatedDraft = await updateResponse.json();
  assert(updatedDraft.title === "修改后的标题" && updatedDraft.body === "修改后的正文", "标题或正文没有保存");
  assert(updatedDraft.hashtags.join(",") === "新标签,内容测试", "话题标签没有保存");
  assert(updatedDraft.status === "待审核", "已经移除的稿件状态仍可被接口修改");

  const imageEndpoint = `http://127.0.0.1:${apiPort}/api/draft-media/${draft.media[0].id}/generate`;
  const savedImagePrompt = store.database.prepare("SELECT generation_prompt FROM draft_media WHERE id = ?").get(draft.media[0].id).generation_prompt;
  assert(savedImagePrompt && draft.media[0].canRegenerate, "生图提示词或操作权限未正确保存");
  async function requestImage(mode, direction = "") {
    return fetch(imageEndpoint, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ mode, direction }) });
  }
  async function waitImage() {
    for (let i = 0; i < 100; i++) {
      const row = store.database.prepare("SELECT * FROM draft_media WHERE id = ?").get(draft.media[0].id);
      if (row.image_status !== "running") return row;
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
    throw new Error("图片任务超时");
  }
  assert((await requestImage("regenerate")).status === 202, "无法单独重新生成图片");
  const regeneratedImage = await waitImage();
  assert(regeneratedImage.image_status === "idle" && lastImagePrompt === savedImagePrompt, "重新生图没有准确复用原提示词");
  assert(!lastImagePrompt.includes("修改后的标题"), "重新生图错误地使用了后来修改的稿件");
  store.database.prepare("UPDATE draft_media SET generation_prompt = '' WHERE id = ?").run(draft.media[0].id);
  assert((await requestImage("regenerate")).status === 202, "旧图片无法恢复生图提示词");
  await waitImage();
  assert(lastImagePrompt === savedImagePrompt, "旧图片的提示词恢复不准确");
  assert((await requestImage("edit", " ")).status === 400, "空修改要求没有被拦截");
  assert((await requestImage("edit", "字".repeat(1001))).status === 400, "超长修改要求没有被拦截");
  assert((await requestImage("edit", "背景改成蓝色")).status === 202, "无法修改图片");
  assert((await requestImage("regenerate")).status === 409, "未防止重复提交");
  const conflict = await fetch(`http://127.0.0.1:${apiPort}/api/drafts/${draft.id}/regenerate`, {
    method: "POST", headers: { "content-type": "application/json" }, body: "{}",
  });
  assert(conflict.status === 409, "未阻止整稿与图片任务冲突");
  const editedImage = await waitImage();
  assert(editCalls === 1 && editedImage.image_status === "idle" && editedImage.local_path !== regeneratedImage.local_path, "修改图片失败");
  imageFailureMode = true;
  await requestImage("edit", "背景改成蓝色");
  const failedImage = await waitImage();
  assert(failedImage.image_status === "failed" && failedImage.local_path === editedImage.local_path, "图片失败后没有保留原图");
  imageFailureMode = false;
  const oversizedPath = path.join(path.dirname(editedImage.local_path), "oversized-test.png");
  await writeFile(oversizedPath, Buffer.alloc(4 * 1024 * 1024));
  store.database.prepare("UPDATE draft_media SET local_path = ? WHERE id = ?").run(oversizedPath, draft.media[0].id);
  const callsBeforeOversized = editCalls;
  await requestImage("edit", "背景改成蓝色");
  const oversizedResult = await waitImage();
  assert(oversizedResult.image_status === "failed" && oversizedResult.image_error.includes("4MB") && editCalls === callsBeforeOversized, "4MB 底图没有在调用接口前拦截");
  store.database.prepare("UPDATE draft_media SET local_path = ? WHERE id = ?").run(editedImage.local_path, draft.media[0].id);
  expectedImageModel = "compatible-test-image";
  store.database.prepare("UPDATE ai_configurations SET model_name = ? WHERE model_type = 'image' AND is_selected = 1").run(expectedImageModel);
  await requestImage("regenerate");
  assert((await waitImage()).image_status === "idle", "自定义图像模型无法重新生成");
  await requestImage("edit", "背景改成蓝色" + "。".repeat(994));
  assert((await waitImage()).image_status === "idle", "1000 字符修改要求未成功提交");
  expectedImageModel = "gpt-image-2";
  store.database.prepare("UPDATE ai_configurations SET model_name = ? WHERE model_type = 'image' AND is_selected = 1").run(expectedImageModel);
  const unchangedDraft = store.database.prepare("SELECT * FROM drafts WHERE id = ?").get(draft.id);
  assert(unchangedDraft.title === updatedDraft.title && unchangedDraft.body === updatedDraft.body, "单独生图修改了稿件正文");
  assert(updatedDraft.versionCount === 2, "编辑稿件后没有保存新版本");

  const adjustmentDirection = "保留事实不变，语气更轻松，并突出最重要的变化。";
  const adjustedRegenerationResponse = await fetch(
    `http://127.0.0.1:${apiPort}/api/drafts/${draft.id}/regenerate`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ direction: adjustmentDirection }),
    },
  );
  assert(
    adjustedRegenerationResponse.status === 202,
    `带调整方向的重新生成接口失败：HTTP ${adjustedRegenerationResponse.status}`,
  );
  const adjustedRegenerationJob = await adjustedRegenerationResponse.json();
  const adjustedCompletedJob = await waitForGenerationJob(apiPort, adjustedRegenerationJob.id);
  assert(adjustedCompletedJob?.status === "success", "带调整方向的重新生成任务没有完成");
  const adjustedRequest = upstreamRequests.at(-1);
  const adjustedUserMessage = adjustedRequest?.messages?.find((message) => message.role === "user")?.content || "";
  assert(adjustedUserMessage.includes("【原帖资料】"), "调整生成请求没有携带原帖");
  assert(adjustedUserMessage.includes("原帖事实内容"), "调整生成请求丢失原帖正文");
  assert(adjustedUserMessage.includes("【当前已生成稿件】"), "调整生成请求没有携带当前稿件");
  assert(adjustedUserMessage.includes("修改后的正文"), "调整生成请求没有使用用户修改后的稿件");
  assert(adjustedUserMessage.includes("【用户调整方向】"), "调整生成请求没有标识用户调整方向");
  assert(adjustedUserMessage.includes(adjustmentDirection), "调整生成请求丢失用户输入的方向");

  const callsBeforeDisabled = imageCalls;
  const disableResponse = await fetch(`http://127.0.0.1:${apiPort}/api/contents/${ids.content}/image-generation`, {
    method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ enabled: false }),
  });
  assert(disableResponse.ok && store.contents.get(ids.content).generateImages === false, "生图开关没有持久化");
  const plainRegenerationResponse = await fetch(
    `http://127.0.0.1:${apiPort}/api/drafts/${draft.id}/regenerate`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ direction: "   " }),
    },
  );
  assert(
    plainRegenerationResponse.status === 202,
    `无调整方向的重新生成接口失败：HTTP ${plainRegenerationResponse.status}`,
  );
  const plainRegenerationJob = await plainRegenerationResponse.json();
  const plainCompletedJob = await waitForGenerationJob(apiPort, plainRegenerationJob.id);
  assert(plainCompletedJob?.status === "success", "无调整方向的重新生成任务没有完成");
  assert(imageCalls === callsBeforeDisabled, "关闭生图后仍然调用图像模型");
  const plainRequest = upstreamRequests.at(-1);
  const plainUserMessage = plainRequest?.messages?.find((message) => message.role === "user")?.content || "";
  assert(plainUserMessage.includes("【原帖资料】"), "普通重新生成请求没有携带原帖");
  assert(!plainUserMessage.includes("【当前已生成稿件】"), "未填写方向时不应携带旧稿件");
  assert(!plainUserMessage.includes("【用户调整方向】"), "未填写方向时不应附加调整指令");
  const regeneratedDraft = await fetch(`http://127.0.0.1:${apiPort}/api/drafts/${draft.id}`)
    .then((response) => response.json());
  assert(regeneratedDraft.versionCount === 4, "两次重新生成没有追加稿件版本记录");

  const batchContentIds = ["test-content-batch-1", "test-content-batch-2"];
  const insertBatchContent = store.database.prepare(`
    INSERT INTO contents (
      id, account_id, account_name, account_region, platform, platform_post_id,
      source_url, author_handle, author_name, text, image_urls, video_urls,
      link_cards, published_at, status, created_at, updated_at
    ) VALUES (?, ?, '测试账号', '国外', 'X', ?, ?,
      '@test', 'Test', '等待批量生成的原帖内容', '[]', '[]', '[]', ?, '待处理', ?, ?)
  `);
  batchContentIds.forEach((contentId, index) => {
    insertBatchContent.run(
      contentId,
      ids.account,
      `post-batch-${index + 1}`,
      `https://x.com/test/status/batch-${index + 1}`,
      timestamp,
      timestamp,
      timestamp,
    );
  });
  const overridePromptId = "test-prompt-override";
  store.database.prepare(`
    INSERT INTO prompts (id, title, content, platform, account_type_id, enabled, created_at, updated_at)
    VALUES (?, '帖子覆盖提示词', '只用于这个帖子的改写规则。', 'X', ?, 1, ?, ?)
  `).run(overridePromptId, ids.type, timestamp, timestamp);
  store.contents.updatePrompt(batchContentIds[0], overridePromptId, timestamp);
  store.database.prepare("UPDATE contents SET generate_images = 0 WHERE id = ?").run(batchContentIds[0]);
  const settingsUrl = `http://127.0.0.1:${apiPort}/api/contents/${batchContentIds[1]}/image-generation`;
  const settingsRequest = (values) => fetch(settingsUrl, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify(values) });
  for (const invalid of [{ imageSizes: [] }, { imageSizes: ["fake"] }, { imageSizes: ["auto", "2048x1152"] }, { imageCount: 0 }, { imageCount: 11 }, { imageCount: 1.5 }]) {
    assert((await settingsRequest(invalid)).status === 400, "无效图片参数未被拒绝");
  }
  assert((await settingsRequest({ imageSizes: ["2048x1152", "2160x3840"], imageCount: 2 })).ok, "尺寸张数保存失败");
  assert(store.contents.get(batchContentIds[1]).imageCount === 2, "张数未持久化");
  const callsBeforeBatch = imageCalls;
  progressiveImages = true;
  const batchResponse = await fetch(`http://127.0.0.1:${apiPort}/api/ai-generation-jobs/pending`, {
    method: "POST",
  });
  assert(batchResponse.status === 202, `全部生成接口失败：HTTP ${batchResponse.status}`);
  const batchPayload = await batchResponse.json();
  // Settings are snapshotted at enqueue time, not read midway through generation.
  await settingsRequest({ imageCount: 1 });
  assert(
    batchPayload.pendingCount === 2 && batchPayload.createdCount === 2 && batchPayload.failedCount === 0,
    "全部生成接口没有把所有待处理内容加入队列",
  );
  const batchStatuses = store.database.prepare(`
    SELECT status FROM contents WHERE id IN (?, ?)
  `).all(...batchContentIds);
  assert(batchStatuses.every((item) => item.status === "已处理"), "批量入队后内容状态没有更新");

  const batchDeadline = Date.now() + 15_000;
  let completedBatchJobs = [];
  let sawTextPreview = false;
  let sawOutOfOrderImages = false;
  while (Date.now() < batchDeadline) {
    const jobs = await fetch(`http://127.0.0.1:${apiPort}/api/ai-generation-jobs`).then((response) => response.json());
    completedBatchJobs = jobs.filter((job) => batchContentIds.includes(job.contentId));
    const partial = completedBatchJobs.find((job) => job.contentId === batchContentIds[1] && job.status === "running");
    if (partial?.preview?.title && partial.preview.images.length === 0) sawTextPreview = true;
    if (partial?.preview?.images.some((image) => image.index >= 2 && image.url) && !partial.preview.images.some((image) => image.index < 2 && image.url)) {
      sawOutOfOrderImages = true;
      const imageResponse = await fetch(`http://127.0.0.1:${apiPort}${partial.preview.images[0].url}`);
      assert(imageResponse.ok && (await imageResponse.arrayBuffer()).byteLength === png.length, "未完成任务的图片无法预览");
    }
    if (completedBatchJobs.length === 2 && completedBatchJobs.every((job) => job.status === "success")) break;
    await new Promise((resolve) => setTimeout(resolve, 150));
  }
  assert(
    completedBatchJobs.length === 2 && completedBatchJobs.every((job) => job.status === "success"),
    "批量生成任务没有全部完成",
  );
  progressiveImages = false;
  assert(sawTextPreview, "图片完成前未显示文案");
  assert(sawOutOfOrderImages, "后面的图片先完成时未独立显示");
  assert(
    completedBatchJobs.find((job) => job.contentId === batchContentIds[0])?.promptId === overridePromptId,
    "生成稿件时没有优先使用帖子单独设置的提示词",
  );
  assert(
    completedBatchJobs.find((job) => job.contentId === batchContentIds[1])?.promptId === ids.prompt,
    "没有单独设置提示词的帖子未继承账号默认提示词",
  );
  assert(imageCalls === callsBeforeBatch + 4, "全部生成没有发送四个单张请求");
  assert(imageRequests.slice(-4).every((request) => request.n === 1), "没有按单张请求并行生成图片");
  assert(imageRequests.slice(-4).filter((request) => request.size === "2048x1152").length === 2 && imageRequests.slice(-4).filter((request) => request.size === "2160x3840").length === 2, "没有为每种尺寸各发送两个请求");
  const multiDraft = store.database.prepare("SELECT id FROM drafts WHERE source_content_id = ?").get(batchContentIds[1]);
  const multiMedia = store.database.prepare("SELECT * FROM draft_media WHERE draft_id = ? ORDER BY sort_order").all(multiDraft.id);
  assert(multiMedia.length === 4 && multiMedia.filter((media) => media.generation_size === "2048x1152").length === 2 && multiMedia.filter((media) => media.generation_size === "2160x3840").length === 2, "两种尺寸各两张没有完整保存");
  const singleImageResponse = await fetch(`http://127.0.0.1:${apiPort}/api/draft-media/${multiMedia[0].id}/generate`, {
    method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ mode: "regenerate" }),
  });
  assert(singleImageResponse.status === 202, "多图中的单图重新生成失败");
  for (let i = 0; i < 100; i++) {
    if (store.database.prepare("SELECT image_status FROM draft_media WHERE id = ?").get(multiMedia[0].id).image_status !== "running") break;
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  assert(imageRequests.at(-1).n === 1 && imageRequests.at(-1).size === "2048x1152", "单图重生成未保留尺寸或意外生成多图");

  imageResponseMode = "empty";
  const invalidImagesResponse = await fetch(`http://127.0.0.1:${apiPort}/api/drafts/${multiDraft.id}/regenerate`, {
    method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ direction: "" }),
  });
  assert(invalidImagesResponse.status === 202, "图片数量异常测试未入队");
  const invalidImagesJob = await waitForGenerationJob(apiPort, (await invalidImagesResponse.json()).id);
  assert(invalidImagesJob.status === "failed" && invalidImagesJob.attemptCount === 1, "图片数量异常后不应整批自动重试");
  assert(store.database.prepare("SELECT count(*) FROM draft_media WHERE draft_id = ?").pluck().get(multiDraft.id) === 4, "生成失败不应删除已有配图");
  const deleteFailedResponse = await fetch(`http://127.0.0.1:${apiPort}/api/ai-generation-jobs/${invalidImagesJob.id}`, { method: "DELETE" });
  assert(deleteFailedResponse.ok, "失败记录无法删除");
  assert(!store.database.prepare("SELECT id FROM ai_generation_jobs WHERE id = ?").get(invalidImagesJob.id), "失败记录未删除");
  assert(store.database.prepare("SELECT count(*) FROM ai_generation_attempts WHERE job_id = ?").pluck().get(invalidImagesJob.id) === 0, "失败尝试记录未清理");
  assert(store.contents.get(batchContentIds[1]) && store.database.prepare("SELECT id FROM drafts WHERE id = ?").get(multiDraft.id), "删除失败记录影响原帖或稿件");
  assert(store.database.prepare("SELECT count(*) FROM draft_media WHERE draft_id = ?").pluck().get(multiDraft.id) === 4, "删除失败记录影响配图");
  assert((await fetch(`http://127.0.0.1:${apiPort}/api/ai-generation-jobs/${invalidImagesJob.id}`, { method: "DELETE" })).status === 404, "不存在记录应返回404");
  imageResponseMode = "base64";

  const cancelContentIds = [
    "test-content-cancel-1",
    "test-content-cancel-2",
    "test-content-cancel-3",
  ];
  const insertCancelContent = store.database.prepare(`
    INSERT INTO contents (
      id, account_id, account_name, account_region, platform, platform_post_id,
      source_url, author_handle, author_name, text, image_urls, video_urls,
      link_cards, published_at, status, created_at, updated_at
    ) VALUES (?, ?, '测试账号', '国外', 'X', ?, ?,
      '@test', 'Test', '等待取消的原帖内容', '[]', '[]', '[]', ?, '待处理', ?, ?)
  `);
  cancelContentIds.forEach((contentId, index) => {
    insertCancelContent.run(
      contentId,
      ids.account,
      `post-cancel-${index + 1}`,
      `https://x.com/test/status/cancel-${index + 1}`,
      timestamp,
      timestamp,
      timestamp,
    );
  });
  slowMode = true;
  const cancelCreatePayload = generationService.enqueueContentIds(cancelContentIds);
  assert(cancelCreatePayload.createdCount === 3, "服务内部批量入队接口创建任务失败");
  const cancelJobIds = cancelCreatePayload.results.map((result) => result.job.id);
  assert(cancelJobIds.length === 3, "没有创建三条并行测试任务");
  const cancelRunningDeadline = Date.now() + 5_000;
  let cancelJobs = [];
  while (Date.now() < cancelRunningDeadline) {
    const jobs = await fetch(`http://127.0.0.1:${apiPort}/api/ai-generation-jobs`).then((response) => response.json());
    cancelJobs = jobs.filter((job) => cancelJobIds.includes(job.id));
    if (cancelJobs.length === 3 && cancelJobs.every((job) => job.status === "running") && upstreamCalls >= 5) break;
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  assert(cancelJobs.length === 3 && cancelJobs.every((job) => job.status === "running"), "三条任务没有同时进入运行状态");
  assert((await fetch(`http://127.0.0.1:${apiPort}/api/ai-generation-jobs/${cancelJobIds[0]}`, { method: "DELETE" })).status === 409, "不应删除正在执行的任务");
  assert(upstreamCalls >= 5, "三条并行任务没有同时调用模型接口");
  const generationStatus = await fetch(`http://127.0.0.1:${apiPort}/api/ai-generation-status`)
    .then((response) => response.json());
  assert(generationStatus.concurrency === 3 && generationStatus.runningCount === 3, "并行状态接口返回不正确");
  const cancelResponses = await Promise.all(cancelJobIds.map((jobId) => (
    fetch(`http://127.0.0.1:${apiPort}/api/ai-generation-jobs/${jobId}/cancel`, { method: "POST" })
  )));
  assert(cancelResponses.every((response) => response.ok), "并行任务取消接口调用失败");
  const cancelDeadline = Date.now() + 5_000;
  while (Date.now() < cancelDeadline) {
    const jobs = await fetch(`http://127.0.0.1:${apiPort}/api/ai-generation-jobs`).then((response) => response.json());
    cancelJobs = jobs.filter((job) => cancelJobIds.includes(job.id));
    if (cancelJobs.length === 3 && cancelJobs.every((job) => job.status === "failed")) break;
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  assert(cancelJobs.every((job) => job.errorCode === "USER_CANCELLED"), "并行运行中的任务没有被正确取消");
  const cancelledContentStatuses = store.database.prepare(`
    SELECT status FROM contents WHERE id IN (?, ?, ?)
  `).all(...cancelContentIds);
  assert(
    cancelledContentStatuses.every((item) => item.status === "待处理"),
    "没有稿件的生成任务取消后，原帖没有恢复为待处理",
  );

  slowMode = false;
  failureMode = true;
  const failedContentId = "test-content-terminal-failure";
  insertCancelContent.run(
    failedContentId,
    ids.account,
    "post-terminal-failure",
    "https://x.com/test/status/terminal-failure",
    timestamp,
    timestamp,
    timestamp,
  );
  const failedCreate = generationService.enqueueContentIds([failedContentId]);
  assert(failedCreate.createdCount === 1, "终止失败测试任务没有成功入队");
  const terminalFailureJob = await waitForGenerationJob(apiPort, failedCreate.results[0].job.id);
  assert(terminalFailureJob?.status === "failed", "鉴权失败任务没有进入终止失败状态");
  assert(
    store.database.prepare("SELECT status FROM contents WHERE id = ?").pluck().get(failedContentId) === "待处理",
    "生成终止失败后，没有稿件的原帖没有恢复为待处理",
  );

  failureMode = false;
  const retryResponse = await fetch(
    `http://127.0.0.1:${apiPort}/api/ai-generation-jobs/${terminalFailureJob.id}/retry`,
    { method: "POST" },
  );
  assert(retryResponse.status === 202, "失败任务无法手动重试");
  assert(
    store.database.prepare("SELECT status FROM contents WHERE id = ?").pluck().get(failedContentId) === "已处理",
    "手动重试入队后原帖没有重新标记为处理中状态",
  );
  const retriedJob = await waitForGenerationJob(apiPort, terminalFailureJob.id);
  assert(retriedJob?.status === "success", "手动重试任务没有成功完成");

  failureMode = true;
  const failedRegenerationResponse = await fetch(
    `http://127.0.0.1:${apiPort}/api/drafts/${draft.id}/regenerate`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ direction: "测试失败时保留原稿" }),
    },
  );
  assert(failedRegenerationResponse.status === 202, "稿件失败保护测试没有成功入队");
  const failedRegenerationJob = await waitForGenerationJob(
    apiPort,
    (await failedRegenerationResponse.json()).id,
  );
  assert(failedRegenerationJob?.status === "failed", "稿件重新生成没有按预期失败");
  assert(
    store.database.prepare("SELECT status FROM contents WHERE id = ?").pluck().get(ids.content) === "已处理",
    "已有稿件重新生成失败后，不应把原帖恢复为待处理",
  );
  failureMode = false;
  console.log(JSON.stringify({
    ok: true,
    upstreamCalls,
    attempts: completedJob.attemptCount,
    adjustedRegeneration: true,
    plainRegeneration: true,
    batchCreated: batchPayload.createdCount,
    concurrency: cancelJobs.length,
    cancelled: cancelJobs.filter((job) => job.errorCode === "USER_CANCELLED").length,
    terminalFailureRecovered: true,
    draft: { id: draft.id, title: draft.title, media: draft.media.length },
  }));
} finally {
  await crawlerService.stop();
  await generationService.stop();
  await close(apiServer);
  await close(upstream);
  store.close();
  if (!keepArtifacts) {
    if (draftId) await rm(path.join(projectDirectory, "data", "draft-media", draftId), { recursive: true, force: true });
    await rm(databasePath, { force: true });
    await rm(`${databasePath}-wal`, { force: true });
    await rm(`${databasePath}-shm`, { force: true });
  }
}
