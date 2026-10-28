import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@heroui/react/button";
import { Modal } from "@heroui/react/modal";
import { toast } from "@heroui/react/toast";
import { ArrowClockwise } from "@phosphor-icons/react/ArrowClockwise";
import { ArrowSquareOut } from "@phosphor-icons/react/ArrowSquareOut";
import { ArrowsInSimple } from "@phosphor-icons/react/ArrowsInSimple";
import { CircleNotch } from "@phosphor-icons/react/CircleNotch";
import { CheckCircle } from "@phosphor-icons/react/CheckCircle";
import { MagnifyingGlassPlus } from "@phosphor-icons/react/MagnifyingGlassPlus";
import { Minus } from "@phosphor-icons/react/Minus";
import { PencilSimple } from "@phosphor-icons/react/PencilSimple";
import { PaperPlaneTilt } from "@phosphor-icons/react/PaperPlaneTilt";
import { Plus } from "@phosphor-icons/react/Plus";
import { Trash } from "@phosphor-icons/react/Trash";
import { WarningCircle } from "@phosphor-icons/react/WarningCircle";
import {
  cancelGenerationJob,
  deleteDraft,
  deleteDraftMedia,
  deleteGenerationJob,
  generateDraftImage,
  getDrafts,
  getGenerationJobs,
  regenerateDraft,
  retryGenerationJob,
  updateDraft,
  updateDraftMedia,
} from "../../api/content";
import "./draft-management.css";
import { getDraftPublications, previewDraftPublication, publishDraft, allowDraftPublicationRetry } from "../../api/publishing-accounts";

const ACTIVE_JOB_STATUSES = new Set(["queued", "running", "retry_wait"]);
const MIN_IMAGE_ZOOM = 0.5;
const MAX_IMAGE_ZOOM = 3;
const IMAGE_ZOOM_STEP = 0.25;
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

function GenerationCard({ job, onRetry, onCancel, onDelete }) {
  const active = ACTIVE_JOB_STATUSES.has(job.status);
  const cancelled = job.errorCode === "USER_CANCELLED";

  return (
    <article className={`draft-card draft-generation-card${active ? " is-active" : " is-failed"}`}>
      <header className="draft-card-header">
        <span className="draft-account-avatar">{job.accountName?.slice(0, 1) || "稿"}</span>
        <div>
          <strong>{job.accountName || "未知账号"}</strong>
          <span>{formatDate(job.createdAt)}</span>
        </div>
        <div className="draft-trace-tags">
          {job.promptTitle && <span>提示词：{job.promptTitle}</span>}
          {job.modelName && <span>{job.modelName}</span>}
        </div>
      </header>

      {job.preview && (
        <div className="draft-progress-preview">
          <h3>{job.preview.title}</h3>
          <p>{job.preview.body}</p>
          <div className="draft-trace-tags">{job.preview.hashtags?.map((tag, index) => <span key={index}>{tag}</span>)}</div>
          <div className="draft-preview-images">
            {job.preview.sizes?.map((size, index) => {
              const image = job.preview.images?.find((item) => item.index === index);
              return <div className="draft-preview-slot" key={index}>
                {image?.url ? <img src={image.url} alt={`配图 ${index + 1}`} /> : <>
                  {active && !image?.error ? <CircleNotch className="draft-generation-spinner" size={28} /> : <WarningCircle size={28} />}
                  <span>图 {index + 1} · {size}</span>
                  <small>{image?.error || (active ? "正在生成" : "未完成")}</small>
                </>}
              </div>;
            })}
          </div>
        </div>
      )}
      <div className={`draft-generation-state${job.preview ? " has-preview" : ""}`} role="status" aria-live="polite">
        {active
          ? <CircleNotch className="draft-generation-spinner" size={38} weight="bold" aria-hidden="true" />
          : <WarningCircle size={38} weight="duotone" aria-hidden="true" />}
        <strong>{active ? "正在生成稿件" : cancelled ? "生成已取消" : "稿件生成失败"}</strong>
        <span>{job.message || job.errorMessage || (active ? "请稍候，完成后会自动显示稿件内容" : "可以重新尝试生成")}</span>
      </div>

      <footer className="draft-card-footer draft-generation-footer">
        {job.sourceUrl && (
          <a className="draft-action" href={job.sourceUrl} target="_blank" rel="noreferrer">查看原帖 <ArrowSquareOut size={15} /></a>
        )}
        <div className="draft-toolbar-group">
          {active ? (
            <Button className="draft-action" size="sm" variant="secondary" onPress={() => onCancel(job.id)}>取消生成</Button>
          ) : (
            <Button className="draft-action" size="sm" variant="secondary" onPress={() => onRetry(job.id)}>
              <ArrowClockwise size={15} /> 重新生成
            </Button>
          )}
          {job.status === "failed" && (
            <Button className="draft-action is-danger" size="sm" variant="secondary" onPress={() => onDelete(job.id)}>
              <Trash size={15} /> 删除记录
            </Button>
          )}
        </div>
      </footer>
    </article>
  );
}

