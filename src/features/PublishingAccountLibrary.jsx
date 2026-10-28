import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@heroui/react/button";
import { FieldError } from "@heroui/react/field-error";
import { Input } from "@heroui/react/input";
import { Label } from "@heroui/react/label";
import { ListBox } from "@heroui/react/list-box";
import { Modal } from "@heroui/react/modal";
import { Select } from "@heroui/react/select";
import { TextField } from "@heroui/react/textfield";
import { toast } from "@heroui/react/toast";
import { ArrowClockwise } from "@phosphor-icons/react/ArrowClockwise";
import { ArrowSquareOut } from "@phosphor-icons/react/ArrowSquareOut";
import { CaretRight } from "@phosphor-icons/react/CaretRight";
import { CheckCircle } from "@phosphor-icons/react/CheckCircle";
import { Clock } from "@phosphor-icons/react/Clock";
import { DotsThree } from "@phosphor-icons/react/DotsThree";
import { FileCode } from "@phosphor-icons/react/FileCode";
import { MagnifyingGlass } from "@phosphor-icons/react/MagnifyingGlass";
import { PaperPlaneTilt } from "@phosphor-icons/react/PaperPlaneTilt";
import { PlugsConnected } from "@phosphor-icons/react/PlugsConnected";
import { Plus } from "@phosphor-icons/react/Plus";
import { ShieldCheck } from "@phosphor-icons/react/ShieldCheck";
import { Trash } from "@phosphor-icons/react/Trash";
import { UploadSimple } from "@phosphor-icons/react/UploadSimple";
import { UsersThree } from "@phosphor-icons/react/UsersThree";
import { X } from "@phosphor-icons/react/X";
import { XCircle } from "@phosphor-icons/react/XCircle";
import {
  checkPublishingAccountState,
  createPublishingAccount,
  deletePublishingAccount,
  getPublishingAccounts,
  getPublishingOwnership,
  replacePublishingAccountState,
  savePublishingOwnership,
} from "../api/publishing-accounts";
import PlatformIcon from "../PlatformIcon";
import "./publishing-account-library.css";

const ACCOUNT_TYPES = ["新闻/资讯/热点", "榜单/推荐", "知识科普", "创作/测评", "测评分享", "情感", "娱乐搞笑", "创作者"];
const PLATFORMS = [
  { id: "x", label: "X", ready: true, description: "发布长文、图片与 Thread 内容" },
  { id: "reddit", label: "Reddit", description: "发布到 Subreddit 与话题社区" },
  { id: "douyin", label: "抖音", description: "发布短视频与图文内容" },
  { id: "xiaohongshu", label: "小红书", description: "发布图文笔记与短视频" },
  { id: "weibo", label: "微博", description: "发布图文、视频与长文" },
];
const EMPTY_FORM = { name: "", url: "", type: null, stateFile: null };

