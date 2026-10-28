const SHORT_LINK_HOSTS = new Set(["t.co"]);

function normalizeHttpUrl(value) {
  const text = String(value || "").trim();
  if (!text) return "";
  try {
    const parsed = new URL(text);
    return parsed.protocol === "http:" || parsed.protocol === "https:" ? parsed.href : "";
  } catch {
    return "";
  }
}

function urlHost(value) {
  try {
    return new URL(value).hostname.toLocaleLowerCase().replace(/^www\./, "");
  } catch {
    return "";
  }
}

function displayHost(card) {
  const statedDomain = String(card?.domain || "")
    .trim()
    .toLocaleLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .split(/[/?#]/, 1)[0];
  return statedDomain || urlHost(card?.url);
}

function isShortLink(value) {
  return SHORT_LINK_HOSTS.has(urlHost(value));
}

function comparableUrl(value) {
  try {
    const parsed = new URL(value);
    parsed.hash = "";
    parsed.hostname = parsed.hostname.toLocaleLowerCase();
    if (parsed.pathname !== "/") parsed.pathname = parsed.pathname.replace(/\/+$/, "");
    return parsed.href;
  } catch {
    return String(value || "").trim();
  }
}

function cardScore(card) {
  return (card.title ? 2 : 0) + (card.imageUrl ? 2 : 0) + (card.domain ? 1 : 0);
}

function mergeCards(left, right) {
  const richer = cardScore(right) > cardScore(left) ? right : left;
  const other = richer === left ? right : left;
  const expanded = !isShortLink(left.url) ? left : !isShortLink(right.url) ? right : null;
  return {
    url: expanded?.url || richer.url,
    title: richer.title || other.title,
    domain: displayHost(expanded || richer) || richer.domain || other.domain,
    imageUrl: richer.imageUrl || other.imageUrl,
  };
}

function isShortAndExpandedPair(left, right) {
  if (isShortLink(left.url) === isShortLink(right.url)) return false;
  const shortCard = isShortLink(left.url) ? left : right;
  const expandedCard = shortCard === left ? right : left;
  const shortDomain = displayHost(shortCard);
  return Boolean(
    shortDomain
      && !SHORT_LINK_HOSTS.has(shortDomain)
      && shortDomain === displayHost(expandedCard),
  );
}

/**
 * 合并 X 同一外链的 t.co 富卡片与详情接口返回的展开地址。
 * 富卡片提供标题和封面，展开地址负责把用户带到最终网页。
 */
export function deduplicateLinkCards(cards) {
  const normalized = (Array.isArray(cards) ? cards : [])
    .filter((card) => card && typeof card === "object" && !Array.isArray(card))
    .map((card) => ({
      url: normalizeHttpUrl(card.url || card.href),
      title: String(card.title || card.name || "").trim(),
      domain: String(card.domain || card.site || "").trim(),
      imageUrl: normalizeHttpUrl(card.imageUrl || card.image_url || card.image),
    }))
    .filter((card) => card.url);

  const result = [];
  for (const card of normalized) {
    const exactIndex = result.findIndex(
      (existing) => comparableUrl(existing.url) === comparableUrl(card.url),
    );
    const pairIndex = exactIndex >= 0
      ? exactIndex
      : result.findIndex((existing) => isShortAndExpandedPair(existing, card));
    if (pairIndex >= 0) {
      result[pairIndex] = mergeCards(result[pairIndex], card);
    } else {
      result.push(card);
    }
  }
  return result;
}
