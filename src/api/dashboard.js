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
  if (!response.ok) throw new Error(payload?.message || "仪表盘数据加载失败");
  return payload;
}

export const getDashboardOverview = () => apiRequest("/api/dashboard/overview");
export const getDashboardLayout = () => apiRequest("/api/dashboard/layout");
export const saveDashboardLayout = (layout) => apiRequest("/api/dashboard/layout", {
  method: "PUT",
  body: JSON.stringify(layout),
});