function ImageActionButton({ media, edit = false, disabled: locked = false }) {
  const [direction, setDirection] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const submittingRef = useRef(false);
  const label = edit ? "修改图片" : "重新生成";
  async function submit(event, close) {
    event.preventDefault();
    if (submittingRef.current) return;
    submittingRef.current = true;
    setSubmitting(true);
    try {
      await generateDraftImage(media.id, edit ? "edit" : "regenerate", direction.trim());
      toast.success("已开始生成图片", { description: "成功后自动替换，失败会保留原图。" });
      close();
    } catch (error) { toast.danger("图片生成失败", { description: error.message }); }
    finally { setSubmitting(false); submittingRef.current = false; }
  }
  const disabled = locked || submitting || media.imageStatus === "running" || (edit ? media.downloadStatus !== "ready" : !media.canRegenerate);
  return (
    <Modal>
      <Modal.Trigger className="draft-image-action" isDisabled={disabled} onClick={() => setDirection("")}
        title={!edit && !media.canRegenerate ? "原帖图片没有生图提示词，可以使用修改图片" : label}>
        {edit ? <PencilSimple size={15} /> : <ArrowClockwise size={15} />}{label}
      </Modal.Trigger>
      <Modal.Backdrop variant="blur" isDismissable>
        <Modal.Container placement="center" size="sm" scroll="inside">
          <Modal.Dialog className="draft-regenerate-modal">
            {({ close }) => (
              <form onSubmit={(event) => submit(event, close)}>
                <Modal.Header><Modal.Heading>{label}</Modal.Heading><Modal.CloseTrigger /></Modal.Header>
                <Modal.Body>
                  <img className="draft-image-edit-reference" src={media.url} alt="当前图片" />
                  <p>{edit ? "以当前图片为底图，按照你的要求修改。" : "使用这张图原来的生图提示词重新生成，不修改正文。"}</p>
                  {edit && <label className="draft-regenerate-field"><span>修改要求</span>
                    <textarea value={direction} onChange={(event) => setDirection(Array.from(event.target.value).slice(0, 1000).join(""))} rows={5} required
                      placeholder="例如：保持主体不变，背景改成浅蓝色，去掉图中的文字……" />
                    <small>{Array.from(direction).length} / 1000 字符 · 底图必须小于 4MB</small>
                  </label>}
                </Modal.Body>
                <Modal.Footer><Button slot="close" variant="secondary">取消</Button>
                  <Button type="submit" isDisabled={submitting || (edit && !direction.trim())}>{submitting ? "正在提交…" : "确认生成"}</Button>
                </Modal.Footer>
              </form>
            )}
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}

function DeleteImageButton({ media, index, onDelete, disabled }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const guard = useRef(false);

  async function confirm() {
    if (guard.current) return;
    guard.current = true;
    setBusy(true);
    try {
      if (await onDelete(media.id)) setOpen(false);
    } finally {
      guard.current = false;
      setBusy(false);
    }
  }

  return <Modal isOpen={open} onOpenChange={(value) => { if (!busy) setOpen(value); }}>
    <Modal.Trigger className="draft-media-delete" isDisabled={disabled || busy}
      aria-label={`删除配图 ${index + 1}`} title="删除图片">
      <Trash size={17} aria-hidden="true" />
    </Modal.Trigger>
    <Modal.Backdrop variant="blur" isDismissable={!busy}>
      <Modal.Container placement="center" size="sm">
        <Modal.Dialog className="draft-delete-image-modal">
          <Modal.Header><Modal.Heading>删除这张配图？</Modal.Heading><Modal.CloseTrigger aria-label="关闭删除确认" isDisabled={busy} /></Modal.Header>
          <Modal.Body>
            <img className="draft-image-edit-reference" src={media.url} alt={`待删除的配图 ${index + 1}`} />
            <p>删除后，这张图将从当前稿件移除，不再用于后续发布。不会修改原帖或已经发布到 X 的内容。</p>
          </Modal.Body>
          <Modal.Footer>
            <Button className="draft-action" variant="secondary" isDisabled={busy} onPress={() => setOpen(false)}>保留图片</Button>
            <Button className="draft-action is-danger" isDisabled={busy || disabled} onPress={confirm}>
              <Trash size={16} />{busy ? "删除中…" : "确认删除"}
            </Button>
          </Modal.Footer>
        </Modal.Dialog>
      </Modal.Container>
    </Modal.Backdrop>
  </Modal>;
}

function DraftMediaItem({ draft, media, index, onToggleMedia, onDeleteMedia, disabled }) {
  const alt = `${draft.title || "稿件"}配图 ${index + 1}`;
  const [zoom, setZoom] = useState(1);
  const previewCanvasRef = useRef(null);

  function changeZoom(nextZoom) {
    const normalizedZoom = Math.min(MAX_IMAGE_ZOOM, Math.max(MIN_IMAGE_ZOOM, nextZoom));
    const canvas = previewCanvasRef.current;
    const horizontalCenter = canvas?.scrollWidth
      ? (canvas.scrollLeft + canvas.clientWidth / 2) / canvas.scrollWidth
      : 0.5;
    const verticalCenter = canvas?.scrollHeight
      ? (canvas.scrollTop + canvas.clientHeight / 2) / canvas.scrollHeight
      : 0.5;

    setZoom(normalizedZoom);
    window.requestAnimationFrame(() => {
      if (!canvas) return;
      canvas.scrollLeft = horizontalCenter * canvas.scrollWidth - canvas.clientWidth / 2;
      canvas.scrollTop = verticalCenter * canvas.scrollHeight - canvas.clientHeight / 2;
    });
  }

  return (
    <div className="draft-media-cell">
    <div className={`draft-media-item${media.enabled ? " is-enabled" : " is-disabled"}`}>
      <Modal>
        <Modal.Trigger
          className="draft-media-preview-trigger"
          aria-label={`放大查看${alt}`}
          title="点击放大图片"
          onClick={() => setZoom(1)}
        >
          <img src={media.url} alt={alt} loading="lazy" />
          <span className="draft-media-zoom-hint" aria-hidden="true">
            <MagnifyingGlassPlus size={18} weight="bold" />
          </span>
        </Modal.Trigger>
        <Modal.Backdrop className="draft-image-preview-backdrop" variant="blur" isDismissable>
          <Modal.Container placement="center" size="cover" scroll="inside">
            <Modal.Dialog className="draft-image-preview-modal">
              <Modal.Header>
                <Modal.Heading>{alt}</Modal.Heading>
                <div className="draft-image-preview-header-actions">
                  <div className="draft-image-zoom-controls" role="group" aria-label="图片缩放控制">
                    <button
                      type="button"
                      onClick={() => changeZoom(zoom - IMAGE_ZOOM_STEP)}
                      disabled={zoom <= MIN_IMAGE_ZOOM}
                      aria-label="缩小图片"
                      title="缩小"
                    >
                      <Minus size={17} weight="bold" aria-hidden="true" />
                    </button>
                    <output aria-live="polite">{Math.round(zoom * 100)}%</output>
                    <button
                      type="button"
                      onClick={() => changeZoom(zoom + IMAGE_ZOOM_STEP)}
                      disabled={zoom >= MAX_IMAGE_ZOOM}
                      aria-label="放大图片"
                      title="放大"
                    >
                      <Plus size={17} weight="bold" aria-hidden="true" />
                    </button>
                    <button
                      type="button"
                      className="draft-image-zoom-fit"
                      onClick={() => changeZoom(1)}
                      disabled={zoom === 1}
                      aria-label="恢复适应窗口"
                      title="恢复适应窗口"
                    >
                      <ArrowsInSimple size={17} aria-hidden="true" />
                      <span>适应</span>
                    </button>
                  </div>
                  <Modal.CloseTrigger aria-label="关闭图片预览" />
                </div>
              </Modal.Header>
              <Modal.Body>
                <div ref={previewCanvasRef} className="draft-image-preview-canvas">
                  <div
                    className="draft-image-preview-stage"
                    style={{ width: `${zoom * 100}%`, height: `${zoom * 100}%` }}
                  >
                    <img src={media.url} alt={alt} />
                  </div>
                </div>
              </Modal.Body>
            </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
      </Modal>
      <DeleteImageButton media={media} index={index} onDelete={onDeleteMedia} disabled={disabled} />
      <button
        type="button"
        className="draft-media-toggle"
        onClick={() => onToggleMedia(draft, media.id)}
        disabled={disabled}
        aria-pressed={media.enabled}
        title={media.enabled ? "点击取消使用这张图" : "点击使用这张图"}
      >
        {media.enabled ? "已选用" : "未选用"}
      </button>
    </div>
    <div className="draft-media-caption"><span>配图 {index + 1}</span>
      {media.generationSize && media.generationSize !== "auto" && <span>{media.generationSize.replace("x", "×")}</span>}
    </div>
    <div className="draft-image-actions"><ImageActionButton media={media} disabled={disabled} /><ImageActionButton media={media} edit disabled={disabled} /></div>
    {media.imageStatus === "running" && <small className="draft-image-status" role="status">正在生成图片…</small>}
    {media.imageStatus === "failed" && <small className="draft-image-error" role="alert">{media.imageError}</small>}
    </div>
  );
}

function DraftRegenerateButton({ draft, onRegenerate, disabled }) {
  const [direction, setDirection] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event, close) {
    event.preventDefault();
    setSubmitting(true);
    const started = await onRegenerate(draft, direction.trim());
    setSubmitting(false);
    if (started) {
      setDirection("");
      close();
    }
  }

  return (
    <Modal>
      <Modal.Trigger
        className="draft-action"
        isDisabled={disabled || submitting}
        aria-label={`重新生成稿件：${draft.title}`}
        onClick={() => setDirection("")}
      >
        <ArrowClockwise size={16} aria-hidden="true" />
        重新生成
      </Modal.Trigger>
      <Modal.Backdrop variant="blur" isDismissable>
        <Modal.Container placement="center" size="sm" scroll="inside">
          <Modal.Dialog className="draft-regenerate-modal">
            {({ close }) => (
              <form onSubmit={(event) => handleSubmit(event, close)}>
                <Modal.Header>
                  <div>
                    <Modal.Heading>重新生成稿件</Modal.Heading>
                    <p>可以补充调整方向；留空确认则按照原帖和当前提示词重新生成。</p>
                  </div>
                  <Modal.CloseTrigger aria-label="关闭重新生成窗口" />
                </Modal.Header>
                <Modal.Body>
                  <label className="draft-regenerate-field">
                    <span>调整方向</span>
                    <textarea
                      value={direction}
                      maxLength={4_000}
                      rows={7}
                      placeholder="例如：语气更轻松，重点突出产品变化，正文控制在 500 字以内……"
                      onChange={(event) => setDirection(event.target.value)}
                      autoFocus
                    />
                    <small>{direction.length} / 4000　可留空</small>
                  </label>
                </Modal.Body>
                <Modal.Footer>
                  <Button slot="close" variant="secondary" isDisabled={submitting}>取消</Button>
                  <Button type="submit" variant="primary" isDisabled={submitting}>
                    <ArrowClockwise size={16} aria-hidden="true" />
                    {submitting ? "正在加入…" : "确认重新生成"}
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

function DraftPublishButton({ draft, publication, disabled }) {
  const [unlockOpen, setUnlockOpen] = useState(false);
  const [preview, setPreview] = useState(null);
  const [busy, setBusy] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const guard = useRef(false);
  useEffect(() => { if (publication) setSubmitted(false); }, [publication]);
  async function open() {
    if (guard.current) return;
    guard.current = true; setBusy(true);
    try { setPreview(await previewDraftPublication(draft.id)); }
    catch (error) { toast.danger("暂时无法发布", { description: error.message }); }
    finally { setBusy(false); guard.current = false; }
  }
  async function confirm() {
    if (guard.current) return;
    guard.current = true; setBusy(true);
    try {
      await publishDraft(draft.id, { accountId: preview.accountId, fingerprint: preview.fingerprint });
      setPreview(null); setSubmitted(true); toast.success("发布任务已提交");
    } catch (error) { toast.danger("发布失败", { description: error.message }); }
    finally { setBusy(false); guard.current = false; }
  }
  const locked = submitted || ["running", "published", "unknown"].includes(publication?.status);
  return <>
    {publication?.status === "unknown" && <Button className="draft-action" size="sm" variant="secondary" isDisabled={busy || disabled} onPress={() => setUnlockOpen(true)}>已核实未发布</Button>}
    <Modal isOpen={unlockOpen} onOpenChange={(value) => { if (!busy) setUnlockOpen(value); }}>
      <Modal.Backdrop><Modal.Container><Modal.Dialog>
        <Modal.Header><Modal.Heading>确认允许重试</Modal.Heading><Modal.CloseTrigger /></Modal.Header>
        <Modal.Body>请先刷新 {publication?.accountName} 的 X 主页，确认没有这篇帖子。解除锁定可能造成重复发布，请仅在确认未发布后继续。本操作不会发送帖子。</Modal.Body>
        <Modal.Footer><Button variant="secondary" isDisabled={busy} onPress={() => setUnlockOpen(false)}>取消</Button><Button isDisabled={busy} onPress={async () => {
          if (guard.current) return;
          guard.current = true; setBusy(true);
          try { await allowDraftPublicationRetry(draft.id); setUnlockOpen(false); toast.success("已允许重试，请等待状态刷新后重新确认发布"); }
          catch (error) { toast.danger("无法解除锁定", { description: error.message }); }
          finally { guard.current = false; setBusy(false); }
        }}>确认未发布，允许重试</Button></Modal.Footer>
      </Modal.Dialog></Modal.Container></Modal.Backdrop>
    </Modal>
    {locked ? <span className={`draft-publication-badge is-${publication?.status || "running"}`} role="status">
      {publication?.status === "published" ? <CheckCircle size={17} /> : publication?.status === "unknown" ? <WarningCircle size={17} /> : <CircleNotch className="draft-generation-spinner" size={17} />}
      {publication?.status === "published" ? "已发布" : publication?.status === "unknown" ? "发布待核实" : "发布中…"}
    </span> : <Button className="draft-action is-primary" size="sm" variant="primary" onPress={open} isDisabled={disabled || busy}>
      <PaperPlaneTilt size={16} />{busy ? "检查中…" : "发布稿件"}
    </Button>}
    <Modal isOpen={Boolean(preview)} onOpenChange={(open) => { if (!open && !busy) setPreview(null); }}>
      <Modal.Backdrop><Modal.Container><Modal.Dialog className="draft-publish-modal">
        <Modal.Header><Modal.Heading>确认发布到 X</Modal.Heading><Modal.CloseTrigger /></Modal.Header>
        <Modal.Body>
          <p>发布账号：<strong>{preview?.accountName}</strong></p><p>{preview?.accountUrl}</p>
          <pre>{preview?.text}</pre>
          <p>将发布 {preview?.imageCount} 张已选用配图。确认后会真实发布，不会自动重试。</p>
        </Modal.Body>
        <Modal.Footer><Button onPress={confirm} isDisabled={busy}>{busy ? "提交中…" : "确认发布"}</Button></Modal.Footer>
      </Modal.Dialog></Modal.Container></Modal.Backdrop>
    </Modal>
  </>;
}

function DraftCard({ draft, publication, generating, onSave, onDelete, onToggleMedia, onDeleteMedia, onRegenerate }) {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(draft.title);
  const [body, setBody] = useState(draft.body);
  const [hashtags, setHashtags] = useState((draft.hashtags || []).join("，"));
  const [saving, setSaving] = useState(false);
  const mediaBusy = draft.media?.some((media) => media.imageStatus === "running");
  const mutationsLocked = generating || mediaBusy || publication?.status === "running";

  useEffect(() => {
    if (editing) return;
    setTitle(draft.title);
    setBody(draft.body);
    setHashtags((draft.hashtags || []).join("，"));
  }, [draft.body, draft.hashtags, draft.title, editing]);

  async function saveText() {
    setSaving(true);
    const saved = await onSave(draft.id, {
      title,
      body,
      hashtags: hashtags
        .split(/[\s,，]+/)
        .map((tag) => tag.trim().replace(/^#+/, ""))
        .filter(Boolean),
    });
    setSaving(false);
    if (saved) setEditing(false);
  }

  return (
    <article className="draft-card">
      <header className="draft-card-header">
        <span className="draft-account-avatar">{draft.account?.name?.slice(0, 1) || "稿"}</span>
        <div>
          <strong>{draft.account?.name || "未知账号"}</strong>
          <span>{draft.source?.platform || "未知平台"} · {formatDate(draft.updatedAt)}</span>
        </div>
        <div className="draft-trace-tags">
          {draft.prompt?.title && <span>提示词：{draft.prompt.title}</span>}
          {draft.ai?.modelName && <span>{draft.ai.modelName}</span>}
        </div>
      </header>

      {editing ? (
        <div className="draft-editor">
          <label>
            <span>稿件标题</span>
            <input value={title} maxLength={300} onChange={(event) => setTitle(event.target.value)} />
          </label>
          <label>
            <span>稿件正文</span>
            <textarea value={body} maxLength={30_000} onChange={(event) => setBody(event.target.value)} />
          </label>
          <label>
            <span>话题标签</span>
            <input
              value={hashtags}
              maxLength={1_000}
              placeholder="多个标签用空格或逗号分隔"
              onChange={(event) => setHashtags(event.target.value)}
            />
          </label>
          <div>
            <Button size="sm" variant="secondary" onPress={() => setEditing(false)} isDisabled={saving}>取消</Button>
            <Button size="sm" variant="primary" onPress={saveText} isDisabled={saving || !title.trim() || !body.trim()}>
              {saving ? "保存中" : "保存修改"}
            </Button>
          </div>
        </div>
      ) : (
        <div className="draft-copy">
          <h3>{draft.title}</h3>
          <p>{draft.body}</p>
          {draft.hashtags?.length > 0 && (
            <div className="draft-hashtags">{draft.hashtags.map((tag) => <span key={tag}>#{tag.replace(/^#/, "")}</span>)}</div>
          )}
        </div>
      )}

      {draft.media?.length > 0 ? (
        <div className="draft-media-grid" aria-label="稿件配图">
          {draft.media.map((media, index) => (
            <DraftMediaItem
              key={media.id}
              draft={draft}
              media={media}
              index={index}
              onToggleMedia={onToggleMedia}
              onDeleteMedia={onDeleteMedia}
              disabled={mutationsLocked}
            />
          ))}
        </div>
      ) : <p className="draft-no-media">暂无配图，将以纯文字发布。</p>}

      <footer className="draft-card-footer draft-actions-footer">
        <div className="draft-toolbar">
          <div className="draft-toolbar-group draft-reference-links">
          {draft.source?.sourceUrl && (
            <a className="draft-action" href={draft.source.sourceUrl} target="_blank" rel="noreferrer">原帖 <ArrowSquareOut size={15} /></a>
          )}
          {publication?.url && <a className="draft-action" href={publication.url} target="_blank" rel="noreferrer">已发布帖子 <ArrowSquareOut size={15} /></a>}
          </div>
          <div className="draft-toolbar-group draft-edit-actions">
            <DraftRegenerateButton draft={draft} onRegenerate={onRegenerate} disabled={mutationsLocked || editing || saving} />
            <button type="button" className="draft-action" disabled={mutationsLocked || editing || saving} onClick={() => setEditing(true)}><PencilSimple size={16} />编辑</button>
            <button type="button" className="draft-action is-danger" disabled={mutationsLocked || saving} onClick={() => onDelete(draft)} aria-label="删除稿件"><Trash size={16} />删除</button>
          </div>
        </div>
        <div className="draft-publication-row">
          <span className="draft-media-summary">{draft.media?.filter((media) => media.enabled).length || 0} 张配图已选用</span>
          <div className="draft-toolbar-group"><DraftPublishButton draft={draft} publication={publication} disabled={editing || saving || mutationsLocked} /></div>
        </div>
        {publication?.message && <p className={`draft-publish-status is-${publication.status}`} role="status">{publication.accountName}：{publication.message}</p>}
      </footer>
    </article>
  );
}

export default function DraftManagement() {
  const [drafts, setDrafts] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [publications, setPublications] = useState([]);
  const mediaRevision = useRef(0);

  const load = useCallback(async ({ quiet = false } = {}) => {
    const revision = mediaRevision.current;
    try {
      const [nextDrafts, nextJobs, nextPublications] = await Promise.all([getDrafts(), getGenerationJobs(50), getDraftPublications()]);
      if (revision !== mediaRevision.current) return;
      setPublications(nextPublications);
      setDrafts(nextDrafts);
      setJobs(nextJobs);
    } catch (error) {
      if (!quiet) toast.danger("稿件加载失败", { description: error.message });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const interval = window.setInterval(() => load({ quiet: true }), 2_000);
    return () => window.clearInterval(interval);
  }, [load]);

  const visibleJobs = useMemo(() => {
    const latestByContent = new Map();
    for (const job of jobs) {
      if (!latestByContent.has(job.contentId)) latestByContent.set(job.contentId, job);
    }
    return [...latestByContent.values()].filter((job) => ACTIVE_JOB_STATUSES.has(job.status) || job.status === "failed");
  }, [jobs]);

  async function retry(jobId) {
    try {
      await retryGenerationJob(jobId);
      toast.success("任务已重新开始");
      await load({ quiet: true });
    } catch (error) {
      toast.danger("重新生成失败", { description: error.message });
    }
  }

  async function cancel(jobId) {
    try {
      await cancelGenerationJob(jobId);
      toast.success("正在取消生成任务");
      await load({ quiet: true });
    } catch (error) {
      toast.danger("取消失败", { description: error.message });
    }
  }

  async function removeJob(jobId) {
    if (!window.confirm("确认删除这次失败记录吗？不会删除原帖、已生成稿件或配图。")) return;
    try {
      await deleteGenerationJob(jobId);
      setJobs((current) => current.filter((item) => item.id !== jobId));
      toast.success("失败记录已删除");
    } catch (error) {
      toast.danger("删除失败", { description: error.message });
    }
  }

  async function save(draftId, values) {
    try {
      const updated = await updateDraft(draftId, values);
      setDrafts((current) => current.map((draft) => draft.id === draftId ? updated : draft));
      toast.success("稿件已保存");
      return true;
    } catch (error) {
      toast.danger("保存失败", { description: error.message });
      return false;
    }
  }

  async function regenerate(draft, direction) {
    try {
      await regenerateDraft(draft.id, direction);
      toast.success("已加入重新生成队列", {
        description: direction
          ? "本次会同时参考原帖、当前稿件和你的调整方向。"
          : "本次会按照原帖和当前提示词重新生成。",
      });
      await load({ quiet: true });
      return true;
    } catch (error) {
      toast.danger("重新生成失败", { description: error.message });
      return false;
    }
  }

  async function remove(draft) {
    if (!window.confirm(`确认删除稿件“${draft.title}”吗？稿件版本和本地图片缓存也会一起删除。`)) return;
    try {
      await deleteDraft(draft.id);
      setDrafts((current) => current.filter((item) => item.id !== draft.id));
      toast.success("稿件已删除");
    } catch (error) {
      toast.danger("删除失败", { description: error.message });
    }
  }

  async function toggleMedia(draft, mediaId) {
    const media = draft.media.map((item, index) => ({
      id: item.id,
      enabled: item.id === mediaId ? !item.enabled : item.enabled,
      sortOrder: index,
    }));
    try {
      const updated = await updateDraftMedia(draft.id, media);
      setDrafts((current) => current.map((item) => item.id === draft.id ? updated : item));
    } catch (error) {
      toast.danger("图片设置保存失败", { description: error.message });
    }
  }

  async function removeMedia(mediaId) {
    try {
      const updated = await deleteDraftMedia(mediaId);
      // Ignore poll responses captured before deletion, so removed images do not flash back.
      mediaRevision.current += 1;
      setDrafts((current) => current.map((draft) => draft.id === updated.id ? updated : draft));
      toast.success("图片已从稿件移除");
      return true;
    } catch (error) {
      toast.danger("图片删除失败", { description: error.message });
      return false;
    }
  }

  return (
    <div className="draft-management">
      {loading ? (
        <div className="draft-empty"><span className="content-loader" />正在读取稿件…</div>
      ) : drafts.length === 0 && visibleJobs.length === 0 ? (
        <div className="draft-empty">
          <PencilSimple size={38} weight="duotone" />
          <strong>还没有生成稿件</strong>
          <span>去“内容列表”选择帖子并点击“生成稿件”，生成成功后会出现在这里。</span>
        </div>
      ) : (
        <section className="draft-list-section">
          <div className="draft-section-heading">
            <div><strong>稿件列表</strong><span>管理文案与配图，确认后发布到归属账号</span></div>
          </div>
          <div className="draft-card-list">
            {visibleJobs.map((job) => (
              <GenerationCard key={`job-${job.id}`} job={job} onRetry={retry} onCancel={cancel} onDelete={removeJob} />
            ))}
            {drafts.map((draft) => (
              <DraftCard
                key={draft.id}
                draft={draft}
                publication={publications.find((item) => item.draftId === draft.id)}
                generating={jobs.some((job) => job.contentId === draft.sourceContentId && ACTIVE_JOB_STATUSES.has(job.status))}
                onSave={save}
                onDelete={remove}
                onToggleMedia={toggleMedia}
                onDeleteMedia={removeMedia}
                onRegenerate={regenerate}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
