import { lazy, Suspense, useEffect, useRef, useState } from "react";
import StripeWorkspace from "./StripeWorkspace";
import GrowthDetails from "./GrowthDetails";
import StripeHome from "./StripeHome";
import PlatformIcon from "./PlatformIcon";
import { AlertDialog } from "@heroui/react/alert-dialog";
import { Button } from "@heroui/react/button";
import { Chip } from "@heroui/react/chip";
import { FieldError } from "@heroui/react/field-error";
import { Input } from "@heroui/react/input";
import { Label } from "@heroui/react/label";
import { ListBox } from "@heroui/react/list-box";
import { Modal } from "@heroui/react/modal";
import { Select } from "@heroui/react/select";
import { Surface } from "@heroui/react/surface";
import { TextArea } from "@heroui/react/textarea";
import { TextField } from "@heroui/react/textfield";
import { ToastProvider, toast } from "@heroui/react/toast";
import { ArrowSquareOut } from "@phosphor-icons/react/ArrowSquareOut";
import { CaretDown } from "@phosphor-icons/react/CaretDown";
import { FolderOpen } from "@phosphor-icons/react/FolderOpen";
import { FunnelSimple } from "@phosphor-icons/react/FunnelSimple";
import { GearSix } from "@phosphor-icons/react/GearSix";
import { House } from "@phosphor-icons/react/House";
import { IdentificationCard } from "@phosphor-icons/react/IdentificationCard";
import { Images } from "@phosphor-icons/react/Images";
import { ListBullets } from "@phosphor-icons/react/ListBullets";
import { MagicWand } from "@phosphor-icons/react/MagicWand";
import { PaperPlaneTilt } from "@phosphor-icons/react/PaperPlaneTilt";
import { PencilSimple } from "@phosphor-icons/react/PencilSimple";
import { Plus } from "@phosphor-icons/react/Plus";
import { SidebarSimple } from "@phosphor-icons/react/SidebarSimple";
import { Trash } from "@phosphor-icons/react/Trash";
import { UserCircle } from "@phosphor-icons/react/UserCircle";
import { X } from "@phosphor-icons/react/X";
import {
  createAccount as createAccountRequest,
  deleteAccount as deleteAccountRequest,
  getAccounts,
  updateAccount as updateAccountRequest,
} from "./api/accounts";
import { getPromptLibrary } from "./api/prompts";
import useWorkspaceLanguageBridge from "./useWorkspaceLanguageBridge";

const ContentLibrary = lazy(() => import("./features/content-library/ContentLibrary"));
const PublishingAccountLibrary = lazy(
  () => import("./features/PublishingAccountLibrary"),
);
const PromptLibrary = lazy(() => import("./features/prompt-library/PromptLibrary"));
const SettingsPage = lazy(() => import("./features/settings/SettingsPage"));

const NAV_ITEMS = [
  { id: "dashboard", label: "仪表盘", icon: House },
];

const ACCOUNT_PLATFORMS = ["X", "Reddit", "抖音", "小红书", "微博"];
const ACCOUNT_REGIONS = ["国内", "国外"];
const ACCOUNT_TYPES = [
  "新闻/资讯/热点",
  "榜单/推荐",
  "知识科普",
  "创作/测评",
  "测评分享",
  "情感",
  "娱乐搞笑",
  "创作者",
];

const ACCOUNT_EN = {
  '信息账号库': 'Source accounts', '已收录': 'Saved', '创建账号': 'Create account', '创建信息账号': 'Create source account',
  '添加账号基础信息、归属平台和内容特点。': 'Add the account details, platform, and content focus.',
  '账号名称': 'Account name', '例如：The Verge': 'For example: The Verge', '账号链接 / 标识': 'Account URL / identifier', '网址、用户名或账号 ID': 'URL, username, or account ID',
  '选择一个类型': 'Select a type', '账号类型': 'Account type', '选择平台': 'Select a platform', '归属平台': 'Platform', '选择国内或国外': 'Select a region', '内容地区': 'Content region',
  '提示词': 'Prompt', '不选择提示词': 'No prompt', '已停用': 'Disabled', '详情': 'Details', '简单写下账号定位、内容特点或备注': 'Describe the account focus, content style, or notes',
  '正在添加…': 'Adding…', '添加账号': 'Add account', '还没有信息账号': 'No source accounts yet', '把值得关注的创作者和信息源收进统一的账号库。': 'Keep creators and sources worth following in one account library.', '添加信息账号': 'Add source account',
  '账号列表': 'Account list', '正在加载…': 'Loading…', '筛选账号': 'Filter accounts', '按账号类型筛选': 'Filter by account type', '按归属平台筛选': 'Filter by platform', '按内容地区筛选': 'Filter by region',
  '全部类型': 'All types', '全部平台': 'All platforms', '全部地区': 'All regions', '清除筛选': 'Clear filters', '正在读取账号库…': 'Loading account library…', '暂时无法读取账号库': 'Unable to load the account library', '重新加载': 'Reload',
  '从第一个账号开始': 'Start with your first account', '把喜欢的创作者或信息源收进来，以后会在这里整齐地展示。': 'Save a creator or source and it will appear here.', '去添加账号': 'Add an account', '没有符合条件的账号': 'No matching accounts', '换一个账号类型、归属平台或内容地区试试。': 'Try another account type, platform, or region.',
  '账号分类': 'Account categories', '暂未补充账号详情': 'No account details yet', '修改账号': 'Edit account', '更新账号信息，保存后会立即同步到账号列表。': 'Update the account details. Changes appear in the list immediately.', '关闭修改账号窗口': 'Close edit account dialog',
  '取消': 'Cancel', '正在保存…': 'Saving…', '保存修改': 'Save changes', '删除账号': 'Delete account', '删除这个账号？': 'Delete this account?', '正在删除…': 'Deleting…', '确认删除': 'Delete',
  '请先完善修改内容': 'Complete the required fields first', '请先完善必填信息': 'Complete the required fields first',
  '请输入账号名称': 'Enter an account name', '请输入账号链接或标识': 'Enter an account URL or identifier', '请选择账号类型': 'Select an account type', '请选择归属平台': 'Select a platform', '请选择国内或国外': 'Select a region',
  '国内': 'Domestic', '国外': 'International', '抖音': 'Douyin', '小红书': 'Xiaohongshu', '微博': 'Weibo',
  '新闻/资讯/热点': 'News / trends', '榜单/推荐': 'Rankings / recommendations', '知识科普': 'Education', '创作/测评': 'Creation / reviews', '测评分享': 'Reviews', '情感': 'Lifestyle', '娱乐搞笑': 'Entertainment', '创作者': 'Creator',
};

