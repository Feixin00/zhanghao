import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, writeFile, rm } from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import express from "express";
import { openSqliteStore } from "../server/sqlite-store.js";
import { createAiGenerationService } from "../server/ai-generation-service.js";
import { createPublishingService } from "../server/publishing-service.js";

// Uses a disposable database and never starts generation workers or real publishing.
// --preview serves the actual React component with these isolated fixtures for visual QA.
const previewMode = process.argv.includes("--preview");
const directory = await mkdtemp(path.join(os.tmpdir(), "flexiblefox-draft-media-test-"));
const store = openSqliteStore(path.join(directory, "data", "test.sqlite"));
const db = store.database;
const now = new Date().toISOString();
const publishing = createPublishingService({ store, projectRoot: directory, runner: async () => { throw new Error("Real publishing is disabled in this test"); } });
const generation = createAiGenerationService({ store });
const mediaPath = path.join(directory, "data", "draft-media", "original.png");
await mkdir(path.dirname(mediaPath), { recursive: true });
await writeFile(mediaPath, "original cached bytes");
db.prepare("INSERT INTO accounts (id,name,url,type,platform,region,details,created_at,updated_at) VALUES ('source','SteamDB','https://x.com/SteamDB','新闻','X','国外','',?,?)").run(now, now);
db.prepare("INSERT INTO publishing_accounts VALUES ('publisher','发布账号','https://x.com/publisher','新闻','X','国外','state.json',2,?,?)").run(now, now);
db.prepare("INSERT INTO publishing_account_sources VALUES ('source','publisher')").run();
for (const id of ["a", "b", "c"]) {
  db.prepare("INSERT INTO contents (id,account_id,account_name,account_region,platform,platform_post_id,source_url,author_handle,author_name,text,image_urls,video_urls,link_cards,published_at,status,created_at,updated_at) VALUES (?,'source','SteamDB','国外','X',?,'https://x.com/SteamDB','SteamDB','SteamDB','原帖正文','[\"original-source-image\"]','[]','[]',?,'已处理',?,?)").run(id, id, now, now, now);
  db.prepare("INSERT INTO drafts (id,source_content_id,account_id,title,body,hashtags_json,source_snapshot_json,account_snapshot_json,prompt_snapshot_json,ai_snapshot_json,created_at,updated_at) VALUES (?,?,'source',?,?,?,?,?,?,?,?,?)").run(id, id,
    id === "a" ? "WARDOGS 在 Steam 首次突破 33 万同时在线" : id === "b" ? "已经发布的稿件" : "无配图 · 发布失败示例",
    "SteamDB 消息：WARDOGS 在 Steam 上首次达到 337,157 名同时在线玩家。\n\n该游戏当前评分为 43.13%。",
    '["Steam","SteamDB","WARDOGS","游戏数据"]', '{"platform":"X","sourceUrl":"https://x.com/SteamDB"}', '{"name":"SteamDB"}', '{"title":"爆款改写"}', '{"modelName":"gpt-5.5"}', now, now);
}
for (const [id, draftId, order, enabled] of [["a1", "a", 0, 1], ["a2", "a", 1, 1], ["a3", "a", 2, 0], ["a4", "a", 3, 1], ["b1", "b", 0, 1]]) {
  db.prepare("INSERT INTO draft_media (id,draft_id,source_url,local_path,mime_type,sort_order,is_enabled,download_status,generation_prompt,generation_size,created_at,updated_at) VALUES (?,?,'',?,'image/png',?,?,'ready','test prompt','2048x1152',?,?)").run(id, draftId, mediaPath, order, enabled, now, now);
}
db.prepare("INSERT INTO draft_publications VALUES ('b','publisher','发布账号','published','发布成功，已在账号主页验证','https://example.test/post','{}',?)").run(now);
db.prepare("INSERT INTO draft_publications VALUES ('c','publisher','发布账号','failed',?,'','{}',?)").run("发布前检查失败，修复后可重试。\n详细原因：阶段：上传图片；类型：RuntimeError；原因：图片没有出现上传预览，停止发布。", now);

