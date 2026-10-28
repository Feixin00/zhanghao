async function apiRequest(path, options = {}) {
  const response = await fetch(path, {
    cache: "no-store",
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  });
  const isJson = response.headers.get("content-type")?.includes("application/json");
  const payload = isJson ? await response.json() : null;

  if (!response.ok) {
    const error = new Error(payload?.message || "请求失败，请稍后重试");
    error.status = response.status;
    error.details = payload?.errors;
    throw error;
  }
  return payload;
}

export function getCrawlSettings() {
  return apiRequest("/api/crawl-settings");
}

export function saveCrawlSettings(accountId, settings) {
  return apiRequest(`/api/crawl-settings/${encodeURIComponent(accountId)}`, {
    method: "PUT",
    body: JSON.stringify(settings),
  });
}

export function updateContentPrompt(contentId, promptId) {
  return apiRequest(`/api/contents/${encodeURIComponent(contentId)}/prompt`, {
    method: "PATCH",
    body: JSON.stringify({ promptId }),
  });
}

export function updateContentImageGeneration(contentId, enabled, options = {}) {
  return apiRequest(`/api/contents/${encodeURIComponent(contentId)}/image-generation`, {
    method: "PATCH",
    body: JSON.stringify({ enabled, ...options }),
  });
}

export function startCrawl(accountIds) {
  return apiRequest("/api/crawl-jobs", {
    method: "POST",
    body: JSON.stringify({ accountIds }),
  });
}

export function getCrawlJobs(limit = 100) {
  const safeLimit = Math.min(Math.max(Number(limit) || 20, 1), 100);
  return apiRequest(`/api/crawl-jobs?limit=${safeLimit}`);
}

export function deleteCrawlJob(jobId) {
  return apiRequest(`/api/crawl-jobs/${encodeURIComponent(jobId)}`, {
    method: "DELETE",
  });
}

export function cancelCrawlJob(jobId) {
  return apiRequest(`/api/crawl-jobs/${encodeURIComponent(jobId)}/cancel`, {
    method: "POST",
  });
}

export function getCrawlerPlatforms() {
  return apiRequest("/api/crawler/platforms");
}

export function getCrawlerSession(platform = "X") {
  return apiRequest(`/api/crawler/session?platform=${encodeURIComponent(platform)}`);
}

export function checkCrawlerSession(platform = "X") {
  return apiRequest("/api/crawler/session/check", {
    method: "POST",
    body: JSON.stringify({ platform }),
  });
}

export async function uploadCrawlerSessionState(file, platform = "X") {
  if (!file) throw new Error("请选择登录状态文件");
  if (file.size > 512 * 1024) throw new Error("登录状态文件不能超过 512KB");

  let state;
  try {
    state = JSON.parse(await file.text());
  } catch {
    throw new Error("登录状态文件不是有效的 JSON");
  }

  return apiRequest("/api/crawler/session/state", {
    method: "POST",
    body: JSON.stringify({ platform, fileName: file.name, state }),
  });
}

export function getContents(filters = {}) {
  const search = new URLSearchParams();
  if (filters.status && filters.status !== "all") search.set("status", filters.status);
  if (filters.accountId && filters.accountId !== "all") search.set("accountId", filters.accountId);
  if (filters.hasImages) search.set("hasImages", "true");
  search.set("sort", filters.sortByPublishedAt ? "published" : "crawled");
  const query = search.toString();
  return apiRequest(`/api/contents${query ? `?${query}` : ""}`);
}

export function deleteContent(contentId) {
  return apiRequest(`/api/contents/${encodeURIComponent(contentId)}`, {
    method: "DELETE",
  });
}

export function createGenerationJobs(contentIds) {
  return apiRequest("/api/ai-generation-jobs", {
    method: "POST",
    body: JSON.stringify({ contentIds }),
  });
}

export function createPendingGenerationJobs() {
  return apiRequest("/api/ai-generation-jobs/pending", {
    method: "POST",
  });
}

export function getGenerationJobs(limit = 50) {
  const safeLimit = Math.min(Math.max(Number(limit) || 50, 1), 100);
  return apiRequest(`/api/ai-generation-jobs?limit=${safeLimit}`);
}

export function getGenerationStatus() {
  return apiRequest("/api/ai-generation-status");
}

export function retryGenerationJob(jobId) {
  return apiRequest(`/api/ai-generation-jobs/${encodeURIComponent(jobId)}/retry`, {
    method: "POST",
  });
}

export function deleteGenerationJob(jobId) {
  return apiRequest(`/api/ai-generation-jobs/${encodeURIComponent(jobId)}`, { method: "DELETE" });
}

export function cancelGenerationJob(jobId) {
  return apiRequest(`/api/ai-generation-jobs/${encodeURIComponent(jobId)}/cancel`, {
    method: "POST",
  });
}

export function getDrafts() {
  return apiRequest("/api/drafts");
}

export function getDraft(draftId) {
  return apiRequest(`/api/drafts/${encodeURIComponent(draftId)}`);
}

export function updateDraft(draftId, values) {
  return apiRequest(`/api/drafts/${encodeURIComponent(draftId)}`, {
    method: "PATCH",
    body: JSON.stringify(values),
  });
}

export function regenerateDraft(draftId, direction = "") {
  return apiRequest(`/api/drafts/${encodeURIComponent(draftId)}/regenerate`, {
    method: "POST",
    body: JSON.stringify({ direction }),
  });
}

export function updateDraftMedia(draftId, media) {
  return apiRequest(`/api/drafts/${encodeURIComponent(draftId)}/media`, {
    method: "PATCH",
    body: JSON.stringify({ media }),
  });
}

export function deleteDraft(draftId) {
  return apiRequest(`/api/drafts/${encodeURIComponent(draftId)}`, {
    method: "DELETE",
  });
}

export function deleteDraftMedia(mediaId) {
  return apiRequest(`/api/draft-media/${encodeURIComponent(mediaId)}`, { method: "DELETE" });
}

export function generateDraftImage(mediaId, mode, direction = "") {
  return apiRequest(`/api/draft-media/${encodeURIComponent(mediaId)}/generate`, {
    method: "POST",
    body: JSON.stringify({ mode, direction }),
  });
}
