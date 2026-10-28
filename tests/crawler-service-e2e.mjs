import { mkdir, rm, writeFile } from "node:fs/promises";
import { createServer } from "node:http";
import path from "node:path";
import express from "express";
import { createCrawlerAdapterRegistry } from "../server/crawler-adapters.js";
import { createCrawlerService } from "../server/crawler-service.js";
import { openSqliteStore } from "../server/sqlite-store.js";

const projectDirectory = path.resolve(import.meta.dirname, "..");
const fixtureDirectory = path.join(projectDirectory, "data", "crawler-service-test");
const databasePath = path.join(fixtureDirectory, "crawler.sqlite");
const crawlerDataDirectory = path.join(fixtureDirectory, "crawler");
const stateFilePath = path.join(crawlerDataDirectory, "x-login-state.json");

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function listen(server) {
  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => resolve(server.address().port));
  });
}

function close(server) {
  return new Promise((resolve) => server.close(resolve));
}

async function waitFor(predicate, message, timeoutMs = 3_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const value = predicate();
    if (value) return value;
    await new Promise((resolve) => setTimeout(resolve, 25));
  }
  throw new Error(message);
}

await rm(fixtureDirectory, { recursive: true, force: true });
await mkdir(crawlerDataDirectory, { recursive: true });
await writeFile(stateFilePath, JSON.stringify({
  version: 1,
  cookies: [{ name: "auth_token", value: "test", domain: ".x.com", path: "/" }],
}), "utf8");

const store = openSqliteStore(databasePath);
const timestamp = new Date().toISOString();
const accounts = ["crawler_running", "crawler_queued"].map((handle, index) => (
  store.accounts.insert({
    name: `爬虫取消测试账号 ${index + 1}`,
    url: `https://x.com/${handle}`,
    type: "测试类型",
    platform: "X",
    region: "国外",
    details: "验证排队中和运行中的抓取任务都能停止",
    promptId: null,
    createdAt: timestamp,
    updatedAt: timestamp,
  })
));
const promptTypeId = "crawler-test-prompt-type";
const promptId = "crawler-test-prompt";
store.database.prepare(`
  INSERT INTO prompt_account_types (id, name, created_at, updated_at)
  VALUES (?, '新闻', ?, ?)
`).run(promptTypeId, timestamp, timestamp);
store.database.prepare(`
  INSERT INTO prompts (id, title, content, platform, account_type_id, enabled, created_at, updated_at)
  VALUES (?, '新闻改写', '把内容整理成新闻稿件。', 'X', ?, 1, ?, ?)
`).run(promptId, promptTypeId, timestamp, timestamp);

let runnerCalls = 0;
let abortedRunners = 0;
function fakeProcessRunner(_command, _args, _timeoutMs, onProgress, _cwd, _activeProcesses, signal) {
  runnerCalls += 1;
  onProgress?.({
    stage: "scanning",
    scannedCount: 1,
    matchedCount: 0,
    targetCount: 20,
    skipped: {},
    round: 1,
    successes: [],
    failures: [],
    message: "测试进程正在运行",
  });
  return new Promise((_resolve, reject) => {
    function cancel() {
      abortedRunners += 1;
      reject(Object.assign(new Error("抓取任务已手动停止"), { code: "USER_CANCELLED" }));
    }
    if (signal?.aborted) cancel();
    else signal?.addEventListener("abort", cancel, { once: true });
  });
}

const app = express();
app.use(express.json());
const crawlerService = createCrawlerService({ store, processRunner: fakeProcessRunner });
crawlerService.registerRoutes(app);
const apiServer = createServer(app);
const apiPort = await listen(apiServer);

