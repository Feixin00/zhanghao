import { createHash } from "node:crypto";
import { spawn } from "node:child_process";
import { mkdir, mkdtemp, readFile, writeFile, rm } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { preparePublishingImage } from "./publishing-images.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const parse = (value, fallback = []) => { try { return JSON.parse(value); } catch { return fallback; } };
const fail = (message, status = 409) => Object.assign(new Error(message), { status });
const safeError = (error) => String(error?.message || error || "未知错误")
  .replace(/sk-[A-Za-z0-9_-]+/g, "[密钥已隐藏]")
  .replace(/(?:Bearer\s+\S+|(?:auth_token|ct0|cookie|api[_-]?key)\s*[=:]\s*[^\s,;]+)/gi, "[凭据已隐藏]")
  .slice(0, 2000);
const handle = (value) => String(value || "").trim().replace(/^https?:\/\/(?:www\.)?(?:x|twitter)\.com\//i, "").split(/[/?#]/)[0].replace(/^@/, "").toLowerCase();

export function runPublishingWorker(payload, onClick, signal) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.env.PYTHON_COMMAND || (process.platform === "win32" ? "python" : "python3"),
      [path.join(root, "spider", "推特爬虫", "post_with_state.py"), "--payload-stdin"],
      { cwd: root, windowsHide: true, stdio: ["pipe", "pipe", "pipe"], env: { ...process.env, PYTHONIOENCODING: "utf-8", PYTHONUTF8: "1" } });
    let buffer = "", result, workerError;
    const consume = (line) => {
      if (line.trim() === "FLEXIBLEFOX_PUBLISH_CLICKING") onClick();
      try { const value = JSON.parse(line); if (value.status === "published_verified") result = value; if (value.status === "publish_error") workerError = safeError(value.message); } catch { /* Browser diagnostics are not protocol messages. */ }
    };
    child.stdout.setEncoding("utf8");
    child.stdout.on("data", (chunk) => { buffer += chunk; const lines = buffer.split(/\r?\n/); buffer = lines.pop(); lines.forEach(consume); });
    child.stderr.on("data", () => {}); // Never echo state/cookie/browser diagnostics to the UI.
    child.stdin.on("error", () => {});
    const abort = () => { child.kill(); reject(fail("发布服务已停止")); };
    signal?.addEventListener("abort", abort, { once: true });
    const timer = setTimeout(() => { child.kill(); reject(fail("发布操作超时，请核实账号主页")); }, 300_000);
    child.on("error", () => { clearTimeout(timer); reject(fail("无法启动发布程序")); });
    child.on("close", (code) => {
      signal?.removeEventListener("abort", abort);
      clearTimeout(timer); consume(buffer);
      if (code === 0 && result?.profileVerification?.verified) resolve(result);
      else reject(fail(workerError || `发布程序退出（代码 ${code}），未返回诊断；请检查 Python 依赖及浏览器启动配置`));
    });
    child.stdin.end(JSON.stringify({ ...payload, publish: true }));
    if (signal?.aborted) abort();
  });
}