const app = express();
app.use(express.json());
if (previewMode) {
  app.post("/api/drafts/:id/publish", (_req, res) => res.status(409).json({ message: "隔离预览，不会真实发布" }));
  app.get("/api/draft-media/:id", (req, res, next) => {
    if (!db.prepare("SELECT 1 FROM draft_media WHERE id=?").get(req.params.id)) return next();
    res.type("svg").send(`<svg xmlns="http://www.w3.org/2000/svg" width="800" height="500"><defs><linearGradient id="bg"><stop stop-color="#122433"/><stop offset="1" stop-color="#385566"/></linearGradient></defs><rect width="800" height="500" fill="url(#bg)"/><circle cx="650" cy="120" r="180" fill="#76becc" opacity=".12"/><text x="60" y="130" fill="#c6d6de" font-family="sans-serif" font-size="30">STEAM · GAME DATA</text><text x="60" y="255" fill="white" font-family="sans-serif" font-size="80" font-weight="bold">337,157</text><text x="60" y="330" fill="#93d5de" font-family="sans-serif" font-size="26">CONCURRENT PLAYERS</text><path d="M60 430L210 400L340 410L480 375L740 350" stroke="#9b8cf4" stroke-width="8" fill="none"/></svg>`);
  });
}
publishing.registerRoutes(app);
generation.registerRoutes(app);
if (previewMode) {
  const { build } = await import("vite");
  const previewDirectory = path.join(directory, "preview");
  await build({ build: {
    outDir: previewDirectory, emptyOutDir: false,
    rollupOptions: { input: path.resolve(import.meta.dirname, "fixtures", "draft-preview.html") },
  } });
  app.get("/", (_req, res) => {
    res.sendFile(path.join(previewDirectory, "tests", "fixtures", "draft-preview.html"));
  });
  app.use(express.static(previewDirectory));
}
const server = app.listen(0, "127.0.0.1");
await new Promise((resolve) => server.once("listening", resolve));
const base = `http://127.0.0.1:${server.address().port}`;
const request = (url, method = "GET", body) => fetch(base + url, { method, headers: { "content-type": "application/json" }, body: body ? JSON.stringify(body) : undefined });
const mediaCount = (draftId) => db.prepare("SELECT count(*) FROM draft_media WHERE draft_id=?").pluck().get(draftId);
async function cleanup() {
  await new Promise((resolve) => server.close(resolve));
  await generation.stop();
  await publishing.stop();
  store.close();
  await rm(directory, { recursive: true, force: true });
}

if (previewMode) {
  console.log(`Isolated draft preview: ${base}`);
  process.once("SIGINT", async () => { await cleanup(); process.exit(0); });
  process.once("SIGTERM", async () => { await cleanup(); process.exit(0); });
} else {
  try {
    const before = await (await request("/api/drafts/a/publish-preview")).json();
    assert.equal(before.imageCount, 3);
    assert.equal((await request("/api/draft-media/missing", "DELETE")).status, 404);
    const response = await request("/api/draft-media/a2", "DELETE");
    assert.equal(response.status, 200);
    assert.deepEqual((await response.json()).media.map((item) => item.id), ["a1", "a3", "a4"]);
    assert.equal(mediaCount("b"), 1, "another draft must not be affected");
    assert.equal(db.prepare("SELECT image_urls FROM contents WHERE id='a'").pluck().get(), '["original-source-image"]');
    assert.equal(await readFile(mediaPath, "utf8"), "original cached bytes");
    assert.equal((await request("/api/draft-media/a2", "DELETE")).status, 404);
    assert.equal((await request("/api/draft-media/a2")).status, 404);
    assert.equal((await request("/api/draft-media/a2/generate", "POST", { mode: "regenerate" })).status, 404);
    const after = await (await request("/api/drafts/a/publish-preview")).json();
    assert.equal(after.imageCount, 2);
    assert.notEqual(before.fingerprint, after.fingerprint);
    assert.equal((await request("/api/drafts/a/publish", "POST", before)).status, 409, "stale publication preview must be rejected");
    const refreshed = await (await request("/api/drafts")).json();
    assert.equal(refreshed.find((draft) => draft.id === "a").media.length, 3);
    db.prepare("UPDATE draft_media SET image_status='running' WHERE id='a1'").run();
    assert.equal((await request("/api/draft-media/a4", "DELETE")).status, 409);
    assert.equal(mediaCount("a"), 3);
    db.prepare("UPDATE draft_media SET image_status='idle' WHERE id='a1'").run();
    for (const status of ["queued", "running", "retry_wait"]) {
      db.prepare("INSERT INTO ai_generation_jobs (id,content_id,status,created_at,updated_at) VALUES ('active','a',?,?,?)").run(status, now, now);
      assert.equal((await request("/api/draft-media/a4", "DELETE")).status, 409);
      db.prepare("DELETE FROM ai_generation_jobs WHERE id='active'").run();
    }
    db.prepare("INSERT INTO draft_publications VALUES ('a','publisher','发布账号','running','','','{}',?)").run(now);
    assert.equal((await request("/api/draft-media/a4", "DELETE")).status, 409, "publishing must lock deletion");
    db.prepare("DELETE FROM draft_publications WHERE draft_id='a'").run();
    assert.equal((await request("/api/draft-media/b1", "DELETE")).status, 200);
    assert.equal(db.prepare("SELECT status FROM draft_publications WHERE draft_id='b'").pluck().get(), "published", "published record must remain unchanged");
    db.prepare("UPDATE draft_media SET image_status='failed', image_error='test error' WHERE id='a4'").run();
    for (const id of ["a1", "a3", "a4"]) assert.equal((await request(`/api/draft-media/${id}`, "DELETE")).status, 200);
    assert.equal((await (await request("/api/drafts/a/publish-preview")).json()).imageCount, 0, "deleting the last image must allow a text-only draft");
    assert.equal(db.prepare("SELECT title FROM drafts WHERE id='a'").pluck().get(), "WARDOGS 在 Steam 首次突破 33 万同时在线");
    console.log("Draft media deletion tests passed: persistence, isolation, publishing selection, stale previews, concurrency locks, last image, published history.");
  } finally { await cleanup(); }
}