try {
  const promptUpdateResponse = await fetch(
    `http://127.0.0.1:${apiPort}/api/accounts/${accounts[0]._id}/prompt`,
    {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ promptId }),
    },
  );
  assert(promptUpdateResponse.ok, `内容列表快捷修改提示词失败：HTTP ${promptUpdateResponse.status}`);
  const promptUpdate = await promptUpdateResponse.json();
  assert(promptUpdate.promptAccountTypeName === "新闻", "快捷修改接口没有返回提示词类型");
  assert(store.accounts.get(accounts[0]._id).promptId === promptId, "账号提示词绑定没有持久化");
  const crawlSettings = await fetch(`http://127.0.0.1:${apiPort}/api/crawl-settings`).then(
    (response) => response.json(),
  );
  assert(
    crawlSettings.find((setting) => setting.accountId === accounts[0]._id)?.promptId === promptId,
    "抓取设置接口没有同步账号当前提示词",
  );
  assert(
    crawlSettings.find((setting) => setting.accountId === accounts[0]._id)?.accountType === "测试类型",
    "抓取设置接口没有提供账号类型筛选字段",
  );

  const registry = createCrawlerAdapterRegistry({ projectDirectory, crawlerDataDirectory });
  const crawlArguments = registry.get("X").buildCrawlArguments({
    target: "crawler_running",
    limit: 20,
    lookbackHours: 24,
    outputPath: path.join(fixtureDirectory, "tweets.json"),
  });
  assert(crawlArguments.includes("--expand-author-threads"), "正式 X 爬虫没有启用作者续帖补全");
  const normalized = registry.get("X").normalizePost({
    tweet_id: "video-post",
    tweet_url: "https://x.com/test/status/video-post",
    content: "带视频封面的测试帖子",
    video_urls: ["https://video.twimg.com/test.mp4"],
    video_thumbnail_urls: ["https://pbs.twimg.com/ext_tw_video_thumb/test.jpg"],
    link_cards: [
      {
        url: "https://t.co/example",
        title: "完整的外链标题",
        domain: "example.com",
        image_url: "https://pbs.twimg.com/card_img/example/cover.jpg",
      },
      {
        url: "https://example.com/article?utm_source=Twitter",
        title: "",
        domain: "example.com",
        image_url: "",
      },
    ],
  }, accounts[0]);
  assert(normalized.videoThumbnailUrls.length === 1, "适配器丢失了视频封面");
  assert(normalized.linkCards.length === 1, "同一外链的短链卡片与展开地址没有合并");
  assert(normalized.linkCards[0].url.startsWith("https://example.com/"), "外链合并后没有使用最终地址");
  assert(normalized.linkCards[0].title === "完整的外链标题", "外链合并时丢失了富卡片标题");
  assert(normalized.linkCards[0].imageUrl.includes("card_img"), "外链合并时丢失了富卡片封面");

  const createResponse = await fetch(`http://127.0.0.1:${apiPort}/api/crawl-jobs`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ accountIds: accounts.map((account) => account._id) }),
  });
  assert(createResponse.status === 202, `创建抓取任务失败：HTTP ${createResponse.status}`);
  const created = await createResponse.json();
  assert(created.queuedCount === 2, "没有创建两项抓取任务");

  await waitFor(() => {
    const jobs = store.jobs.list(10);
    return jobs.some((job) => job.status === "running") && jobs.some((job) => job.status === "queued");
  }, "任务没有进入一个运行、一个排队的状态");
  assert(runnerCalls === 1, "串行抓取队列启动了多个进程");

  const queuedJob = store.jobs.list(10).find((job) => job.status === "queued");
  const queuedCancel = await fetch(
    `http://127.0.0.1:${apiPort}/api/crawl-jobs/${queuedJob._id}/cancel`,
    { method: "POST" },
  );
  assert(queuedCancel.ok, "排队任务停止接口失败");
  assert((await queuedCancel.json()).status === "cancelled", "排队任务没有变为已停止");
  assert(abortedRunners === 0, "停止排队任务误伤了运行中的进程");

  const runningJob = store.jobs.list(10).find((job) => job.status === "running");
  const runningCancel = await fetch(
    `http://127.0.0.1:${apiPort}/api/crawl-jobs/${runningJob._id}/cancel`,
    { method: "POST" },
  );
  assert(runningCancel.ok, "运行中任务停止接口失败");
  assert((await runningCancel.json()).status === "cancelled", "运行中任务没有变为已停止");
  await waitFor(() => abortedRunners === 1, "运行中的爬虫进程没有收到停止信号");
  await waitFor(
    () => store.jobs.list(10).every((job) => job.status === "cancelled"),
    "抓取任务没有全部稳定在已停止状态",
  );
  assert(
    accounts.every((account) => store.accounts.get(account._id).crawl.status === "cancelled"),
    "账号抓取状态没有同步为已停止",
  );

  const contentId = "video-thumbnail-content";
  store.contents.insertIfAbsent({
    id: contentId,
    accountId: accounts[0]._id,
    accountName: accounts[0].name,
    accountRegion: "国外",
    platform: "X",
    platformPostId: "video-thumbnail-post",
    sourceUrl: "https://x.com/test/status/video-thumbnail-post",
    authorHandle: "test",
    authorName: "Test",
    text: "验证视频封面入库",
    imageUrls: [],
    videoUrls: [],
    videoThumbnailUrls: [],
    linkCards: [],
    publishedAt: timestamp,
    status: "待处理",
    createdAt: timestamp,
    updatedAt: timestamp,
  });
  store.contents.insertIfAbsent({
    id: "video-thumbnail-content-repeat",
    accountId: accounts[0]._id,
    accountName: accounts[0].name,
    accountRegion: "国外",
    platform: "X",
    platformPostId: "video-thumbnail-post",
    sourceUrl: "https://x.com/test/status/video-thumbnail-post",
    authorHandle: "test",
    authorName: "Test",
    text: "重复抓取时补齐视频封面",
    imageUrls: [],
    videoUrls: ["https://video.twimg.com/test.mp4"],
    videoThumbnailUrls: ["https://pbs.twimg.com/ext_tw_video_thumb/test.jpg"],
    linkCards: [],
    publishedAt: timestamp,
    status: "待处理",
    createdAt: timestamp,
    updatedAt: new Date(Date.now() + 1_000).toISOString(),
  });
  store.contents.insertIfAbsent({
    id: "video-thumbnail-content-shorter-repeat",
    accountId: accounts[0]._id,
    accountName: accounts[0].name,
    accountRegion: "国外",
    platform: "X",
    platformPostId: "video-thumbnail-post",
    sourceUrl: "https://x.com/test/status/video-thumbnail-post",
    authorHandle: "test",
    authorName: "Test",
    text: "短主帖",
    imageUrls: [],
    videoUrls: [],
    videoThumbnailUrls: [],
    linkCards: [],
    publishedAt: timestamp,
    status: "待处理",
    createdAt: timestamp,
    updatedAt: new Date(Date.now() + 2_000).toISOString(),
  });
  const content = store.contents.list({ status: null, accountId: null, hasImages: true, limit: 10 })
    .find((item) => item._id === contentId);
  assert(content?.videoThumbnailUrls.length === 1, "视频封面没有持久化或没有进入有图筛选");
  assert(content?.videoUrls.length === 1, "较短的重复抓取结果错误覆盖了已有线程媒体");
  assert(content?.text === "重复抓取时补齐视频封面", "重复抓取没有保留更完整的正文");

  const postPromptId = "crawler-test-post-prompt";
  store.database.prepare(`
    INSERT INTO prompts (id, title, content, platform, account_type_id, enabled, created_at, updated_at)
    VALUES (?, '帖子单独改写', '只用于指定帖子的提示词。', 'X', ?, 1, ?, ?)
  `).run(postPromptId, promptTypeId, timestamp, timestamp);
  const contentPromptResponse = await fetch(
    `http://127.0.0.1:${apiPort}/api/contents/${contentId}/prompt`,
    {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ promptId: postPromptId }),
    },
  );
  assert(contentPromptResponse.ok, `帖子提示词修改失败：HTTP ${contentPromptResponse.status}`);
  const contentPromptUpdate = await contentPromptResponse.json();
  assert(contentPromptUpdate.promptId === postPromptId, "帖子提示词接口返回了错误的提示词");
  assert(store.contents.get(contentId).promptId === postPromptId, "帖子提示词没有持久化");
  assert(store.accounts.get(accounts[0]._id).promptId === promptId, "修改帖子提示词错误修改了账号提示词");
  const contentAfterPromptUpdate = await fetch(
    `http://127.0.0.1:${apiPort}/api/contents?accountId=${accounts[0]._id}&limit=200`,
  ).then((response) => response.json());
  assert(
    contentAfterPromptUpdate.find((item) => item.id === contentId)?.promptId === postPromptId,
    "内容列表接口没有返回帖子单独设置的提示词",
  );

  [
    {
      id: "sort-newly-crawled",
      platformPostId: "sort-newly-crawled-post",
      text: "最新抓取但发布时间较早",
      publishedAt: "2020-01-01T00:00:00.000Z",
      createdAt: "2099-01-01T00:00:00.000Z",
    },
    {
      id: "sort-recently-published",
      platformPostId: "sort-recently-published-post",
      text: "发布时间较新但抓取时间较早",
      publishedAt: "2098-01-01T00:00:00.000Z",
      createdAt: "2000-01-01T00:00:00.000Z",
    },
  ].forEach((item) => store.contents.insertIfAbsent({
    ...item,
    accountId: accounts[0]._id,
    accountName: accounts[0].name,
    accountRegion: "国外",
    platform: "X",
    sourceUrl: `https://x.com/test/status/${item.platformPostId}`,
    authorHandle: "test",
    authorName: "Test",
    imageUrls: [],
    videoUrls: [],
    videoThumbnailUrls: [],
    linkCards: [],
    status: "待处理",
    updatedAt: item.createdAt,
  }));
  const crawledOrder = await fetch(
    `http://127.0.0.1:${apiPort}/api/contents?sort=crawled&limit=200`,
  ).then((response) => response.json());
  const publishedOrder = await fetch(
    `http://127.0.0.1:${apiPort}/api/contents?sort=published&limit=200`,
  ).then((response) => response.json());
  assert(
    crawledOrder.findIndex((item) => item.id === "sort-newly-crawled")
      < crawledOrder.findIndex((item) => item.id === "sort-recently-published"),
    "关闭排序按钮时没有按抓取入库顺序显示",
  );
  assert(
    publishedOrder.findIndex((item) => item.id === "sort-recently-published")
      < publishedOrder.findIndex((item) => item.id === "sort-newly-crawled"),
    "开启排序按钮时没有按帖子发布时间显示",
  );

  console.log(JSON.stringify({
    ok: true,
    schemaVersion: store.schemaVersion,
    cancelledJobs: store.jobs.list(10).length,
    abortedRunners,
    videoThumbnails: content.videoThumbnailUrls.length,
    accountPromptDefault: true,
    contentPromptOverride: true,
    contentSortModes: true,
  }));
} finally {
  await crawlerService.stop();
  await close(apiServer);
  store.close();
  await rm(fixtureDirectory, { recursive: true, force: true });
}
