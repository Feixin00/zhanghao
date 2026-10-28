import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { createAiGenerationService } from "../server/ai-generation-service.js";
import { openSqliteStore } from "../server/sqlite-store.js";

const temporaryDirectory = await mkdtemp(path.join(tmpdir(), "flexiblefox-account-relations-"));
const databasePath = path.join(temporaryDirectory, "relations.sqlite");
const store = openSqliteStore(databasePath);
const timestamp = "2026-09-04T12:00:00.000Z";
let generationService;

try {
  store.database.prepare(`
    INSERT INTO prompt_account_types (id, name, created_at, updated_at)
    VALUES ('history-type', '历史内容测试', ?, ?)
  `).run(timestamp, timestamp);
  store.database.prepare(`
    INSERT INTO prompts (id, title, content, platform, account_type_id, enabled, created_at, updated_at)
    VALUES ('history-prompt', '历史提示词', '根据历史原帖生成稿件。', 'X', 'history-type', 1, ?, ?)
  `).run(timestamp, timestamp);
  store.database.prepare(`
    INSERT INTO accounts (
      id, name, url, type, platform, region, details, prompt_id, created_at, updated_at
    ) VALUES (
      'history-account', '将被删除的账号', 'https://x.com/history_owner', '历史内容测试',
      'X', '国外', '测试删除关系', 'history-prompt', ?, ?
    )
  `).run(timestamp, timestamp);
  store.database.prepare(`
    INSERT INTO contents (
      id, account_id, account_name, account_region, platform, platform_post_id,
      source_url, author_handle, author_name, text, image_urls, video_urls,
      video_thumbnail_urls, link_cards, status, created_at, updated_at
    ) VALUES (
      'history-content', 'history-account', '将被删除的账号', '国外', 'X', 'history-post',
      'https://x.com/history_owner/status/1', '@history_owner', 'History Owner',
      '删除账号后仍需保留的历史内容', '[]', '[]', '[]', '[]', '待处理', ?, ?
    )
  `).run(timestamp, timestamp);
  store.database.prepare(`
    INSERT INTO ai_configurations (
      id, model_name, model_type, api_key, base_url, is_selected, created_at, updated_at
    ) VALUES (
      'history-ai', 'mock-model', 'text', 'sk-test', 'http://127.0.0.1:1/v1', 1, ?, ?
    )
  `).run(timestamp, timestamp);

  assert.equal(store.accounts.delete("history-account", timestamp), true, "信息账号删除失败");
  assert.equal(store.accounts.get("history-account"), null, "信息账号删除后仍然存在");

  const historicalContent = store.contents.get("history-content");
  assert.ok(historicalContent, "删除信息账号时不应删除历史内容");
  assert.equal(historicalContent.accountId, null, "历史内容仍保留悬空的账号 ID");
  assert.equal(historicalContent.accountName, "将被删除的账号", "历史内容丢失账号名称快照");
  assert.equal(historicalContent.promptId, "history-prompt", "历史内容没有固化账号默认提示词");

  store.database.prepare("UPDATE contents SET generate_images = 0").run();
  generationService = createAiGenerationService({ store });
  const enqueueResult = generationService.enqueueContentIds(["history-content"]);
  assert.equal(enqueueResult.createdCount, 1, "删除账号后的历史内容无法继续生成稿件");
  const queuedJob = store.database.prepare(`
    SELECT account_id, prompt_id, status FROM ai_generation_jobs WHERE content_id = ?
  `).get("history-content");
  assert.equal(queuedJob.account_id, null, "历史内容生成任务不应继续引用已删除账号");
  assert.equal(queuedJob.prompt_id, "history-prompt", "历史内容生成任务没有使用固化的提示词");
  assert.equal(queuedJob.status, "queued", "历史内容生成任务没有正常入队");

  console.log(JSON.stringify({
    ok: true,
    historyPreserved: true,
    danglingAccountRemoved: true,
    historicalGenerationAvailable: true,
  }));
} finally {
  await generationService?.stop();
  store.close();
  await rm(temporaryDirectory, { recursive: true, force: true });
}
