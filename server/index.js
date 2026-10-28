import "dotenv/config";

import { existsSync, mkdirSync } from "node:fs";
import { readFile, unlink, writeFile } from "node:fs/promises";
import { createServer as createHttpServer } from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import compression from "compression";
import express from "express";
import { createAiGenerationService } from "./ai-generation-service.js";
import { createPublishingService } from "./publishing-service.js";
import { createCrawlerService } from "./crawler-service.js";
import { isValidDatabaseId, openSqliteStore } from "./sqlite-store.js";

const ACCOUNT_TYPES = new Set([
  "新闻/资讯/热点",
  "榜单/推荐",
  "知识科普",
  "创作/测评",
  "测评分享",
  "情感",
  "娱乐搞笑",
  "创作者",
]);
const ACCOUNT_PLATFORMS = new Set(["X", "Reddit", "抖音", "小红书", "微博"]);
const ACCOUNT_REGIONS = new Set(["国内", "国外"]);
const AI_MODEL_TYPES = new Set(["text", "image"]);
const AI_SETTING_LIMITS = Object.freeze({
  modelName: 160,
});
const MAX_PUBLISHING_STATE_FILE_BYTES = 512 * 1024;
const X_RESERVED_PATHS = new Set([
  "compose", "explore", "home", "i", "intent", "login", "messages",
  "notifications", "search", "settings", "share", "signup",
]);

const currentDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectDirectory = path.resolve(currentDirectory, "..");
const distDirectory = path.join(projectDirectory, "dist");
const developmentUiDirectory = path.join(projectDirectory, "data", "dev-ui");
const developmentMode = process.argv.includes("--dev");
const host = process.env.HOST || "0.0.0.0";
const port = developmentMode
  ? Number(process.env.VITE_PORT) || 5173
  : Number(process.env.PORT) || 3000;
const uiDirectory = developmentMode ? developmentUiDirectory : distDirectory;

if (developmentMode) {
  console.log("正在准备前端页面……");
  const { build } = await import("vite");
  await build({
    root: projectDirectory,
    build: {
      outDir: developmentUiDirectory,
      emptyOutDir: true,
    },
  });
}

const store = openSqliteStore();
const publishingStateDirectory = path.join(path.dirname(store.path), "publishing-account-states");
mkdirSync(publishingStateDirectory, { recursive: true });
const aiGenerationService = createAiGenerationService({ store });
const crawlerService = createCrawlerService({
  store,
  enqueueGenerationJobs: (contentIds) => aiGenerationService.enqueueContentIds(contentIds),
  sessionCheckCommand: process.env.PUBLISHING_SESSION_CHECK_COMMAND || null,
  sessionCheckScript: process.env.PUBLISHING_SESSION_CHECK_SCRIPT || null,
});

const app = express();
const server = createHttpServer(app);

app.disable("x-powered-by");
app.use(compression({ threshold: 1_024 }));
app.use(express.json({ limit: "768kb" }));
const publishingService = createPublishingService({ store });
publishingService.registerRoutes(app);

function serializeAccount(account) {
  return {
    id: account._id,
    name: account.name,
    url: account.url,
    type: account.type,
    platform: account.platform,
    region: account.region || "国外",
    details: account.details,
    promptId: account.promptId || null,
    createdAt: account.createdAt,
    updatedAt: account.updatedAt,
  };
}

function serializePublishingAccount(account) {
  return {
    id: account._id,
    name: account.name,
    url: account.url,
    type: account.type,
    platform: account.platform,
    stateFileName: account.stateFileName,
    stateCookieCount: account.stateCookieCount,
    createdAt: account.createdAt,
    updatedAt: account.updatedAt,
  };
}

function serializePromptAccountType(accountType) {
  return {
    id: accountType._id,
    name: accountType.name,
    active: accountType.active,
    createdAt: accountType.createdAt,
    updatedAt: accountType.updatedAt,
  };
}

function serializePrompt(prompt) {
  return {
    id: prompt._id,
    title: prompt.title,
    content: prompt.content,
    platform: prompt.platform,
    accountTypeId: prompt.accountTypeId,
    accountTypeName: prompt.accountTypeName,
    enabled: prompt.enabled,
    createdAt: prompt.createdAt,
    updatedAt: prompt.updatedAt,
  };
}

function maskApiKey(value) {
  if (!value) return "";
  if (value.length <= 8) return "••••••••";
  return `${value.slice(0, 4)}••••••${value.slice(-4)}`;
}

function serializeAiSettings(options, providers) {
  const settings = {
    modelName: { selectedId: null, options: [] },
    provider: { selectedId: null, options: [] },
  };

  for (const option of options) {
    if (option.key !== "modelName") continue;
    const serialized = {
      id: option._id,
      value: option.value,
      selected: option.selected,
      createdAt: option.createdAt,
      updatedAt: option.updatedAt,
    };
    settings[option.key].options.push(serialized);
    if (option.selected) settings[option.key].selectedId = option._id;
  }

  for (const provider of providers) {
    const maskedApiKey = maskApiKey(provider.apiKey);
    const serialized = {
      id: provider._id,
      alias: provider.alias,
      apiKey: maskedApiKey,
      baseUrl: provider.baseUrl,
      label: provider.alias || provider.baseUrl,
      summary: `${provider.baseUrl} · ${maskedApiKey}`,
      selected: provider.selected,
      createdAt: provider.createdAt,
      updatedAt: provider.updatedAt,
    };
    settings.provider.options.push(serialized);
    if (provider.selected) settings.provider.selectedId = provider._id;
  }

  return settings;
}

function serializeAiConfigurations(configurations) {
  return configurations.map((configuration) => ({
    id: configuration._id,
    modelName: configuration.modelName,
    modelType: configuration.modelType,
    apiKey: maskApiKey(configuration.apiKey),
    baseUrl: configuration.baseUrl,
    enabled: configuration.selected,
    createdAt: configuration.createdAt,
    updatedAt: configuration.updatedAt,
  }));
}

