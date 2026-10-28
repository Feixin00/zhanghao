import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { getImageSizeOptions } from "../../../shared/image-size-profiles.js";
import { AlertDialog } from "@heroui/react/alert-dialog";
import { Button } from "@heroui/react/button";
import { Chip } from "@heroui/react/chip";
import { Modal } from "@heroui/react/modal";
import { Surface } from "@heroui/react/surface";
import { toast } from "@heroui/react/toast";
import { ArrowClockwise } from "@phosphor-icons/react/ArrowClockwise";
import { ArrowSquareOut } from "@phosphor-icons/react/ArrowSquareOut";
import { CaretDown } from "@phosphor-icons/react/CaretDown";
import { CheckCircle } from "@phosphor-icons/react/CheckCircle";
import { ClockCounterClockwise } from "@phosphor-icons/react/ClockCounterClockwise";
import { CloudCheck } from "@phosphor-icons/react/CloudCheck";
import { CloudSlash } from "@phosphor-icons/react/CloudSlash";
import { MagicWand } from "@phosphor-icons/react/MagicWand";
import { Play } from "@phosphor-icons/react/Play";
import { Sparkle } from "@phosphor-icons/react/Sparkle";
import { Stop } from "@phosphor-icons/react/Stop";
import { SortAscending } from "@phosphor-icons/react/SortAscending";
import { Trash } from "@phosphor-icons/react/Trash";
import { UploadSimple } from "@phosphor-icons/react/UploadSimple";
import {
  checkCrawlerSession,
  cancelCrawlJob,
  createGenerationJobs,
  createPendingGenerationJobs,
  deleteContent,
  deleteCrawlJob,
  getContents,
  getCrawlJobs,
  getCrawlerPlatforms,
  getCrawlerSession,
  getCrawlSettings,
  saveCrawlSettings,
  startCrawl,
  updateContentPrompt,
  updateContentImageGeneration,
  uploadCrawlerSessionState,
} from "../../api/content";
import { getPromptLibrary } from "../../api/prompts";
import { getAiConfigurations } from "../../api/settings";
import { deduplicateLinkCards } from "../../../shared/link-cards.js";
import DraftManagement from "./DraftManagement";
import "./content-library.css";

const CONTENT_STATUSES = ["待处理", "已处理"];
const ACCOUNT_TYPE_ORDER = [
  "新闻/资讯/热点",
  "榜单/推荐",
  "知识科普",
  "创作/测评",
  "测评分享",
  "情感",
  "娱乐搞笑",
  "创作者",
];
const RUN_LABELS = {
  idle: "等待抓取",
  queued: "排队中",
  running: "抓取中",
  success: "上次成功",
  failed: "抓取失败",
  cancelled: "已停止",
  login_required: "需要登录",
};
const JOB_STATUS_META = {
  queued: { label: "排队中", message: "正在等待前面的任务完成" },
  running: { label: "抓取中", message: "爬虫正在获取并整理内容" },
  success: { label: "已完成", message: "抓取任务已完成" },
  failed: { label: "失败", message: "抓取任务未能完成" },
  cancelled: { label: "已停止", message: "抓取任务已手动停止" },
};
const JOB_TRIGGER_LABELS = {
  manual: "手动抓取",
  scheduled: "定时抓取",
};

