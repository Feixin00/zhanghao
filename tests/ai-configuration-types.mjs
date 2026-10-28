import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import Database from "better-sqlite3";
import { openSqliteStore } from "../server/sqlite-store.js";

const temporaryDirectory = mkdtempSync(path.join(tmpdir(), "flexiblefox-ai-types-"));
const databaseFile = path.join(temporaryDirectory, "legacy.sqlite");
const timestamp = "2026-09-04T00:00:00.000Z";

const legacyDatabase = new Database(databaseFile);
legacyDatabase.exec(`
  CREATE TABLE contents (
    id TEXT PRIMARY KEY,
    account_id TEXT,
    account_name TEXT NOT NULL,
    account_region TEXT NOT NULL DEFAULT '国外',
    platform TEXT NOT NULL,
    platform_post_id TEXT NOT NULL,
    source_url TEXT NOT NULL,
    author_handle TEXT NOT NULL DEFAULT '',
    author_name TEXT NOT NULL DEFAULT '',
    text TEXT NOT NULL DEFAULT '',
    image_urls TEXT NOT NULL DEFAULT '[]',
    video_urls TEXT NOT NULL DEFAULT '[]',
    video_thumbnail_urls TEXT NOT NULL DEFAULT '[]',
    link_cards TEXT NOT NULL DEFAULT '[]',
    published_at TEXT,
    status TEXT NOT NULL DEFAULT '待处理',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    UNIQUE(platform, platform_post_id)
  );
  CREATE TABLE ai_configurations (
    id TEXT PRIMARY KEY,
    model_name TEXT NOT NULL,
    api_key TEXT NOT NULL,
    base_url TEXT NOT NULL,
    is_selected INTEGER NOT NULL DEFAULT 0 CHECK (is_selected IN (0, 1)),
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    UNIQUE(model_name, api_key, base_url)
  );
  CREATE TABLE ai_generation_jobs (
    id TEXT PRIMARY KEY,
    content_id TEXT NOT NULL,
    draft_id TEXT,
    account_id TEXT,
    prompt_id TEXT,
    ai_configuration_id TEXT,
    status TEXT NOT NULL DEFAULT 'queued',
    stage TEXT NOT NULL DEFAULT 'queued',
    progress INTEGER NOT NULL DEFAULT 0,
    message TEXT NOT NULL DEFAULT '',
    attempt_count INTEGER NOT NULL DEFAULT 0,
    max_attempts INTEGER NOT NULL DEFAULT 3,
    error_code TEXT NOT NULL DEFAULT '',
    error_message TEXT NOT NULL DEFAULT '',
    source_snapshot_json TEXT NOT NULL DEFAULT '{}',
    account_snapshot_json TEXT NOT NULL DEFAULT '{}',
    prompt_snapshot_json TEXT NOT NULL DEFAULT '{}',
    ai_snapshot_json TEXT NOT NULL DEFAULT '{}',
    next_retry_at TEXT,
    started_at TEXT,
    completed_at TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );
  CREATE UNIQUE INDEX idx_ai_configurations_selected
    ON ai_configurations(is_selected)
    WHERE is_selected = 1;
  INSERT INTO ai_configurations (
    id, model_name, api_key, base_url, is_selected, created_at, updated_at
  ) VALUES (
    'legacy-text', 'legacy-text-model', 'sk-legacy', 'https://text.example/v1', 1,
    '${timestamp}', '${timestamp}'
  );
  PRAGMA user_version = 15;
`);
legacyDatabase.close();

let store;
try {
  store = openSqliteStore(databaseFile);
  assert.equal(store.schemaVersion, 22, "数据库没有迁移到结构版本 22");
  assert.equal(
    store.database.pragma("table_info(contents)").some((column) => column.name === "prompt_id"),
    true,
    "旧内容表没有增加帖子提示词字段",
  );
  assert.equal(
    store.database.pragma("table_info(ai_generation_jobs)")
      .some((column) => column.name === "revision_context_json"),
    true,
    "旧生成任务表没有增加调整方向上下文字段",
  );

  let configurations = store.aiConfigurations.list();
  assert.equal(configurations[0].modelType, "text", "旧配置没有默认迁移为文本模型");
  assert.equal(configurations[0].selected, true, "旧配置的启用状态没有保留");

  const image = store.aiConfigurations.save({
    modelName: "image-model",
    modelType: "image",
    apiKey: "sk-image",
    baseUrl: "https://image.example/v1",
  }, timestamp);
  assert.equal(image.selected, true, "图像模型没有启用");

  configurations = store.aiConfigurations.list();
  assert.equal(
    configurations.find((item) => item._id === "legacy-text")?.selected,
    true,
    "启用图像模型时不应停用文本模型",
  );

  const secondText = store.aiConfigurations.save({
    modelName: "second-text-model",
    modelType: "text",
    apiKey: "sk-text-2",
    baseUrl: "https://text-2.example/v1",
  }, timestamp);
  configurations = store.aiConfigurations.list();
  assert.equal(secondText.selected, true, "第二个文本模型没有启用");
  assert.equal(
    configurations.find((item) => item._id === "legacy-text")?.selected,
    false,
    "同类型的新文本模型启用后，旧文本模型仍然处于启用状态",
  );
  assert.equal(
    configurations.find((item) => item._id === image._id)?.selected,
    true,
    "切换文本模型不应停用图像模型",
  );

  store.aiConfigurations.setEnabled("legacy-text", true, timestamp);
  configurations = store.aiConfigurations.list();
  assert.equal(
    configurations.filter((item) => item.modelType === "text" && item.selected).length,
    1,
    "文本模型只能同时启用一个",
  );
  assert.equal(
    configurations.filter((item) => item.modelType === "image" && item.selected).length,
    1,
    "图像模型应能与文本模型同时启用",
  );

  const changedType = store.aiConfigurations.update("legacy-text", {
    modelName: "legacy-text-model",
    modelType: "image",
    apiKey: "",
    baseUrl: "https://text.example/v1",
  }, timestamp);
  configurations = store.aiConfigurations.list();
  assert.equal(changedType.modelType, "image", "编辑配置时没有保存新的模型类型");
  assert.equal(changedType.selected, true, "修改已启用配置的类型后没有保留启用状态");
  assert.equal(
    configurations.filter((item) => item.modelType === "image" && item.selected).length,
    1,
    "修改已启用配置的类型后，目标类型出现了多个启用项",
  );

  console.log("AI 配置类型迁移与独立启用测试通过");
} finally {
  store?.close();
  try {
    rmSync(temporaryDirectory, {
      recursive: true,
      force: true,
      maxRetries: 5,
      retryDelay: 100,
    });
  } catch (cleanupError) {
    if (cleanupError?.code !== "EPERM") throw cleanupError;
  }
}