function validateAiSettingKey(value) {
  return value === "modelName" ? value : null;
}

function validateAccountPayload(payload) {
  const account = {
    name: typeof payload?.name === "string" ? payload.name.trim() : "",
    url: typeof payload?.url === "string" ? payload.url.trim() : "",
    type: typeof payload?.type === "string" ? payload.type : "",
    platform: typeof payload?.platform === "string" ? payload.platform : "",
    region: typeof payload?.region === "string" ? payload.region : "",
    details: typeof payload?.details === "string" ? payload.details.trim() : "",
    promptId:
      typeof payload?.promptId === "string" && payload.promptId.trim()
        ? payload.promptId.trim()
        : null,
  };
  const errors = {};

  if (!account.name) errors.name = "请输入账号名称";
  if (!account.url) errors.url = "请输入账号链接或标识";
  if (!ACCOUNT_TYPES.has(account.type)) errors.type = "请选择有效的账号类型";
  if (!ACCOUNT_PLATFORMS.has(account.platform)) errors.platform = "请选择有效的归属平台";
  if (!ACCOUNT_REGIONS.has(account.region)) errors.region = "请选择国内或国外";

  if (account.name.length > 120) errors.name = "账号名称不能超过 120 个字符";
  if (account.url.length > 500) errors.url = "账号链接或标识不能超过 500 个字符";
  if (account.details.length > 2_000) errors.details = "详情不能超过 2000 个字符";
  if (account.promptId && !isValidDatabaseId(account.promptId)) {
    errors.promptId = "提示词 ID 无效";
  }

  return { account, errors };
}

function validatePublishingStatePayload(payload, platform = "X") {
  const stateFileName = typeof payload?.fileName === "string" ? payload.fileName.trim() : "";
  const errors = {};

  if (!stateFileName) errors.stateFile = "请上传状态文件";
  if (stateFileName && path.extname(stateFileName).toLowerCase() !== ".json") {
    errors.stateFile = "请选择 JSON 格式的状态文件";
  }

  let normalizedState = null;
  let stateCookieCount = 0;
  const sourceState = payload?.state;
  if (!sourceState || typeof sourceState !== "object") {
    errors.stateFile = errors.stateFile || "状态文件不是有效的 JSON 登录状态";
  } else {
    const cookies = Array.isArray(sourceState) ? sourceState : sourceState.cookies;
    if (!Array.isArray(cookies) || cookies.length === 0) {
      errors.stateFile = "状态文件中没有可用的 Cookie";
    } else {
      const hasPlatformCookie = cookies.some((cookie) => {
        if (!cookie || typeof cookie !== "object" || Array.isArray(cookie)) return false;
        const domain = typeof cookie.domain === "string" ? cookie.domain.toLowerCase() : "";
        return platform === "X" && (domain === "x.com" || domain.endsWith(".x.com")
          || domain === "twitter.com" || domain.endsWith(".twitter.com"))
          && typeof cookie.name === "string" && cookie.name.trim()
          && typeof cookie.value === "string";
      });
      if (!hasPlatformCookie) {
        errors.stateFile = "状态文件中没有找到 X / Twitter 的有效 Cookie";
      } else {
        normalizedState = Array.isArray(sourceState)
          ? { cookies: sourceState, origins: [] }
          : sourceState;
        stateCookieCount = cookies.length;
        const serializedState = `${JSON.stringify(normalizedState, null, 2)}\n`;
        if (Buffer.byteLength(serializedState, "utf8") > MAX_PUBLISHING_STATE_FILE_BYTES) {
          errors.stateFile = "状态文件不能超过 512KB";
        }
      }
    }
  }

  return { stateFileName, normalizedState, stateCookieCount, errors };
}

