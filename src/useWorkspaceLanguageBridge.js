import { useEffect } from "react";

// A compatibility layer for older workspace screens that predate the shared
// language setting. Newer screens should continue to use component-level copy.
const ENGLISH_UI = {
  "增长明细类型": "Growth detail type",
  "增长结果": "Growth results",
  "增长汇总": "Growth summary",
  "增长数据按内容发布时间归因；不同平台可能有 5–30 分钟同步延迟。": "Growth is attributed by publish time. Platform data may be delayed by 5–30 minutes.",
  "报告": "Report",
  "查看并导出本周增长表现": "Review and export this week’s growth performance",
  "本月至今": "Month to date",
  "导出报告": "Export report",
  "指标": "Metric",
  "数值": "Value",
  "阅读量增长": "Read growth",
  "平均互动率": "Average engagement rate",
  "产生增长的内容": "Content driving growth",
  "篇": "posts",
  "内容贡献": "Content contribution",
  "平台明细": "Platform breakdown",
  "异常变化": "Anomalies",
  "选择日期范围": "Select a date range",
  "今天 09:42": "Today 09:42",
  "昨天 18:20": "Yesterday 18:20",
  "10 月 24 日": "Oct 24",
  "10 月 23 日": "Oct 23",
  "平台与账号": "Platform and account",
  "阅读 / 曝光": "Reads / impressions",
  "新增粉丝": "New followers",
  "互动率": "Engagement rate",
  "周期变化": "Period change",
  "近期活动": "Recent activity",
  "内容": "Content",
  "平台": "Platform",
  "发布时间": "Published",
  "带来粉丝": "Followers gained",
  "增长贡献": "Growth contribution",
  "所有平台数据同步正常": "All platform data is syncing normally",
  "数据同步": "Data sync",
  "立即刷新": "Refresh now",
  "增长结果周报": "Weekly growth report",
  "知道了": "Got it",

  "发布账号库": "Publishing accounts",
  "发布账号库分类": "Publishing account sections",
  "管理发布身份、登录状态和内容归属。": "Manage publishing identities, login status, and content ownership.",
  "发布账号": "Publishing accounts",
  "平台接入": "Platform access",
  "管理发布渠道与当前开放状态。": "Manage publishing channels and availability.",
  "已接入": "Connected",
  "即将接入": "Coming soon",
  "管理": "Manage",
  "尚未开放": "Not available yet",
  "添加发布账号": "Add publishing account",
  "当前支持 X，上传登录状态后即可用于发布。": "X is currently supported. Upload a login state file to start publishing.",
  "账号名称": "Account name",
  "例如：The Verge": "For example: The Verge",
  "账号链接 / 标识": "Account URL / identifier",
  "网址、用户名或账号 ID": "URL, username, or account ID",
  "账号类型": "Account type",
  "选择一个类型": "Select a type",
  "状态文件": "State file",
  "上传 JSON 状态文件": "Upload JSON state file",
  "最大 512KB": "Up to 512 KB",
  "取消": "Cancel",
  "校验并创建中…": "Validating and creating…",
  "添加账号": "Add account",
  "增加归属账号": "Add owned source accounts",
  "搜索信息账号": "Search source accounts",
  "全部平台": "All platforms",
  "没有符合条件的信息账号。": "No matching source accounts.",
  "添加中": "Adding…",
  "添加所选账号": "Add selected accounts",
  "删除发布账号？": "Delete publishing account?",
  "解除账号归属？": "Remove account ownership?",
  "确认": "Confirm",
  "账号详情": "Account details",
  "关闭账号详情": "Close account details",
  "X 发布账号": "X publishing account",
  "账号信息": "Account information",
  "账号链接": "Account URL",
  "登录状态": "Login status",
  "最近更新": "Last updated",
  "登录凭证": "Login credentials",
  "替换": "Replace",
  "检查": "Check",
  "归属账号": "Owned source accounts",
  "+添加": "+ Add",
  "尚未添加归属账号。": "No owned source accounts yet.",
  "删除发布账号": "Delete publishing account",
  "统一管理发布身份、登录状态和内容归属。": "Manage publishing identities, login status, and content ownership in one place.",
  "搜索发布账号": "Search publishing accounts",
  "按平台筛选": "Filter by platform",
  "按状态筛选": "Filter by status",
  "发布账号列表": "Publishing account list",
  "替换 X 发布账号状态文件": "Replace X publishing account state file",
  "搜索账号": "Search accounts",
  "全部状态": "All statuses",
  "正常": "Active",
  "待检查": "Needs checking",
  "已失效": "Expired",
  "账号": "Account",
  "正在读取发布账号…": "Loading publishing accounts…",
  "没有匹配的账号": "No matching accounts",
  "尚未添加发布账号": "No publishing accounts yet",
  "尝试调整搜索或筛选条件。": "Try changing your search or filters.",
  "添加 X 账号后，即可用于内容发布。": "Add an X account to start publishing content.",
  "查看详情": "View details",
  "检查登录状态": "Check login status",
  "替换状态文件": "Replace state file",
  "管理归属账号": "Manage owned accounts",
  "删除账号": "Delete account",
  "检查中": "Checking",
  "替换中": "Replacing",
  "尚未记录": "Not recorded",
  "请输入账号名称": "Enter an account name",
  "请输入账号链接或标识": "Enter an account URL or identifier",
  "请选择账号类型": "Select an account type",
  "请选择状态文件": "Select a state file",
  "请选择 JSON 格式的状态文件": "Select a JSON state file",
  "状态文件不能超过 512KB": "The state file must be 512 KB or smaller",

  "提示词库": "Prompt library",
  "已保存": "Saved",
  "新增": "Add",
  "新闻": "News",
  "集中管理不同平台和账号类型的创作指令，需要时直接复用。": "Manage reusable creation instructions by platform and account type.",
  "添加提示词": "Add prompt",
  "提示词列表": "Prompt list",
  "正在读取提示词库": "Loading prompt library",
  "暂时无法读取提示词库": "Unable to load the prompt library",
  "还没有提示词": "No prompts yet",
  "在上方新增第一条提示词，同时建立第一个账号类型。": "Add your first prompt above and create the first account type.",
  "新增提示词": "New prompt",
  "建立可复用的创作指令，保存后默认启用。": "Create reusable instructions. New prompts are enabled by default.",
  "提示词名称": "Prompt name",
  "例如：爆款标题改写": "For example: Viral headline rewrite",
  "归属平台": "Platform",
  "选择平台": "Select a platform",
  "选择提示词类型": "Select prompt type",
  "提示词内容": "Prompt content",
  "输入需要保存和复用的完整提示词……": "Enter the complete prompt you want to save and reuse…",
  "正在添加…": "Adding…",
  "编辑提示词": "Edit prompt",
  "修改后会立即同步到提示词列表。": "Changes appear in the prompt list immediately.",
  "保存修改": "Save changes",
  "保存中…": "Saving…",
  "删除这个提示词？": "Delete this prompt?",
  "确认删除": "Delete",
  "已启用": "Enabled",
  "已停用": "Disabled",
  "点击启用": "Enable",
  "点击停用": "Disable",
  "全部类型": "All types",
  "选择已有账号类型": "Select an existing account type",
  "输入新的账号类型": "Enter a new account type",
  "可用的提示词类型": "Available prompt types",
  "账号类型录入方式": "Account type input",
  "编辑账号类型录入方式": "Edit account type input",
  "可以改用现有类型，也可以新增一个类型。": "Use an existing type or add a new one.",
  "关闭提示词类型窗口": "Close prompt type dialog",
  "关闭编辑提示词窗口": "Close edit prompt dialog",

  "内容库": "Content library",
  "抓取设置": "Collection settings",
  "抓取记录": "Collection runs",
  "内容列表": "Content",
  "稿件管理": "Drafts",
  "按平台和账号配置登录状态、抓取频率与自动生成规则。": "Configure login state, collection frequency, and generation rules by account.",
  "实时查看排队、抓取、完成和失败状态，运行中的记录每 2 秒同步一次。": "Track queued, running, completed, and failed jobs. Active jobs refresh every 2 seconds.",
  "集中查看已抓取的原创帖子，筛选、批量选择并生成稿件。": "Review collected original posts, filter them, and generate drafts in bulk.",
  "管理生成文案与配图，确认发布状态并继续编辑或重新生成。": "Manage generated copy and images, review status, and edit or regenerate drafts.",
  "平台爬虫适配器": "Platform collection adapters",
  "选择平台爬虫适配器": "Choose a platform collection adapter",
  "平台适配器": "Platform adapters",
  "登录状态和执行入口彼此独立": "Login state and run controls are managed separately",
  "定时抓取": "Scheduled collection",
  "手动抓取": "Manual collection",
  "开启自动抓取": "Enable automatic collection",
  "开启自动生成": "Enable automatic generation",
  "多久抓一次": "Collection frequency",
  "每 15 分钟": "Every 15 minutes",
  "每次扫描": "Each scan",
  "抓取到的内容": "Collected content",
  "新增入库": "Newly saved",
  "符合条件": "Eligible",
  "已扫描（不重复）": "Scanned (deduplicated)",
  "成功解析并符合条件": "Parsed and eligible",
  "解析失败": "Parse failures",
  "本次没有帖子解析失败。": "No posts failed to parse in this run.",
  "本次没有符合时间和原创条件的帖子。": "No posts matched the time and originality filters.",
  "上次成功": "Last successful run",
  "暂未支持抓取": "Collection not supported yet",
  "暂未支持自动抓取": "Automatic collection not supported yet",
  "需要登录": "Login required",
  "待接入": "Coming soon",
  "检查登录": "Check login",
  "更新状态文件": "Update state file",
  "上传状态文件": "Upload state file",
  "状态文件等待检查": "State file awaiting check",
  "已找到X / Twitter登录状态文件，等待检查。": "X / Twitter login state file found and awaiting check.",
  "请选择X / Twitter登录状态文件": "Choose an X / Twitter login state file",
  "选择X / Twitter登录状态文件": "Choose an X / Twitter login state file",
  "请在本机运行": "Run locally",
  "，再上传生成的": ", then upload the generated",
  "。": ".",
  "按平台筛选账号": "Filter accounts by platform",
  "上传并检查中": "Uploading and checking",
  "自动抓取已开启": "Automatic collection enabled",
  "自动生成已开启": "Automatic generation enabled",
  "选择要持续关注的账号": "Choose accounts to monitor",
  "可分别开启定时抓取和自动生成；只有本次新入库的内容会进入稿件生成队列。": "Scheduled collection and automatic generation can be enabled separately. Only newly saved content from this run enters the draft queue.",
  "抓取已开启账号（0）": "Collect enabled accounts (0)",
  "正在同步账号库…": "Syncing account library…",
  "账号库里还没有账号": "There are no source accounts yet",
  "先去账号库添加账号，就会自动同步到这里。": "Add a source account first and it will sync here automatically.",
  "当前筛选条件下没有账号": "No accounts match these filters",
  "请选择其他平台或账号类型，也可以切回全部查看。": "Choose another platform or account type, or view all.",
  "全部账号": "All accounts",
  "全部": "All",
  "近 7 天": "Last 7 days",
  "近 30 天": "Last 30 days",
  "只看最近": "Recent only",
  "刷新抓取记录": "Refresh collection runs",
  "正在读取抓取记录…": "Loading collection runs…",
  "暂时无法读取抓取记录": "Unable to load collection runs",
  "还没有抓取记录": "No collection runs yet",
  "去“抓取设置”点击立即抓取，任务进度会实时显示在这里。": "Start a collection from Collection settings to see live progress here.",
  "进行中": "In progress",
  "排队中": "Queued",
  "已完成": "Completed",
  "失败": "Failed",
  "已停止": "Stopped",
  "等待调度": "Waiting",
  "等待抓取": "Waiting to collect",
  "抓取中": "Collecting",
  "停止抓取": "Stop collection",
  "继续抓取": "Continue collection",
  "展开抓取详情": "Expand run details",
  "收起抓取详情": "Collapse run details",
  "抓取详情": "Run details",
  "删除抓取记录": "Delete run",
  "每 2 秒自动刷新": "Refreshes every 2 seconds",
  "立即抓取": "Collect now",
  "小时": "hours",
  "条": "items",
  "正在整理内容…": "Preparing content…",
  "暂时无法读取内容库": "Unable to load the content library",
  "这里还没有内容": "No content yet",
  "去“抓取设置”选择账号并立即抓取，帖子会出现在这里。": "Choose an account in Collection settings and start a run to see posts here.",
  "当前按帖子发布时间排序": "Sorted by post publish time",
  "当前按抓取顺序排序，新抓取的内容在上方": "Sorted by collection order, newest first",
  "开启按帖子发布时间排序": "Sort by post publish time",
  "关闭按帖子发布时间排序": "Sort by collection order",
  "待处理": "Pending",
  "已处理": "Processed",
  "没有待处理内容": "No pending content",
  "切换到其他状态或“全部”继续查看。": "Choose another status or All to continue.",
  "全部生成": "Generate all",
  "生成稿件": "Generate draft",
  "正在加入…": "Adding…",
  "选择提示词": "Select prompt",
  "生成图片设置": "Image generation settings",
  "图片尺寸（可多选）": "Image sizes (select multiple)",
  "保存设置": "Save settings",
  "重新生成": "Regenerate",
  "删除内容": "Delete content",
  "外部链接": "External link",
  "打开帖子中的链接": "Open links in the post",
  "页面未提供帖子链接": "No post link was provided",
  "暂无": "None",
  "未知": "Unknown",
  "未知平台": "Unknown platform",
  "未知来源": "Unknown source",
  "未知账号": "Unknown account",
  "新闻/资讯/热点": "News / trends",
  "榜单/推荐": "Rankings / recommendations",
  "知识科普": "Education",
  "创作/测评": "Creation / reviews",
  "测评分享": "Reviews",
  "情感": "Lifestyle",
  "娱乐搞笑": "Entertainment",
  "创作者": "Creator",
  "抖音": "Douyin",
  "小红书": "Xiaohongshu",
  "微博": "Weibo",
  "国内": "Domestic",
  "国外": "International",
};