const accountText = (language, value) => language === 'en' ? (ACCOUNT_EN[value] || value) : value;

const EMPTY_FORM = {
  name: "",
  url: "",
  type: null,
  platform: null,
  region: null,
  details: "",
  promptId: null,
};

function isExternalUrl(value) {
  return /^https?:\/\//i.test(value);
}

function getAvatarInitial(name) {
  return name?.trim().slice(0, 1).toUpperCase() || "?";
}

function getPlatformClass(platform) {
  const platformClasses = {
    X: "x",
    Reddit: "reddit",
    抖音: "douyin",
    小红书: "xiaohongshu",
    微博: "weibo",
  };

  return platformClasses[platform] || "default";
}

function getAccountFormErrors(form, language = 'zh') {
  const errors = {};

  if (!form.name?.trim()) errors.name = accountText(language, "请输入账号名称");
  if (!form.url?.trim()) errors.url = accountText(language, "请输入账号链接或标识");
  if (!form.type) errors.type = accountText(language, "请选择账号类型");
  if (!form.platform) errors.platform = accountText(language, "请选择归属平台");
  if (!form.region) errors.region = accountText(language, "请选择国内或国外");

  return errors;
}

function AccountPromptSelect({ prompts, value, onChange, className = "", language = 'zh' }) {
  const t = value => accountText(language, value);
  return (
    <Select
      className={`form-field account-prompt-select ${className}`.trim()}
      variant="secondary"
      placeholder={t("不选择提示词")}
      selectedKey={value || "__none__"}
      onSelectionChange={(key) =>
        onChange(key && String(key) !== "__none__" ? String(key) : null)
      }
    >
      <Label>{t('提示词')}</Label>
      <Select.Trigger>
        <Select.Value />
        <Select.Indicator />
      </Select.Trigger>
      <Select.Popover>
        <ListBox>
          <ListBox.Item id="__none__" textValue={t('不选择提示词')}>
            <Label>{t('不选择提示词')}</Label>
            <ListBox.ItemIndicator />
          </ListBox.Item>
          {prompts.map((prompt) => (
            <ListBox.Item key={prompt.id} id={prompt.id} textValue={prompt.title}>
              <div className="account-prompt-option">
                <Label>{prompt.title}</Label>
                <span>
                  {prompt.platform} · {prompt.accountTypeName}
                  {!prompt.enabled ? ` · ${t('已停用')}` : ""}
                </span>
              </div>
              <ListBox.ItemIndicator />
            </ListBox.Item>
          ))}
        </ListBox>
      </Select.Popover>
    </Select>
  );
}

function Brand() {
  return (
    <div className="brand" aria-label="FlexibleFox">
      <img
        className="brand-logo"
        src="/assets/flexiblefox-logo-mark.png"
        alt=""
        aria-hidden="true"
      />
      <span>FlexibleFox</span>
    </div>
  );
}