function formatDate(value) {
  if (!value) return "暂无";
  const date = new Date(value);
  if (Number.isNaN(date.valueOf())) return "暂无";
  return new Intl.DateTimeFormat("zh-CN", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function formatDuration(startValue, endValue) {
  if (!startValue) return "尚未开始";
  const start = new Date(startValue).valueOf();
  const end = endValue ? new Date(endValue).valueOf() : Date.now();
  if (!Number.isFinite(start) || !Number.isFinite(end)) return "时间未知";

  const seconds = Math.max(0, Math.floor((end - start) / 1000));
  if (seconds < 60) return `${seconds} 秒`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} 分 ${seconds % 60} 秒`;
  const hours = Math.floor(minutes / 60);
  return `${hours} 小时 ${minutes % 60} 分`;
}

function getInitial(name) {
  return name?.trim().slice(0, 1).toUpperCase() || "X";
}

function NumberSetting({ label, value, suffix, min, max, step = 1, disabled = false, onChange }) {
  return (
    <label className="crawl-number-field">
      <span>{label}</span>
      <span className="crawl-number-input">
        <input
          type="number"
          min={min}
          max={max}
          step={step}
          value={value}
          disabled={disabled}
          onChange={(event) => onChange(event.target.value)}
        />
        <small>{suffix}</small>
      </span>
    </label>
  );
}

function CrawlAccountCard({ setting, onChange, onSave, onRun, isSaving, isRunning }) {
  const crawlSupported = setting.crawlSupported === true;
  const enabled = crawlSupported && setting.enabled;
  const statusClass = ["success", "running", "queued"].includes(setting.status)
    ? "is-ok"
    : setting.status === "failed" || setting.status === "login_required"
      ? "is-error"
      : "";

  return (
    <article className={`crawl-account-card${enabled ? " is-enabled" : ""}${crawlSupported ? "" : " is-unsupported"}`}>
      <div className="crawl-account-heading">
        <span className="crawl-account-avatar">{getInitial(setting.accountName)}</span>
        <div>
          <div className="crawl-account-name-line">
            <strong>{setting.accountName}</strong>
            <Chip
              className="crawl-platform-chip"
              data-platform={setting.accountPlatform}
              size="sm"
              variant="secondary"
            >
              {setting.accountPlatform || "未知平台"}
            </Chip>
            <Chip size="sm" variant="secondary">{setting.accountRegion}</Chip>
          </div>
          <span className={`crawl-run-state ${statusClass}`}>
            {crawlSupported ? (RUN_LABELS[setting.status] || "等待抓取") : "暂未支持自动抓取"}
            {crawlSupported && setting.lastRunAt ? ` · ${formatDate(setting.lastRunAt)}` : ""}
          </span>
        </div>
      </div>

      <div className="crawl-account-toggles">
        <button
          type="button"
          className="crawl-enable-button"
          aria-pressed={enabled}
          disabled={!crawlSupported}
          onClick={() => onChange("enabled", !enabled)}
        >
          <span className="crawl-enable-dot" />
          {crawlSupported ? (enabled ? "自动抓取已开启" : "开启自动抓取") : "暂未支持抓取"}
        </button>
        <button
          type="button"
          className="crawl-enable-button is-ai"
          aria-pressed={setting.autoGenerateDrafts === true}
          disabled={!crawlSupported || !enabled}
          title={enabled ? "定时抓取新增内容后自动生成图文稿件" : "请先开启自动抓取"}
          onClick={() => onChange("autoGenerateDrafts", setting.autoGenerateDrafts !== true)}
        >
          <Sparkle size={13} weight="fill" />
          {setting.autoGenerateDrafts ? "自动生成已开启" : "开启自动生成"}
        </button>
      </div>

      <div className="crawl-setting-grid">
        <NumberSetting
          label="多久抓一次"
          value={setting.intervalHours}
          suffix="小时"
          min={0.01}
          max={720}
          step={0.01}
          disabled={!crawlSupported}
          onChange={(value) => onChange("intervalHours", value)}
        />
        <NumberSetting
          label="每次扫描"
          value={setting.maxPosts}
          suffix="条"
          min={1}
          max={100}
          disabled={!crawlSupported}
          onChange={(value) => onChange("maxPosts", value)}
        />
        <NumberSetting
          label="只看最近"
          value={setting.lookbackHours}
          suffix="小时"
          min={1}
          max={87600}
          disabled={!crawlSupported}
          onChange={(value) => onChange("lookbackHours", value)}
        />
      </div>

      <div className="crawl-account-footer">
        <div>
          <Button variant="secondary" size="sm" onPress={onSave} isDisabled={!crawlSupported || isSaving}>
            <CheckCircle size={16} />
            {isSaving ? "保存中" : "保存设置"}
          </Button>
          <Button variant="primary" size="sm" onPress={onRun} isDisabled={!crawlSupported || isRunning}>
            <Play size={15} weight="fill" />
            立即抓取
          </Button>
        </div>
      </div>
    </article>
  );
}

function CrawlJobCard({ job, now, onDelete, onCancel }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const meta = JOB_STATUS_META[job.status] || { label: job.status || "未知", message: "任务状态未知" };
  const active = job.status === "queued" || job.status === "running";
  const durationStart = job.startedAt || job.createdAt;
  const durationEnd = active ? now : job.completedAt;
  const durationPrefix = job.status === "queued" ? "已等待" : active ? "已运行" : "耗时";
  const scannedCount = Math.max(job.scannedCount || 0, job.fetchedCount || 0);
  const targetCount = Math.max(0, Number(job.progress?.targetCount) || 0);
  const skipped = job.progress?.skipped || {};
  const skippedLabels = {
    reply: "回复",
    repost: "转发",
    quote: "引用",
    outsideRange: "超出时间范围",
    parseFailed: "解析失败",
  };
  const skippedSummary = Object.entries(skipped)
    .filter(([, count]) => Number(count) > 0)
    .map(([reason, count]) => `${skippedLabels[reason] || reason} ${count} 条`)
    .join("、");
  const displayMessage = job.message || meta.message;
  const successes = Array.isArray(job.progress?.successes) ? job.progress.successes : [];
  const failures = Array.isArray(job.progress?.failures) ? job.progress.failures : [];
  const hasSavedDetails = Object.hasOwn(job.progress || {}, "successes")
    || Object.hasOwn(job.progress || {}, "failures");

  async function handleDelete(close) {
    setIsDeleting(true);
    const deleted = await onDelete(job.id, job.accountName);
    setIsDeleting(false);
    if (deleted) close();
  }

  async function handleCancel(close) {
    setIsCancelling(true);
    const cancelled = await onCancel(job.id, job.accountName);
    setIsCancelling(false);
    if (cancelled) close();
  }

  function toggleFromCard(event) {
    if (event.target.closest("button, a, select, input, [role='button']")) return;
    setIsExpanded((current) => !current);
  }

  function handleCardKeyDown(event) {
    if (event.target !== event.currentTarget || !["Enter", " "].includes(event.key)) return;
    event.preventDefault();
    setIsExpanded((current) => !current);
  }

  return (
    <article
      className={`crawl-job-card is-${job.status || "unknown"}${isExpanded ? " is-expanded" : ""}`}
      tabIndex={0}
      aria-expanded={isExpanded}
      onClick={toggleFromCard}
      onKeyDown={handleCardKeyDown}
    >
      <header className="crawl-job-heading">
        <span className="crawl-job-avatar">{getInitial(job.accountName)}</span>
        <div>
          <div className="crawl-job-name-line">
            <strong>{job.accountName || "未知账号"}</strong>
            <Chip size="sm" variant="secondary">{job.accountPlatform || "X"}</Chip>
          </div>
          <span>{JOB_TRIGGER_LABELS[job.trigger] || job.trigger || "未知来源"} · 创建于 {formatDate(job.createdAt)}</span>
        </div>
        <div className="crawl-job-heading-actions">
          <span className={`crawl-job-status is-${job.status || "unknown"}`}>
            <i aria-hidden="true" />
            {meta.label}
          </span>
          {active && (
            <AlertDialog>
              <AlertDialog.Trigger
                className="crawl-record-cancel-trigger"
                aria-label={`停止 ${job.accountName || "未知账号"} 的抓取任务`}
                title="停止抓取"
              >
                <Stop size={15} weight="fill" aria-hidden="true" />
              </AlertDialog.Trigger>
              <AlertDialog.Backdrop variant="blur" isDismissable isKeyboardDismissDisabled={false}>
                <AlertDialog.Container placement="center" size="xs">
                  <AlertDialog.Dialog>
                    {({ close }) => (
                      <>
                        <AlertDialog.Header>
                          <AlertDialog.Icon status="danger" />
                          <AlertDialog.Heading>停止这项抓取？</AlertDialog.Heading>
                        </AlertDialog.Header>
                        <AlertDialog.Body>
                          {job.status === "running"
                            ? `将停止「${job.accountName || "未知账号"}」正在运行的爬虫和浏览器进程；已经入库的内容会保留。`
                            : `将从队列中移除「${job.accountName || "未知账号"}」的抓取任务。`}
                        </AlertDialog.Body>
                        <AlertDialog.Footer>
                          <Button slot="close" variant="secondary" isDisabled={isCancelling}>继续抓取</Button>
                          <Button variant="danger" isDisabled={isCancelling} onPress={() => handleCancel(close)}>
                            {isCancelling ? "正在停止…" : "确认停止"}
                          </Button>
                        </AlertDialog.Footer>
                      </>
                    )}
                  </AlertDialog.Dialog>
                </AlertDialog.Container>
              </AlertDialog.Backdrop>
            </AlertDialog>
          )}
          {!active && (
            <AlertDialog>
              <AlertDialog.Trigger
                className="crawl-record-delete-trigger"
                aria-label={`删除 ${job.accountName || "未知账号"} 的抓取记录`}
                title="删除抓取记录"
              >
                <Trash size={16} aria-hidden="true" />
              </AlertDialog.Trigger>
              <AlertDialog.Backdrop variant="blur" isDismissable isKeyboardDismissDisabled={false}>
                <AlertDialog.Container placement="center" size="xs">
                  <AlertDialog.Dialog>
                    {({ close }) => (
                      <>
                        <AlertDialog.Header>
                          <AlertDialog.Icon status="danger" />
                          <AlertDialog.Heading>删除这条抓取记录？</AlertDialog.Heading>
                        </AlertDialog.Header>
                        <AlertDialog.Body>
                          将删除「{job.accountName || "未知账号"}」本次任务记录；已经入库的内容不会被删除。
                        </AlertDialog.Body>
                        <AlertDialog.Footer>
                          <Button slot="close" variant="secondary" isDisabled={isDeleting}>取消</Button>
                          <Button variant="danger" isDisabled={isDeleting} onPress={() => handleDelete(close)}>
                            {isDeleting ? "正在删除…" : "确认删除"}
                          </Button>
                        </AlertDialog.Footer>
                      </>
                    )}
                  </AlertDialog.Dialog>
                </AlertDialog.Container>
              </AlertDialog.Backdrop>
            </AlertDialog>
          )}
          <button
            type="button"
            className="crawl-job-expand-button"
            aria-label={isExpanded ? "收起抓取详情" : "展开抓取详情"}
            aria-expanded={isExpanded}
            onClick={() => setIsExpanded((current) => !current)}
          >
            <CaretDown size={16} aria-hidden="true" />
          </button>
        </div>
      </header>

      <div className="crawl-job-metrics">
        <div>
          <span>已扫描（不重复）</span>
          <strong>{scannedCount}</strong>
          <small>{targetCount ? `/ ${targetCount} 条` : "条"}</small>
        </div>
        <div><span>符合条件</span><strong>{job.fetchedCount || 0}</strong><small>条</small></div>
        <div><span>新增入库</span><strong>{job.insertedCount || 0}</strong><small>条</small></div>
        <div>
          <span>{durationPrefix}</span>
          <strong className="crawl-job-duration">{formatDuration(durationStart, durationEnd)}</strong>
        </div>
      </div>

      <footer className="crawl-job-footer">
        <p title={[displayMessage, skippedSummary].filter(Boolean).join("；")}>
          {displayMessage}{skippedSummary ? ` · ${skippedSummary}` : ""}
        </p>
        <time dateTime={job.completedAt || job.startedAt || job.createdAt || undefined}>
          {job.completedAt
            ? `${job.status === "cancelled" ? "停止" : "完成"}于 ${formatDate(job.completedAt)}`
            : job.startedAt
              ? `开始于 ${formatDate(job.startedAt)}`
              : "等待调度"}
        </time>
      </footer>

      {isExpanded && (
        <section className="crawl-job-details" aria-label="抓取详情" onClick={(event) => event.stopPropagation()}>
          {!hasSavedDetails ? (
            <div className="crawl-job-detail-empty">
              <strong>{job.status === "cancelled" ? "任务停止前没有产生帖子明细" : "这条历史记录没有帖子明细"}</strong>
              <span>
                {job.status === "cancelled"
                  ? "任务在抓取完成前停止，因此没有可展示的帖子链接或解析结果。"
                  : "明细功能启用前创建的任务只保留统计数字；重新抓取后即可查看链接和失败原因。"}
              </span>
            </div>
          ) : (
            <>
              <div className="crawl-job-detail-group is-success">
                <div className="crawl-job-detail-title">
                  <strong>成功解析并符合条件</strong>
                  <span>{successes.length} 条</span>
                </div>
                {successes.length > 0 ? (
                  <ol className="crawl-job-detail-list">
                    {successes.map((item, index) => (
                      <li key={item.postId || item.tweetId || item.url || index}>
                        <div>
                          <strong>
                            {item.postId || item.tweetId
                              ? `帖子 ${item.postId || item.tweetId}`
                              : `成功帖子 ${index + 1}`}
                          </strong>
                          {item.textExcerpt && <span>{item.textExcerpt}</span>}
                        </div>
                        {item.url ? (
                          <a href={item.url} target="_blank" rel="noreferrer">
                            打开原帖 <ArrowSquareOut size={14} />
                          </a>
                        ) : <em>未保存链接</em>}
                      </li>
                    ))}
                  </ol>
                ) : <p className="crawl-job-detail-note">本次没有符合时间和原创条件的帖子。</p>}
              </div>

              <div className="crawl-job-detail-group is-failed">
                <div className="crawl-job-detail-title">
                  <strong>解析失败</strong>
                  <span>{failures.length} 条</span>
                </div>
                {failures.length > 0 ? (
                  <ol className="crawl-job-detail-list">
                    {failures.map((item, index) => (
                      <li key={`${item.url || item.reason || "failed"}-${index}`}>
                        <div>
                          <strong>{item.reasonLabel || "帖子结构解析失败"}</strong>
                          <span>
                            {item.textExcerpt || "页面没有留下可识别的正文摘要"}
                            {item.round ? ` · 第 ${item.round} 轮扫描` : ""}
                          </span>
                        </div>
                        {item.url ? (
                          <a href={item.url} target="_blank" rel="noreferrer">
                            打开页面 <ArrowSquareOut size={14} />
                          </a>
                        ) : <em>页面未提供帖子链接</em>}
                      </li>
                    ))}
                  </ol>
                ) : <p className="crawl-job-detail-note">本次没有帖子解析失败。</p>}
              </div>
            </>
          )}
        </section>
      )}
    </article>
  );
}

function PromptTypeButton({ item, prompts, promptId, onSave }) {
  const [selectedPromptId, setSelectedPromptId] = useState(promptId || null);
  const [isSaving, setIsSaving] = useState(false);
  const currentPrompt = prompts.find((prompt) => prompt.id === promptId) || null;
  const availablePrompts = prompts.filter(
    (prompt) => prompt.enabled && prompt.platform === item.platform,
  );
  const selectedPrompt = availablePrompts.find((prompt) => prompt.id === selectedPromptId) || null;

  useEffect(() => {
    setSelectedPromptId(promptId || null);
  }, [promptId]);

  async function handleSave(event, close) {
    event.preventDefault();
    if (!selectedPrompt) return;
    setIsSaving(true);
    const saved = await onSave(item, selectedPrompt.id);
    setIsSaving(false);
    if (saved) close();
  }

  return (
    <Modal>
      <Modal.Trigger
        className={`content-prompt-trigger${currentPrompt ? " is-selected" : ""}`}
        aria-label={`选择这条帖子的提示词类型`}
        title={currentPrompt ? `当前提示词：${currentPrompt.accountTypeName} · ${currentPrompt.title}` : "选择提示词类型"}
        onClick={() => setSelectedPromptId(promptId || null)}
      >
        <MagicWand size={15} aria-hidden="true" />
        <span>{currentPrompt?.accountTypeName || "选择提示词"}</span>
      </Modal.Trigger>
      <Modal.Backdrop variant="blur" isDismissable>
        <Modal.Container placement="center" size="sm" scroll="inside">
          <Modal.Dialog className="content-prompt-modal">
            {({ close }) => (
              <form onSubmit={(event) => handleSave(event, close)}>
                <Modal.Header>
                  <div>
                    <Modal.Heading>选择提示词类型</Modal.Heading>
                    <p className="content-prompt-description">
                      {!item.accountId
                        ? "原信息账号已删除；当前选择仍然只对这个历史帖子生效。"
                        : item.promptId
                        ? "当前帖子已单独设置提示词；修改仍然只对这个帖子生效。"
                        : promptId
                          ? `当前默认使用账号「${item.accountName}」分配的提示词；修改只对这一个帖子生效。`
                          : "当前账号没有分配提示词；选择后只对这一个帖子生效。"}
                    </p>
                  </div>
                  <Modal.CloseTrigger aria-label="关闭提示词类型窗口" />
                </Modal.Header>
                <Modal.Body>
                  {availablePrompts.length > 0 ? (
                    <div className="content-prompt-options" role="radiogroup" aria-label="可用的提示词类型">
                      {availablePrompts.map((prompt) => {
                        const selected = prompt.id === selectedPromptId;
                        return (
                          <button
                            key={prompt.id}
                            type="button"
                            className={`content-prompt-option${selected ? " is-selected" : ""}`}
                            role="radio"
                            aria-checked={selected}
                            onClick={() => setSelectedPromptId(prompt.id)}
                          >
                            <span className="content-prompt-option-mark" aria-hidden="true" />
                            <span>
                              <strong>{prompt.accountTypeName}</strong>
                              <small>{prompt.title} · {prompt.platform}</small>
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="content-prompt-empty">
                      <MagicWand size={28} weight="duotone" aria-hidden="true" />
                      <strong>还没有可用的 {item.platform} 提示词</strong>
                      <span>请先到提示词库创建并启用提示词。</span>
                    </div>
                  )}
                  {currentPrompt && !availablePrompts.some((prompt) => prompt.id === currentPrompt.id) && (
                    <p className="content-prompt-warning">当前绑定的提示词已停用或不适用于该平台，请重新选择。</p>
                  )}
                </Modal.Body>
                <Modal.Footer>
                  <Button slot="close" variant="secondary" isDisabled={isSaving}>取消</Button>
                  <Button
                    type="submit"
                    variant="primary"
                    isDisabled={isSaving || !selectedPrompt || selectedPrompt.id === promptId}
                  >
                    {isSaving ? "正在保存…" : "保存类型"}
                  </Button>
                </Modal.Footer>
              </form>
            )}
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}

function ImageGenerationSettings({ item }) {
  const [imageModel, setImageModel] = useState("");
  const [modelStatus, setModelStatus] = useState("loading");
  const imageSizeOptions = getImageSizeOptions(imageModel);
  async function loadImageModel() {
    setModelStatus("loading");
    try {
      const configurations = await getAiConfigurations();
      setImageModel(configurations.find((config) => config.modelType === "image" && config.enabled)?.modelName || "");
      setModelStatus("ready");
    } catch {
      setModelStatus("error");
    }
  }
  const [enabled, setEnabled] = useState(item.generateImages !== false);
  const [draftEnabled, setDraftEnabled] = useState(enabled);
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);
  const [sizes, setSizes] = useState(item.imageSizes || ["auto"]);
  const [count, setCount] = useState(item.imageCount || 1);
  const [draftSizes, setDraftSizes] = useState(sizes);
  const [draftCount, setDraftCount] = useState(String(count));
  const sizeKey = JSON.stringify(item.imageSizes || ["auto"]);
  useEffect(() => { setSizes(JSON.parse(sizeKey)); setCount(item.imageCount || 1); }, [sizeKey, item.imageCount]);
  const countValue = Number(draftCount);
  const validSettings = draftSizes.length > 0 && Number.isInteger(countValue) && countValue >= 1 && countValue <= 10;
  function chooseSize(size, checked) {
    setDraftSizes((current) => checked
      ? size === "auto" ? ["auto"] : [...current.filter((value) => value !== "auto"), size]
      : current.filter((value) => value !== size));
  }
  async function saveSettings(event, close) {
    event.preventDefault();
    if (savingRef.current || !validSettings) return;
    savingRef.current = true;
    setSaving(true);
    try {
      const result = await updateContentImageGeneration(item.id, draftEnabled, { imageSizes: draftSizes, imageCount: countValue });
      setEnabled(result.generateImages); setSizes(result.imageSizes); setCount(result.imageCount); close();
    } catch (error) { toast.danger("图片设置保存失败", { description: error.message }); }
    finally { savingRef.current = false; setSaving(false); }
  }
  useEffect(() => { setEnabled(item.generateImages !== false); }, [item.generateImages]);

  return (
    <Modal>
      <Modal.Trigger className="content-image-toggle" isDisabled={saving}
        onClick={() => { setDraftEnabled(enabled); setDraftSizes(sizes); setDraftCount(String(count)); void loadImageModel(); }}
        title="设置本帖下次生成图片的尺寸和张数">
        尺寸 · {enabled ? `${sizes.length * count} 张` : "已关闭"}
      </Modal.Trigger>
      <Modal.Backdrop variant="blur" isDismissable>
        <Modal.Container placement="center" size="sm" scroll="inside">
          <Modal.Dialog className="content-image-settings-modal">
            {({ close }) => <form onSubmit={(event) => saveSettings(event, close)}>
              <Modal.Header><Modal.Heading>生成图片设置</Modal.Heading><Modal.CloseTrigger /></Modal.Header>
              <Modal.Body>
                <small role="status">{modelStatus === "loading" ? "正在读取图像模型…" : modelStatus === "error" ? "图像模型读取失败，暂显示 GPT Image 2 尺寸。" : imageModel ? `当前图像模型：${imageModel}${imageModel === "gpt-image-2-vip" ? "（按 GPT Image 2 尺寸配置）" : ""}` : "尚未启用图像模型，暂显示 GPT Image 2 尺寸。"}</small>
                <label className="content-image-count" style={{ marginBottom: 16 }}>
                  <input type="checkbox" checked={draftEnabled} disabled={saving} onChange={(event) => setDraftEnabled(event.target.checked)} style={{ width: "auto" }} />
                  生成图片
                </label>
                <fieldset className="content-image-size-options"><legend>图片尺寸（可多选）</legend>
                  {imageSizeOptions.map((option) => <label key={option.id}>
                    <input type="checkbox" checked={draftSizes.includes(option.id)} onChange={(event) => chooseSize(option.id, event.target.checked)} />
                    <span>{option.label}</span>
                  </label>)}
                </fieldset>
                <label className="content-image-count">每种尺寸的张数
                  <input type="number" min="1" max="10" step="1" required value={draftCount} onChange={(event) => setDraftCount(event.target.value)} />
                </label>
                <p role="status">{!draftEnabled ? "本帖不生成新图片，已设置的尺寸和张数会保留。" : validSettings ? `${draftSizes.length} 种尺寸 × ${countValue} 张 = 共 ${draftSizes.length * countValue} 张新图` : "请至少选择一种尺寸，张数填写 1–10。"}</p>
                <small>仅影响本帖下次生成；“全部生成”也使用此设置。关闭“生成图片”时不生图。多图、4K 可能增加耗时和费用。</small>
              </Modal.Body>
              <Modal.Footer><Button slot="close" variant="secondary">取消</Button><Button type="submit" isDisabled={saving || !validSettings}>{saving ? "保存中…" : "保存设置"}</Button></Modal.Footer>
            </form>}
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}

function ContentCard({
  item,
  prompts,
  promptId,
  onDelete,
  onGenerate,
  onPromptChange,
  onLayoutChange,
  selected,
  onToggleSelected,
  selectionDisabled,
}) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isTextExpanded, setIsTextExpanded] = useState(false);
  const [canExpandText, setCanExpandText] = useState(false);
  const textRef = useRef(null);
  const visibleLinkCards = deduplicateLinkCards(item.linkCards);
  const contentMedia = [
    ...(Array.isArray(item.imageUrls)
      ? item.imageUrls.map((url) => ({ url, href: url, kind: "image" }))
      : []),
    ...(Array.isArray(item.videoThumbnailUrls)
      ? item.videoThumbnailUrls.map((url, index) => ({
          url,
          href: item.videoUrls?.[index] || item.sourceUrl || url,
          kind: "video",
        }))
      : []),
  ].filter((media, index, list) => media.url && list.findIndex((entry) => entry.url === media.url) === index);

  useEffect(() => {
    const textElement = textRef.current;
    if (!textElement || isTextExpanded) return undefined;

    const measureOverflow = () => {
      setCanExpandText(textElement.scrollHeight > textElement.clientHeight + 1);
    };
    const frame = window.requestAnimationFrame(measureOverflow);
    const resizeObserver = new ResizeObserver(measureOverflow);
    resizeObserver.observe(textElement);

    return () => {
      window.cancelAnimationFrame(frame);
      resizeObserver.disconnect();
    };
  }, [item.text, isTextExpanded]);

  useLayoutEffect(() => {
    onLayoutChange?.();
  }, [canExpandText, onLayoutChange]);

  async function handleDelete(close) {
    setIsDeleting(true);
    const deleted = await onDelete(item.id, item.accountName);
    setIsDeleting(false);
    if (deleted) close();
  }

  async function handleGenerate() {
    setIsGenerating(true);
    await onGenerate(item);
    setIsGenerating(false);
  }

  return (
    <article className={`content-card${isTextExpanded ? " is-expanded" : ""}${selected ? " is-selected" : ""}`}>
      <header className="content-card-header">
        <input
          type="checkbox"
          className="content-selection-checkbox"
          aria-label={`选择 ${item.accountName} 的帖子：${(item.text || "媒体内容").slice(0, 40)}`}
          checked={selected}
          disabled={selectionDisabled}
          onChange={() => onToggleSelected(item.id)}
        />
        <span className="content-source-avatar">{getInitial(item.accountName)}</span>
        <div>
          <strong>{item.accountName}</strong>
          <span>@{String(item.authorHandle || "").replace(/^@/, "")} · {formatDate(item.publishedAt)}</span>
        </div>
        <div className="content-card-header-actions">
          <Chip size="sm" variant="secondary">{item.accountRegion}</Chip>
          <a href={item.sourceUrl} target="_blank" rel="noreferrer">
            查看原帖 <ArrowSquareOut size={15} />
          </a>
        </div>
      </header>

      <div className="content-card-copy">
        {item.text ? (
          <p
            ref={textRef}
            className={`content-card-text${isTextExpanded ? " is-expanded" : ""}`}
          >
            {item.text}
          </p>
        ) : (
          <p className="content-card-text is-muted">这条帖子只有媒体内容</p>
        )}
        {item.text && canExpandText && (
          <button
            type="button"
            className="content-card-expand"
            aria-expanded={isTextExpanded}
            onClick={() => setIsTextExpanded((current) => !current)}
          >
            {isTextExpanded ? "收起" : "展开"}
            <CaretDown size={14} aria-hidden="true" />
          </button>
        )}
      </div>

      {visibleLinkCards.length > 0 && (
        <div className="content-link-card-list">
          {visibleLinkCards.map((card, index) => (
            <a
              key={`${card.url}-${index}`}
              className={`content-link-card${card.imageUrl ? "" : " is-text-only"}`}
              href={card.url}
              target="_blank"
              rel="noreferrer"
            >
              {card.imageUrl && <img src={card.imageUrl} alt="" loading="lazy" />}
              <span>
                <small>{card.domain || "外部链接"}</small>
                <strong>{card.title || "打开帖子中的链接"}</strong>
              </span>
              <ArrowSquareOut size={16} aria-hidden="true" />
            </a>
          ))}
        </div>
      )}

      {contentMedia.length > 0 && (
        <div className={`content-media-grid media-count-${Math.min(contentMedia.length, 3)}`}>
          {contentMedia.slice(0, 3).map((media, index) => (
            <a key={media.url} href={media.href} target="_blank" rel="noreferrer" className="content-media-item">
              <img
                src={media.url}
                alt={media.kind === "video" ? `视频封面 ${index + 1}` : `帖子配图 ${index + 1}`}
                loading="lazy"
              />
              {media.kind === "video" && (
                <span className="content-media-kind"><Play size={11} weight="fill" /> 视频</span>
              )}
              {index === 2 && contentMedia.length > 3 && (
                <span className="content-media-more">+{contentMedia.length - 3}</span>
              )}
            </a>
          ))}
        </div>
      )}

      <footer className="content-card-footer">
        <span className={`content-status-badge${item.status === "已处理" ? " is-processed" : " is-pending"}`}>
          <i aria-hidden="true" />
          {item.status === "已处理" ? "已处理" : "待处理"}
        </span>
        <div className="content-card-actions">
          <ImageGenerationSettings item={item} />
          <PromptTypeButton
            item={item}
            prompts={prompts}
            promptId={promptId}
            onSave={onPromptChange}
          />
          <Button
            size="sm"
            variant="primary"
            className="content-generate-button"
            onPress={handleGenerate}
            isDisabled={isGenerating}
          >
            <Sparkle size={15} weight="fill" />
            {isGenerating ? "正在加入…" : item.status === "已处理" ? "重新生成" : "生成稿件"}
          </Button>
          <AlertDialog>
            <AlertDialog.Trigger
              className="content-delete-trigger"
              aria-label={`删除 ${item.accountName} 的这条内容`}
              title="删除内容"
            >
              <Trash size={16} aria-hidden="true" />
            </AlertDialog.Trigger>
            <AlertDialog.Backdrop variant="blur" isDismissable isKeyboardDismissDisabled={false}>
              <AlertDialog.Container placement="center" size="xs">
                <AlertDialog.Dialog>
                  {({ close }) => (
                    <>
                      <AlertDialog.Header>
                        <AlertDialog.Icon status="danger" />
                        <AlertDialog.Heading>删除这条内容？</AlertDialog.Heading>
                      </AlertDialog.Header>
                      <AlertDialog.Body>
                        这条内容会从内容列表永久移除；原平台帖子和抓取记录不会受到影响。
                      </AlertDialog.Body>
                      <AlertDialog.Footer>
                        <Button slot="close" variant="secondary" isDisabled={isDeleting}>取消</Button>
                        <Button variant="danger" isDisabled={isDeleting} onPress={() => handleDelete(close)}>
                          {isDeleting ? "正在删除…" : "确认删除"}
                        </Button>
                      </AlertDialog.Footer>
                    </>
                  )}
                </AlertDialog.Dialog>
              </AlertDialog.Container>
            </AlertDialog.Backdrop>
          </AlertDialog>
        </div>
      </footer>
    </article>
  );
}

function ContentCardList({ contents, prompts, promptIdsByAccount, onDelete, onGenerate, onPromptChange, selectedIds, onToggleSelected, selectionDisabled }) {
  const listRef = useRef(null);
  const lastWidthRef = useRef(0);
  const [rowHeights, setRowHeights] = useState([]);

  const measureCollapsedRows = useCallback(() => {
    const listElement = listRef.current;
    if (!listElement) return;

    const nextRowHeights = [];
    const previousMinHeight = listElement.style.minHeight;
    listElement.style.minHeight = `${Math.ceil(listElement.getBoundingClientRect().height)}px`;
    listElement.classList.add("is-measuring");
    try {
      listElement.querySelectorAll("[data-content-card-index]").forEach((wrapper) => {
        const itemIndex = Number(wrapper.dataset.contentCardIndex);
        const card = wrapper.querySelector(":scope > .content-card");
        if (!card || !Number.isInteger(itemIndex)) return;
        const rowIndex = Math.floor(itemIndex / 2);
        nextRowHeights[rowIndex] = Math.max(
          nextRowHeights[rowIndex] || 0,
          Math.ceil(card.getBoundingClientRect().height),
        );
      });
    } finally {
      listElement.classList.remove("is-measuring");
      listElement.style.minHeight = previousMinHeight;
    }

    setRowHeights((current) => {
      const unchanged = current.length === nextRowHeights.length
        && current.every((height, index) => height === nextRowHeights[index]);
      return unchanged ? current : nextRowHeights;
    });
  }, []);

  useLayoutEffect(() => {
    measureCollapsedRows();
  }, [contents, measureCollapsedRows]);

  useEffect(() => {
    const listElement = listRef.current;
    if (!listElement) return undefined;
    lastWidthRef.current = listElement.getBoundingClientRect().width;
    let frame = 0;
    const resizeObserver = new ResizeObserver(([entry]) => {
      const nextWidth = entry.contentRect.width;
      if (Math.abs(nextWidth - lastWidthRef.current) < 1) return;
      lastWidthRef.current = nextWidth;
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(measureCollapsedRows);
    });
    resizeObserver.observe(listElement);

    return () => {
      window.cancelAnimationFrame(frame);
      resizeObserver.disconnect();
    };
  }, [measureCollapsedRows]);

  return (
    <div className="content-card-list" ref={listRef}>
      {[0, 1].map((columnIndex) => (
        <div className="content-card-column" key={columnIndex}>
          {contents
            .map((item, itemIndex) => ({ item, itemIndex }))
            .filter(({ itemIndex }) => itemIndex % 2 === columnIndex)
            .map(({ item, itemIndex }) => {
              const collapsedHeight = rowHeights[Math.floor(itemIndex / 2)];
              return (
                <div
                  className="content-card-order"
                  data-content-card-index={itemIndex}
                  style={{
                    "--content-card-order": itemIndex,
                    ...(collapsedHeight
                      ? { "--content-card-row-height": `${collapsedHeight}px` }
                      : {}),
                  }}
                  key={item.id}
                >
                  <ContentCard
                    item={item}
                    prompts={prompts}
                    promptId={item.promptId || promptIdsByAccount.get(item.accountId) || null}
                    onDelete={onDelete}
                    onGenerate={onGenerate}
                    onPromptChange={onPromptChange}
                    onLayoutChange={measureCollapsedRows}
                    selected={selectedIds.has(item.id)}
                    onToggleSelected={onToggleSelected}
                    selectionDisabled={selectionDisabled}
                  />
                </div>
              );
            })}
        </div>
      ))}
    </div>
  );
}

export default function ContentLibrary({ section = "settings" }) {
  const [settings, setSettings] = useState([]);
  const [prompts, setPrompts] = useState([]);
  const [contents, setContents] = useState([]);
  const [selectedContentIds, setSelectedContentIds] = useState(new Set());
  const [isDeletingSelected, setIsDeletingSelected] = useState(false);
  const deletingSelectedRef = useRef(false);
  const selectAllRef = useRef(null);
  const selectedVisibleIds = contents.filter((item) => selectedContentIds.has(item.id)).map((item) => item.id);
  const allContentsSelected = contents.length > 0 && selectedVisibleIds.length === contents.length;

  useEffect(() => {
    if (selectAllRef.current) {
      selectAllRef.current.indeterminate = selectedVisibleIds.length > 0 && !allContentsSelected;
    }
  }, [selectedVisibleIds.length, allContentsSelected]);

  const [jobs, setJobs] = useState([]);
  const [jobClock, setJobClock] = useState(Date.now());
  const [jobStatusFilter, setJobStatusFilter] = useState("all");
  const [adapters, setAdapters] = useState([]);
  const [sessions, setSessions] = useState({});
  const [sessionPlatform, setSessionPlatform] = useState("X");
  const [accountPlatformFilter, setAccountPlatformFilter] = useState("all");
  const [accountTypeFilter, setAccountTypeFilter] = useState("all");
  const [filters, setFilters] = useState({
    status: "all",
    accountId: "all",
    sortByPublishedAt: false,
  });
  useEffect(() => {
    setSelectedContentIds(new Set());
  }, [section, filters.status, filters.accountId]);

  useEffect(() => {
    const visibleIds = new Set(contents.map((item) => item.id));
    setSelectedContentIds((current) => {
      const next = new Set([...current].filter((id) => visibleIds.has(id)));
      return next.size === current.size ? current : next;
    });
  }, [contents]);
  const [isLoadingSettings, setIsLoadingSettings] = useState(true);
  const [isLoadingContents, setIsLoadingContents] = useState(true);
  const [isGeneratingAll, setIsGeneratingAll] = useState(false);
  const [isLoadingJobs, setIsLoadingJobs] = useState(true);
  const [isRefreshingJobs, setIsRefreshingJobs] = useState(false);
  const [isCheckingSession, setIsCheckingSession] = useState(false);
  const [isUploadingSession, setIsUploadingSession] = useState(false);
  const [savingIds, setSavingIds] = useState(new Set());
  const [runningIds, setRunningIds] = useState(new Set());
  const [error, setError] = useState("");
  const stateFileInputRef = useRef(null);
  const hasInitializedCrawlerDataRef = useRef(false);
  const activeAdapter = useMemo(
    () => adapters.find((adapter) => adapter.platform === sessionPlatform) || null,
    [adapters, sessionPlatform],
  );
  const session = sessions[sessionPlatform]
    || activeAdapter?.session
    || { status: "unknown", message: `尚未读取${sessionPlatform}适配器状态` };

  const enabledIds = useMemo(
    () => settings
      .filter((setting) => setting.crawlSupported && setting.enabled)
      .map((setting) => setting.accountId),
    [settings],
  );
  const promptIdsByAccount = useMemo(
    () => new Map(settings.map((setting) => [setting.accountId, setting.promptId || null])),
    [settings],
  );
  const platformFilters = useMemo(() => {
    const counts = settings.reduce((result, setting) => {
      const platform = setting.accountPlatform || "未知平台";
      result.set(platform, (result.get(platform) || 0) + 1);
      return result;
    }, new Map());
    const preferredOrder = ["X", "Reddit", "抖音", "小红书", "微博"];
    const platforms = [...counts.keys()].sort((left, right) => {
      const leftIndex = preferredOrder.indexOf(left);
      const rightIndex = preferredOrder.indexOf(right);
      if (leftIndex === -1 && rightIndex === -1) return left.localeCompare(right, "zh-CN");
      if (leftIndex === -1) return 1;
      if (rightIndex === -1) return -1;
      return leftIndex - rightIndex;
    });
    return [
      { id: "all", label: "全部平台", count: settings.length },
      ...platforms.map((platform) => ({ id: platform, label: platform, count: counts.get(platform) })),
    ];
  }, [settings]);
  const platformFilteredSettings = useMemo(
    () => accountPlatformFilter === "all"
      ? settings
      : settings.filter((setting) => (setting.accountPlatform || "未知平台") === accountPlatformFilter),
    [settings, accountPlatformFilter],
  );
  const accountTypeFilters = useMemo(() => {
    const counts = platformFilteredSettings.reduce((result, setting) => {
      const accountType = setting.accountType || "未分类";
      result.set(accountType, (result.get(accountType) || 0) + 1);
      return result;
    }, new Map());
    const accountTypes = [...counts.keys()].sort((left, right) => {
      const leftIndex = ACCOUNT_TYPE_ORDER.indexOf(left);
      const rightIndex = ACCOUNT_TYPE_ORDER.indexOf(right);
      if (leftIndex === -1 && rightIndex === -1) return left.localeCompare(right, "zh-CN");
      if (leftIndex === -1) return 1;
      if (rightIndex === -1) return -1;
      return leftIndex - rightIndex;
    });
    return [
      { id: "all", label: "全部类型", count: platformFilteredSettings.length },
      ...accountTypes.map((accountType) => ({
        id: accountType,
        label: accountType,
        count: counts.get(accountType),
      })),
    ];
  }, [platformFilteredSettings]);
  const visibleSettings = useMemo(
    () => accountTypeFilter === "all"
      ? platformFilteredSettings
      : platformFilteredSettings.filter(
          (setting) => (setting.accountType || "未分类") === accountTypeFilter,
        ),
    [platformFilteredSettings, accountTypeFilter],
  );

  async function loadSettings({ quiet = false } = {}) {
    if (!quiet) setIsLoadingSettings(true);
    try {
      const next = await getCrawlSettings();
      setSettings((current) => next.map((setting) => {
        const editing = current.find((item) => item.accountId === setting.accountId && item.isDirty);
        return editing || setting;
      }));
      setError("");
    } catch (loadError) {
      setError(loadError.message || "暂时无法读取抓取设置");
    } finally {
      if (!quiet) setIsLoadingSettings(false);
    }
  }

  async function loadContentList({ quiet = false } = {}) {
    if (!quiet) setIsLoadingContents(true);
    try {
      const nextContents = await getContents(filters);
      setContents((current) => (
        JSON.stringify(current) === JSON.stringify(nextContents) ? current : nextContents
      ));
      setError("");
    } catch (loadError) {
      setError(loadError.message || "暂时无法读取内容库");
    } finally {
      if (!quiet) setIsLoadingContents(false);
    }
  }

  async function loadPromptOptions() {
    try {
      const library = await getPromptLibrary();
      setPrompts(Array.isArray(library?.prompts) ? library.prompts : []);
    } catch (loadError) {
      toast.danger("提示词读取失败", { description: loadError.message });
    }
  }

  function mergeSession(nextSession) {
    if (!nextSession?.platform) return;
    setSessions((current) => ({ ...current, [nextSession.platform]: nextSession }));
  }

  async function loadAdapterList() {
    try {
      const nextAdapters = await getCrawlerPlatforms();
      setAdapters(nextAdapters);
      setSessions(Object.fromEntries(nextAdapters.map((adapter) => [adapter.platform, adapter.session])));
    } catch (adapterError) {
      setError(adapterError.message || "暂时无法读取平台适配器");
    }
  }

  async function loadJobList({ quiet = false } = {}) {
    if (!quiet) setIsRefreshingJobs(true);
    try {
      setJobs(await getCrawlJobs(100));
      setJobClock(Date.now());
      setError("");
    } catch (loadError) {
      setError(loadError.message || "暂时无法读取抓取记录");
    } finally {
      setIsLoadingJobs(false);
      if (!quiet) setIsRefreshingJobs(false);
    }
  }

  useEffect(() => {
    if (section === "drafts" || hasInitializedCrawlerDataRef.current) return;
    hasInitializedCrawlerDataRef.current = true;
    void loadSettings();
    void loadAdapterList();
  }, [section]);

  useEffect(() => {
    if (!adapters.some((adapter) => adapter.platform === sessionPlatform)) return;
    void getCrawlerSession(sessionPlatform).then(mergeSession).catch(() => {});
  }, [sessionPlatform, adapters.length]);

  useEffect(() => {
    if (section === "content") void loadContentList();
  }, [section, filters.status, filters.accountId, filters.sortByPublishedAt]);

  useEffect(() => {
    if (section === "content") void loadPromptOptions();
  }, [section]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      if (section === "settings" || section === "content") void loadSettings({ quiet: true });
    }, 15_000);
    return () => window.clearInterval(timer);
  }, [section]);

  useEffect(() => {
    if (section !== "content") return undefined;
    const timer = window.setInterval(() => void loadContentList({ quiet: true }), 2_000);
    return () => window.clearInterval(timer);
  }, [section, filters.status, filters.accountId, filters.sortByPublishedAt]);

  useEffect(() => {
    if (section !== "jobs") return undefined;

    let stopped = false;
    let timer;
    async function refresh(initial = false) {
      await loadJobList({ quiet: !initial });
      if (!stopped) timer = window.setTimeout(() => refresh(false), 2_000);
    }
    void refresh(true);
    return () => {
      stopped = true;
      window.clearTimeout(timer);
    };
  }, [section]);

  useEffect(() => {
    if (session.status !== "checking") return undefined;

    const timer = window.setInterval(() => {
      void getCrawlerSession(sessionPlatform).then(mergeSession).catch(() => {});
    }, 2_000);
    return () => window.clearInterval(timer);
  }, [session.status, sessionPlatform]);

  useEffect(() => {
    if (accountPlatformFilter === "all") return;
    if (!settings.some((setting) => (setting.accountPlatform || "未知平台") === accountPlatformFilter)) {
      setAccountPlatformFilter("all");
    }
  }, [settings, accountPlatformFilter]);

  useEffect(() => {
    if (accountTypeFilter === "all") return;
    if (!accountTypeFilters.some((accountType) => accountType.id === accountTypeFilter)) {
      setAccountTypeFilter("all");
    }
  }, [accountTypeFilters, accountTypeFilter]);

  function changeSetting(accountId, name, value) {
    setSettings((current) => current.map((setting) => (
      setting.accountId === accountId ? { ...setting, [name]: value, isDirty: true } : setting
    )));
  }

  async function toggleSetting(setting, name, value) {
    const nextSetting = {
      ...setting,
      [name]: value,
      ...(name === "enabled" && value === false ? { autoGenerateDrafts: false } : {}),
      isDirty: true,
    };
    setSettings((current) => current.map((item) => (
      item.accountId === setting.accountId ? nextSetting : item
    )));
    await saveSetting(nextSetting);
  }

  async function saveSetting(setting, { quiet = false } = {}) {
    setSavingIds((current) => new Set(current).add(setting.accountId));
    try {
      const saved = await saveCrawlSettings(setting.accountId, {
        enabled: setting.enabled,
        autoGenerateDrafts: setting.autoGenerateDrafts === true,
        intervalHours: Number(setting.intervalHours),
        maxPosts: Number(setting.maxPosts),
        lookbackHours: Number(setting.lookbackHours),
      });
      setSettings((current) => current.map((item) => item.accountId === saved.accountId ? saved : item));
      if (!quiet) {
        toast.success("抓取设置已保存", { description: `「${setting.accountName}」会按新规则运行。` });
      }
      return saved;
    } catch (saveError) {
      toast.danger("保存失败", { description: saveError.message });
      return null;
    } finally {
      setSavingIds((current) => {
        const next = new Set(current);
        next.delete(setting.accountId);
        return next;
      });
    }
  }

  async function runSetting(setting) {
    if (setting.isDirty) {
      const saved = await saveSetting(setting, { quiet: true });
      if (!saved) return;
    }
    await runAccounts([setting.accountId]);
  }

  async function runEnabledAccounts() {
    const enabledSettings = settings.filter((setting) => setting.crawlSupported && setting.enabled);
    const readyIds = [];
    for (const setting of enabledSettings) {
      if (!setting.isDirty || await saveSetting(setting, { quiet: true })) {
        readyIds.push(setting.accountId);
      }
    }
    if (readyIds.length) await runAccounts(readyIds);
  }

  async function runAccounts(accountIds) {
    setRunningIds((current) => new Set([...current, ...accountIds]));
    try {
      const result = await startCrawl(accountIds);
      if (result.queuedCount) {
        toast.success("已加入抓取队列", { description: `${result.queuedCount} 个账号会依次抓取，可在“抓取记录”查看进度。` });
      }
      if (result.skipped?.length) {
        toast.warning(`${result.skipped.length} 个账号未入队`, {
          description: result.skipped.slice(0, 2).map((item) => `${item.accountName}：${item.reason}`).join("；"),
        });
      } else if (!result.queuedCount) {
        toast.warning("这些账号已经在队列中");
      }
      await loadSettings({ quiet: true });
    } catch (runError) {
      toast.danger("无法开始抓取", { description: runError.message });
    } finally {
      setRunningIds((current) => {
        const next = new Set(current);
        accountIds.forEach((id) => next.delete(id));
        return next;
      });
    }
  }

  async function checkSession() {
    setIsCheckingSession(true);
    try {
      mergeSession(await checkCrawlerSession(sessionPlatform));
    } catch (sessionError) {
      toast.danger("检查失败", { description: sessionError.message });
    } finally {
      setIsCheckingSession(false);
    }
  }

  async function uploadSessionState(event) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    setIsUploadingSession(true);
    try {
      const nextSession = await uploadCrawlerSessionState(file, sessionPlatform);
      mergeSession(nextSession);
      if (nextSession.status === "connected") {
        toast.success("登录状态已更新", { description: "状态文件有效，爬虫可以复用这次登录。" });
      } else if (nextSession.status === "checking") {
        toast.success("状态文件已上传", { description: "登录检查正在后台进行，结果会自动刷新。" });
      } else {
        toast.warning("状态文件已上传", { description: nextSession.message });
      }
    } catch (uploadError) {
      toast.danger("上传失败", { description: uploadError.message });
    } finally {
      setIsUploadingSession(false);
    }
  }

  async function deleteJobRecord(id, accountName) {
    try {
      await deleteCrawlJob(id);
      setJobs((current) => current.filter((job) => job.id !== id));
      toast.success("抓取记录已删除", { description: `「${accountName || "未知账号"}」的任务记录已移除。` });
      return true;
    } catch (deleteError) {
      toast.danger("删除失败", { description: deleteError.message });
      return false;
    }
  }

  async function cancelJobRecord(id, accountName) {
    try {
      const cancelled = await cancelCrawlJob(id);
      setJobs((current) => current.map((job) => job.id === id ? cancelled : job));
      await loadSettings({ quiet: true });
      toast.success("抓取任务已停止", { description: `「${accountName || "未知账号"}」不会继续抓取。` });
      return true;
    } catch (cancelError) {
      toast.danger("停止失败", { description: cancelError.message });
      return false;
    }
  }

  async function deleteContentRecord(id, accountName) {
    try {
      await deleteContent(id);
      setContents((current) => current.filter((item) => item.id !== id));
      toast.success("内容已删除", { description: `「${accountName || "未知账号"}」的这条内容已移除。` });
      return true;
    } catch (deleteError) {
      toast.danger("删除失败", { description: deleteError.message });
      return false;
    }
  }

  function toggleContentSelection(id) {
    setSelectedContentIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function deleteSelectedContents(close) {
    if (deletingSelectedRef.current || !selectedVisibleIds.length) return;
    deletingSelectedRef.current = true;
    setIsDeletingSelected(true);
    const ids = [...selectedVisibleIds];
    const deletedIds = new Set();
    const failures = [];
    try {
      // 复用单条删除的稿件、生成任务保护，每批最多发送四个请求。
      for (let offset = 0; offset < ids.length; offset += 4) {
        const batch = ids.slice(offset, offset + 4);
        const results = await Promise.allSettled(batch.map((id) => deleteContent(id)));
        results.forEach((result, index) => {
          if (result.status === "fulfilled") deletedIds.add(batch[index]);
          else failures.push(result.reason?.message || "删除失败，请稍后重试");
        });
      }
      setContents((current) => current.filter((item) => !deletedIds.has(item.id)));
      setSelectedContentIds((current) => new Set([...current].filter((id) => !deletedIds.has(id))));
      if (failures.length) {
        toast.warning(`已删除 ${deletedIds.size} 条，${failures.length} 条未删除`, {
          description: [...new Set(failures)].join("；"),
        });
      } else {
        toast.success(`已删除 ${deletedIds.size} 条内容`);
      }
      close();
    } finally {
      deletingSelectedRef.current = false;
      setIsDeletingSelected(false);
    }
  }

  async function generateDraft(item) {
    try {
      const result = await createGenerationJobs([item.id]);
      if (!result.createdCount) {
        const message = result.results?.[0]?.error || "没有创建生成任务";
        toast.warning("暂时无法生成", { description: message });
        return false;
      }
      setContents((current) => current.map((content) => (
        content.id === item.id ? { ...content, status: "已处理" } : content
      )));
      toast.success("已加入生成队列", {
        description: "可到“稿件管理”实时查看 AI 处理进度。",
      });
      return true;
    } catch (generationError) {
      toast.danger("生成任务创建失败", { description: generationError.message });
      return false;
    }
  }

  async function generateAllPendingDrafts() {
    setIsGeneratingAll(true);
    try {
      const result = await createPendingGenerationJobs();
      await loadContentList({ quiet: true });
      if (!result.createdCount) {
        toast.warning("没有待处理内容", { description: "当前所有帖子都已经进入过稿件生成流程。" });
        return;
      }
      toast.success(`已加入 ${result.createdCount} 条内容`, {
        description: result.failedCount
          ? `${result.failedCount} 条内容因提示词或模型配置问题未能加入，可修正后再次生成。`
          : "全部待处理内容已加入队列，可到“稿件管理”查看进度。",
      });
    } catch (generationError) {
      await loadContentList({ quiet: true });
      toast.danger("全部生成失败", { description: generationError.message });
    } finally {
      setIsGeneratingAll(false);
    }
  }

  async function changeContentPrompt(item, promptId) {
    try {
      const saved = await updateContentPrompt(item.id, promptId);
      setContents((current) => current.map((content) => (
        content.id === saved.contentId ? { ...content, promptId: saved.promptId } : content
      )));
      toast.success("帖子提示词已更新", {
        description: `仅当前帖子改为 ${saved.promptAccountTypeName} · ${saved.promptTitle}`,
      });
      return true;
    } catch (saveError) {
      toast.danger("提示词修改失败", { description: saveError.message });
      return false;
    }
  }

  const showSettings = section === "settings";
  const showJobs = section === "jobs";
  const showDrafts = section === "drafts";
  const showContents = !showSettings && !showJobs && !showDrafts;
  const activeJobCount = jobs.filter((job) => job.status === "queued" || job.status === "running").length;
  const visibleJobs = jobStatusFilter === "all"
    ? jobs
    : jobs.filter((job) => (
        jobStatusFilter === "active"
          ? job.status === "queued" || job.status === "running"
          : job.status === jobStatusFilter
      ));
  const pageCopy = showSettings
    ? {
        section: "抓取设置",
        title: "抓取设置",
        description: "按平台和账号配置登录状态、抓取频率与自动生成规则。",
      }
    : showDrafts
      ? {
          section: "稿件管理",
          title: "稿件管理",
          description: "管理生成文案与配图，确认发布状态并继续编辑或重新生成。",
        }
      : showJobs
      ? {
          section: "抓取记录",
          title: "抓取记录",
          description: "实时查看排队、抓取、完成和失败状态，运行中的记录每 2 秒同步一次。",
        }
      : {
          section: "内容列表",
          title: "内容列表",
          description: "集中查看已抓取的原创帖子，筛选、批量选择并生成稿件。",
        };
  const sessionConnected = session.status === "connected";
  const sessionChecking = session.status === "checking";
  const adapterLabel = activeAdapter?.label || sessionPlatform;
  const adapterAvailable = activeAdapter?.available === true;
  let sessionTitle = `请上传${adapterLabel}登录状态文件`;
  if (!adapterAvailable || session.status === "unavailable") {
    sessionTitle = `${adapterLabel}适配器待接入`;
  } else if (sessionConnected) {
    sessionTitle = activeAdapter?.sessionRequired
      ? `状态文件有效，${adapterLabel}已登录`
      : `${adapterLabel}适配器可以运行`;
  } else if (sessionChecking) {
    sessionTitle = `正在检查${adapterLabel}登录状态`;
  } else if (session.status === "failed") {
    sessionTitle = "状态文件检查失败";
  } else if (session.status === "unknown" && session.stateFilePresent) {
    sessionTitle = "状态文件等待检查";
  } else if (session.stateFilePresent) {
    sessionTitle = `${adapterLabel}登录状态已失效`;
  }

  return (
    <section className={`content-library-page${showJobs ? " is-jobs" : ""}${showSettings ? " is-settings" : ""}${showContents ? " is-contents" : ""}${showDrafts ? " is-drafts" : ""}`} aria-label="内容库">
        <div className={`content-library-intro${showJobs ? " is-jobs" : ""}${showSettings ? " is-settings" : ""}${showContents ? " is-contents" : ""}${showDrafts ? " is-drafts" : ""}`}>
          <div>
            {!showJobs && !showSettings && !showContents && !showDrafts && (
              <span className="content-eyebrow">
                <Sparkle size={15} weight="fill" />
                内容库 · {pageCopy.section}
              </span>
            )}
            <h1>{pageCopy.title}</h1>
            {pageCopy.description && <p>{pageCopy.description}</p>}
          </div>
        </div>

      {error && <div className="content-error" role="alert">{error}</div>}

      {showSettings ? (
        <>
          <div className="crawler-adapter-bar" aria-label="选择平台爬虫适配器">
            <div>
              <strong>平台爬虫适配器</strong>
              <span>登录状态和执行入口彼此独立</span>
            </div>
            <div className="crawler-adapter-options" role="group" aria-label="平台适配器">
              {adapters.map((adapter) => (
                <button
                  key={adapter.platform}
                  type="button"
                  className={`crawler-adapter-option${sessionPlatform === adapter.platform ? " is-active" : ""}${adapter.available ? " is-ready" : " is-missing"}`}
                  data-platform={adapter.platform}
                  aria-pressed={sessionPlatform === adapter.platform}
                  onClick={() => setSessionPlatform(adapter.platform)}
                >
                  <i aria-hidden="true" />
                  {adapter.platform}
                  <small>{adapter.available ? "已接入" : "待接入"}</small>
                </button>
              ))}
            </div>
          </div>

          <Surface className={`crawler-session-card ${sessionConnected ? "is-connected" : ""}${adapterAvailable ? "" : " is-unavailable"}`} variant="default">
            <span className="crawler-session-icon">
              {sessionConnected ? <CloudCheck size={25} weight="duotone" /> : <CloudSlash size={25} weight="duotone" />}
            </span>
            <div>
              <strong>{sessionTitle}</strong>
              <p>{session.message}。</p>
              {session.stateFilePresent && (
                <span className="crawler-state-meta">
                  {session.stateFileName} · {session.stateCookieCount || 0} 个 Cookie
                  {session.stateFileUploadedAt ? ` · 上传于 ${formatDate(session.stateFileUploadedAt)}` : ""}
                </span>
              )}
              {!adapterAvailable && (
                <p className="crawler-state-help">
                  将该平台爬虫放到 <code>{activeAdapter?.expectedEntry || "spider/对应平台爬虫/crawl_with_state.py"}</code>，重启后会自动识别。
                </p>
              )}
              {adapterAvailable && activeAdapter?.sessionRequired && !sessionConnected && (
                <p className="crawler-state-help">
                  {sessionPlatform === "X" ? (
                    <>请在本机运行 <code>npm run crawler:save-state</code>，再上传生成的 <code>x-login-state.json</code>。</>
                  ) : (
                    <>请使用{adapterLabel}爬虫提供的状态导出脚本，再上传 <code>{activeAdapter.stateFileName}</code>。</>
                  )}
                </p>
              )}
            </div>
            {adapterAvailable && activeAdapter?.sessionRequired && (
              <div className="crawler-session-actions">
                <input
                  ref={stateFileInputRef}
                  type="file"
                  accept=".json,application/json"
                  className="crawler-state-input"
                  aria-label={`选择${adapterLabel}登录状态文件`}
                  onChange={uploadSessionState}
                />
                <Button
                  variant={sessionConnected ? "secondary" : "primary"}
                  size="sm"
                  onPress={() => stateFileInputRef.current?.click()}
                  isDisabled={isUploadingSession || isCheckingSession || sessionChecking}
                >
                  <UploadSimple size={16} />
                  {isUploadingSession ? "上传并检查中" : session.stateFilePresent ? "更新状态文件" : "上传状态文件"}
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onPress={checkSession}
                  isDisabled={isCheckingSession || isUploadingSession || sessionChecking}
                >
                  <ArrowClockwise size={16} className={isCheckingSession || sessionChecking ? "is-spinning" : ""} />
                  {isCheckingSession || sessionChecking ? "检查中" : "检查登录"}
                </Button>
              </div>
            )}
          </Surface>

          {!isLoadingSettings && settings.length > 0 && (
            <Surface className="content-filter-bar crawl-account-select-filter" variant="default">
              <div className="crawl-platform-buttons" role="group" aria-label="按平台筛选账号">
                {platformFilters.map((platform) => (
                  <button
                    key={platform.id}
                    type="button"
                    aria-pressed={accountPlatformFilter === platform.id}
                    onClick={() => {
                      setAccountPlatformFilter(platform.id);
                      if (platform.id !== "all" && adapters.some((adapter) => adapter.platform === platform.id)) {
                        setSessionPlatform(platform.id);
                      }
                    }}
                  >
                    {platform.label}<span>{platform.count}</span>
                  </button>
                ))}
              </div>
              <label>
                <span>账号类型</span>
                <select
                  value={accountTypeFilter}
                  onChange={(event) => setAccountTypeFilter(event.target.value)}
                >
                  {accountTypeFilters.map((accountType) => (
                    <option key={accountType.id} value={accountType.id}>
                      {accountType.label}（{accountType.count}）
                    </option>
                  ))}
                </select>
              </label>
            </Surface>
          )}

          <div className="crawl-settings-toolbar">
            <div>
              <h2>选择要持续关注的账号</h2>
              <p>可分别开启定时抓取和自动生成；只有本次新入库的内容会进入稿件生成队列。</p>
            </div>
            <Button variant="primary" onPress={runEnabledAccounts} isDisabled={enabledIds.length === 0}>
              <Play size={17} weight="fill" /> 抓取已开启账号（{enabledIds.length}）
            </Button>
          </div>

          {isLoadingSettings ? (
            <div className="content-gentle-state"><span className="content-loader" />正在同步账号库…</div>
          ) : settings.length === 0 ? (
            <div className="content-gentle-state">
              <CloudSlash size={34} weight="duotone" />
              <strong>账号库里还没有账号</strong>
              <span>先去账号库添加账号，就会自动同步到这里。</span>
            </div>
          ) : visibleSettings.length === 0 ? (
            <div className="content-gentle-state">
              <CloudSlash size={34} weight="duotone" />
              <strong>当前筛选条件下没有账号</strong>
              <span>请选择其他平台或账号类型，也可以切回全部查看。</span>
            </div>
          ) : (
            <div className="crawl-account-list">
              {visibleSettings.map((setting) => (
                <CrawlAccountCard
                  key={setting.accountId}
                  setting={setting}
                  onChange={(name, value) => (
                    name === "enabled" || name === "autoGenerateDrafts"
                      ? toggleSetting(setting, name, value)
                      : changeSetting(setting.accountId, name, value)
                  )}
                  onSave={() => saveSetting(setting)}
                  onRun={() => runSetting(setting)}
                  isSaving={savingIds.has(setting.accountId)}
                  isRunning={runningIds.has(setting.accountId)}
                />
              ))}
            </div>
          )}
        </>
      ) : showDrafts ? <DraftManagement /> : showJobs ? (
        <>
          <Surface className="crawl-job-toolbar" variant="default">
            <div className="crawl-job-toolbar-copy">
              <strong>最近 {jobs.length} 条记录</strong>
              <span className={`crawl-job-live${activeJobCount > 0 ? " is-active" : ""}`} aria-live="polite">
                <i aria-hidden="true" />
                {activeJobCount > 0 ? `${activeJobCount} 个任务正在执行或排队` : "每 2 秒自动刷新"}
              </span>
            </div>
            <div className="crawl-job-summary" aria-label="抓取记录统计">
              {[
                ["all", "全部", jobs.length],
                ["active", "进行中", activeJobCount],
                ["success", "已完成", jobs.filter((job) => job.status === "success").length],
                ["failed", "失败", jobs.filter((job) => job.status === "failed").length],
                ["cancelled", "已停止", jobs.filter((job) => job.status === "cancelled").length],
              ].map(([status, label, count]) => (
                <button
                  key={status}
                  type="button"
                  aria-pressed={jobStatusFilter === status}
                  onClick={() => setJobStatusFilter(status)}
                >
                  {label} <strong>{count}</strong>
                </button>
              ))}
            </div>
            <Button
              isIconOnly
              variant="tertiary"
              aria-label="刷新抓取记录"
              onPress={() => loadJobList()}
              isDisabled={isRefreshingJobs}
            >
              <ArrowClockwise size={18} className={isRefreshingJobs ? "is-spinning" : ""} />
            </Button>
          </Surface>

          {isLoadingJobs ? (
            <div className="content-gentle-state"><span className="content-loader" />正在读取抓取记录…</div>
          ) : jobs.length === 0 ? (
            <div className="content-gentle-state">
              <ClockCounterClockwise size={38} weight="duotone" />
              <strong>还没有抓取记录</strong>
              <span>去“抓取设置”点击立即抓取，任务进度会实时显示在这里。</span>
            </div>
          ) : visibleJobs.length === 0 ? (
            <div className="content-gentle-state is-compact">
              <ClockCounterClockwise size={32} weight="duotone" />
              <strong>没有符合当前状态的记录</strong>
              <span>切换到其他状态或“全部”继续查看。</span>
            </div>
          ) : (
            <div className="crawl-job-list">
              {visibleJobs.map((job) => (
                <CrawlJobCard
                  key={job.id}
                  job={job}
                  now={jobClock}
                  onDelete={deleteJobRecord}
                  onCancel={cancelJobRecord}
                />
              ))}
            </div>
          )}
        </>
      ) : (
        <>
          <Surface className="content-filter-bar" variant="default">
            <div>
              <strong>抓取到的内容</strong>
              <span>共显示 {contents.length} 条</span>
            </div>
            <label>
              <span>状态</span>
              <select value={filters.status} onChange={(event) => setFilters((current) => ({ ...current, status: event.target.value }))}>
                <option value="all">全部状态</option>
                {CONTENT_STATUSES.map((status) => <option key={status}>{status}</option>)}
              </select>
            </label>
            <label>
              <span>账号</span>
              <select value={filters.accountId} onChange={(event) => setFilters((current) => ({ ...current, accountId: event.target.value }))}>
                <option value="all">全部账号</option>
                {settings.map((setting) => <option key={setting.accountId} value={setting.accountId}>{setting.accountName}</option>)}
              </select>
            </label>
            <Button
              size="sm"
              variant="primary"
              className="content-generate-all-button"
              isDisabled={isGeneratingAll}
              onPress={generateAllPendingDrafts}
            >
              <Sparkle size={16} weight="fill" />
              {isGeneratingAll ? "正在加入…" : "全部生成"}
            </Button>
            <button
              type="button"
              className={`content-sort-button${filters.sortByPublishedAt ? " is-active" : ""}`}
              aria-pressed={filters.sortByPublishedAt}
              aria-label={filters.sortByPublishedAt ? "关闭按帖子发布时间排序" : "开启按帖子发布时间排序"}
              title={filters.sortByPublishedAt
                ? "当前按帖子发布时间排序"
                : "当前按抓取顺序排序，新抓取的内容在上方"}
              onClick={() => setFilters((current) => ({
                ...current,
                sortByPublishedAt: !current.sortByPublishedAt,
              }))}
            >
              <SortAscending size={17} /> 排序
            </button>
            <Button
              isIconOnly
              className="content-refresh-button"
              variant="tertiary"
              aria-label="刷新内容"
              onPress={() => loadContentList()}
            >
              <ArrowClockwise size={18} />
            </Button>
          </Surface>

          <div className="content-bulk-toolbar">
            <label className="content-select-all">
              <input
                ref={selectAllRef}
                type="checkbox"
                className="content-selection-checkbox"
                checked={allContentsSelected}
                disabled={isLoadingContents || isDeletingSelected || contents.length === 0}
                onChange={() => setSelectedContentIds(
                  allContentsSelected ? new Set() : new Set(contents.map((item) => item.id)),
                )}
              />
              全选
            </label>
            <span className="content-selection-count" aria-live="polite">
              已选 {selectedVisibleIds.length} / {contents.length} 条 · 仅当前显示内容
            </span>
            <AlertDialog>
              <AlertDialog.Trigger
                className="content-bulk-delete-button"
                disabled={!selectedVisibleIds.length || isLoadingContents || isDeletingSelected}
              >
                <Trash size={16} aria-hidden="true" />
                {isDeletingSelected ? "正在删除…" : "一键删除"}
              </AlertDialog.Trigger>
              <AlertDialog.Backdrop variant="blur" isDismissable={!isDeletingSelected} isKeyboardDismissDisabled={isDeletingSelected}>
                <AlertDialog.Container placement="center" size="xs">
                  <AlertDialog.Dialog>
                    {({ close }) => (
                      <>
                        <AlertDialog.Header>
                          <AlertDialog.Icon status="danger" />
                          <AlertDialog.Heading>删除选中的 {selectedVisibleIds.length} 条内容？</AlertDialog.Heading>
                        </AlertDialog.Header>
                        <AlertDialog.Body>
                          所选内容将永久移除。已有稿件或正在生成的帖子会保留，并提示原因。原平台帖子和抓取记录不受影响。
                        </AlertDialog.Body>
                        <AlertDialog.Footer>
                          <Button slot="close" variant="secondary" isDisabled={isDeletingSelected}>取消</Button>
                          <Button variant="danger" isDisabled={isDeletingSelected || !selectedVisibleIds.length} onPress={() => deleteSelectedContents(close)}>
                            {isDeletingSelected ? "正在删除…" : "确认删除"}
                          </Button>
                        </AlertDialog.Footer>
                      </>
                    )}
                  </AlertDialog.Dialog>
                </AlertDialog.Container>
              </AlertDialog.Backdrop>
            </AlertDialog>
          </div>

          {isLoadingContents ? (
            <div className="content-gentle-state"><span className="content-loader" />正在整理内容…</div>
          ) : contents.length === 0 ? (
            <div className="content-gentle-state">
              <ClockCounterClockwise size={38} weight="duotone" />
              <strong>这里还没有内容</strong>
              <span>去“抓取设置”选择账号并立即抓取，帖子会出现在这里。</span>
            </div>
          ) : (
            <ContentCardList
              contents={contents}
              prompts={prompts}
              promptIdsByAccount={promptIdsByAccount}
              onDelete={deleteContentRecord}
              onGenerate={generateDraft}
              onPromptChange={changeContentPrompt}
              selectedIds={selectedContentIds}
              onToggleSelected={toggleContentSelection}
              selectionDisabled={isDeletingSelected}
            />
          )}
        </>
      )}
    </section>
  );
}