function translateDynamic(value) {
  const rules = [
    [/^已添加$/, ""],
    [/^个发布账号$/, "publishing accounts added"],
    [/^个账号$/, "accounts"],
    [/^个 Cookie$/, "cookies"],
    [/^已添加 (\d+) 个发布账号$/, "$1 publishing accounts added"],
    [/^(\d+) 个账号$/, "$1 accounts"],
    [/^已选择 (\d+) 个账号$/, "$1 accounts selected"],
    [/^共 (\d+) 条提示词$/, "$1 prompts"],
    [/^已保存 (\d+) 条提示词$/, "$1 prompts saved"],
    [/^(\d+) 个 Cookie$/, "$1 cookies"],
    [/^已添加 (\d+) 个归属账号$/, "$1 owned accounts added"],
    [/^打开 (.+) 操作菜单$/, "Open $1 actions"],
    [/^移除归属账号 (.+)$/, "Remove owned account $1"],
    [/^编辑提示词 (.+)$/, "Edit prompt $1"],
    [/^删除提示词 (.+)$/, "Delete prompt $1"],
    [/^启用提示词 (.+)$/, "Enable prompt $1"],
    [/^停用提示词 (.+)$/, "Disable prompt $1"],
    [/^删除账号类型 (.+)$/, "Delete account type $1"],
    [/^已选择 (\d+) 条$/, "$1 selected"],
    [/^共 (\d+) 条$/, "$1 total"],
    [/^(\d+) 条$/, "$1 items"],
    [/^(\d+) 小时$/, "$1 hours"],
    [/^(\d+) 分钟$/, "$1 minutes"],
    [/^(\d+) 秒$/, "$1 seconds"],
    [/^添加于 (.+)$/, "Added $1"],
    [/^上传于 (.+)$/, "uploaded $1"],
    [/^抓取失败 · (.+)$/, "Collection failed · $1"],
    [/^已找到(.+)登录状态文件，等待检查。$/, "$1 login state file found and awaiting check."],
    [/^选择(.+)登录状态文件$/, "Choose $1 login state file"],
    [/^请选择(.+)登录状态文件$/, "Choose $1 login state file"],
    [/^抓取已开启账号（(\d+)）$/, "Collect enabled accounts ($1)"],
  ];
  for (const [pattern, replacement] of rules) {
    if (pattern.test(value)) return value.replace(pattern, replacement);
  }
  return value;
}