function normalizeXAccountHandle(value) {
  const raw = String(value || "").trim();
  if (!raw) return "";

  let candidate = raw.replace(/^@/, "");
  if (/^(?:https?:\/\/)?(?:www\.)?(?:x|twitter)\.com\//i.test(raw)) {
    try {
      const parsed = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`);
      if (!/^(?:www\.)?(?:x|twitter)\.com$/i.test(parsed.hostname)) return "";
      candidate = parsed.pathname.split("/").filter(Boolean)[0] || "";
    } catch {
      return "";
    }
  } else if (raw.includes("/") || raw.includes(":") || raw.includes("?")) {
    return "";
  }

  candidate = candidate.replace(/^@/, "");
  if (!/^[A-Za-z0-9_]{1,15}$/.test(candidate)) return "";
  if (X_RESERVED_PATHS.has(candidate.toLowerCase())) return "";
  return candidate;
}

function validatePublishingAccountPayload(payload) {
  const requestedPlatform = typeof payload?.platform === "string" ? payload.platform : "";
  const platform = requestedPlatform || "X";
  const stateValidation = validatePublishingStatePayload(payload, platform);
  const account = {
    name: typeof payload?.name === "string" ? payload.name.trim() : "",
    url: typeof payload?.url === "string" ? payload.url.trim() : "",
    type: typeof payload?.type === "string" ? payload.type : "",
    // 发布平台由当前接入的发布通道决定，不需要用户重复填写。
    platform,
    // 旧表仍保留该列以兼容已有数据，发布账号不再要求内容地区。
    region: "",
    stateFileName: stateValidation.stateFileName,
  };
  const errors = { ...stateValidation.errors };

  if (!account.name) errors.name = "请输入账号名称";
  if (!account.url) errors.url = "请输入账号链接或标识";
  const expectedHandle = account.platform === "X" ? normalizeXAccountHandle(account.url) : "";
  if (account.url && account.platform === "X" && !expectedHandle) {
    errors.url = "请输入有效的 X 用户名或主页链接";
  }
  if (!ACCOUNT_TYPES.has(account.type)) errors.type = "请选择有效的账号类型";
  if (account.platform !== "X") errors.platform = "当前仅支持创建 X 发布账号";
  if (account.name.length > 120) errors.name = "账号名称不能超过 120 个字符";
  if (account.url.length > 500) errors.url = "账号链接或标识不能超过 500 个字符";

  return {
    account,
    normalizedState: stateValidation.normalizedState,
    stateCookieCount: stateValidation.stateCookieCount,
    expectedHandle,
    errors,
  };
}

function respondToPublishingSessionError(response, error, logPrefix) {
  if (error?.code === "PUBLISHING_SESSION_INVALID"
    || error?.code === "PUBLISHING_ACCOUNT_MISMATCH") {
    return response.status(422).json({
      message: error.message,
      errors: { stateFile: error.message },
    });
  }
  console.error(`${logPrefix}：`, error);
  const message = "暂时无法校验状态文件，请确认本机浏览器与 Python 环境可用后重试";
  return response.status(503).json({ message, errors: { stateFile: message } });
}

function validatePromptPayload(payload) {
  const prompt = {
    title: typeof payload?.title === "string" ? payload.title.trim() : "",
    content: typeof payload?.content === "string" ? payload.content.trim() : "",
    platform: typeof payload?.platform === "string" ? payload.platform : "",
    accountTypeId: typeof payload?.accountTypeId === "string" ? payload.accountTypeId.trim() : "",
    newAccountTypeName:
      typeof payload?.newAccountTypeName === "string" ? payload.newAccountTypeName.trim() : "",
    enabled: payload?.enabled !== false,
  };
  const errors = {};

  if (!prompt.title) errors.title = "请输入提示词名称";
  if (!prompt.content) errors.content = "请输入提示词内容";
  if (!ACCOUNT_PLATFORMS.has(prompt.platform)) errors.platform = "请选择有效的归属平台";
  if (!prompt.accountTypeId && !prompt.newAccountTypeName) {
    errors.accountType = "请选择或新增账号类型";
  }
  if (prompt.accountTypeId && prompt.newAccountTypeName) {
    errors.accountType = "账号类型只能选择现有类型或新增类型";
  }
  if (prompt.accountTypeId && !isValidDatabaseId(prompt.accountTypeId)) {
    errors.accountType = "账号类型 ID 无效";
  }
  if (prompt.title.length > 120) errors.title = "提示词名称不能超过 120 个字符";
  if (prompt.content.length > 20_000) errors.content = "提示词内容不能超过 20000 个字符";
  if (prompt.newAccountTypeName.length > 80) {
    errors.accountType = "账号类型名称不能超过 80 个字符";
  }

  return { prompt, errors };
}

app.get("/api/health", (_request, response) => {
  store.database.prepare("SELECT 1").get();
  response.json({
    ok: true,
    database: path.basename(store.path),
    driver: "sqlite",
    schemaVersion: store.schemaVersion,
  });
});

const dashboardDefaultLayout = Object.freeze({
  visible: ["collected", "rewritten", "published", "reads", "followers", "top"],
  order: ["pipeline", "growth", "ranking"],
});

function parseDashboardList(value, fallback) {
  try {
    const parsed = JSON.parse(value || "[]");
    return Array.isArray(parsed) ? parsed.filter(item => typeof item === "string") : fallback;
  } catch {
    return fallback;
  }
}

function dashboardChange(current, previous) {
  if (!previous) return current ? "+100%" : "0%";
  const change = ((current - previous) / previous) * 100;
  return `${change >= 0 ? "+" : ""}${change.toFixed(1)}%`;
}

function dashboardSeries(table, dateColumn, startIso, extraWhere = "", params = []) {
  const rows = store.database.prepare(`
    SELECT substr(${dateColumn}, 1, 10) AS day, COUNT(*) AS count
    FROM ${table}
    WHERE ${dateColumn} >= ? ${extraWhere}
    GROUP BY substr(${dateColumn}, 1, 10)
  `).all(startIso, ...params);
  const counts = new Map(rows.map(row => [row.day, Number(row.count)]));
  return Array.from({ length: 7 }, (_, index) => {
    const day = new Date(Date.now() - (6 - index) * 86_400_000).toISOString().slice(0, 10);
    return counts.get(day) || 0;
  });
}

function dashboardMetric({ table, dateColumn = "created_at", extraWhere = "", params = [] }) {
  const now = Date.now();
  const currentStart = new Date(now - 7 * 86_400_000).toISOString();
  const previousStart = new Date(now - 14 * 86_400_000).toISOString();
  const count = (start, end) => Number(store.database.prepare(`
    SELECT COUNT(*) AS count FROM ${table}
    WHERE ${dateColumn} >= ? ${end ? `AND ${dateColumn} < ?` : ""} ${extraWhere}
  `).get(...(end ? [start, end, ...params] : [start, ...params])).count);
  const current = count(currentStart);
  const previous = count(previousStart, currentStart);
  return {
    value: String(current),
    previous: String(previous),
    comparison: dashboardChange(current, previous),
    trend: dashboardSeries(table, dateColumn, currentStart, extraWhere, params),
  };
}

app.get("/api/dashboard/layout", (_request, response) => {
  const row = store.database.prepare("SELECT * FROM dashboard_preferences WHERE id = 1").get();
  if (!row) return response.json(dashboardDefaultLayout);
  return response.json({
    visible: parseDashboardList(row.visible_json, dashboardDefaultLayout.visible),
    order: parseDashboardList(row.order_json, dashboardDefaultLayout.order),
    updatedAt: row.updated_at,
  });
});

app.put("/api/dashboard/layout", (request, response) => {
  const clean = value => Array.isArray(value)
    ? [...new Set(value.filter(item => typeof item === "string" && /^[a-z0-9:-]{1,80}$/i.test(item)))].slice(0, 80)
    : null;
  const visible = clean(request.body?.visible);
  const order = clean(request.body?.order);
  if (!visible || !order) return response.status(400).json({ message: "仪表盘布局格式无效" });
  const updatedAt = new Date().toISOString();
  store.database.prepare(`
    INSERT INTO dashboard_preferences (id, visible_json, order_json, updated_at)
    VALUES (1, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      visible_json = excluded.visible_json,
      order_json = excluded.order_json,
      updated_at = excluded.updated_at
  `).run(JSON.stringify(visible), JSON.stringify(order), updatedAt);
  return response.json({ visible, order, updatedAt });
});

app.get("/api/dashboard/overview", (_request, response) => {
  const metrics = {
    collected: dashboardMetric({ table: "contents" }),
    rewritten: dashboardMetric({ table: "drafts" }),
    published: dashboardMetric({ table: "drafts", extraWhere: "AND status = ?", params: ["已发布"] }),
  };
  const scalar = sql => Number(store.database.prepare(sql).pluck().get() || 0);
  response.json({
    generatedAt: new Date().toISOString(),
    metrics,
    operations: {
      pendingRewrite: scalar("SELECT COUNT(*) FROM contents WHERE status = '待处理'"),
      pendingReview: scalar("SELECT COUNT(*) FROM drafts WHERE status = '待审核'"),
      pendingPublish: scalar("SELECT COUNT(*) FROM drafts WHERE status IN ('审核通过', '待发布')"),
      failed: scalar("SELECT COUNT(*) FROM ai_generation_jobs WHERE status = 'failed'")
        + scalar("SELECT COUNT(*) FROM draft_publications WHERE status = 'failed'"),
      activePublishingAccounts: scalar("SELECT COUNT(*) FROM publishing_accounts"),
      authorizationAttention: scalar("SELECT COUNT(*) FROM publishing_accounts WHERE state_cookie_count = 0"),
    },
  });
});

app.get("/api/accounts", (_request, response) => {
  const accounts = store.accounts.list();
  response.json(accounts.map(serializeAccount));
});

app.post("/api/accounts", (request, response) => {
  const { account, errors } = validateAccountPayload(request.body);

  if (account.promptId && !errors.promptId && !store.prompts.get(account.promptId)) {
    errors.promptId = "没有找到这个提示词";
  }

  if (Object.keys(errors).length > 0) {
    return response.status(400).json({ message: "账号信息不完整", errors });
  }

  const now = new Date();
  const document = { ...account, createdAt: now.toISOString(), updatedAt: now.toISOString() };
  const createdAccount = store.accounts.insert(document);

  return response.status(201).json(serializeAccount(createdAccount));
});

app.put("/api/accounts/:id", (request, response) => {
  const accountId = request.params.id;
  if (!isValidDatabaseId(accountId)) {
    return response.status(400).json({ message: "账号 ID 无效" });
  }

  const { account, errors } = validateAccountPayload(request.body);

  if (account.promptId && !errors.promptId && !store.prompts.get(account.promptId)) {
    errors.promptId = "没有找到这个提示词";
  }

  if (Object.keys(errors).length > 0) {
    return response.status(400).json({ message: "账号信息不完整", errors });
  }

  const updatedAccount = store.accounts.update(accountId, {
    ...account,
    updatedAt: new Date().toISOString(),
  });
  if (!updatedAccount) {
    return response.status(404).json({ message: "没有找到这个账号" });
  }

  return response.json(serializeAccount(updatedAccount));
});

app.delete("/api/accounts/:id", (request, response) => {
  const accountId = request.params.id;
  if (!isValidDatabaseId(accountId)) {
    return response.status(400).json({ message: "账号 ID 无效" });
  }

  if (store.jobs.getActiveForAccount(accountId)) {
    return response.status(409).json({
      message: "这个账号仍有抓取任务正在排队或运行，请先停止任务再删除",
    });
  }

  if (!store.accounts.delete(accountId, new Date().toISOString())) {
    return response.status(404).json({ message: "没有找到这个账号" });
  }

  return response.status(204).end();
});

app.get("/api/publishing-accounts", (request, response) => {
  const platform = typeof request.query?.platform === "string"
    ? request.query.platform.trim()
    : "X";
  if (!ACCOUNT_PLATFORMS.has(platform)) {
    return response.status(400).json({ message: "发布平台无效" });
  }
  return response.json(store.publishingAccounts.list(platform).map(serializePublishingAccount));
});

app.post("/api/publishing-accounts", async (request, response) => {
  const { account, normalizedState, stateCookieCount, expectedHandle, errors } =
    validatePublishingAccountPayload(request.body);
  if (Object.keys(errors).length > 0) {
    return response.status(400).json({ message: "发布账号信息不完整", errors });
  }

  let verifiedState = normalizedState;
  let verifiedCookieCount = stateCookieCount;
  try {
    const verification = await crawlerService.validateSessionState(
      account.platform,
      normalizedState,
      { expectedHandle },
    );
    verifiedState = verification.normalizedState;
    verifiedCookieCount = verification.stateCookieCount;
  } catch (error) {
    return respondToPublishingSessionError(response, error, "校验发布账号登录状态失败");
  }

  const now = new Date().toISOString();
  const createdAccount = store.publishingAccounts.insert({
    ...account,
    stateCookieCount: verifiedCookieCount,
    createdAt: now,
    updatedAt: now,
  });
  const stateFilePath = path.join(publishingStateDirectory, `${createdAccount._id}.json`);

  try {
    await writeFile(stateFilePath, `${JSON.stringify(verifiedState, null, 2)}\n`, {
      encoding: "utf8",
      mode: 0o600,
    });
  } catch (error) {
    store.publishingAccounts.delete(createdAccount._id);
    console.error("保存发布账号状态文件失败：", error);
    return response.status(500).json({ message: "状态文件保存失败，请检查 data 目录权限" });
  }

  return response.status(201).json(serializePublishingAccount(createdAccount));
});

app.post("/api/publishing-accounts/:id/state/check", async (request, response) => {
  const accountId = request.params.id;
  if (!isValidDatabaseId(accountId)) {
    return response.status(400).json({ message: "发布账号 ID 无效" });
  }
  const account = store.publishingAccounts.get(accountId);
  if (!account) {
    return response.status(404).json({ message: "没有找到这个发布账号" });
  }

  let sourceState;
  try {
    sourceState = JSON.parse(
      await readFile(path.join(publishingStateDirectory, `${accountId}.json`), "utf8"),
    );
  } catch (error) {
    const message = error?.code === "ENOENT"
      ? "没有找到这个账号的状态文件，请重新上传"
      : "已保存的状态文件无法读取，请重新上传";
    return response.status(422).json({ message, errors: { stateFile: message } });
  }

  try {
    const verification = await crawlerService.validateSessionState(
      account.platform,
      sourceState,
      { expectedHandle: normalizeXAccountHandle(account.url) },
    );
    const identitySuffix = verification.authenticatedHandle
      ? `，已确认登录账号 @${verification.authenticatedHandle}`
      : "";
    return response.json({
      valid: true,
      checkedAt: new Date().toISOString(),
      message: `状态文件有效，X 登录状态正常${identitySuffix}`,
      authenticatedHandle: verification.authenticatedHandle || null,
    });
  } catch (error) {
    return respondToPublishingSessionError(response, error, "重新检查发布账号登录状态失败");
  }
});

app.put("/api/publishing-accounts/:id/state", async (request, response) => {
  const accountId = request.params.id;
  if (!isValidDatabaseId(accountId)) {
    return response.status(400).json({ message: "发布账号 ID 无效" });
  }
  const account = store.publishingAccounts.get(accountId);
  if (!account) {
    return response.status(404).json({ message: "没有找到这个发布账号" });
  }

  const stateValidation = validatePublishingStatePayload(request.body, account.platform);
  if (Object.keys(stateValidation.errors).length > 0) {
    return response.status(400).json({
      message: "状态文件格式不正确",
      errors: stateValidation.errors,
    });
  }

  let verification;
  try {
    verification = await crawlerService.validateSessionState(
      account.platform,
      stateValidation.normalizedState,
      { expectedHandle: normalizeXAccountHandle(account.url) },
    );
  } catch (error) {
    return respondToPublishingSessionError(response, error, "校验替换状态文件失败");
  }

  const updatedAt = new Date().toISOString();
  try {
    await writeFile(
      path.join(publishingStateDirectory, `${accountId}.json`),
      `${JSON.stringify(verification.normalizedState, null, 2)}\n`,
      { encoding: "utf8", mode: 0o600 },
    );
  } catch (error) {
    console.error("替换发布账号状态文件失败：", error);
    return response.status(500).json({ message: "状态文件替换失败，请检查 data 目录权限" });
  }

  const updatedAccount = store.publishingAccounts.updateState(accountId, {
    stateFileName: stateValidation.stateFileName,
    stateCookieCount: verification.stateCookieCount,
    updatedAt,
  });
  if (!updatedAccount) {
    return response.status(404).json({ message: "没有找到这个发布账号" });
  }

  return response.json({
    account: serializePublishingAccount(updatedAccount),
    valid: true,
    checkedAt: updatedAt,
    message: verification.authenticatedHandle
      ? `状态文件已替换，已确认登录账号 @${verification.authenticatedHandle}`
      : "状态文件已替换，X 登录状态正常",
    authenticatedHandle: verification.authenticatedHandle || null,
  });
});

app.delete("/api/publishing-accounts/:id", async (request, response) => {
  const accountId = request.params.id;
  if (!isValidDatabaseId(accountId)) {
    return response.status(400).json({ message: "发布账号 ID 无效" });
  }
  const account = store.publishingAccounts.get(accountId);
  if (!account) {
    return response.status(404).json({ message: "没有找到这个发布账号" });
  }
  if (!store.publishingAccounts.delete(accountId)) {
    return response.status(404).json({ message: "没有找到这个发布账号" });
  }

  try {
    await unlink(path.join(publishingStateDirectory, `${accountId}.json`));
  } catch (error) {
    if (error?.code !== "ENOENT") {
      console.error("删除发布账号状态文件失败：", error);
    }
  }
  return response.status(204).end();
});

app.get("/api/prompts", (_request, response) => {
  response.json({
    prompts: store.prompts.list().map(serializePrompt),
    accountTypes: store.promptAccountTypes.list().map(serializePromptAccountType),
  });
});

app.delete("/api/prompt-account-types/:id", (request, response) => {
  const accountTypeId = request.params.id;
  if (!isValidDatabaseId(accountTypeId)) {
    return response.status(400).json({ message: "账号类型 ID 无效" });
  }

  const accountType = store.promptAccountTypes.get(accountTypeId);
  if (!accountType?.active) {
    return response.status(404).json({ message: "没有找到这个账号类型" });
  }
  if (!store.promptAccountTypes.archive(accountTypeId, new Date().toISOString())) {
    return response.status(404).json({ message: "没有找到这个账号类型" });
  }

  return response.json({
    accountTypes: store.promptAccountTypes.list().map(serializePromptAccountType),
  });
});

app.post("/api/prompts", (request, response) => {
  const { prompt, errors } = validatePromptPayload(request.body);

  if (prompt.accountTypeId && !errors.accountType && !store.promptAccountTypes.get(prompt.accountTypeId)) {
    errors.accountType = "没有找到这个账号类型";
  }
  if (Object.keys(errors).length > 0) {
    return response.status(400).json({ message: "提示词信息不完整", errors });
  }

  const now = new Date().toISOString();
  const createdPrompt = store.prompts.create({
    ...prompt,
    createdAt: now,
    updatedAt: now,
  });

  return response.status(201).json({
    prompt: serializePrompt(createdPrompt),
    accountTypes: store.promptAccountTypes.list().map(serializePromptAccountType),
  });
});

app.put("/api/prompts/:id", (request, response) => {
  const promptId = request.params.id;
  if (!isValidDatabaseId(promptId)) {
    return response.status(400).json({ message: "提示词 ID 无效" });
  }
  if (!store.prompts.get(promptId)) {
    return response.status(404).json({ message: "没有找到这个提示词" });
  }

  const { prompt, errors } = validatePromptPayload(request.body);
  if (prompt.accountTypeId && !errors.accountType && !store.promptAccountTypes.get(prompt.accountTypeId)) {
    errors.accountType = "没有找到这个账号类型";
  }
  if (Object.keys(errors).length > 0) {
    return response.status(400).json({ message: "提示词信息不完整", errors });
  }

  const now = new Date().toISOString();
  const updatedPrompt = store.prompts.update(promptId, {
    ...prompt,
    createdAt: now,
    updatedAt: now,
  });

  return response.json({
    prompt: serializePrompt(updatedPrompt),
    accountTypes: store.promptAccountTypes.list().map(serializePromptAccountType),
  });
});

app.patch("/api/prompts/:id/enabled", (request, response) => {
  const promptId = request.params.id;
  if (!isValidDatabaseId(promptId)) {
    return response.status(400).json({ message: "提示词 ID 无效" });
  }
  if (typeof request.body?.enabled !== "boolean") {
    return response.status(400).json({ message: "启停状态无效" });
  }

  const updatedPrompt = store.prompts.setEnabled(
    promptId,
    request.body.enabled,
    new Date().toISOString(),
  );
  if (!updatedPrompt) {
    return response.status(404).json({ message: "没有找到这个提示词" });
  }

  return response.json(serializePrompt(updatedPrompt));
});

app.delete("/api/prompts/:id", (request, response) => {
  const promptId = request.params.id;
  if (!isValidDatabaseId(promptId)) {
    return response.status(400).json({ message: "提示词 ID 无效" });
  }
  if (!store.prompts.delete(promptId)) {
    return response.status(404).json({ message: "没有找到这个提示词" });
  }
  return response.status(204).end();
});

app.get("/api/ai-settings", (_request, response) => {
  response.json(serializeAiSettings(store.aiSettings.list(), store.aiProviders.list()));
});

app.get("/api/ai-configurations", (_request, response) => {
  response.json(serializeAiConfigurations(store.aiConfigurations.list()));
});

app.post("/api/ai-configurations", (request, response) => {
  const modelName = typeof request.body?.modelName === "string" ? request.body.modelName.trim() : "";
  const modelType = AI_MODEL_TYPES.has(request.body?.modelType) ? request.body.modelType : "text";
  const apiKey = typeof request.body?.apiKey === "string" ? request.body.apiKey.trim() : "";
  const baseUrl = typeof request.body?.baseUrl === "string" ? request.body.baseUrl.trim() : "";
  if (!modelName || !apiKey || !baseUrl) {
    return response.status(400).json({ message: "请同时输入模型名称、API Key 和 Base URL" });
  }
  if (modelName.length > 160 || apiKey.length > 2_048 || baseUrl.length > 2_048) {
    return response.status(400).json({ message: "配置内容过长，请缩短后再保存" });
  }

  try {
    store.aiConfigurations.save(
      { modelName, modelType, apiKey, baseUrl },
      new Date().toISOString(),
    );
  } catch (error) {
    if (error?.code?.startsWith("SQLITE_CONSTRAINT")) {
      return response.status(409).json({ message: "相同的完整配置已经存在，请编辑已有配置的模型类型" });
    }
    throw error;
  }
  return response.status(201).json(serializeAiConfigurations(store.aiConfigurations.list()));
});

app.patch("/api/ai-configurations/:id/status", (request, response) => {
  if (!isValidDatabaseId(request.params.id)) {
    return response.status(400).json({ message: "配置 ID 无效" });
  }
  if (typeof request.body?.enabled !== "boolean") {
    return response.status(400).json({ message: "启用状态无效" });
  }
  if (!store.aiConfigurations.setEnabled(
    request.params.id,
    request.body.enabled,
    new Date().toISOString(),
  )) {
    return response.status(404).json({ message: "没有找到这项配置" });
  }
  return response.json(serializeAiConfigurations(store.aiConfigurations.list()));
});

app.put("/api/ai-configurations/:id", (request, response) => {
  if (!isValidDatabaseId(request.params.id)) {
    return response.status(400).json({ message: "配置 ID 无效" });
  }
  const modelName = typeof request.body?.modelName === "string" ? request.body.modelName.trim() : "";
  const modelType = request.body?.modelType === undefined
    ? undefined
    : AI_MODEL_TYPES.has(request.body.modelType)
      ? request.body.modelType
      : null;
  const apiKey = typeof request.body?.apiKey === "string" ? request.body.apiKey.trim() : "";
  const baseUrl = typeof request.body?.baseUrl === "string" ? request.body.baseUrl.trim() : "";
  if (!modelName || !baseUrl) {
    return response.status(400).json({ message: "请输入模型名称和 Base URL" });
  }
  if (modelType === null) {
    return response.status(400).json({ message: "模型类型无效" });
  }
  if (modelName.length > 160 || apiKey.length > 2_048 || baseUrl.length > 2_048) {
    return response.status(400).json({ message: "配置内容过长，请缩短后再保存" });
  }

  try {
    const updated = store.aiConfigurations.update(
      request.params.id,
      { modelName, modelType, apiKey, baseUrl },
      new Date().toISOString(),
    );
    if (!updated) return response.status(404).json({ message: "没有找到这项配置" });
  } catch (error) {
    if (error?.code?.startsWith("SQLITE_CONSTRAINT")) {
      return response.status(409).json({ message: "相同的完整配置已经存在" });
    }
    throw error;
  }
  return response.json(serializeAiConfigurations(store.aiConfigurations.list()));
});

app.delete("/api/ai-configurations/:id", (request, response) => {
  if (!isValidDatabaseId(request.params.id)) {
    return response.status(400).json({ message: "配置 ID 无效" });
  }
  if (!store.aiConfigurations.delete(request.params.id)) {
    return response.status(404).json({ message: "没有找到这项配置" });
  }
  return response.json(serializeAiConfigurations(store.aiConfigurations.list()));
});

app.post("/api/ai-settings/provider/options", (request, response) => {
  const alias = typeof request.body?.alias === "string" ? request.body.alias.trim() : "";
  const apiKey = typeof request.body?.apiKey === "string" ? request.body.apiKey.trim() : "";
  const baseUrl = typeof request.body?.baseUrl === "string" ? request.body.baseUrl.trim() : "";
  if (!apiKey || !baseUrl) {
    return response.status(400).json({ message: "请同时输入 API Key 和 Base URL" });
  }
  if (apiKey.length > 2_048 || baseUrl.length > 2_048) {
    return response.status(400).json({ message: "接口配置过长，请缩短后再保存" });
  }
  if (alias.length > 80) {
    return response.status(400).json({ message: "别名不能超过 80 个字符" });
  }

  store.aiProviders.saveOption(alias, apiKey, baseUrl, new Date().toISOString());
  return response.status(201).json(
    serializeAiSettings(store.aiSettings.list(), store.aiProviders.list()),
  );
});

app.patch("/api/ai-settings/provider/selection", (request, response) => {
  const optionId = typeof request.body?.optionId === "string" ? request.body.optionId : "";
  if (!isValidDatabaseId(optionId)) {
    return response.status(400).json({ message: "接口配置 ID 无效" });
  }
  const enabled = request.body?.enabled !== false;
  if (!store.aiProviders.setEnabled(optionId, enabled, new Date().toISOString())) {
    return response.status(404).json({ message: "没有找到这个接口配置" });
  }

  return response.json(serializeAiSettings(store.aiSettings.list(), store.aiProviders.list()));
});

app.put("/api/ai-settings/provider/options/:id", (request, response) => {
  if (!isValidDatabaseId(request.params.id)) {
    return response.status(400).json({ message: "接口配置 ID 无效" });
  }
  const alias = typeof request.body?.alias === "string" ? request.body.alias.trim() : "";
  const apiKey = typeof request.body?.apiKey === "string" ? request.body.apiKey.trim() : "";
  const baseUrl = typeof request.body?.baseUrl === "string" ? request.body.baseUrl.trim() : "";
  if (!baseUrl) return response.status(400).json({ message: "请输入 Base URL" });
  if (alias.length > 80 || apiKey.length > 2_048 || baseUrl.length > 2_048) {
    return response.status(400).json({ message: "接口配置过长，请缩短后再保存" });
  }

  try {
    const updated = store.aiProviders.updateOption(
      request.params.id,
      { alias, apiKey, baseUrl },
      new Date().toISOString(),
    );
    if (!updated) return response.status(404).json({ message: "没有找到这个接口配置" });
  } catch (error) {
    if (error?.code?.startsWith("SQLITE_CONSTRAINT")) {
      return response.status(409).json({ message: "相同的 API Key 与 Base URL 已经存在" });
    }
    throw error;
  }
  return response.json(serializeAiSettings(store.aiSettings.list(), store.aiProviders.list()));
});

app.delete("/api/ai-settings/provider/options/:id", (request, response) => {
  if (!isValidDatabaseId(request.params.id)) {
    return response.status(400).json({ message: "接口配置 ID 无效" });
  }
  if (!store.aiProviders.deleteOption(request.params.id, new Date().toISOString())) {
    return response.status(404).json({ message: "没有找到这个接口配置" });
  }

  return response.json(serializeAiSettings(store.aiSettings.list(), store.aiProviders.list()));
});

app.post("/api/ai-settings/:key/options", (request, response) => {
  const key = validateAiSettingKey(request.params.key);
  if (!key) return response.status(400).json({ message: "设置字段无效" });

  const value = typeof request.body?.value === "string" ? request.body.value.trim() : "";
  if (!value) return response.status(400).json({ message: "请输入要保存的设置值" });
  if (value.length > AI_SETTING_LIMITS[key]) {
    return response.status(400).json({ message: "设置值过长，请缩短后再保存" });
  }

  store.aiSettings.saveOption(key, value, new Date().toISOString());
  return response.status(201).json(
    serializeAiSettings(store.aiSettings.list(), store.aiProviders.list()),
  );
});

app.patch("/api/ai-settings/:key/selection", (request, response) => {
  const key = validateAiSettingKey(request.params.key);
  if (!key) return response.status(400).json({ message: "设置字段无效" });

  const optionId = typeof request.body?.optionId === "string" ? request.body.optionId : "";
  if (!isValidDatabaseId(optionId)) {
    return response.status(400).json({ message: "设置选项 ID 无效" });
  }
  const enabled = request.body?.enabled !== false;
  if (!store.aiSettings.setEnabled(key, optionId, enabled, new Date().toISOString())) {
    return response.status(404).json({ message: "没有找到这个设置选项" });
  }

  return response.json(serializeAiSettings(store.aiSettings.list(), store.aiProviders.list()));
});

app.put("/api/ai-settings/:key/options/:id", (request, response) => {
  const key = validateAiSettingKey(request.params.key);
  if (!key) return response.status(400).json({ message: "设置字段无效" });
  if (!isValidDatabaseId(request.params.id)) {
    return response.status(400).json({ message: "设置选项 ID 无效" });
  }
  const value = typeof request.body?.value === "string" ? request.body.value.trim() : "";
  if (!value) return response.status(400).json({ message: "请输入模型名称" });
  if (value.length > AI_SETTING_LIMITS[key]) {
    return response.status(400).json({ message: "设置值过长，请缩短后再保存" });
  }

  try {
    const updated = store.aiSettings.updateOption(
      key,
      request.params.id,
      value,
      new Date().toISOString(),
    );
    if (!updated) return response.status(404).json({ message: "没有找到这个设置选项" });
  } catch (error) {
    if (error?.code?.startsWith("SQLITE_CONSTRAINT")) {
      return response.status(409).json({ message: "这个模型名称已经存在" });
    }
    throw error;
  }
  return response.json(serializeAiSettings(store.aiSettings.list(), store.aiProviders.list()));
});

app.delete("/api/ai-settings/:key/options/:id", (request, response) => {
  const key = validateAiSettingKey(request.params.key);
  if (!key) return response.status(400).json({ message: "设置字段无效" });
  if (!isValidDatabaseId(request.params.id)) {
    return response.status(400).json({ message: "设置选项 ID 无效" });
  }
  if (!store.aiSettings.deleteOption(key, request.params.id, new Date().toISOString())) {
    return response.status(404).json({ message: "没有找到这个设置选项" });
  }

  return response.json(serializeAiSettings(store.aiSettings.list(), store.aiProviders.list()));
});

app.post("/api/ai-settings/test-connection", async (_request, response) => {
  const selectedConfiguration = store.aiConfigurations
    .list()
    .find((configuration) => configuration.selected && configuration.modelType === "text");

  if (!selectedConfiguration) {
    return response.status(400).json({ message: "请先启用一项文本模型配置" });
  }

  let endpoint;
  try {
    const baseUrl = selectedConfiguration.baseUrl.replace(/\/+$/, "");
    endpoint = new URL(`${baseUrl}/models`);
    if (!new Set(["http:", "https:"]).has(endpoint.protocol)) throw new Error("invalid protocol");
  } catch {
    return response.status(400).json({ message: "当前 Base URL 不是有效的 HTTP 地址" });
  }

  const startedAt = Date.now();
  try {
    const upstreamResponse = await fetch(endpoint, {
      method: "GET",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${selectedConfiguration.apiKey}`,
      },
      signal: AbortSignal.timeout(15_000),
    });
    const rawBody = await upstreamResponse.text();
    let payload = null;
    try {
      payload = rawBody ? JSON.parse(rawBody) : null;
    } catch {
      payload = null;
    }

    if (!upstreamResponse.ok) {
      const upstreamMessage =
        payload?.error?.message
        || payload?.message
        || rawBody.slice(0, 240)
        || `上游返回 HTTP ${upstreamResponse.status}`;
      return response.status(502).json({
        message: `连接失败：${upstreamMessage}`,
        upstreamStatus: upstreamResponse.status,
      });
    }

    const modelName = selectedConfiguration.modelName;
    const modelIds = Array.isArray(payload?.data)
      ? payload.data.map((model) => model?.id).filter(Boolean)
      : [];
    const modelAvailable = modelIds.length > 0 ? modelIds.includes(modelName) : null;
    const message = modelAvailable === false
      ? `接口连接成功，但模型列表中没有找到 ${modelName}`
      : modelAvailable === true
        ? `接口连接成功，模型 ${modelName} 可用`
        : "接口连接成功";

    return response.json({
      ok: true,
      message,
      latencyMs: Date.now() - startedAt,
      modelName,
      modelAvailable,
    });
  } catch (error) {
    const timedOut = error?.name === "TimeoutError" || error?.name === "AbortError";
    return response.status(502).json({
      message: timedOut ? "连接超时，请检查 Base URL 或网络" : `连接失败：${error.message}`,
    });
  }
});

