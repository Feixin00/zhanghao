import gptImage2Sizes from "./image-sizes.json" with { type: "json" };

// VIP 按项目约定沿用 LLMS.BEST 的 GPT Image 2 尺寸规则。
const profiles = {
  "gpt-image-2": gptImage2Sizes,
  "gpt-image-2-vip": gptImage2Sizes,
};

export function getImageSizeOptions(modelName) {
  return profiles[String(modelName || "").trim().toLowerCase()] || gptImage2Sizes;
}