function translateValue(value) {
  return ENGLISH_UI[value] || translateDynamic(value);
}

function translateTextNode(node, originals) {
  if (!node.nodeValue) return;
  const match = node.nodeValue.match(/^(\s*)(.*?)(\s*)$/s);
  const original = match?.[2] || "";
  if (!original) return;
  const translated = translateValue(original);
  if (translated === original) return;
  originals.set(node, node.nodeValue);
  if (node.parentElement?.tagName === "OPTION" && !node.parentElement.hasAttribute("value")) {
    node.parentElement.setAttribute("value", original);
    node.parentElement.dataset.i18nAddedValue = "true";
  }
  node.nodeValue = `${match[1]}${translated}${match[3]}`;
}

function translateElement(element, textOriginals, attributeOriginals) {
  if (!(element instanceof Element)) return;
  for (const attribute of ["placeholder", "aria-label", "title"]) {
    const original = element.getAttribute(attribute);
    if (!original) continue;
    const translated = translateValue(original);
    if (translated === original) continue;
    attributeOriginals.set(`${attribute}:${attributeOriginals.size}`, { element, attribute, original });
    element.setAttribute(attribute, translated);
  }
  for (const child of element.childNodes) {
    if (child.nodeType === Node.TEXT_NODE) translateTextNode(child, textOriginals);
  }
}

