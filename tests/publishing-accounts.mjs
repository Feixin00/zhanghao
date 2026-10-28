import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { access, mkdtemp, readFile, rm } from "node:fs/promises";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import path from "node:path";
import { openSqliteStore } from "../server/sqlite-store.js";

const projectDirectory = path.resolve(import.meta.dirname, "..");
const temporaryDirectory = await mkdtemp(path.join(tmpdir(), "flexiblefox-publishing-"));
const databaseFile = path.join(temporaryDirectory, "publishing.sqlite");
let store;
let serverProcess;

function reservePort() {
  return new Promise((resolve, reject) => {
    const server = createServer();
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const port = server.address().port;
      server.close((error) => (error ? reject(error) : resolve(port)));
    });
  });
}

async function waitForServer(url, output) {
  const deadline = Date.now() + 12_000;
  while (Date.now() < deadline) {
    if (serverProcess.exitCode !== null) {
      throw new Error(`测试服务提前退出：${output.join("")}`);
    }
    try {
      const response = await fetch(`${url}/api/health`);
      if (response.ok) return;
    } catch {
      // 服务还在启动。
    }
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  throw new Error(`等待测试服务启动超时：${output.join("")}`);
}

try {
  store = openSqliteStore(databaseFile);
  assert.equal(store.schemaVersion, 22, "数据库未升级到结构版本 22");
  assert.equal(
    store.database.pragma("table_info(publishing_accounts)").length > 0,
    true,
    "缺少发布账号数据表",
  );

  const timestamp = "2026-09-04T12:00:00.000Z";
  const account = store.publishingAccounts.insert({
    name: "X 发布测试账号",
    url: "https://x.com/publisher",
    type: "新闻/资讯/热点",
    platform: "X",
    region: "国外",
    stateFileName: "x-login-state.json",
    stateCookieCount: 2,
    createdAt: timestamp,
    updatedAt: timestamp,
  });

  assert.ok(account._id, "创建发布账号后没有生成 ID");
  assert.equal(account.stateFileName, "x-login-state.json", "状态文件名未保存");
  assert.equal(account.stateCookieCount, 2, "Cookie 数量未保存");
  const updatedAccount = store.publishingAccounts.updateState(account._id, {
    stateFileName: "replacement-state.json",
    stateCookieCount: 3,
    updatedAt: "2026-09-04T12:30:00.000Z",
  });
  assert.equal(updatedAccount.stateFileName, "replacement-state.json", "状态文件元数据更新失败");
  assert.equal(updatedAccount.stateCookieCount, 3, "替换后的 Cookie 数量未更新");
  assert.equal(store.publishingAccounts.list("X").length, 1, "发布账号列表读取失败");
  assert.equal(store.publishingAccounts.list("Reddit").length, 0, "不同平台账号没有隔离");
  assert.equal(store.publishingAccounts.delete(account._id), true, "发布账号删除失败");
  assert.equal(store.publishingAccounts.get(account._id), null, "已删除账号仍可读取");

  store.close();
  store = null;

  const port = await reservePort();
  const baseUrl = `http://127.0.0.1:${port}`;
  const output = [];
  serverProcess = spawn(process.execPath, [path.join(projectDirectory, "server/index.js")], {
    cwd: projectDirectory,
    windowsHide: true,
    env: {
      ...process.env,
      HOST: "127.0.0.1",
      PORT: String(port),
      SQLITE_PATH: databaseFile,
      PUBLISHING_SESSION_CHECK_COMMAND: process.execPath,
      PUBLISHING_SESSION_CHECK_SCRIPT: path.join(
        projectDirectory,
        "tests",
        "fixtures",
        "publishing-session-check.mjs",
      ),
    },
    stdio: ["ignore", "pipe", "pipe"],
  });
  serverProcess.stdout.on("data", (chunk) => output.push(chunk.toString("utf8")));
  serverProcess.stderr.on("data", (chunk) => output.push(chunk.toString("utf8")));
  await waitForServer(baseUrl, output);

  const incompleteResponse = await fetch(`${baseUrl}/api/publishing-accounts`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: "缺少状态文件",
      url: "https://x.com/missing_state",
      type: "新闻/资讯/热点",
    }),
  });
  assert.equal(incompleteResponse.status, 400, "缺少状态文件时不应创建发布账号");

  const expiredStateResponse = await fetch(`${baseUrl}/api/publishing-accounts`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: "失效状态测试账号",
      url: "https://x.com/expired_user",
      type: "新闻/资讯/热点",
      fileName: "expired-state.json",
      state: {
        cookies: [{
          name: "auth_token",
          value: "expired-token",
          domain: ".x.com",
          path: "/",
        }],
      },
    }),
  });
  assert.equal(expiredStateResponse.status, 422, "登录状态失效时不应创建发布账号");
  const expiredStateError = await expiredStateResponse.json();
  assert.match(expiredStateError.errors.stateFile, /已失效/, "没有返回状态文件失效原因");

  const mismatchedStateResponse = await fetch(`${baseUrl}/api/publishing-accounts`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: "账号身份不匹配测试",
      url: "https://x.com/api_publisher",
      type: "新闻/资讯/热点",
      fileName: "other-account-state.json",
      state: {
        cookies: [{
          name: "auth_token",
          value: "other-account-token",
          domain: ".x.com",
          path: "/",
        }],
      },
    }),
  });
  assert.equal(mismatchedStateResponse.status, 422, "其他账号的状态文件不应创建当前发布账号");
  const mismatchedStateError = await mismatchedStateResponse.json();
  assert.match(mismatchedStateError.errors.stateFile, /不一致/, "没有返回账号身份不匹配原因");

  const createResponse = await fetch(`${baseUrl}/api/publishing-accounts`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: "接口发布测试账号",
      url: "https://x.com/api_publisher",
      type: "新闻/资讯/热点",
      fileName: "x-login-state.json",
      state: {
        cookies: [{
          name: "auth_token",
          value: "test-token",
          domain: ".x.com",
          path: "/",
        }],
        origins: [],
      },
    }),
  });
  if (createResponse.status !== 201) {
    throw new Error(`发布账号接口创建失败：${await createResponse.text()}`);
  }
  const created = await createResponse.json();
  assert.equal(created.platform, "X", "未填写平台时应自动归入 X 发布通道");
  assert.equal(created.region, undefined, "发布账号接口不应再返回内容地区");
  assert.equal(created.stateFileName, "x-login-state.json", "接口没有返回状态文件元数据");
  assert.equal(created.state, undefined, "接口不应返回状态文件内容");

  const statePath = path.join(temporaryDirectory, "publishing-account-states", `${created.id}.json`);
  const savedState = JSON.parse(await readFile(statePath, "utf8"));
  assert.equal(savedState.cookies[0].value, "test-token", "状态文件没有按账号独立保存");

  const checkResponse = await fetch(
    `${baseUrl}/api/publishing-accounts/${created.id}/state/check`,
    { method: "POST" },
  );
  assert.equal(checkResponse.status, 200, "无法重新检查已保存的状态文件");
  const checkPayload = await checkResponse.json();
  assert.equal(checkPayload.valid, true, "有效状态文件被误判为失效");
  assert.equal(checkPayload.authenticatedHandle, "api_publisher", "状态检查没有返回已确认的账号身份");

  const failedReplacementResponse = await fetch(
    `${baseUrl}/api/publishing-accounts/${created.id}/state`,
    {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fileName: "expired-replacement.json",
        state: {
          cookies: [{
            name: "auth_token",
            value: "expired-token",
            domain: ".x.com",
            path: "/",
          }],
        },
      }),
    },
  );
  assert.equal(failedReplacementResponse.status, 422, "失效状态文件不应覆盖原文件");
  const stateAfterFailedReplacement = JSON.parse(await readFile(statePath, "utf8"));
  assert.equal(
    stateAfterFailedReplacement.cookies[0].value,
    "test-token",
    "替换校验失败后原状态文件没有保留",
  );

  const mismatchedReplacementResponse = await fetch(
    `${baseUrl}/api/publishing-accounts/${created.id}/state`,
    {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fileName: "other-account-state.json",
        state: {
          cookies: [{
            name: "auth_token",
            value: "other-account-token",
            domain: ".x.com",
            path: "/",
          }],
        },
      }),
    },
  );
  assert.equal(mismatchedReplacementResponse.status, 422, "其他账号的状态文件不应覆盖当前账号");
  const stateAfterMismatchedReplacement = JSON.parse(await readFile(statePath, "utf8"));
  assert.equal(
    stateAfterMismatchedReplacement.cookies[0].value,
    "test-token",
    "账号身份不匹配后原状态文件没有保留",
  );

  const replacementResponse = await fetch(
    `${baseUrl}/api/publishing-accounts/${created.id}/state`,
    {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fileName: "replacement-state.json",
        state: {
          cookies: [{
            name: "auth_token",
            value: "test-token",
            domain: ".x.com",
            path: "/",
          }],
        },
      }),
    },
  );
  assert.equal(replacementResponse.status, 200, "有效状态文件替换失败");
  const replacement = await replacementResponse.json();
  assert.equal(replacement.account.stateFileName, "replacement-state.json", "替换后的文件名未更新");
  assert.equal(replacement.valid, true, "替换成功后没有返回有效状态");

  const listResponse = await fetch(`${baseUrl}/api/publishing-accounts?platform=X`);
  const listed = await listResponse.json();
  assert.equal(listed.length, 1, "接口没有返回已创建的发布账号");
  assert.equal(listed[0].stateFileName, "replacement-state.json", "账号列表没有返回替换后的文件");

  const deleteResponse = await fetch(`${baseUrl}/api/publishing-accounts/${created.id}`, {
    method: "DELETE",
  });
  assert.equal(deleteResponse.status, 204, "发布账号接口删除失败");
  await assert.rejects(access(statePath), "删除发布账号时应一并删除状态文件");

  console.log(JSON.stringify({
    ok: true,
    schemaVersion: 22,
    requiredStateFile: true,
    stateCheck: true,
    accountIdentityCheck: true,
    stateReplacement: true,
  }));
} finally {
  store?.close();
  if (serverProcess && serverProcess.exitCode === null) {
    serverProcess.kill("SIGTERM");
    await new Promise((resolve) => serverProcess.once("exit", resolve));
  }
  await rm(temporaryDirectory, { recursive: true, force: true });
}
