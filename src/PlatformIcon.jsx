import "./platform-icon.css";

const PLATFORM_ICONS = {
  X: { src: "/assets/platform-icons/x.svg", key: "x" },
  Reddit: { src: "/assets/platform-icons/reddit.svg", key: "reddit" },
  "抖音": { src: "/assets/platform-icons/tiktok.svg", key: "tiktok" },
  TikTok: { src: "/assets/platform-icons/tiktok.svg", key: "tiktok" },
  YouTube: { src: "/assets/platform-icons/youtube.svg", key: "youtube" },
  "小红书": { src: "/assets/platform-icons/xiaohongshu.png", key: "xiaohongshu" },
  "微博": { src: "/assets/platform-icons/weibo.png", key: "weibo" },
};

export default function PlatformIcon({ platform, className = "", fallback = null }) {
  const icon = PLATFORM_ICONS[platform];
  if (!icon) return fallback;

  return (
    <img
      src={icon.src}
      alt=""
      aria-hidden="true"
      draggable="false"
      className={`platform-icon is-${icon.key} ${className}`.trim()}
    />
  );
}
