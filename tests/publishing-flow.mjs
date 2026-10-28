import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, writeFile, rm } from "node:fs/promises";
import sharp from "sharp";
import os from "node:os";
import path from "node:path";
import express from "express";
import { openSqliteStore } from "../server/sqlite-store.js";
import { createPublishingService } from "../server/publishing-service.js";

const directory = await mkdtemp(path.join(os.tmpdir(), "flexiblefox-publish-test-"));
const store = openSqliteStore(path.join(directory, "data", "test.sqlite"));
const db = store.database;
const now = new Date().toISOString();
let calls = 0, release, mode = "success";
const service = createPublishingService({ store, projectRoot: directory, runner: async (payload, onClick) => {
  calls++;
  assert.equal(payload.expectedHandle, "publisher");
  assert.ok(payload.state.startsWith(directory));
  assert.ok(payload.profileDir.startsWith(directory));
  if (mode === "success") {
    assert.equal(payload.images.length, 1);
    assert.ok(payload.images[0].includes("publishing-tmp"));
    assert.deepEqual(await readFile(payload.images[0]), await readFile(path.join(directory, "data", "draft-media", "test.png")));
  }
  if (mode === "preflight") throw Error("identity mismatch");
  onClick();
  if (mode === "unknown") throw Error("verification failed");
  await new Promise((resolve) => { release = resolve; });
  return { status: "published_verified", profileVerification: { verified: true, url: "https://x.com/publisher/status/123" } };
} });
for (const id of ["source-a", "source-b"]) db.prepare("INSERT INTO accounts (id,name,url,type,platform,region,details,created_at,updated_at) VALUES (?,?,'source','新闻','X','国外','',?,?)").run(id,id,now,now);
for (const id of ["pub-a", "pub-b"]) db.prepare("INSERT INTO publishing_accounts VALUES (?,?,'https://x.com/publisher','新闻','X','国外','state.json',2,?,?)").run(id,id,now,now);
for (const id of ["a", "b", "c", "d"]) {
  db.prepare("INSERT INTO contents (id,account_id,account_name,account_region,platform,platform_post_id,source_url,author_handle,author_name,text,image_urls,video_urls,link_cards,published_at,status,created_at,updated_at) VALUES (?,'source-a','Source','国外','X',?,'url','source','Source','text','[]','[]','[]',?,'已处理',?,?)").run(id,id,now,now,now);
  db.prepare("INSERT INTO drafts (id,source_content_id,account_id,title,body,created_at,updated_at) VALUES (?,?,'source-a','Title','Body',?,?)").run(id,id,now,now);
}
await mkdir(path.join(directory,"data","publishing-account-states"), {recursive:true});
await writeFile(path.join(directory,"data","publishing-account-states","pub-a.json"), "{}");
await mkdir(path.join(directory, "data", "draft-media"), { recursive: true });
const mediaPath = path.join(directory, "data", "draft-media", "test.png");
await sharp({ create: { width: 32, height: 32, channels: 3, background: "#8899aa" } }).png().toFile(mediaPath);
db.prepare("INSERT INTO draft_media (id,draft_id,source_url,local_path,download_status,created_at,updated_at) VALUES ('test-image','a','',?,'ready',?,?)").run(mediaPath,now,now);
const app = express(); app.use(express.json()); service.registerRoutes(app);
const server = app.listen(0,"127.0.0.1"); await new Promise((resolve) => server.once("listening",resolve));
const base = `http://127.0.0.1:${server.address().port}`;
const request = (url, method="GET", body) => fetch(base+url,{method,headers:{"content-type":"application/json"},body:body?JSON.stringify(body):undefined});
const wait = async (predicate) => { for(let i=0;i<100;i++){ if(predicate())return; await new Promise((r)=>setTimeout(r,20)); } throw Error("timeout"); };
try {
  assert.equal((await request("/api/drafts/a/publish-preview")).status,409);
  assert.equal((await request("/api/publishing-accounts/pub-a/sources","PUT",{sourceAccountIds:["source-a","source-b"]})).status,200);
  assert.equal((await request("/api/publishing-accounts/pub-b/sources","PUT",{sourceAccountIds:["source-a"]})).status,409);
  assert.equal((await request("/api/publishing-accounts/pub-a/sources","PUT",{sourceAccountIds:["missing"]})).status,400);
  assert.equal(db.prepare("SELECT count(*) FROM publishing_account_sources").pluck().get(),2);
  const preview = await (await request("/api/drafts/a/publish-preview")).json();
  assert.equal(preview.accountId,"pub-a"); assert.equal(preview.text,"Title\n\nBody");
  assert.equal((await request("/api/drafts/a/publish","POST",{...preview,fingerprint:"stale"})).status,409);
  assert.equal((await request("/api/drafts/a/publish","POST",preview)).status,202);
  await wait(()=>Boolean(release));
  assert.equal((await request("/api/drafts/a/publish","POST",preview)).status,409);
  assert.equal((await request("/api/publishing-accounts/pub-a","DELETE")).status,409);
  assert.equal((await request("/api/drafts/a","DELETE")).status,409);
  const previewB = await (await request("/api/drafts/b/publish-preview")).json();
  assert.equal((await request("/api/drafts/b/publish","POST",previewB)).status,409);
  release(); await wait(()=>db.prepare("SELECT status FROM draft_publications WHERE draft_id='a'").pluck().get()==="published");
  assert.equal(db.prepare("SELECT status FROM drafts WHERE id='a'").pluck().get(),"已发布");
  assert.equal((await request("/api/drafts/a/publish","POST",preview)).status,409);
  mode="unknown";
  assert.equal((await request("/api/drafts/b/publish","POST",previewB)).status,202);
  await wait(()=>db.prepare("SELECT status FROM draft_publications WHERE draft_id='b'").pluck().get()==="unknown");
  assert.equal((await request("/api/drafts/b/publish","POST",previewB)).status,409);
  mode="preflight";
  const previewC = await (await request("/api/drafts/c/publish-preview")).json();
  assert.equal((await request("/api/drafts/c/publish","POST",previewC)).status,202);
  await wait(()=>db.prepare("SELECT status FROM draft_publications WHERE draft_id='c'").pluck().get()==="failed");
  db.prepare("UPDATE drafts SET body=? WHERE id='d'").run("长".repeat(281));
  assert.equal((await request("/api/drafts/d/publish-preview")).status,409);
  assert.equal(calls,3);
  assert.equal((await request('/api/drafts/b/publication/allow-retry','POST',{})).status,400);
  assert.equal((await request('/api/drafts/a/publication/allow-retry','POST',{confirmedNotPublished:true})).status,409);
  assert.equal((await request('/api/drafts/b/publication/allow-retry','POST',{confirmedNotPublished:true})).status,200);
  assert.equal(db.prepare("SELECT status FROM draft_publications WHERE draft_id='b'").pluck().get(),'failed');
  assert.equal(calls,3, '解锁不能发帖');
  console.log(JSON.stringify({ok:true,ownership:true,confirmation:true,duplicatesBlocked:true,unknownBlocked:true,preflightFailure:true}));
} finally {
  await new Promise((resolve)=>server.close(resolve));
  store.close();
  await rm(directory,{recursive:true,force:true});
}
