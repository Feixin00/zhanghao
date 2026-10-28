import { existsSync } from "node:fs";
import path from "node:path";
import { deduplicateLinkCards } from "../shared/link-cards.js";

const ADAPTER_DEFINITIONS = Object.freeze([
  {
    platform: "X",
    key: "x",
    label: "X / Twitter",
    crawlerDirectory: "推特爬虫",
    stateFileName: "x-login-state.json",
    profileDirectoryName: "browser-profile",
    sessionRequired: true,
    cookieDomains: ["x.com", "twitter.com"],
    originalOnlyFlag: true,
    expandAuthorThreadsFlag: true,
  },
  {
    platform: "Reddit",
    key: "reddit",
    label: "Reddit",
    crawlerDirectory: "Reddit爬虫",
    stateFileName: "reddit-login-state.json",
    profileDirectoryName: "reddit-browser-profile",
    sessionRequired: false,
    cookieDomains: ["reddit.com"],
  },
  {
    platform: "抖音",
    key: "douyin",
    label: "抖音",
    crawlerDirectory: "抖音爬虫",
    stateFileName: "douyin-login-state.json",
    profileDirectoryName: "douyin-browser-profile",
    sessionRequired: true,
    cookieDomains: ["douyin.com"],
  },
  {
    platform: "小红书",
    key: "xiaohongshu",
    label: "小红书",
    crawlerDirectory: "小红书爬虫",
    stateFileName: "xiaohongshu-login-state.json",
    profileDirectoryName: "xiaohongshu-browser-profile",
    sessionRequired: true,
    cookieDomains: ["xiaohongshu.com"],
  },
  {
    platform: "微博",
    key: "weibo",
    label: "微博",
    crawlerDirectory: "微博爬虫",
    stateFileName: "weibo-login-state.json",
    profileDirectoryName: "weibo-browser-profile",
    sessionRequired: true,
    cookieDomains: ["weibo.com", "weibo.cn"],
  },
]);

function xAccountTarget(account) {
  const value = String(account?.url || "").trim();
  const match = value.match(/(?:https?:\/\/)?(?:www\.)?(?:x\.com|twitter\.com)\/([^/?#]+)/i);
  if (match?.[1]) return match[1].replace(/^@/, "");
  return value.replace(/^@/, "").split(/[/?#]/, 1)[0];
}

function genericAccountTarget(account) {
  return String(account?.url || "").trim();
}

function firstPostArray(payload, target) {
  if (Array.isArray(payload)) return payload;
  if (!payload || typeof payload !== "object") return [];
  if (Array.isArray(payload[target])) return payload[target];
  return Object.values(payload).find(Array.isArray) || [];
}

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

function normalizeLinkCards(post) {
  const candidates = Array.isArray(post.link_cards)
    ? post.link_cards
    : Array.isArray(post.linkCards)
      ? post.linkCards
      : [];
  return deduplicateLinkCards(candidates
    .filter((card) => card && typeof card === "object" && !Array.isArray(card))
    .map((card) => ({
      url: normalizeHttpUrl(card.url || card.href),
      title: String(card.title || card.name || "").trim(),
      domain: String(card.domain || card.site || "").trim(),
      imageUrl: normalizeHttpUrl(card.image_url || card.imageUrl || card.image),
    }))
    .filter((card) => card.url));
}

function normalizePost(adapter, post, account) {
  if (!post || typeof post !== "object") return null;
  const platformPostId = post.platform_post_id ?? post.post_id ?? post.tweet_id ?? post.id;
  if (platformPostId === undefined || platformPostId === null || String(platformPostId).trim() === "") {
    return null;
  }

  const sourceUrl = post.source_url || post.post_url || post.tweet_url || post.url || "";
  const authorHandle = post.author_handle || post.author_id || post.author || "";
  return {
    platform: adapter.platform,
    platformPostId: String(platformPostId),
    sourceUrl: String(sourceUrl || account?.url || ""),
    authorHandle: String(authorHandle || ""),
    authorName: String(post.author_name || post.nickname || account?.name || ""),
    text: String(post.content || post.text || post.title || ""),
    imageUrls: Array.isArray(post.image_urls) ? post.image_urls : Array.isArray(post.images) ? post.images : [],
    videoUrls: Array.isArray(post.video_urls) ? post.video_urls : Array.isArray(post.videos) ? post.videos : [],
    videoThumbnailUrls: Array.isArray(post.video_thumbnail_urls)
      ? post.video_thumbnail_urls
      : Array.isArray(post.videoThumbnailUrls)
        ? post.videoThumbnailUrls
        : [],
    linkCards: normalizeLinkCards(post),
    publishedAt: post.published_at || post.created_at || post.createdAt || null,
    isReply: post.is_reply === true,
    isRepost: post.is_repost === true || post.is_reblog === true,
    isQuote: post.is_quote === true,
    raw: post,
  };
}

export function createCrawlerAdapterRegistry({ projectDirectory, crawlerDataDirectory }) {
  const adapters = ADAPTER_DEFINITIONS.map((definition) => {
    const directory = path.join(projectDirectory, "spider", definition.crawlerDirectory);
    const crawlerScript = path.join(directory, "crawl_with_state.py");
    const sessionScript = path.join(directory, "main.py");
    const available = existsSync(crawlerScript);
    const sessionCheckSupported = existsSync(sessionScript);
    const expectedEntry = path.join("spider", definition.crawlerDirectory, "crawl_with_state.py");
    const adapter = {
      ...definition,
      directory,
      crawlerScript,
      sessionScript,
      stateFilePath: path.join(crawlerDataDirectory, definition.stateFileName),
      profileDirectory: path.join(crawlerDataDirectory, definition.profileDirectoryName),
      available,
      sessionCheckSupported,
      expectedEntry,
      unavailableReason: available ? "" : `缺少平台爬虫入口：${expectedEntry}`,
      resolveTarget: definition.platform === "X" ? xAccountTarget : genericAccountTarget,
      extractPosts(payload, target) {
        return firstPostArray(payload, target);
      },
      normalizePost(post, account) {
        return normalizePost(adapter, post, account);
      },
      buildCrawlArguments({ target, limit, lookbackHours, outputPath }) {
        const args = [crawlerScript, target];
        if (existsSync(adapter.stateFilePath)) {
          args.push("--state", adapter.stateFilePath);
        }
        args.push(
          "--limit",
          String(limit),
          "--since-hours",
          String(lookbackHours),
          "--output",
          outputPath,
          "--profile-dir",
          adapter.profileDirectory,
        );
        if (definition.originalOnlyFlag) args.push("--original-only");
        if (definition.expandAuthorThreadsFlag) args.push("--expand-author-threads");
        return args;
      },
      buildSessionCheckArguments() {
        return [
          sessionScript,
          "--headless",
          "--profile-dir",
          adapter.profileDirectory,
          "--import-cookies",
          adapter.stateFilePath,
        ];
      },
    };
    return adapter;
  });
  const byPlatform = new Map(adapters.map((adapter) => [adapter.platform, adapter]));

  return {
    get(platform) {
      return byPlatform.get(platform) || null;
    },
    list() {
      return [...adapters];
    },
    publicList() {
      return adapters.map((adapter) => ({
        platform: adapter.platform,
        key: adapter.key,
        label: adapter.label,
        available: adapter.available,
        sessionRequired: adapter.sessionRequired,
        sessionCheckSupported: adapter.sessionCheckSupported,
        stateFileName: adapter.stateFileName,
        expectedEntry: adapter.expectedEntry,
        unavailableReason: adapter.unavailableReason,
      }));
    },
  };
}