crawlerService.registerRoutes(app);
aiGenerationService.registerRoutes(app);

app.use("/api", (_request, response) => {
  response.status(404).json({ message: "接口不存在" });
});

if (existsSync(uiDirectory)) {
  app.use(
    express.static(uiDirectory, {
      index: false,
      maxAge: 0,
      setHeaders(response, filePath) {
        const fileName = path.basename(filePath);
        if (/[-.][A-Za-z0-9_-]{8,}\.(?:js|css)$/.test(fileName)) {
          response.setHeader("Cache-Control", "public, max-age=31536000, immutable");
        } else if (/\.(?:png|jpe?g|gif|webp|svg|ico)$/i.test(fileName)) {
          response.setHeader("Cache-Control", "public, max-age=86400");
        }
      },
    }),
  );

  app.use((request, response, next) => {
    if (request.method === "GET" && request.accepts("html")) {
      return response.sendFile(path.join(uiDirectory, "index.html"));
    }
    return next();
  });
}

app.use((error, _request, response, _next) => {
  console.error(error);
  response.status(500).json({ message: "服务器暂时无法处理请求，请稍后重试" });
});

server.listen(port, host, () => {
  const accessHost = host === "::" ? "0.0.0.0" : host;
  if (developmentMode) {
    console.log(`FlexibleFox 开发服务已启动：http://${accessHost}:${port}`);
    console.log("页面与 API 使用同一端口，无需转发。");
  } else {
    console.log(`FlexibleFox 已启动：http://${accessHost}:${port}`);
  }
  console.log(`SQLite 数据库：${store.path}`);
  crawlerService.start();
  aiGenerationService.start();
});

let shuttingDown = false;

async function shutdown(signal) {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`收到 ${signal}，正在安全关闭服务……`);

  const forceExitTimer = setTimeout(() => {
    console.error("安全关闭超时，正在强制断开剩余连接。");
    server.closeAllConnections?.();
    store.close();
    process.exit(1);
  }, 10_000);
  forceExitTimer.unref?.();

  try {
    await publishingService.stop();
  } catch (error) {
    console.error("停止发布服务失败：", error);
  }
  try {
    await crawlerService.stop();
  } catch (error) {
    console.error("停止爬虫服务失败：", error);
  }
  try {
    await aiGenerationService.stop();
  } catch (error) {
    console.error("停止 AI 生成服务失败：", error);
  }

  server.closeIdleConnections?.();
  server.close((error) => {
    clearTimeout(forceExitTimer);
    store.close();
    if (error) {
      console.error("关闭 HTTP 服务失败：", error);
      process.exit(1);
    }
    console.log("FlexibleFox 已安全关闭。");
    process.exit(0);
  });
}

process.once("SIGINT", () => void shutdown("SIGINT"));
process.once("SIGTERM", () => void shutdown("SIGTERM"));