function Sidebar({ open, activePage, onClose, onNavigate }) {
  const accountActive = activePage.startsWith("account-");
  const contentActive = activePage.startsWith("content-");
  const settingsActive = activePage === "settings";
  const [accountExpanded, setAccountExpanded] = useState(true);
  const [contentExpanded, setContentExpanded] = useState(true);

  useEffect(() => {
    if (accountActive) setAccountExpanded(true);
  }, [accountActive]);

  useEffect(() => {
    if (contentActive) setContentExpanded(true);
  }, [contentActive]);

  return (
    <>
      <button
        type="button"
        className={"sidebar-backdrop" + (open ? " is-open" : "")}
        aria-label="关闭导航"
        onClick={onClose}
      />
      <aside className={"sidebar" + (open ? " is-open" : "")} aria-label="主导航">
        <div className="sidebar-brand-row">
          <Brand />
          <Button
            isIconOnly
            variant="tertiary"
            className="sidebar-close"
            onPress={onClose}
            aria-label="关闭导航"
          >
            <X size={20} />
          </Button>
        </div>

        <nav className="sidebar-nav">
          {NAV_ITEMS.map(({ id, label, icon: Icon }) => {
            const active = id === activePage;
            return (
              <button
                key={id}
                type="button"
                className={"nav-item" + (active ? " is-active" : "")}
                aria-current={active ? "page" : undefined}
                onClick={() => {
                  onNavigate(id);
                  onClose();
                }}
              >
                <Icon size={20} weight={active ? "fill" : "regular"} />
                <span>{label}</span>
              </button>
            );
          })}

          <div className={`nav-group${accountExpanded ? " is-expanded" : ""}`}>
            <button
              type="button"
              className={`nav-item nav-group-toggle${accountActive ? " is-active" : ""}`}
              aria-expanded={accountExpanded}
              aria-controls="account-library-subnav"
              onClick={() => setAccountExpanded((current) => !current)}
            >
              <UserCircle size={20} weight={accountActive ? "fill" : "regular"} />
              <span>账号库</span>
              <CaretDown className="nav-group-caret" size={16} weight="bold" aria-hidden="true" />
            </button>

            <div
              id="account-library-subnav"
              className="nav-submenu"
              aria-hidden={!accountExpanded}
            >
              {[
                { id: "account-information", label: "信息账号库", icon: IdentificationCard },
                { id: "account-publishing", label: "发布账号库", icon: PaperPlaneTilt },
              ].map(({ id, label, icon: Icon }) => {
                const active = activePage === id;
                return (
                  <button
                    key={id}
                    type="button"
                    className={`nav-subitem${active ? " is-active" : ""}`}
                    aria-current={active ? "page" : undefined}
                    tabIndex={accountExpanded ? 0 : -1}
                    onClick={() => {
                      onNavigate(id);
                      onClose();
                    }}
                  >
                    <Icon size={18} weight={active ? "fill" : "regular"} />
                    <span>{label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <button
            type="button"
            className={`nav-item${activePage === "prompt-library" ? " is-active" : ""}`}
            aria-current={activePage === "prompt-library" ? "page" : undefined}
            onClick={() => {
              onNavigate("prompt-library");
              onClose();
            }}
          >
            <MagicWand
              size={20}
              weight={activePage === "prompt-library" ? "fill" : "regular"}
            />
            <span>提示词库</span>
          </button>

          <div className={`nav-group${contentExpanded ? " is-expanded" : ""}`}>
            <button
              type="button"
              className={`nav-item nav-group-toggle${contentActive ? " is-active" : ""}`}
              aria-expanded={contentExpanded}
              aria-controls="content-library-subnav"
              onClick={() => setContentExpanded((current) => !current)}
            >
              <FolderOpen size={20} weight={contentActive ? "fill" : "regular"} />
              <span>内容库</span>
              <CaretDown className="nav-group-caret" size={16} weight="bold" aria-hidden="true" />
            </button>

            <div
              id="content-library-subnav"
              className="nav-submenu"
              aria-hidden={!contentExpanded}
            >
              {[
                { id: "content-settings", label: "抓取设置", icon: GearSix },
                { id: "content-jobs", label: "抓取记录", icon: ListBullets },
                { id: "content-list", label: "内容列表", icon: Images },
                { id: "content-drafts", label: "稿件管理", icon: PencilSimple },
              ].map(({ id, label, icon: Icon }) => {
                const active = activePage === id;
                return (
                  <button
                    key={id}
                    type="button"
                    className={`nav-subitem${active ? " is-active" : ""}`}
                    aria-current={active ? "page" : undefined}
                    tabIndex={contentExpanded ? 0 : -1}
                    onClick={() => {
                      onNavigate(id);
                      onClose();
                    }}
                  >
                    <Icon size={18} weight={active ? "fill" : "regular"} />
                    <span>{label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <button
            type="button"
            className={`nav-item${settingsActive ? " is-active" : ""}`}
            aria-current={settingsActive ? "page" : undefined}
            onClick={() => {
              onNavigate("settings");
              onClose();
            }}
          >
            <GearSix size={20} weight={settingsActive ? "fill" : "regular"} />
            <span>设置</span>
          </button>
        </nav>
      </aside>
    </>
  );
}

function EditAccountModal({ account, prompts, onSave, language = 'zh' }) {
  const t = value => accountText(language, value);
  const [editForm, setEditForm] = useState(() => ({
    name: account.name ?? "",
    url: account.url ?? "",
    type: account.type ?? null,
    platform: account.platform ?? null,
    region: account.region ?? "国外",
    details: account.details ?? "",
    promptId: account.promptId ?? null,
  }));
  const [editErrors, setEditErrors] = useState({});
  const [isSaving, setIsSaving] = useState(false);

  function resetEditForm() {
    setEditForm({
      name: account.name ?? "",
      url: account.url ?? "",
      type: account.type ?? null,
      platform: account.platform ?? null,
      region: account.region ?? "国外",
      details: account.details ?? "",
      promptId: account.promptId ?? null,
    });
    setEditErrors({});
    setIsSaving(false);
  }

  function updateEditField(name, value) {
    setEditForm((current) => ({ ...current, [name]: value }));
    setEditErrors((current) => {
      if (!current[name]) return current;
      return { ...current, [name]: undefined };
    });
  }

  async function saveEdit(event, close) {
    event.preventDefault();
    const nextErrors = getAccountFormErrors(editForm, language);

    if (Object.keys(nextErrors).length > 0) {
      setEditErrors(nextErrors);
      toast.warning(t("请先完善修改内容"));
      return;
    }

    setIsSaving(true);
    const saved = await onSave(account.id, {
      name: editForm.name.trim(),
      url: editForm.url.trim(),
      type: editForm.type,
      platform: editForm.platform,
      region: editForm.region,
      details: editForm.details.trim(),
      promptId: editForm.promptId,
    });
    setIsSaving(false);

    if (saved) close();
  }

  return (
    <Modal>
      <Modal.Trigger
        className="account-edit-trigger"
        aria-label={`${t('修改账号')} ${account.name}`}
        title={t('修改账号')}
        onClick={resetEditForm}
      >
        <PencilSimple size={18} aria-hidden="true" />
      </Modal.Trigger>
      <Modal.Backdrop variant="blur" isDismissable>
        <Modal.Container placement="center" size="lg" scroll="inside">
          <Modal.Dialog className="account-edit-modal">
            {({ close }) => (
              <form className="edit-account-form" onSubmit={(event) => saveEdit(event, close)} noValidate>
                <Modal.Header>
                  <div>
                    <Modal.Heading>{t('修改账号')}</Modal.Heading>
                    <p className="edit-modal-description">{t('更新账号信息，保存后会立即同步到账号列表。')}</p>
                  </div>
                  <Modal.CloseTrigger aria-label={t('关闭修改账号窗口')} />
                </Modal.Header>

                <Modal.Body>
                  <div className="edit-form-grid">
                    <TextField
                      className="form-field"
                      value={editForm.name}
                      onChange={(value) => updateEditField("name", value)}
                      isRequired
                      isInvalid={Boolean(editErrors.name)}
                      validationBehavior="aria"
                    >
                      <Label>{t('账号名称')}</Label>
                      <Input variant="secondary" placeholder={t('例如：The Verge')} autoComplete="off" />
                      {editErrors.name && <FieldError>{editErrors.name}</FieldError>}
                    </TextField>

                    <TextField
                      className="form-field"
                      value={editForm.url}
                      onChange={(value) => updateEditField("url", value)}
                      isRequired
                      isInvalid={Boolean(editErrors.url)}
                      validationBehavior="aria"
                    >
                      <Label>{t('账号链接 / 标识')}</Label>
                      <Input
                        variant="secondary"
                        placeholder={t('网址、用户名或账号 ID')}
                        autoComplete="off"
                      />
                      {editErrors.url && <FieldError>{editErrors.url}</FieldError>}
                    </TextField>

                    <Select
                      className="form-field"
                      variant="secondary"
                      placeholder={t('选择一个类型')}
                      selectedKey={editForm.type}
                      onSelectionChange={(key) => updateEditField("type", key ? String(key) : null)}
                      isRequired
                      isInvalid={Boolean(editErrors.type)}
                      validationBehavior="aria"
                    >
                      <Label>{t('账号类型')}</Label>
                      <Select.Trigger>
                        <Select.Value />
                        <Select.Indicator />
                      </Select.Trigger>
                      <Select.Popover>
                        <ListBox>
                          {ACCOUNT_TYPES.map((type) => (
                            <ListBox.Item key={type} id={type} textValue={type}>
                              <Label>{t(type)}</Label>
                              <ListBox.ItemIndicator />
                            </ListBox.Item>
                          ))}
                        </ListBox>
                      </Select.Popover>
                      {editErrors.type && <FieldError>{editErrors.type}</FieldError>}
                    </Select>

                    <Select
                      className="form-field"
                      variant="secondary"
                      placeholder={t('选择平台')}
                      selectedKey={editForm.platform}
                      onSelectionChange={(key) => updateEditField("platform", key ? String(key) : null)}
                      isRequired
                      isInvalid={Boolean(editErrors.platform)}
                      validationBehavior="aria"
                    >
                      <Label>{t('归属平台')}</Label>
                      <Select.Trigger>
                        <Select.Value />
                        <Select.Indicator />
                      </Select.Trigger>
                      <Select.Popover>
                        <ListBox>
                          {ACCOUNT_PLATFORMS.map((platform) => (
                            <ListBox.Item key={platform} id={platform} textValue={platform}>
                              <Label>{t(platform)}</Label>
                              <ListBox.ItemIndicator />
                            </ListBox.Item>
                          ))}
                        </ListBox>
                      </Select.Popover>
                      {editErrors.platform && <FieldError>{editErrors.platform}</FieldError>}
                    </Select>

                    <Select
                      className="form-field"
                      variant="secondary"
                      placeholder={t('选择国内或国外')}
                      selectedKey={editForm.region}
                      onSelectionChange={(key) => updateEditField("region", key ? String(key) : null)}
                      isRequired
                      isInvalid={Boolean(editErrors.region)}
                      validationBehavior="aria"
                    >
                      <Label>{t('内容地区')}</Label>
                      <Select.Trigger>
                        <Select.Value />
                        <Select.Indicator />
                      </Select.Trigger>
                      <Select.Popover>
                        <ListBox>
                          {ACCOUNT_REGIONS.map((region) => (
                            <ListBox.Item key={region} id={region} textValue={region}>
                              <Label>{t(region)}</Label>
                              <ListBox.ItemIndicator />
                            </ListBox.Item>
                          ))}
                        </ListBox>
                      </Select.Popover>
                      {editErrors.region && <FieldError>{editErrors.region}</FieldError>}
                    </Select>

                    <AccountPromptSelect
                      prompts={prompts}
                      value={editForm.promptId}
                      onChange={(value) => updateEditField("promptId", value)}
                      className="edit-field-prompt"
                      language={language}
                    />

                    <TextField
                      className="form-field edit-field-details"
                      value={editForm.details}
                      onChange={(value) => updateEditField("details", value)}
                      isInvalid={Boolean(editErrors.details)}
                      validationBehavior="aria"
                    >
                      <Label>{t('详情')}</Label>
                      <TextArea
                        variant="secondary"
                        placeholder={t('简单写下账号定位、内容特点或备注')}
                        rows={4}
                      />
                      {editErrors.details && <FieldError>{editErrors.details}</FieldError>}
                    </TextField>
                  </div>
                </Modal.Body>

                <Modal.Footer>
                  <Button slot="close" variant="secondary" isDisabled={isSaving}>
                    {t('取消')}
                  </Button>
                  <Button type="submit" variant="primary" isDisabled={isSaving}>
                    {t(isSaving ? "正在保存…" : "保存修改")}
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

function AccountRow({ account, prompts, onDelete, onEdit, language = 'zh' }) {
  const t = value => accountText(language, value);
  const isLink = isExternalUrl(account.url);
  const platformClass = getPlatformClass(account.platform);
  const [isDeleting, setIsDeleting] = useState(false);

  async function handleDelete(close) {
    setIsDeleting(true);
    const deleted = await onDelete(account.id, account.name);
    setIsDeleting(false);

    if (deleted) close();
  }

  return (
    <article className="account-row">
      <div className="account-identity">
        <span className={"account-avatar account-avatar-" + platformClass} aria-hidden="true">
          <PlatformIcon platform={account.platform} fallback={getAvatarInitial(account.name)} />
        </span>
        <div className="account-name-group">
          <strong>{account.name}</strong>
          {isLink ? (
            <a href={account.url} target="_blank" rel="noreferrer" className="account-link">
              <span>{account.url}</span>
              <ArrowSquareOut size={14} aria-hidden="true" />
            </a>
          ) : (
            <span className="account-link account-identifier" title={account.url}>
              {account.url}
            </span>
          )}
        </div>
      </div>

      <div className="account-tags" aria-label={t('账号分类')}>
        <Chip
          size="sm"
          variant="secondary"
          color="default"
          className={"platform-chip platform-chip-" + platformClass}
        >
          {t(account.platform)}
        </Chip>
        <Chip size="sm" variant="secondary" color="default" className="type-chip">
          {t(account.type)}
        </Chip>
        <Chip size="sm" variant="secondary" color="default" className="region-chip">
          {t(account.region || "国外")}
        </Chip>
      </div>

      <p className="account-summary" title={account.details}>
        {account.details || t("暂未补充账号详情")}
      </p>

      <div className="account-actions">
        <EditAccountModal account={account} prompts={prompts} onSave={onEdit} language={language} />

        <AlertDialog>
          <AlertDialog.Trigger
            className="account-delete-trigger"
            aria-label={`${t('删除账号')} ${account.name}`}
            title={t('删除账号')}
          >
            <Trash size={18} aria-hidden="true" />
          </AlertDialog.Trigger>
          <AlertDialog.Backdrop variant="blur" isDismissable isKeyboardDismissDisabled={false}>
            <AlertDialog.Container placement="center" size="xs">
              <AlertDialog.Dialog>
                {({ close }) => (
                  <>
                    <AlertDialog.Header>
                      <AlertDialog.Icon status="danger" />
                      <AlertDialog.Heading>{t('删除这个账号？')}</AlertDialog.Heading>
                    </AlertDialog.Header>
                    <AlertDialog.Body>
                      {language === 'en' ? `The account “${account.name}” and its details will be removed from the library.` : `删除后，账号「${account.name}」及其详情会从账号库中移除。`}
                    </AlertDialog.Body>
                    <AlertDialog.Footer>
                      <Button slot="close" variant="secondary" isDisabled={isDeleting}>
                        {t('取消')}
                      </Button>
                      <Button
                        variant="danger"
                        isDisabled={isDeleting}
                        onPress={() => handleDelete(close)}
                      >
                        {t(isDeleting ? "正在删除…" : "确认删除")}
                      </Button>
                    </AlertDialog.Footer>
                  </>
                )}
              </AlertDialog.Dialog>
            </AlertDialog.Container>
          </AlertDialog.Backdrop>
        </AlertDialog>
      </div>
    </article>
  );
}

function AccountLibrary({ language = 'zh' }) {
  const t = value => accountText(language, value);
  const [accounts, setAccounts] = useState([]);
  const [prompts, setPrompts] = useState([]);
  const [activeTab, setActiveTab] = useState("installed");
  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});
  const [typeFilter, setTypeFilter] = useState("all");
  const [platformFilter, setPlatformFilter] = useState("all");
  const [regionFilter, setRegionFilter] = useState("all");
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  const hasActiveFilters = typeFilter !== "all" || platformFilter !== "all" || regionFilter !== "all";
  const filteredAccounts = accounts.filter((account) => {
    const matchesType = typeFilter === "all" || account.type === typeFilter;
    const matchesPlatform = platformFilter === "all" || account.platform === platformFilter;
    const matchesRegion = regionFilter === "all" || (account.region || "国外") === regionFilter;
    return matchesType && matchesPlatform && matchesRegion;
  });

  async function loadAccountList() {
    setIsLoading(true);
    setLoadError("");

    try {
      const [nextAccounts, promptLibrary] = await Promise.all([
        getAccounts(),
        getPromptLibrary(),
      ]);
      setAccounts(nextAccounts);
      setPrompts(promptLibrary.prompts || []);
    } catch (error) {
      setLoadError(error.message || t("暂时无法读取账号库"));
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadAccountList();
  }, []);

  function updateFormField(name, value) {
    setForm((current) => ({ ...current, [name]: value }));
    setErrors((current) => {
      if (!current[name]) return current;
      return { ...current, [name]: undefined };
    });
  }

  function validateForm() {
    const nextErrors = getAccountFormErrors(form, language);

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  async function createAccount(event) {
    event.preventDefault();
    if (!validateForm()) {
      toast.warning(t("请先完善必填信息"));
      return;
    }

    setIsCreating(true);

    try {
      const account = await createAccountRequest({
        name: form.name.trim(),
        url: form.url.trim(),
        type: form.type,
        platform: form.platform,
        region: form.region,
        details: form.details.trim(),
        promptId: form.promptId,
      });

      setAccounts((current) => [account, ...current]);
      setForm(EMPTY_FORM);
      setErrors({});
      setLoadError("");
      setActiveTab("installed");
      toast.success(language === 'en' ? 'Account added' : '账号已添加', { description: language === 'en' ? `“${account.name}” was added to the account library.` : "「" + account.name + "」已加入账号库。" });
    } catch (error) {
      toast.danger(language === 'en' ? 'Unable to add account' : '添加失败', { description: error.message });
    } finally {
      setIsCreating(false);
    }
  }

  async function deleteAccount(id, name) {
    try {
      await deleteAccountRequest(id);
      setAccounts((current) => current.filter((account) => account.id !== id));
      toast.success(language === 'en' ? 'Account deleted' : '账号已删除', { description: language === 'en' ? `“${name}” was removed from the account library.` : "「" + name + "」已从账号库移除。" });
      return true;
    } catch (error) {
      toast.danger(language === 'en' ? 'Unable to delete account' : '删除失败', { description: error.message });
      return false;
    }
  }

  async function editAccount(id, updates) {
    try {
      const updatedAccount = await updateAccountRequest(id, updates);
      setAccounts((current) =>
        current.map((account) => (account.id === id ? updatedAccount : account)),
      );
      toast.success(language === 'en' ? 'Account updated' : '账号已更新', { description: language === 'en' ? `Changes to “${updatedAccount.name}” were saved.` : "「" + updatedAccount.name + "」的信息已保存。" });
      return true;
    } catch (error) {
      toast.danger(language === 'en' ? 'Unable to save changes' : '保存失败', { description: error.message });
      return false;
    }
  }

  function clearFilters() {
    setTypeFilter("all");
    setPlatformFilter("all");
    setRegionFilter("all");
  }

  return (
    <section className="account-library-page" aria-label={t('信息账号库')}>
      <header className="account-library-header">
        <h1>{t('信息账号库')}</h1>
        <nav className="account-library-tabs" aria-label={t('信息账号库')} role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "installed"}
            className={`account-library-tab${activeTab === "installed" ? " is-active" : ""}`}
            onClick={() => setActiveTab("installed")}
          >
            {t('已收录')}
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "created"}
            className={`account-library-tab${activeTab === "created" ? " is-active" : ""}`}
            onClick={() => setActiveTab("created")}
          >
            {t('创建账号')}
          </button>
        </nav>
      </header>

      {activeTab === "created" ? (
      <Surface className="account-form-surface" variant="default">
        <div className="account-create-intro">
          <h2>{t('创建信息账号')}</h2>
          <p>{t('添加账号基础信息、归属平台和内容特点。')}</p>
        </div>
        <form className="account-form" onSubmit={createAccount} noValidate>
          <div className="account-form-layout">
            <div className="account-core-fields">
              <TextField
                className="form-field field-name"
                value={form.name}
                onChange={(value) => updateFormField("name", value)}
                isRequired
                isInvalid={Boolean(errors.name)}
                validationBehavior="aria"
              >
                <Label>{t('账号名称')}</Label>
                <Input
                  id="account-name"
                  variant="secondary"
                  placeholder={t('例如：The Verge')}
                  autoComplete="off"
                />
                {errors.name && <FieldError>{errors.name}</FieldError>}
              </TextField>

              <TextField
                className="form-field field-link"
                value={form.url}
                onChange={(value) => updateFormField("url", value)}
                isRequired
                isInvalid={Boolean(errors.url)}
                validationBehavior="aria"
              >
                <Label>{t('账号链接 / 标识')}</Label>
                <Input
                  variant="secondary"
                  placeholder={t('网址、用户名或账号 ID')}
                  autoComplete="off"
                />
                {errors.url && <FieldError>{errors.url}</FieldError>}
              </TextField>

              <Select
                className="form-field field-type"
                variant="secondary"
                placeholder={t('选择一个类型')}
                selectedKey={form.type}
                onSelectionChange={(key) => updateFormField("type", key ? String(key) : null)}
                isRequired
                isInvalid={Boolean(errors.type)}
                validationBehavior="aria"
              >
                <Label>{t('账号类型')}</Label>
                <Select.Trigger>
                  <Select.Value />
                  <Select.Indicator />
                </Select.Trigger>
                <Select.Popover>
                  <ListBox>
                    {ACCOUNT_TYPES.map((type) => (
                      <ListBox.Item key={type} id={type} textValue={type}>
                        <Label>{t(type)}</Label>
                        <ListBox.ItemIndicator />
                      </ListBox.Item>
                    ))}
                  </ListBox>
                </Select.Popover>
                {errors.type && <FieldError>{errors.type}</FieldError>}
              </Select>

              <Select
                className="form-field field-platform"
                variant="secondary"
                placeholder={t('选择平台')}
                selectedKey={form.platform}
                onSelectionChange={(key) => updateFormField("platform", key ? String(key) : null)}
                isRequired
                isInvalid={Boolean(errors.platform)}
                validationBehavior="aria"
              >
                <Label>{t('归属平台')}</Label>
                <Select.Trigger>
                  <Select.Value />
                  <Select.Indicator />
                </Select.Trigger>
                <Select.Popover>
                  <ListBox>
                    {ACCOUNT_PLATFORMS.map((platform) => (
                      <ListBox.Item key={platform} id={platform} textValue={platform}>
                        <Label>{t(platform)}</Label>
                        <ListBox.ItemIndicator />
                      </ListBox.Item>
                    ))}
                  </ListBox>
                </Select.Popover>
                {errors.platform && <FieldError>{errors.platform}</FieldError>}
              </Select>

              <Select
                className="form-field field-region"
                variant="secondary"
                placeholder={t('选择国内或国外')}
                selectedKey={form.region}
                onSelectionChange={(key) => updateFormField("region", key ? String(key) : null)}
                isRequired
                isInvalid={Boolean(errors.region)}
                validationBehavior="aria"
              >
                <Label>{t('内容地区')}</Label>
                <Select.Trigger>
                  <Select.Value />
                  <Select.Indicator />
                </Select.Trigger>
                <Select.Popover>
                  <ListBox>
                    {ACCOUNT_REGIONS.map((region) => (
                      <ListBox.Item key={region} id={region} textValue={region}>
                        <Label>{t(region)}</Label>
                        <ListBox.ItemIndicator />
                      </ListBox.Item>
                    ))}
                  </ListBox>
                </Select.Popover>
                {errors.region && <FieldError>{errors.region}</FieldError>}
              </Select>

              <AccountPromptSelect
                prompts={prompts}
                value={form.promptId}
                onChange={(value) => updateFormField("promptId", value)}
                language={language}
              />
            </div>

            <div className="account-note-fields">
              <TextField
                className="form-field field-details"
                value={form.details}
                onChange={(value) => updateFormField("details", value)}
                isInvalid={Boolean(errors.details)}
                validationBehavior="aria"
              >
                <Label>{t('详情')}</Label>
                <TextArea
                  variant="secondary"
                  placeholder={t('简单写下账号定位、内容特点或备注')}
                  rows={3}
                />
                {errors.details && <FieldError>{errors.details}</FieldError>}
              </TextField>

              <div className="form-submit">
                <Button type="submit" variant="primary" size="lg" isDisabled={isCreating}>
                  <Plus size={18} weight="bold" />
                  {t(isCreating ? "正在添加…" : "添加账号")}
                </Button>
              </div>
            </div>
          </div>
        </form>
      </Surface>

      ) : (
      <>
      <section className="account-overview-hero" aria-labelledby="account-overview-title">
        <div>
          <h2 id="account-overview-title">
            {accounts.length > 0 ? (language === 'en' ? `${accounts.length} source accounts saved` : `已收录 ${accounts.length} 个信息账号`) : t("还没有信息账号")}
          </h2>
          <p>{t('把值得关注的创作者和信息源收进统一的账号库。')}</p>
          <Button variant="primary" onPress={() => setActiveTab("created")}>
            {t('添加信息账号')}
          </Button>
        </div>
      </section>

      <Surface className="account-list-surface" variant="default">
        <div className="account-list-toolbar">
          <div className="account-list-title">
            <span className="list-icon" aria-hidden="true">
              <ListBullets size={20} />
            </span>
            <div>
              <h2>{t('账号列表')}</h2>
              <p>
                {isLoading
                  ? t("正在加载…")
                  : hasActiveFilters
                  ? (language === 'en' ? `Showing ${filteredAccounts.length} of ${accounts.length}` : "显示 " + filteredAccounts.length + " 个，共 " + accounts.length + " 个")
                  : (language === 'en' ? `${accounts.length} accounts` : "共 " + accounts.length + " 个账号")}
              </p>
            </div>
          </div>

          <div className="account-filters" aria-label={t('筛选账号')}>
            <Select
              className="account-filter-select account-filter-type"
              variant="secondary"
              aria-label={t('按账号类型筛选')}
              selectedKey={typeFilter}
              onSelectionChange={(key) => setTypeFilter(key ? String(key) : "all")}
              isDisabled={isLoading || accounts.length === 0}
            >
              <Select.Trigger>
                <Select.Value />
                <Select.Indicator />
              </Select.Trigger>
              <Select.Popover>
                <ListBox>
                  <ListBox.Item id="all" textValue={t('全部类型')}>
                    <Label>{t('全部类型')}</Label>
                    <ListBox.ItemIndicator />
                  </ListBox.Item>
                  {ACCOUNT_TYPES.map((type) => (
                    <ListBox.Item key={type} id={type} textValue={type}>
                      <Label>{t(type)}</Label>
                      <ListBox.ItemIndicator />
                    </ListBox.Item>
                  ))}
                </ListBox>
              </Select.Popover>
            </Select>

            <Select
              className="account-filter-select account-filter-platform"
              variant="secondary"
              aria-label={t('按归属平台筛选')}
              selectedKey={platformFilter}
              onSelectionChange={(key) => setPlatformFilter(key ? String(key) : "all")}
              isDisabled={isLoading || accounts.length === 0}
            >
              <Select.Trigger>
                <Select.Value />
                <Select.Indicator />
              </Select.Trigger>
              <Select.Popover>
                <ListBox>
                  <ListBox.Item id="all" textValue={t('全部平台')}>
                    <Label>{t('全部平台')}</Label>
                    <ListBox.ItemIndicator />
                  </ListBox.Item>
                  {ACCOUNT_PLATFORMS.map((platform) => (
                    <ListBox.Item key={platform} id={platform} textValue={platform}>
                      <Label>{t(platform)}</Label>
                      <ListBox.ItemIndicator />
                    </ListBox.Item>
                  ))}
                </ListBox>
              </Select.Popover>
            </Select>

            <Select
              className="account-filter-select account-filter-region"
              variant="secondary"
              aria-label={t('按内容地区筛选')}
              selectedKey={regionFilter}
              onSelectionChange={(key) => setRegionFilter(key ? String(key) : "all")}
              isDisabled={isLoading || accounts.length === 0}
            >
              <Select.Trigger>
                <Select.Value />
                <Select.Indicator />
              </Select.Trigger>
              <Select.Popover>
                <ListBox>
                  <ListBox.Item id="all" textValue={t('全部地区')}>
                    <Label>{t('全部地区')}</Label>
                    <ListBox.ItemIndicator />
                  </ListBox.Item>
                  {ACCOUNT_REGIONS.map((region) => (
                    <ListBox.Item key={region} id={region} textValue={region}>
                      <Label>{t(region)}</Label>
                      <ListBox.ItemIndicator />
                    </ListBox.Item>
                  ))}
                </ListBox>
              </Select.Popover>
            </Select>

            {hasActiveFilters && (
              <Button
                isIconOnly
                size="sm"
                variant="tertiary"
                className="clear-filter-button"
                aria-label={t('清除筛选')}
                title={t('清除筛选')}
                onPress={clearFilters}
              >
                <X size={17} aria-hidden="true" />
              </Button>
            )}
          </div>
        </div>

        {isLoading ? (
          <div className="account-loading" role="status" aria-live="polite">
            <span className="account-loading-indicator" aria-hidden="true" />
            <p>{t('正在读取账号库…')}</p>
          </div>
        ) : loadError ? (
          <div className="account-load-error" role="alert">
            <span className="empty-filter-icon" aria-hidden="true">
              <UserCircle size={30} weight="duotone" />
            </span>
            <h3>{t('暂时无法读取账号库')}</h3>
            <p>{loadError}</p>
            <Button variant="secondary" onPress={loadAccountList}>
              {t('重新加载')}
            </Button>
          </div>
        ) : accounts.length === 0 ? (
          <div className="account-empty">
            <div className="empty-visual" aria-hidden="true">
              <span className="empty-orbit empty-orbit-x">X</span>
              <span className="empty-icon">
                <UserCircle size={38} weight="duotone" />
              </span>
              <span className="empty-orbit empty-orbit-reddit">r/</span>
            </div>
            <h3>{t('从第一个账号开始')}</h3>
            <p>{t('把喜欢的创作者或信息源收进来，以后会在这里整齐地展示。')}</p>
            <Button
              variant="secondary"
              onPress={() => document.getElementById("account-name")?.focus()}
            >
              {t('去添加账号')}
            </Button>
          </div>
        ) : filteredAccounts.length === 0 ? (
          <div className="filtered-empty">
            <span className="empty-filter-icon" aria-hidden="true">
              <FunnelSimple size={30} weight="duotone" />
            </span>
            <h3>{t('没有符合条件的账号')}</h3>
            <p>{t('换一个账号类型、归属平台或内容地区试试。')}</p>
            <Button variant="secondary" onPress={clearFilters}>
              {t('清除筛选')}
            </Button>
          </div>
        ) : (
          <div className="account-list" aria-label={t('账号列表')}>
            {filteredAccounts.map((account) => (
              <AccountRow
                key={account.id}
                account={account}
                prompts={prompts}
                onDelete={deleteAccount}
                onEdit={editAccount}
                language={language}
              />
            ))}
          </div>
        )}
      </Surface>
      </>
      )}
    </section>
  );
}

const workspacePageIds = new Set([
  "dashboard",
  "growth-details",
  "account-information",
  "account-publishing",
  "settings",
  "prompt-library",
  "content-settings",
  "content-list",
  "content-drafts",
  "content-jobs",
]);

function readWorkspacePage() {
  const params = new URLSearchParams(window.location.search);
  if (params.get("view") === "growth-details") return "growth-details";
  const page = params.get("page");
  return workspacePageIds.has(page) ? page : "dashboard";
}

function readWorkspaceLanguage() {
  try {
    if (window.localStorage.getItem("flexiblefox-language") === "en") return "en";
    const profile = JSON.parse(window.localStorage.getItem("flexiblefox-profile") || "null");
    return profile?.language === "English" || profile?.language === "en" ? "en" : "zh";
  } catch {
    return "zh";
  }
}

export default function App() {
  const [activePage, setActivePage] = useState(readWorkspacePage);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [language, setLanguage] = useState(readWorkspaceLanguage);
  const mainRef = useRef(null);
  useWorkspaceLanguageBridge(mainRef, language);

  useEffect(() => {
    document.documentElement.dataset.theme = "light";
    document.documentElement.style.colorScheme = "light";
    try {
      window.localStorage.setItem("flexiblefox-theme", "light");
    } catch {
      // 浏览器禁用本地存储时，工作台仍保持浅色模式。
    }
  }, []);

  useEffect(() => {
    document.documentElement.lang = language === "en" ? "en" : "zh-CN";
    document.title = language === "en" ? "FlexibleFox · Content Workspace" : "FlexibleFox 灵狐 · 创作工作台";
    try {
      window.localStorage.setItem("flexiblefox-language", language);
    } catch {
      // 浏览器禁用本地存储时，语言仍在当前会话内生效。
    }
  }, [language]);

  useEffect(() => {
    const handleHistory = () => setActivePage(readWorkspacePage());
    window.addEventListener("popstate", handleHistory);
    return () => window.removeEventListener("popstate", handleHistory);
  }, []);

  const navigateToPage = (page) => {
    setActivePage(page);
    const url = new URL(window.location.href);
    if (page === "growth-details") {
      url.searchParams.set("view", "growth-details");
      url.searchParams.delete("page");
    } else {
      url.searchParams.delete("view");
      url.searchParams.delete("scope");
      if (page === "dashboard") url.searchParams.delete("page");
      else url.searchParams.set("page", page);
    }
    window.history.pushState({ page }, "", url);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const openGrowthDetails = (scope = "overall") => {
    setActivePage("growth-details");
    const url = new URL(window.location.href);
    url.searchParams.set("view", "growth-details");
    url.searchParams.delete("page");
    if (scope === "overall") url.searchParams.delete("scope");
    else url.searchParams.set("scope", scope);
    window.history.pushState({ page: "growth-details", scope }, "", url);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <StripeWorkspace activePage={activePage} onNavigate={navigateToPage} language={language}>
        <main
          ref={mainRef}
          className={"workspace-main" + (activePage !== "dashboard" ? " has-page-content" : "")}
          data-active-page={activePage}
          aria-label={language === "en" ? "Main content" : "主内容区域"}
        >
          {activePage === "dashboard" && <StripeHome onOpenGrowthDetails={openGrowthDetails} onNavigate={navigateToPage} language={language} />}
          {activePage === "growth-details" && <GrowthDetails scope={new URLSearchParams(window.location.search).get("scope") || "overall"} onBack={() => navigateToPage("dashboard")} language={language} />}
          {activePage === "account-information" && <AccountLibrary language={language} />}
          {activePage === "account-publishing" && (
            <Suspense
              fallback={
                <div className="account-loading" role="status" aria-live="polite">
                  <span className="account-loading-indicator" aria-hidden="true" />
                  <p>{language === "en" ? "Opening publishing accounts…" : "正在打开发布账号库…"}</p>
                </div>
              }
            >
              <PublishingAccountLibrary language={language} />
            </Suspense>
          )}
          {activePage === "settings" && (
            <Suspense
              fallback={
                <div className="account-loading" role="status" aria-live="polite">
                  <span className="account-loading-indicator" aria-hidden="true" />
                  <p>{language === "en" ? "Opening settings…" : "正在打开设置…"}</p>
                </div>
              }
            >
              <SettingsPage language={language} onLanguageChange={setLanguage} />
            </Suspense>
          )}
          {activePage === "prompt-library" && (
            <Suspense
              fallback={
                <div className="account-loading" role="status" aria-live="polite">
                  <span className="account-loading-indicator" aria-hidden="true" />
                  <p>{language === "en" ? "Opening prompt library…" : "正在打开提示词库…"}</p>
                </div>
              }
            >
              <PromptLibrary language={language} />
            </Suspense>
          )}
          {(
            activePage === "content-settings"
            || activePage === "content-list"
            || activePage === "content-drafts"
            || activePage === "content-jobs"
          ) && (
            <Suspense
              fallback={
                <div className="account-loading" role="status" aria-live="polite">
                  <span className="account-loading-indicator" aria-hidden="true" />
                  <p>{language === "en" ? "Opening content library…" : "正在打开内容库…"}</p>
                </div>
              }
            >
              <ContentLibrary
                language={language}
                section={
                  activePage === "content-list"
                    ? "content"
                    : activePage === "content-drafts"
                      ? "drafts"
                      : activePage === "content-jobs"
                        ? "jobs"
                        : "settings"
                }
              />
            </Suspense>
          )}
        </main>
      <ToastProvider placement="bottom end" maxVisibleToasts={3} />
    </StripeWorkspace>
  );
}
