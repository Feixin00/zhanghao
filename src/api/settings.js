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
    throw error;
  }

  return payload;
}

export function getAiSettings() {
  return apiRequest("/api/ai-settings");
}

export function addAiSettingOption(key, value) {
  return apiRequest(`/api/ai-settings/${encodeURIComponent(key)}/options`, {
    method: "POST",
    body: JSON.stringify({ value }),
  });
}

export function selectAiSettingOption(key, optionId, enabled = true) {
  return apiRequest(`/api/ai-settings/${encodeURIComponent(key)}/selection`, {
    method: "PATCH",
    body: JSON.stringify({ optionId, enabled }),
  });
}

export function updateAiSettingOption(key, optionId, value) {
  return apiRequest(
    `/api/ai-settings/${encodeURIComponent(key)}/options/${encodeURIComponent(optionId)}`,
    { method: "PUT", body: JSON.stringify({ value }) },
  );
}

export function deleteAiSettingOption(key, optionId) {
  return apiRequest(
    `/api/ai-settings/${encodeURIComponent(key)}/options/${encodeURIComponent(optionId)}`,
    { method: "DELETE" },
  );
}

export function addAiProviderOption(alias, apiKey, baseUrl) {
  return apiRequest("/api/ai-settings/provider/options", {
    method: "POST",
    body: JSON.stringify({ alias, apiKey, baseUrl }),
  });
}

export function selectAiProviderOption(optionId, enabled = true) {
  return apiRequest("/api/ai-settings/provider/selection", {
    method: "PATCH",
    body: JSON.stringify({ optionId, enabled }),
  });
}

export function updateAiProviderOption(optionId, values) {
  return apiRequest(`/api/ai-settings/provider/options/${encodeURIComponent(optionId)}`, {
    method: "PUT",
    body: JSON.stringify(values),
  });
}

export function deleteAiProviderOption(optionId) {
  return apiRequest(`/api/ai-settings/provider/options/${encodeURIComponent(optionId)}`, {
    method: "DELETE",
  });
}

export function testAiConnection() {
  return apiRequest("/api/ai-settings/test-connection", {
    method: "POST",
  });
}

export function getAiConfigurations() {
  return apiRequest("/api/ai-configurations");
}

export function addAiConfiguration(values) {
  return apiRequest("/api/ai-configurations", {
    method: "POST",
    body: JSON.stringify(values),
  });
}

export function setAiConfigurationEnabled(id, enabled) {
  return apiRequest(`/api/ai-configurations/${encodeURIComponent(id)}/status`, {
    method: "PATCH",
    body: JSON.stringify({ enabled }),
  });
}

export function updateAiConfiguration(id, values) {
  return apiRequest(`/api/ai-configurations/${encodeURIComponent(id)}`, {
    method: "PUT",
    body: JSON.stringify(values),
  });
}

export function deleteAiConfiguration(id) {
  return apiRequest(`/api/ai-configurations/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
}
