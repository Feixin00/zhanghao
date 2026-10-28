async function apiRequest(path, options = {}) {
  const response = await fetch(path, {
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

export function getPromptLibrary() {
  return apiRequest("/api/prompts");
}

export function deletePromptAccountType(id) {
  return apiRequest(`/api/prompt-account-types/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
}

export function createPrompt(prompt) {
  return apiRequest("/api/prompts", {
    method: "POST",
    body: JSON.stringify(prompt),
  });
}

export function updatePrompt(id, prompt) {
  return apiRequest(`/api/prompts/${encodeURIComponent(id)}`, {
    method: "PUT",
    body: JSON.stringify(prompt),
  });
}

export function setPromptEnabled(id, enabled) {
  return apiRequest(`/api/prompts/${encodeURIComponent(id)}/enabled`, {
    method: "PATCH",
    body: JSON.stringify({ enabled }),
  });
}

export function deletePrompt(id) {
  return apiRequest(`/api/prompts/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
}