export function createPublishingService({ store, runner = runPublishingWorker, projectRoot = root }) {
  const db = store.database;
  db.exec(`
    CREATE TABLE IF NOT EXISTS publishing_account_sources (
      source_account_id TEXT PRIMARY KEY REFERENCES accounts(id) ON DELETE CASCADE,
      publishing_account_id TEXT NOT NULL REFERENCES publishing_accounts(id) ON DELETE CASCADE
    );
    CREATE TABLE IF NOT EXISTS draft_publications (
      draft_id TEXT PRIMARY KEY REFERENCES drafts(id) ON DELETE CASCADE,
      account_id TEXT REFERENCES publishing_accounts(id) ON DELETE SET NULL,
      account_name TEXT NOT NULL, status TEXT NOT NULL, message TEXT NOT NULL DEFAULT '',
      url TEXT NOT NULL DEFAULT '', snapshot_json TEXT NOT NULL, updated_at TEXT NOT NULL
    );
  `);
  db.prepare("UPDATE draft_publications SET status = 'unknown', message = '服务中断，发布结果待核实，请检查账号主页' WHERE status = 'running'").run();
  const active = new Set();
  const tasks = new Map();
  const controllers = new Map();
  let stopping = false;
  const getPublication = (id) => db.prepare("SELECT draft_id AS draftId, account_id AS accountId, account_name AS accountName, status, message, url FROM draft_publications WHERE draft_id = ?").get(id) || null;
  const busyAccount = (id) => Boolean(db.prepare("SELECT 1 FROM draft_publications WHERE account_id = ? AND status = 'running'").get(id));

  function prepare(id) {
    const draft = db.prepare("SELECT * FROM drafts WHERE id = ?").get(id);
    if (!draft) throw fail("稿件不存在", 404);
    const source = db.prepare("SELECT account_id FROM contents WHERE id = ?").get(draft.source_content_id);
    const account = db.prepare("SELECT p.* FROM publishing_account_sources s JOIN publishing_accounts p ON p.id = s.publishing_account_id WHERE s.source_account_id = ?").get(source?.account_id || "");
    if (!account) throw fail("该稿件的来源账号尚未分配发布账号，请先在发布账号库设置归属账号");
    if (account.platform !== "X") throw fail("当前仅支持发布到 X");
    if (db.prepare("SELECT 1 FROM ai_generation_jobs WHERE content_id = ? AND status IN ('queued','running','retry_wait')").get(draft.source_content_id)) throw fail("请等待稿件生成完成");
    if (db.prepare("SELECT 1 FROM draft_media WHERE draft_id = ? AND image_status = 'running'").get(id)) throw fail("请等待配图生成完成");
    const tags = parse(draft.hashtags_json).map((tag) => `#${String(tag).replace(/^#+/, "")}`).join(" ");
    const text = [draft.title.trim(), draft.body.trim(), tags].filter(Boolean).join("\n\n");
    if (!text || Array.from(text).length > 280) throw fail(`当前普通帖子最多 280 个字符，当前 ${Array.from(text).length} 个，请先编辑稿件缩短内容`);
    const media = db.prepare("SELECT * FROM draft_media WHERE draft_id = ? AND is_enabled = 1 ORDER BY sort_order, id").all(id).filter((item) => !item.source_url || item.generation_prompt);
    if (media.length > 4) throw fail("X 单帖最多 4 张图片，请先取消多余配图的选用");
    for (const item of media) {
      const resolved = path.resolve(item.local_path || "");
      const relative = path.relative(path.join(projectRoot, "data", "draft-media"), resolved);
      if (!item.local_path || relative.startsWith("..") || path.isAbsolute(relative) || item.download_status !== "ready") throw fail("选用的图片尚未下载完成，请重新生成或取消选用");
    }
    const snapshot = { text, accountId: account.id, accountUrl: account.url, media: media.map((item) => ({ id: item.id, path: item.local_path, updatedAt: item.updated_at })) };
    return { account, media, text, fingerprint: createHash("sha256").update(JSON.stringify(snapshot)).digest("hex"), snapshot };
  }

  async function execute(id, prepared) {
    let directory, clicked = false;
    try {
      const tempRoot = path.join(projectRoot, "data", "publishing-tmp");
      await mkdir(tempRoot, { recursive: true });
      directory = await mkdtemp(path.join(tempRoot, "post-"));
      const state = path.join(directory, "state.json");
      await writeFile(state, await readFile(path.join(path.dirname(store.path), "publishing-account-states", `${prepared.account.id}.json`)));
      const images = [];
      for (const item of prepared.media) {
        const index = images.length + 1;
        db.prepare("UPDATE draft_publications SET message=? WHERE draft_id=?").run(`正在检查并优化第 ${index}/${prepared.media.length} 张上传图片（保留原图）`, id);
        try {
          images.push(await preparePublishingImage(item.local_path, directory, { signal: controllers.get(id)?.signal }));
        } catch (error) {
          throw fail(`处理第 ${index}/${prepared.media.length} 张上传图片失败：${safeError(error)}`);
        }
      }
      if (stopping) throw fail("发布服务已停止");
      db.prepare("UPDATE draft_publications SET message='正在校验账号并发布' WHERE draft_id=?").run(id);
      const result = await runner({ text: prepared.text, images, state, profileDir: path.join(directory, "browser"), expectedHandle: handle(prepared.account.url) }, () => { clicked = true; }, controllers.get(id)?.signal);
      const url = result.profileVerification?.url || result.url || "";
      if (!/^https:\/\/x\.com\/[A-Za-z0-9_]+\/status\/\d+$/.test(url) || handle(url) !== handle(prepared.account.url)) throw fail("发布结果与目标账号不匹配");
      db.transaction(() => {
        db.prepare("UPDATE draft_publications SET status='published', message='发布成功，已在账号主页验证', url=?, updated_at=? WHERE draft_id=?").run(url, new Date().toISOString(), id);
        db.prepare("UPDATE drafts SET status='已发布' WHERE id=?").run(id);
      })();
    } catch (error) {
      db.prepare("UPDATE draft_publications SET status=?, message=?, updated_at=? WHERE draft_id=?").run(clicked || stopping ? "unknown" : "failed", `${clicked || stopping ? "发布结果待核实，请检查账号主页，不要重复发布。" : "发布前检查失败，修复后可重试。"}\n详细原因：${safeError(error)}`, new Date().toISOString(), id);
    } finally {
      active.delete(id);
      if (directory) await rm(directory, { recursive: true, force: true }).catch(() => {});
    }
  }

  function registerRoutes(app) {
    // Protect the exact resources being published against concurrent mutation.
    app.use("/api", (req, res, next) => {
      if (["GET", "HEAD", "OPTIONS"].includes(req.method)) return next();
      const parts = req.path.split("/").filter(Boolean);
      if (parts[0] === "publishing-accounts" && busyAccount(parts[1])) return res.status(409).json({ message: "该账号正在发布，请稍后修改" });
      let id = parts[0] === "drafts" ? parts[1] : null;
      if (parts[0] === "draft-media") id = db.prepare("SELECT draft_id FROM draft_media WHERE id=?").get(parts[1])?.draft_id;
      if (id && getPublication(id)?.status === "running") return res.status(409).json({ message: "稿件正在发布，请稍后操作" });
      if (active.size && ["contents", "accounts", "ai-generation-jobs"].includes(parts[0])) return res.status(409).json({ message: "发布期间请稍后修改内容、账号或生成任务" });
      next();
    });
    app.get("/api/publishing-ownership", (_req, res) => res.json(db.prepare("SELECT a.id, a.name, a.platform, s.publishing_account_id AS ownerId FROM accounts a LEFT JOIN publishing_account_sources s ON s.source_account_id=a.id ORDER BY a.created_at DESC").all()));
    app.put("/api/publishing-accounts/:id/sources", (req, res) => {
      try {
        const ids = req.body?.sourceAccountIds;
        if (!Array.isArray(ids) || ids.length > 500 || ids.some((id) => typeof id !== "string") || new Set(ids).size !== ids.length) throw fail("归属账号参数无效", 400);
        if (!store.publishingAccounts.get(req.params.id)) throw fail("发布账号不存在", 404);
        db.transaction(() => {
          for (const id of ids) {
            if (!db.prepare("SELECT 1 FROM accounts WHERE id=?").get(id)) throw fail("信息账号不存在", 400);
            const owner = db.prepare("SELECT publishing_account_id FROM publishing_account_sources WHERE source_account_id=?").get(id);
            if (owner && owner.publishing_account_id !== req.params.id) throw fail("该信息账号已归属其他发布账号，请先解除原归属");
          }
          db.prepare("DELETE FROM publishing_account_sources WHERE publishing_account_id=?").run(req.params.id);
          for (const id of ids) db.prepare("INSERT INTO publishing_account_sources VALUES (?, ?)").run(id, req.params.id);
        })();
        res.json({ saved: true });
      } catch (error) { res.status(error.status || 500).json({ message: error.status ? error.message : "保存归属失败" }); }
    });
    app.get("/api/draft-publications", (_req, res) => res.json(db.prepare("SELECT draft_id AS draftId, account_name AS accountName, status, message, url FROM draft_publications").all()));
    app.post("/api/drafts/:id/publication/allow-retry", (req, res) => {
      if (req.body?.confirmedNotPublished !== true) return res.status(400).json({ message: "请先确认账号主页没有该帖子" });
      if (active.has(req.params.id)) return res.status(409).json({ message: "发布任务尚未结束" });
      const result = db.prepare("UPDATE draft_publications SET status='failed', message=message || ?, updated_at=? WHERE draft_id=? AND status='unknown'").run("\n用户已核实未发布，手动允许重试。", new Date().toISOString(), req.params.id);
      if (!result.changes) return res.status(409).json({ message: "仅发布待核实的记录可以解除锁定" });
      return res.json(getPublication(req.params.id));
    });
    app.get("/api/drafts/:id/publish-preview", (req, res) => {
      try {
        const value = prepare(req.params.id);
        res.json({ accountId: value.account.id, accountName: value.account.name, accountUrl: value.account.url, text: value.text, imageCount: value.media.length, fingerprint: value.fingerprint });
      } catch (error) { res.status(error.status || 500).json({ message: error.message }); }
    });
    app.post("/api/drafts/:id/publish", (req, res) => {
      try {
        if (stopping) throw fail("服务正在关闭，请稍后再试", 503);
        const previous = getPublication(req.params.id);
        if (previous && previous.status !== "failed") throw fail("该稿件已发布、正在发布或结果待核实，不能重复发布");
        const value = prepare(req.params.id);
        if (value.account.id !== req.body?.accountId || value.fingerprint !== req.body?.fingerprint) throw fail("稿件内容或归属已变化，请重新确认");
        if (busyAccount(value.account.id)) throw fail("该发布账号正在处理另一篇稿件，请稍后再试");
        db.prepare("INSERT OR REPLACE INTO draft_publications VALUES (?, ?, ?, 'running', '正在校验账号并发布', '', ?, ?)").run(req.params.id, value.account.id, value.account.name, JSON.stringify(value.snapshot), new Date().toISOString());
        active.add(req.params.id);
        controllers.set(req.params.id, new AbortController());
        const task = execute(req.params.id, value).finally(() => { tasks.delete(req.params.id); controllers.delete(req.params.id); });
        tasks.set(req.params.id, task);
        res.status(202).json(getPublication(req.params.id));
      } catch (error) { res.status(error.status || 500).json({ message: error.status ? error.message : "无法创建发布任务" }); }
    });
  }
  return { registerRoutes, async stop() {
    stopping = true;
    for (const controller of controllers.values()) controller.abort();
    await Promise.allSettled([...tasks.values()]);
  } };
}
