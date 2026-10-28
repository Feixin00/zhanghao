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

export function getAccounts() {
  return apiRequest("/api/accounts");
}

export function createAccount(account) {
  return apiRequest("/api/accounts", {
    method: "POST",
    body: JSON.stringify(account),
  });
}

export function updateAccount(id, account) {
  return apiRequest(`/api/accounts/${encodeURIComponent(id)}`, {
    method: "PUT",
    body: JSON.stringify(account),
  });
}

export function deleteAccount(id) {
  return apiRequest(`/api/accounts/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
}