function formatDate(value) {
  const date = new Date(value);
  if (!value || Number.isNaN(date.valueOf())) return "尚未记录";
  return new Intl.DateTimeFormat("zh-CN", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" }).format(date);
}

function validateForm(form) {
  const errors = {};
  if (!form.name.trim()) errors.name = "请输入账号名称";
  if (!form.url.trim()) errors.url = "请输入账号链接或标识";
  if (!form.type) errors.type = "请选择账号类型";
  if (!form.stateFile) errors.stateFile = "请上传状态文件";
  return errors;
}

function validateFile(file) {
  if (!file) return "请选择状态文件";
  if (!file.name.toLowerCase().endsWith(".json")) return "请选择 JSON 格式的状态文件";
  if (file.size > 512 * 1024) return "状态文件不能超过 512KB";
  return "";
}

function getStatus(status, checking, replacing) {
  if (checking) return { key: "checking", label: "检查中", Icon: ArrowClockwise };
  if (replacing) return { key: "checking", label: "替换中", Icon: ArrowClockwise };
  if (status?.status === "valid") return { key: "valid", label: "正常", Icon: CheckCircle };
  if (status?.status === "invalid") return { key: "invalid", label: "已失效", Icon: XCircle };
  return { key: "unchecked", label: "待检查", Icon: Clock };
}

function PlatformAccess({ onManage }) {
  return <div className="publishing-platform-access">
    <div className="publishing-section-intro"><h2>平台接入</h2><p>管理发布渠道与当前开放状态。</p></div>
    <div className="publishing-platform-list">
      {PLATFORMS.map((platform) => <article className="publishing-platform-row" key={platform.id}>
        <span className={`publishing-platform-mark is-${platform.id}`} aria-hidden="true"><PlatformIcon platform={platform.label} /></span>
        <div><strong>{platform.label}</strong><p>{platform.description}</p></div>
        <span className={`publishing-platform-status${platform.ready ? " is-ready" : ""}`}>{platform.ready ? "已接入" : "即将接入"}</span>
        {platform.ready ? <button type="button" className="publishing-platform-action" onClick={onManage}>管理 <CaretRight size={15} /></button> : <span className="publishing-platform-placeholder">尚未开放</span>}
      </article>)}
    </div>
  </div>;
}

function AccountWorkspace({ language = "zh" }) {
  const stateFileRef = useRef(null);
  const replacementFileRef = useRef(null);
  const replacementAccountRef = useRef(null);
  const [accounts, setAccounts] = useState([]);
  const [ownership, setOwnership] = useState([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [checkingId, setCheckingId] = useState(null);
  const [replacingId, setReplacingId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [stateStatuses, setStateStatuses] = useState({});
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [openMenuId, setOpenMenuId] = useState(null);
  const [detailAccount, setDetailAccount] = useState(null);
  const [ownerEditing, setOwnerEditing] = useState(null);
  const [sourceIds, setSourceIds] = useState([]);
  const [ownershipQuery, setOwnershipQuery] = useState("");
  const [ownershipPlatform, setOwnershipPlatform] = useState("all");
  const [ownershipSaving, setOwnershipSaving] = useState(false);
  const [confirmAction, setConfirmAction] = useState(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([getPublishingAccounts("X"), getPublishingOwnership()])
      .then(([items, sources]) => { if (!cancelled) { setAccounts(Array.isArray(items) ? items : []); setOwnership(Array.isArray(sources) ? sources : []); } })
      .catch((error) => { if (!cancelled) toast.danger("读取失败", { description: error.message }); })
      .finally(() => { if (!cancelled) setIsLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const statusFor = (account) => getStatus(stateStatuses[account.id], checkingId === account.id, replacingId === account.id);
  const filteredAccounts = useMemo(() => accounts.filter((account) => {
    const query = search.trim().toLowerCase();
    const matches = !query || [account.name, account.url, account.type].some((value) => String(value || "").toLowerCase().includes(query));
    const status = getStatus(stateStatuses[account.id], checkingId === account.id, replacingId === account.id).key;
    return matches && (statusFilter === "all" || statusFilter === status);
  }), [accounts, checkingId, replacingId, search, stateStatuses, statusFilter]);
  const ownershipPlatforms = useMemo(() => [...new Set(ownership.map((item) => item.platform).filter(Boolean))], [ownership]);
  const ownershipCandidates = useMemo(() => {
    const query = ownershipQuery.trim().toLowerCase();
    return ownership.filter((item) => item.ownerId !== ownerEditing?.id
      && (!query || [item.name, item.platform, item.type].some((value) => String(value || "").toLowerCase().includes(query)))
      && (ownershipPlatform === "all" || item.platform === ownershipPlatform));
  }, [ownerEditing, ownership, ownershipPlatform, ownershipQuery]);

  function updateField(name, value) {
    setForm((current) => ({ ...current, [name]: value }));
    setErrors((current) => current[name] ? { ...current, [name]: undefined } : current);
  }

  function chooseFile(event, replace = false) {
    const file = event.target.files?.[0] || null;
    event.target.value = "";
    if (!file) return;
    const error = validateFile(file);
    if (error) {
      if (replace) toast.danger("无法替换状态文件", { description: error });
      else setErrors((current) => ({ ...current, stateFile: error }));
      return;
    }
    if (!replace) updateField("stateFile", file);
    else replaceStateFile(file);
  }

  async function submitAccount(event) {
    event.preventDefault();
    const nextErrors = validateForm(form);
    if (Object.keys(nextErrors).length) { setErrors(nextErrors); toast.warning("请先完善发布账号信息"); return; }
    setIsSaving(true);
    try {
      const created = await createPublishingAccount({ name: form.name.trim(), url: form.url.trim(), type: form.type }, form.stateFile);
      setAccounts((current) => [created, ...current]);
      setForm(EMPTY_FORM); setErrors({}); setIsCreateOpen(false);
      toast.success("发布账号已创建", { description: `「${created.name}」及其状态文件已保存。` });
    } catch (error) {
      if (error.details) setErrors((current) => ({ ...current, ...error.details }));
      toast.danger("创建失败", { description: error.message });
    } finally { setIsSaving(false); }
  }

  async function checkState(account) {
    setOpenMenuId(null); setCheckingId(account.id);
    setStateStatuses((current) => ({ ...current, [account.id]: { status: "checking", message: "正在检查登录状态…" } }));
    try {
      const result = await checkPublishingAccountState(account.id);
      setStateStatuses((current) => ({ ...current, [account.id]: { status: "valid", message: result.message } }));
      toast.success("登录状态正常", { description: `「${account.name}」可以继续发布。` });
    } catch (error) {
      setStateStatuses((current) => ({ ...current, [account.id]: { status: "invalid", message: error.message } }));
      toast.danger("检查失败", { description: error.message });
    } finally { setCheckingId(null); }
  }

  function requestReplacement(account) {
    setOpenMenuId(null); replacementAccountRef.current = account; replacementFileRef.current?.click();
  }

  async function replaceStateFile(file) {
    const account = replacementAccountRef.current;
    replacementAccountRef.current = null;
    if (!account) return;
    setReplacingId(account.id);
    setStateStatuses((current) => ({ ...current, [account.id]: { status: "checking", message: "正在校验新状态文件…" } }));
    try {
      const result = await replacePublishingAccountState(account.id, file);
      setAccounts((current) => current.map((item) => item.id === account.id ? result.account : item));
      setDetailAccount((current) => current?.id === account.id ? result.account : current);
      setStateStatuses((current) => ({ ...current, [account.id]: { status: "valid", message: result.message } }));
      toast.success("状态文件已替换");
    } catch (error) {
      setStateStatuses((current) => ({ ...current, [account.id]: { status: "invalid", message: `${error.message}，原文件未更改` } }));
      toast.danger("替换失败", { description: error.message });
    } finally { setReplacingId(null); }
  }

  async function editOwnership(account) {
    try {
      setOwnership(await getPublishingOwnership());
      setSourceIds([]); setOwnershipQuery(""); setOwnershipPlatform("all"); setOwnerEditing(account); setOpenMenuId(null);
    } catch (error) { toast.danger("读取归属失败", { description: error.message }); }
  }

  async function saveOwnership() {
    setOwnershipSaving(true);
    try {
      const latest = await getPublishingOwnership();
      const existing = latest.filter((item) => item.ownerId === ownerEditing.id).map((item) => item.id);
      await savePublishingOwnership(ownerEditing.id, [...new Set([...existing, ...sourceIds])]);
      setOwnership(await getPublishingOwnership()); setOwnerEditing(null); toast.success("归属账号已保存");
    } catch (error) { toast.danger("保存失败", { description: error.message }); }
    finally { setOwnershipSaving(false); }
  }

  async function confirmDestructiveAction() {
    const action = confirmAction;
    if (!action) return;
    setConfirmAction(null);
    if (action.type === "ownership") {
      setOwnershipSaving(true);
      try {
        const latest = await getPublishingOwnership();
        await savePublishingOwnership(action.account.id, latest.filter((item) => item.ownerId === action.account.id && item.id !== action.source.id).map((item) => item.id));
        setOwnership(await getPublishingOwnership()); toast.success("已解除归属");
      } catch (error) { toast.danger("移除失败", { description: error.message }); }
      finally { setOwnershipSaving(false); }
      return;
    }
    setDeletingId(action.account.id);
    try {
      await deletePublishingAccount(action.account.id);
      setAccounts((current) => current.filter((item) => item.id !== action.account.id));
      if (detailAccount?.id === action.account.id) setDetailAccount(null);
      toast.success("发布账号已删除");
    } catch (error) { toast.danger("删除失败", { description: error.message }); }
    finally { setDeletingId(null); }
  }

  const closeCreate = () => { if (!isSaving) { setIsCreateOpen(false); setForm(EMPTY_FORM); setErrors({}); } };

  return <div className="x-publishing-workspace">
    <input ref={replacementFileRef} type="file" accept=".json,application/json" className="publishing-state-input" aria-label="替换 X 发布账号状态文件" onChange={(event) => chooseFile(event, true)} />

    <Modal isOpen={isCreateOpen} onOpenChange={(open) => { if (!open) closeCreate(); }}><Modal.Backdrop><Modal.Container><Modal.Dialog className="publishing-create-modal">
      <Modal.CloseTrigger /><Modal.Header><Modal.Heading>添加发布账号</Modal.Heading><p>当前支持 X，上传登录状态后即可用于发布。</p></Modal.Header>
      <form onSubmit={submitAccount} noValidate><Modal.Body><div className="publishing-create-grid">
        <TextField value={form.name} onChange={(value) => updateField("name", value)} isRequired isInvalid={Boolean(errors.name)} validationBehavior="aria"><Label>账号名称</Label><Input variant="secondary" placeholder="例如：The Verge" autoComplete="off" />{errors.name && <FieldError>{errors.name}</FieldError>}</TextField>
        <TextField value={form.url} onChange={(value) => updateField("url", value)} isRequired isInvalid={Boolean(errors.url)} validationBehavior="aria"><Label>账号链接 / 标识</Label><Input variant="secondary" placeholder="网址、用户名或账号 ID" autoComplete="off" />{errors.url && <FieldError>{errors.url}</FieldError>}</TextField>
        <Select variant="secondary" placeholder="选择一个类型" selectedKey={form.type} onSelectionChange={(key) => updateField("type", key ? String(key) : null)} isRequired isInvalid={Boolean(errors.type)} validationBehavior="aria"><Label>账号类型</Label><Select.Trigger><Select.Value /><Select.Indicator /></Select.Trigger><Select.Popover><ListBox>{ACCOUNT_TYPES.map((type) => <ListBox.Item key={type} id={type} textValue={type}><Label>{type}</Label><ListBox.ItemIndicator /></ListBox.Item>)}</ListBox></Select.Popover>{errors.type && <FieldError>{errors.type}</FieldError>}</Select>
        <div className={`publishing-state-field${errors.stateFile ? " is-invalid" : ""}`}><Label>状态文件 <span aria-hidden="true">*</span></Label><input ref={stateFileRef} type="file" accept=".json,application/json" className="publishing-state-input" aria-label="选择 X 发布账号状态文件" onChange={chooseFile} /><button type="button" className="publishing-state-picker" onClick={() => stateFileRef.current?.click()}>{form.stateFile ? <FileCode size={21} weight="duotone" /> : <UploadSimple size={21} />}<span><strong>{form.stateFile?.name || "上传 JSON 状态文件"}</strong><small>最大 512KB</small></span></button>{errors.stateFile && <span className="publishing-state-error">{errors.stateFile}</span>}</div>
      </div></Modal.Body><Modal.Footer><Button type="button" variant="tertiary" className="publishing-modal-cancel" onPress={closeCreate} isDisabled={isSaving}>取消</Button><Button type="submit" variant="primary" isDisabled={isSaving}>{isSaving ? "校验并创建中…" : "添加账号"}</Button></Modal.Footer></form>
    </Modal.Dialog></Modal.Container></Modal.Backdrop></Modal>

    <Modal isOpen={Boolean(ownerEditing)} onOpenChange={(open) => { if (!open && !ownershipSaving) setOwnerEditing(null); }}><Modal.Backdrop><Modal.Container><Modal.Dialog className="ownership-modal">
      <Modal.CloseTrigger /><Modal.Header><Modal.Heading>增加归属账号</Modal.Heading><p>为「{ownerEditing?.name}」选择负责的信息账号。</p></Modal.Header>
      <Modal.Body><div className="ownership-toolbar"><label className="publishing-search"><MagnifyingGlass size={17} /><input value={ownershipQuery} onChange={(event) => setOwnershipQuery(event.target.value)} placeholder="搜索信息账号" aria-label="搜索信息账号" /></label><select value={ownershipPlatform} onChange={(event) => setOwnershipPlatform(event.target.value)} aria-label="按平台筛选信息账号"><option value="all">全部平台</option>{ownershipPlatforms.map((platform) => <option key={platform} value={platform}>{platform}</option>)}</select></div>
        <div className="ownership-options">{ownershipCandidates.map((item) => { const owned = Boolean(item.ownerId); return <label key={item.id} className={owned ? "is-disabled" : ""}><input type="checkbox" checked={sourceIds.includes(item.id)} disabled={ownershipSaving || owned} onChange={(event) => setSourceIds((ids) => event.target.checked ? [...ids, item.id] : ids.filter((id) => id !== item.id))} /><span className="ownership-option-avatar">{item.name.slice(0, 1)}</span><span><strong>{item.name}</strong><small>{item.platform}{owned ? " · 已归属其他发布账号" : ""}</small></span></label>; })}{!ownershipCandidates.length && <p className="ownership-empty">没有符合条件的信息账号。</p>}</div>
      </Modal.Body><Modal.Footer><span className="ownership-selection" aria-live="polite">已选择 {sourceIds.length} 个账号</span><Button onPress={saveOwnership} isDisabled={ownershipSaving || !sourceIds.length}>{ownershipSaving ? "添加中" : "添加所选账号"}</Button></Modal.Footer>
    </Modal.Dialog></Modal.Container></Modal.Backdrop></Modal>

    <Modal isOpen={Boolean(confirmAction)} onOpenChange={(open) => { if (!open) setConfirmAction(null); }}><Modal.Backdrop><Modal.Container><Modal.Dialog className="publishing-confirm-modal"><Modal.CloseTrigger /><Modal.Header><Modal.Heading>{confirmAction?.type === "delete" ? "删除发布账号？" : "解除账号归属？"}</Modal.Heading></Modal.Header><Modal.Body><p>{confirmAction?.type === "delete" ? `「${confirmAction?.account.name}」与其状态文件将被删除，此操作无法撤销。` : `将「${confirmAction?.source.name}」从「${confirmAction?.account.name}」下移除，信息账号本身不会被删除。`}</p></Modal.Body><Modal.Footer><Button variant="tertiary" className="publishing-modal-cancel" onPress={() => setConfirmAction(null)}>取消</Button><Button className="publishing-danger-button" onPress={confirmDestructiveAction}>确认</Button></Modal.Footer></Modal.Dialog></Modal.Container></Modal.Backdrop></Modal>

    {detailAccount && <div className="publishing-detail-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setDetailAccount(null); }}><aside className="publishing-detail-drawer" aria-label={`${detailAccount.name} 账号详情`}>
      <header><div><span className="publishing-account-avatar">{detailAccount.name.trim().slice(0, 1).toUpperCase() || "X"}</span><div><h2>{detailAccount.name}</h2><p>X 发布账号</p></div></div><button type="button" className="publishing-icon-button" aria-label="关闭账号详情" onClick={() => setDetailAccount(null)}><X size={19} /></button></header>
      <div className="publishing-detail-body"><section><h3>账号信息</h3><dl><div><dt>账号链接</dt><dd>{/^https?:\/\//i.test(detailAccount.url) ? <a href={detailAccount.url} target="_blank" rel="noreferrer">{detailAccount.url}<ArrowSquareOut size={13} /></a> : detailAccount.url}</dd></div><div><dt>账号类型</dt><dd>{detailAccount.type}</dd></div><div><dt>登录状态</dt><dd><span className={`publishing-status is-${statusFor(detailAccount).key}`}>{statusFor(detailAccount).label}</span></dd></div><div><dt>最近更新</dt><dd>{formatDate(detailAccount.updatedAt)}</dd></div></dl></section>
        <section><div className="publishing-detail-section-heading"><h3>登录凭证</h3><button type="button" onClick={() => requestReplacement(detailAccount)}>替换</button></div><div className="publishing-credential-card"><FileCode size={20} weight="duotone" /><div><strong>{detailAccount.stateFileName}</strong><small>{detailAccount.stateCookieCount} 个 Cookie</small></div><Button variant="tertiary" onPress={() => checkState(detailAccount)} isDisabled={Boolean(checkingId || replacingId)}><ShieldCheck size={16} />检查</Button></div>{stateStatuses[detailAccount.id]?.message && <p className={`publishing-status-message is-${stateStatuses[detailAccount.id].status}`}>{stateStatuses[detailAccount.id].message}</p>}</section>
        <section><div className="publishing-detail-section-heading"><h3>归属账号</h3><button type="button" onClick={() => editOwnership(detailAccount)}>+添加</button></div><div className="publishing-owned-list">{ownership.filter((item) => item.ownerId === detailAccount.id).map((source) => <div key={source.id}><span className="publishing-owned-avatar">{source.name.slice(0, 1)}</span><div><strong>{source.name}</strong><small>{source.platform}</small></div><button type="button" aria-label={`移除归属账号 ${source.name}`} onClick={() => setConfirmAction({ type: "ownership", account: detailAccount, source })}><Trash size={16} /></button></div>)}{!ownership.some((item) => item.ownerId === detailAccount.id) && <p className="publishing-detail-empty">尚未添加归属账号。</p>}</div></section>
      </div><footer><Button variant="tertiary" className="publishing-delete-detail" onPress={() => setConfirmAction({ type: "delete", account: detailAccount })}><Trash size={16} />删除发布账号</Button></footer>
    </aside></div>}

    <section className="publishing-account-hero" aria-labelledby="publishing-account-hero-title">
      <div>
        <h2 id="publishing-account-hero-title">{language === "en" ? `${accounts.length} publishing ${accounts.length === 1 ? "account" : "accounts"} added` : `已添加 ${accounts.length} 个发布账号`}</h2>
        <p>统一管理发布身份、登录状态和内容归属。</p>
        <Button variant="primary" onPress={() => setIsCreateOpen(true)}><Plus size={16} />添加发布账号</Button>
      </div>
    </section>

    <div className="publishing-list-toolbar"><label className="publishing-search"><MagnifyingGlass size={17} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="搜索账号" aria-label="搜索发布账号" /></label><select aria-label="按平台筛选" defaultValue="all"><option value="all">全部平台</option><option value="x">X</option></select><select aria-label="按状态筛选" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}><option value="all">全部状态</option><option value="valid">正常</option><option value="unchecked">待检查</option><option value="invalid">已失效</option></select><span>{language === "en" ? `${filteredAccounts.length} ${filteredAccounts.length === 1 ? "account" : "accounts"}` : `${filteredAccounts.length} 个账号`}</span></div>
    <div className="publishing-account-table" role="table" aria-label="发布账号列表"><div className="publishing-account-table-head" role="row"><span>账号</span><span>平台</span><span>登录状态</span><span>归属账号</span><span>最近更新</span><span /></div>
      {isLoading ? <div className="publishing-account-state">正在读取发布账号…</div> : !filteredAccounts.length ? <div className="publishing-account-state"><PaperPlaneTilt size={28} weight="duotone" /><strong>{accounts.length ? "没有匹配的账号" : "尚未添加发布账号"}</strong><p>{accounts.length ? "尝试调整搜索或筛选条件。" : "添加 X 账号后，即可用于内容发布。"}</p>{!accounts.length && <Button variant="primary" onPress={() => setIsCreateOpen(true)}><Plus size={16} />添加账号</Button>}</div> : filteredAccounts.map((account) => { const status = statusFor(account); const StatusIcon = status.Icon; const ownedCount = ownership.filter((item) => item.ownerId === account.id).length; return <article key={account.id} className="publishing-account-row" role="row" tabIndex={0} onClick={() => setDetailAccount(account)} onKeyDown={(event) => { if (event.key === "Enter") setDetailAccount(account); }}>
        <div className="publishing-account-cell is-account"><span className="publishing-account-avatar">{account.name.trim().slice(0, 1).toUpperCase() || "X"}</span><div><strong>{account.name}</strong><span>{account.url}</span></div></div><div className="publishing-account-cell"><span className="publishing-platform-pill"><b><PlatformIcon platform="X" /></b> X</span></div><div className="publishing-account-cell"><span className={`publishing-status is-${status.key}`}><StatusIcon size={15} className={status.key === "checking" ? "is-spinning" : ""} />{status.label}</span></div><div className="publishing-account-cell"><button type="button" className="publishing-ownership-count" onClick={(event) => { event.stopPropagation(); editOwnership(account); }}><UsersThree size={16} />{language === "en" ? `${ownedCount} ${ownedCount === 1 ? "account" : "accounts"}` : `${ownedCount} 个账号`}</button></div><div className="publishing-account-cell is-date">{formatDate(account.updatedAt)}</div>
        <div className="publishing-account-cell is-actions" onClick={(event) => event.stopPropagation()}><button type="button" className="publishing-menu-trigger" aria-label={`打开 ${account.name} 操作菜单`} aria-expanded={openMenuId === account.id} onClick={() => setOpenMenuId((current) => current === account.id ? null : account.id)}><DotsThree size={22} weight="bold" /></button>{openMenuId === account.id && <div className="publishing-row-menu"><button type="button" onClick={() => { setDetailAccount(account); setOpenMenuId(null); }}><CaretRight size={16} />查看详情</button><button type="button" onClick={() => checkState(account)}><ShieldCheck size={16} />检查登录状态</button><button type="button" onClick={() => requestReplacement(account)}><UploadSimple size={16} />替换状态文件</button><button type="button" onClick={() => editOwnership(account)}><UsersThree size={16} />管理归属账号</button><button type="button" className="is-danger" disabled={deletingId === account.id} onClick={() => { setConfirmAction({ type: "delete", account }); setOpenMenuId(null); }}><Trash size={16} />删除账号</button></div>}</div>
      </article>; })}
    </div>
  </div>;
}

export default function PublishingAccountLibrary({ language = "zh" }) {
  const [section, setSection] = useState("accounts");
  return <section className="publishing-account-library" aria-label="发布账号库">
    <header className="publishing-page-header"><div><h1>发布账号库</h1><p>管理发布身份、登录状态和内容归属。</p></div></header>
    <nav className="publishing-primary-tabs" aria-label="发布账号库分类"><button type="button" className={section === "accounts" ? "is-active" : ""} onClick={() => setSection("accounts")}><PaperPlaneTilt size={17} />发布账号</button><button type="button" className={section === "platforms" ? "is-active" : ""} onClick={() => setSection("platforms")}><PlugsConnected size={17} />平台接入</button></nav>
    <main className="publishing-page-content">{section === "accounts" ? <AccountWorkspace language={language} /> : <PlatformAccess onManage={() => setSection("accounts")} />}</main>
  </section>;
}