function translateTree(root, textOriginals, attributeOriginals) {
  if (!root) return;
  if (root.nodeType === Node.TEXT_NODE) {
    translateTextNode(root, textOriginals);
    return;
  }
  if (!(root instanceof Element)) return;
  translateElement(root, textOriginals, attributeOriginals);
  for (const element of root.querySelectorAll("*")) {
    translateElement(element, textOriginals, attributeOriginals);
  }
}

export default function useWorkspaceLanguageBridge(rootRef, language) {
  useEffect(() => {
    const root = rootRef.current;
    if (language !== "en" || !root) return undefined;

    const textOriginals = new Map();
    const attributeOriginals = new Map();
    translateTree(root, textOriginals, attributeOriginals);

    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.type === "characterData") translateTextNode(mutation.target, textOriginals);
        for (const node of mutation.addedNodes) translateTree(node, textOriginals, attributeOriginals);
      }
    });
    observer.observe(root, { childList: true, subtree: true, characterData: true });

    return () => {
      observer.disconnect();
      for (const [node, original] of textOriginals) {
        if (node.isConnected) node.nodeValue = original;
      }
      for (const { element, attribute, original } of attributeOriginals.values()) {
        if (element.isConnected) element.setAttribute(attribute, original);
      }
      for (const option of root.querySelectorAll('option[data-i18n-added-value="true"]')) {
        option.removeAttribute("value");
        delete option.dataset.i18nAddedValue;
      }
    };
  }, [rootRef, language]);
}
