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

export function getPublishingAccounts(platform = "X") {
  return apiRequest(`/api/publishing-accounts?platform=${encodeURIComponent(platform)}`);
}

export const getPublishingOwnership = () => apiRequest("/api/publishing-ownership");
export const savePublishingOwnership = (id, sourceAccountIds) => apiRequest(`/api/publishing-accounts/${encodeURIComponent(id)}/sources`, { method: "PUT", body: JSON.stringify({ sourceAccountIds }) });
export const getDraftPublications = () => apiRequest("/api/draft-publications");
export const previewDraftPublication = (id) => apiRequest(`/api/drafts/${encodeURIComponent(id)}/publish-preview`);
export const publishDraft = (id, confirmation) => apiRequest(`/api/drafts/${encodeURIComponent(id)}/publish`, { method: "POST", body: JSON.stringify(confirmation) });

async function readPublishingStateFile(stateFile) {
  if (!stateFile) throw new Error("请上传状态文件");
  if (stateFile.size > 512 * 1024) throw new Error("状态文件不能超过 512KB");

  let state;
  try {
    state = JSON.parse(await stateFile.text());
  } catch {
    throw new Error("状态文件不是有效的 JSON");
  }

  return state;
}

export async function createPublishingAccount(account, stateFile) {
  const state = await readPublishingStateFile(stateFile);

  return apiRequest("/api/publishing-accounts", {
    method: "POST",
    body: JSON.stringify({ ...account, fileName: stateFile.name, state }),
  });
}

export function checkPublishingAccountState(id) {
  return apiRequest(`/api/publishing-accounts/${encodeURIComponent(id)}/state/check`, {
    method: "POST",
  });
}

export async function replacePublishingAccountState(id, stateFile) {
  const state = await readPublishingStateFile(stateFile);
  return apiRequest(`/api/publishing-accounts/${encodeURIComponent(id)}/state`, {
    method: "PUT",
    body: JSON.stringify({ fileName: stateFile.name, state }),
  });
}

export function deletePublishingAccount(id) {
  return apiRequest(`/api/publishing-accounts/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
}

export function allowDraftPublicationRetry(id) {
  return apiRequest(`/api/drafts/${encodeURIComponent(id)}/publication/allow-retry`, {
    method: "POST",
    body: JSON.stringify({ confirmedNotPublished: true }),
  });
}
