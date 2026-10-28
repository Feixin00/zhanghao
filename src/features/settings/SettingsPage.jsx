import { useEffect, useState } from "react";
import { AlertDialog } from "@heroui/react/alert-dialog";
import { Button } from "@heroui/react/button";
import { Input } from "@heroui/react/input";
import { Label } from "@heroui/react/label";
import { ListBox } from "@heroui/react/list-box";
import { Modal } from "@heroui/react/modal";
import { Select } from "@heroui/react/select";
import { TextField } from "@heroui/react/textfield";
import { toast } from "@heroui/react/toast";
import { Cpu } from "@phosphor-icons/react/Cpu";
import { ArrowLeft } from "@phosphor-icons/react/ArrowLeft";
import { Bell } from "@phosphor-icons/react/Bell";
import { Code } from "@phosphor-icons/react/Code";
import { EnvelopeSimple } from "@phosphor-icons/react/EnvelopeSimple";
import { Globe } from "@phosphor-icons/react/Globe";
import { Monitor } from "@phosphor-icons/react/Monitor";
import { PencilSimple } from "@phosphor-icons/react/PencilSimple";
import { Plug } from "@phosphor-icons/react/Plug";
import { Plus } from "@phosphor-icons/react/Plus";
import { ShieldCheck } from "@phosphor-icons/react/ShieldCheck";
import { SignOut } from "@phosphor-icons/react/SignOut";
import { Trash } from "@phosphor-icons/react/Trash";
import { User } from "@phosphor-icons/react/User";
import {
  addAiConfiguration,
  deleteAiConfiguration,
  getAiConfigurations,
  setAiConfigurationEnabled,
  testAiConnection,
  updateAiConfiguration,
} from "../../api/settings";
import "./settings-page.css";

const MODEL_TYPES = Object.freeze([
  { id: "text", label: "文本模型" },
  { id: "image", label: "图像模型" },
]);
const MODEL_TYPE_LABELS = Object.freeze(Object.fromEntries(
  MODEL_TYPES.map((item) => [item.id, item.label]),
));
const EMPTY_FORM = Object.freeze({ modelName: "", apiKey: "", baseUrl: "", modelType: "text" });
const IMAGE_MODEL_PRESETS = ["gpt-image-2", "gpt-image-2-vip"];
const PROFILE_STORAGE_KEY = "flexiblefox-profile";
const PREFERENCE_STORAGE_KEY = "flexiblefox-notification-preferences";
const SETTINGS_COPY = {
  zh: {
    settings: "设置", personalSettings: "个人设置", productSettings: "产品设置", personal: "个人资料", personalDescription: "修改昵称、邮箱、密码、安全验证和活跃会话。", notifications: "通知偏好", notificationsDescription: "选择希望收到的抓取、创作和发布提醒。", aiModels: "AI 模型", aiModelsDescription: "管理文本与图像模型、API Key 和服务地址。", global: "全局设置", edit: "编辑", editProfile: "编辑个人资料", nickname: "昵称", loginEmail: "登录邮箱", verifyEmail: "保存后需要在新邮箱中完成验证。", cancel: "取消", save: "保存", user: "用户", password: "密码", changePassword: "修改密码", currentPassword: "当前密码", newPassword: "新密码", confirmPassword: "确认新密码", updatePassword: "更新密码", linkedAccounts: "关联账号", linkedDescription: "使用 Google 或 Apple 账号快捷登录 FlexibleFox。", linkAccount: "关联账号", passkeys: "通行密钥", passkeysDescription: "使用设备生物识别、设备密码或硬件安全密钥登录。", addPasskey: "添加通行密钥", twoStep: "两步验证", twoStepDescription: "增加额外验证方式，提升账号安全性。", addVerification: "添加验证方式", language: "语言", languageDescription: "选择界面以及日期、时间和数字使用的语言。", interfaceLanguage: "界面语言", saved: "语言偏好已保存", activeSessions: "活跃会话", activeSessionsDescription: "当前登录 FlexibleFox 的设备。", signOutOthers: "退出其他会话", location: "位置", device: "设备", ip: "IP 地址", time: "时间", shanghai: "中国 · 上海", currentNetwork: "当前网络", justNow: "刚刚", currentSession: "当前会话", signOut: "退出登录", profileSaved: "个人资料已保存", verificationSent: "验证邮件已发送到新邮箱。", nicknameUpdated: "昵称已更新。", passwordUpdated: "密码已更新", passwordHint: "下次登录时请使用新密码。", linkedReady: "关联入口已准备", linkedReadyHint: "正式接入 OAuth 后可在这里完成绑定。", passkeyOpened: "通行密钥设置已打开", verificationOpened: "验证方式设置已打开", otherSessionsSignedOut: "已退出其他设备", currentDeviceStays: "当前设备仍保持登录。",
  },
  en: {
    settings: "Settings", personalSettings: "Personal settings", productSettings: "Product settings", personal: "Personal details", personalDescription: "Update your name, email, password, security methods, and active sessions.", notifications: "Notification preferences", notificationsDescription: "Choose which collection, creation, and publishing alerts you receive.", aiModels: "AI models", aiModelsDescription: "Manage text and image models, API keys, and service endpoints.", global: "Global", edit: "Edit", editProfile: "Edit personal details", nickname: "Display name", loginEmail: "Sign-in email", verifyEmail: "You’ll need to verify the new email address after saving.", cancel: "Cancel", save: "Save", user: "User", password: "Password", changePassword: "Change password", currentPassword: "Current password", newPassword: "New password", confirmPassword: "Confirm new password", updatePassword: "Update password", linkedAccounts: "Linked accounts", linkedDescription: "Use Google or Apple to sign in to FlexibleFox.", linkAccount: "Link account", passkeys: "Passkeys", passkeysDescription: "Sign in with biometrics, your device password, or a hardware security key.", addPasskey: "Add passkey", twoStep: "Two-step verification", twoStepDescription: "Add another verification method to improve account security.", addVerification: "Add verification method", language: "Language", languageDescription: "Choose the language used for the interface, dates, times, and numbers.", interfaceLanguage: "Interface language", saved: "Language preference saved", activeSessions: "Active sessions", activeSessionsDescription: "Devices currently signed in to FlexibleFox.", signOutOthers: "Sign out other sessions", location: "Location", device: "Device", ip: "IP address", time: "Time", shanghai: "Shanghai, China", currentNetwork: "Current network", justNow: "Just now", currentSession: "Current session", signOut: "Sign out", profileSaved: "Personal details saved", verificationSent: "A verification email was sent to the new address.", nicknameUpdated: "Your display name was updated.", passwordUpdated: "Password updated", passwordHint: "Use your new password the next time you sign in.", linkedReady: "Account linking is ready", linkedReadyHint: "You can finish linking after OAuth is connected.", passkeyOpened: "Passkey setup opened", verificationOpened: "Verification setup opened", otherSessionsSignedOut: "Other sessions signed out", currentDeviceStays: "This device remains signed in.",
  },
};

function ModelNameField({ form, onChange }) {
  if (form.modelType !== "image") return (
    <TextField value={form.modelName} onChange={onChange} isRequired>
      <Label>模型名称</Label><Input variant="secondary" placeholder="例如：gpt-5.4" autoComplete="off" />
    </TextField>
  );
  return <div className="ai-image-model-field">
    <Select className="ai-model-type-select" variant="secondary" selectedKey={IMAGE_MODEL_PRESETS.includes(form.modelName) ? form.modelName : "custom"}
      onSelectionChange={(key) => onChange(IMAGE_MODEL_PRESETS.includes(key) ? key : "")} isRequired>
      <Label>图像模型</Label>
      <Select.Trigger><Select.Value /><Select.Indicator /></Select.Trigger>
      <Select.Popover><ListBox>
        <ListBox.Item id="gpt-image-2" textValue="gpt-image-2"><Label>gpt-image-2（推荐）</Label><ListBox.ItemIndicator /></ListBox.Item>
        <ListBox.Item id="gpt-image-2-vip" textValue="gpt-image-2-vip"><Label>gpt-image-2-vip</Label><ListBox.ItemIndicator /></ListBox.Item>
        <ListBox.Item id="custom" textValue="自定义图像模型"><Label>自定义图像模型</Label><ListBox.ItemIndicator /></ListBox.Item>
      </ListBox></Select.Popover>
    </Select>
    {!IMAGE_MODEL_PRESETS.includes(form.modelName) && <TextField value={form.modelName} onChange={onChange} isRequired>
      <Label>自定义模型名称</Label><Input variant="secondary" placeholder="填写服务商提供的模型 ID" autoComplete="off" />
    </TextField>}
    <small>自定义模型需兼容 Images 生成／编辑接口。<a href="https://llms.best/en/models" target="_blank" rel="noreferrer">查看模型列表</a></small>
  </div>;
}

function formatTime(value) {
  if (!value) return "";
  return new Intl.DateTimeFormat("zh-CN", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(value));
}

function readStoredProfile() {
  const fallback = { name: "FlexibleFox 用户", email: "name@example.com", language: "简体中文" };
  try {
    const preview = JSON.parse(sessionStorage.getItem("flexiblefox-auth-preview") || "null");
    const stored = JSON.parse(localStorage.getItem(PROFILE_STORAGE_KEY) || "null");
    return {
      ...fallback,
      ...(preview?.name ? { name: preview.name } : {}),
      ...(preview?.email ? { email: preview.email } : {}),
      ...(stored || {}),
    };
  } catch {
    return fallback;
  }
}

function SettingsBackButton({ onBack, copy }) {
  return <button type="button" className="settings-back-link" onClick={onBack}><ArrowLeft size={14} weight="bold" />{copy.settings}</button>;
}

function SettingsHub({ onOpen, copy }) {
  const groups = [
    {
      title: copy.personalSettings,
      items: [
        { id: "personal", title: copy.personal, description: copy.personalDescription, icon: User },
        { id: "notifications", title: copy.notifications, description: copy.notificationsDescription, icon: EnvelopeSimple },
      ],
    },
    {
      title: copy.productSettings,
      items: [
        { id: "ai-models", title: copy.aiModels, description: copy.aiModelsDescription, icon: Code },
      ],
    },
  ];

  return <section className="settings-hub" aria-labelledby="settings-title">
    <h1 id="settings-title">{copy.settings}</h1>
    {groups.map((group) => <div className="settings-hub-group" key={group.title}>
      <h2>{group.title}</h2>
      <div className="settings-hub-grid">
        {group.items.map(({ id, title, description, icon: Icon }) => <button type="button" className="settings-hub-item" key={id} onClick={() => onOpen(id)}>
          <span className="settings-hub-icon" aria-hidden="true"><Icon size={20} weight="duotone" /></span>
          <span><strong>{title}</strong><small>{description}</small></span>
        </button>)}
      </div>
    </div>)}
  </section>;
}

function EditProfileModal({ profile, onSave, copy }) {
  const [draft, setDraft] = useState(profile);
  const reset = () => setDraft(profile);
  return <Modal>
    <Modal.Trigger className="settings-outline-button" onClick={reset}><PencilSimple size={14} />{copy.edit}</Modal.Trigger>
    <Modal.Backdrop variant="blur" isDismissable>
      <Modal.Container placement="center" size="sm"><Modal.Dialog>{({ close }) => <form onSubmit={(event) => {
        event.preventDefault();
        const next = { ...profile, name: draft.name.trim(), email: draft.email.trim() };
        if (!next.name || !next.email) return;
        onSave(next);
        close();
      }}>
        <Modal.Header><Modal.Heading>{copy.editProfile}</Modal.Heading><Modal.CloseTrigger /></Modal.Header>
        <Modal.Body><div className="settings-modal-fields">
          <TextField value={draft.name} onChange={(name) => setDraft((current) => ({ ...current, name }))} isRequired><Label>{copy.nickname}</Label><Input variant="secondary" autoComplete="name" /></TextField>
          <TextField value={draft.email} onChange={(email) => setDraft((current) => ({ ...current, email }))} isRequired><Label>{copy.loginEmail}</Label><Input variant="secondary" type="email" autoComplete="email" /></TextField>
          {draft.email !== profile.email && <p className="settings-verification-note">{copy.verifyEmail}</p>}
        </div></Modal.Body>
        <Modal.Footer><Button slot="close" variant="secondary">{copy.cancel}</Button><Button type="submit">{copy.save}</Button></Modal.Footer>
      </form>}</Modal.Dialog></Modal.Container>
    </Modal.Backdrop>
  </Modal>;
}

function PasswordModal({ copy }) {
  const [passwords, setPasswords] = useState({ current: "", next: "", confirm: "" });
  const reset = () => setPasswords({ current: "", next: "", confirm: "" });
  const valid = passwords.current && passwords.next.length >= 6 && passwords.next === passwords.confirm;
  return <Modal>
    <Modal.Trigger className="settings-outline-button" onClick={reset}>{copy.changePassword}</Modal.Trigger>
    <Modal.Backdrop variant="blur" isDismissable><Modal.Container placement="center" size="sm"><Modal.Dialog>{({ close }) => <form onSubmit={(event) => {
      event.preventDefault();
      if (!valid) return;
      toast.success(copy.passwordUpdated, { description: copy.passwordHint });
      close();
    }}>
      <Modal.Header><Modal.Heading>{copy.changePassword}</Modal.Heading><Modal.CloseTrigger /></Modal.Header>
      <Modal.Body><div className="settings-modal-fields">
        <TextField value={passwords.current} onChange={(current) => setPasswords((value) => ({ ...value, current }))} isRequired><Label>{copy.currentPassword}</Label><Input variant="secondary" type="password" autoComplete="current-password" /></TextField>
        <TextField value={passwords.next} onChange={(next) => setPasswords((value) => ({ ...value, next }))} isRequired><Label>{copy.newPassword}</Label><Input variant="secondary" type="password" autoComplete="new-password" /></TextField>
        <TextField value={passwords.confirm} onChange={(confirm) => setPasswords((value) => ({ ...value, confirm }))} isRequired><Label>{copy.confirmPassword}</Label><Input variant="secondary" type="password" autoComplete="new-password" /></TextField>
      </div></Modal.Body>
      <Modal.Footer><Button slot="close" variant="secondary">{copy.cancel}</Button><Button type="submit" isDisabled={!valid}>{copy.updatePassword}</Button></Modal.Footer>
    </form>}</Modal.Dialog></Modal.Container></Modal.Backdrop>
  </Modal>;
}

function PersonalDetails({ onBack, language, onLanguageChange, copy }) {
  const [profile, setProfile] = useState(readStoredProfile);
  const [selectedLanguage, setSelectedLanguage] = useState(language);
  useEffect(() => setSelectedLanguage(language), [language]);
  const saveProfile = (next) => {
    setProfile(next);
    localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(next));
    toast.success(copy.profileSaved, { description: next.email !== profile.email ? copy.verificationSent : copy.nicknameUpdated });
  };
  const saveLanguage = () => {
    const next = { ...profile, language: selectedLanguage === "en" ? "English" : "简体中文" };
    setProfile(next);
    localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(next));
    onLanguageChange(selectedLanguage);
    toast.success(SETTINGS_COPY[selectedLanguage]?.saved || copy.saved);
  };

  return <section className="personal-settings-page" aria-labelledby="personal-settings-title">
    <SettingsBackButton onBack={onBack} copy={copy} />
    <div className="personal-settings-title-row"><div><h1 id="personal-settings-title">{copy.personal}</h1><span className="settings-global-badge">{copy.global}</span></div><EditProfileModal profile={profile} onSave={saveProfile} copy={copy} /></div>

    <section className="settings-detail-section"><h2>{copy.user}</h2><div className="settings-detail-table">
      <div><span>{copy.nickname}</span><strong>{profile.name}</strong></div>
      <div><span>{copy.password}</span><PasswordModal copy={copy} /></div>
      <div><span>{copy.loginEmail}</span><strong>{profile.email}</strong></div>
    </div></section>

    <section className="settings-detail-section settings-action-section"><div><h2>{copy.linkedAccounts}</h2><p>{copy.linkedDescription}</p></div><Button variant="secondary" onPress={() => toast.success(copy.linkedReady, { description: copy.linkedReadyHint })}>{copy.linkAccount}</Button></section>
    <section className="settings-detail-section settings-action-section"><div><h2>{copy.passkeys}</h2><p>{copy.passkeysDescription}</p></div><Button variant="secondary" onPress={() => toast.success(copy.passkeyOpened) }><Plus size={14} />{copy.addPasskey}</Button></section>
    <section className="settings-detail-section settings-action-section"><div><h2>{copy.twoStep}</h2><p>{copy.twoStepDescription}</p></div><Button variant="secondary" onPress={() => toast.success(copy.verificationOpened) }><Plus size={14} />{copy.addVerification}</Button></section>

    <section className="settings-detail-section settings-language-section"><div><h2>{copy.language}</h2><p>{copy.languageDescription}</p><label><span className="sr-only">{copy.interfaceLanguage}</span><select value={selectedLanguage} onChange={(event) => setSelectedLanguage(event.target.value)}><option value="zh">简体中文</option><option value="en">English</option></select></label></div><Button onPress={saveLanguage}>{copy.save}</Button></section>

    <section className="settings-detail-section settings-sessions-section"><div className="settings-session-heading"><div><h2>{copy.activeSessions}</h2><p>{copy.activeSessionsDescription}</p></div><Button variant="secondary" onPress={() => toast.success(copy.otherSessionsSignedOut, { description: copy.currentDeviceStays })}>{copy.signOutOthers}</Button></div>
      <div className="settings-session-table"><div className="is-header"><span>{copy.location}</span><span>{copy.device}</span><span>{copy.ip}</span><span>{copy.time}</span><span /></div><div><span>{copy.shanghai}</span><span><Monitor size={15} />Chrome · macOS</span><span>{copy.currentNetwork}</span><span>{copy.justNow}</span><strong>{copy.currentSession}</strong></div></div>
    </section>

    <div className="settings-danger-row"><button type="button" onClick={() => { sessionStorage.removeItem("flexiblefox-auth-preview"); window.location.assign("/login"); }}><SignOut size={16} />{copy.signOut}</button></div>
  </section>;
}

function NotificationPreferences({ onBack, copy }) {
  const defaults = { crawl: true, generation: true, publishing: true, security: true };
  const [preferences, setPreferences] = useState(() => {
    try { return { ...defaults, ...JSON.parse(localStorage.getItem(PREFERENCE_STORAGE_KEY) || "null") }; } catch { return defaults; }
  });
  const rows = [
    ["crawl", "抓取状态", "抓取完成、失败或登录状态过期时通知我。", Bell],
    ["generation", "内容生成", "稿件或图片生成完成、失败时通知我。", Code],
    ["publishing", "发布结果", "内容发布成功或失败时通知我。", Globe],
    ["security", "账号安全", "邮箱、密码或登录设备发生变化时通知我。", ShieldCheck],
  ];
  const togglePreference = (key) => setPreferences((current) => ({ ...current, [key]: !current[key] }));
  return <section className="preference-settings-page" aria-labelledby="preference-settings-title"><SettingsBackButton onBack={onBack} copy={copy} /><h1 id="preference-settings-title">{copy.notifications}</h1><p className="settings-page-lead">{copy.notificationsDescription}</p>
    <div className="settings-preference-list">{rows.map(([key, title, description, Icon]) => <div key={key}><span className="settings-hub-icon"><Icon size={20} weight="duotone" /></span><span><strong>{title}</strong><small>{description}</small></span><button type="button" role="switch" aria-checked={preferences[key]} className={`settings-switch${preferences[key] ? " is-on" : ""}`} onClick={() => togglePreference(key)}><span /></button></div>)}</div>
    <Button className="settings-preference-save" onPress={() => { localStorage.setItem(PREFERENCE_STORAGE_KEY, JSON.stringify(preferences)); toast.success("通知偏好已保存"); }}>保存更改</Button>
  </section>;
}

function StatusButton({ configuration, busy, onToggle }) {
  return (
    <button
      type="button"
      className={`ai-config-status${configuration.enabled ? " is-enabled" : " is-disabled"}`}
      disabled={busy}
      aria-label={`${configuration.enabled ? "停用" : "启用"}配置 ${configuration.modelName}`}
      title={configuration.enabled ? "点击停用" : "点击启用"}
      onClick={() => onToggle(configuration)}
    >
      <span aria-hidden="true" />
      {busy ? "保存中" : configuration.enabled ? "已启用" : "已停用"}
    </button>
  );
}

function DeleteConfigurationButton({ configuration, onDelete }) {
  const [isDeleting, setIsDeleting] = useState(false);

  async function handleDelete(close) {
    setIsDeleting(true);
    const deleted = await onDelete(configuration);
    setIsDeleting(false);
    if (deleted) close();
  }

  return (
    <AlertDialog>
      <AlertDialog.Trigger
        className="ai-config-action is-danger"
        aria-label={`删除配置 ${configuration.modelName}`}
        title="删除配置"
      >
        <Trash size={17} aria-hidden="true" />
      </AlertDialog.Trigger>
      <AlertDialog.Backdrop variant="blur" isDismissable isKeyboardDismissDisabled={false}>
        <AlertDialog.Container placement="center" size="xs">
          <AlertDialog.Dialog>
            {({ close }) => (
              <>
                <AlertDialog.Header>
                  <AlertDialog.Icon status="danger" />
                  <AlertDialog.Heading>删除这项配置？</AlertDialog.Heading>
                </AlertDialog.Header>
                <AlertDialog.Body>
                  模型「{configuration.modelName}」及其 API Key、Base URL 会被一起删除，且无法恢复。
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
  );
}

function EditConfigurationModal({ configuration, onSave }) {
  const [form, setForm] = useState({
    modelName: configuration.modelName,
    apiKey: "",
    baseUrl: configuration.baseUrl,
    modelType: configuration.modelType || "text",
  });
  const [isSaving, setIsSaving] = useState(false);

  function reset() {
    setForm({
      modelName: configuration.modelName,
      apiKey: "",
      baseUrl: configuration.baseUrl,
      modelType: configuration.modelType || "text",
    });
    setIsSaving(false);
  }

  function updateField(key, value) {
    setForm((current) => ({ ...current, [key]: value,
      ...(key === "modelType" && value === "image" && current.modelType !== "image" ? { modelName: "gpt-image-2" } : {}),
    }));
  }

  async function save(event, close) {
    event.preventDefault();
    if (!form.modelName.trim() || !form.baseUrl.trim()) return;
    setIsSaving(true);
    const saved = await onSave(configuration, {
      modelName: form.modelName.trim(),
      apiKey: form.apiKey.trim(),
      baseUrl: form.baseUrl.trim(),
      modelType: form.modelType,
    });
    setIsSaving(false);
    if (saved) close();
  }

  return (
    <Modal>
      <Modal.Trigger
        className="ai-config-action"
        aria-label={`修改配置 ${configuration.modelName}`}
        title="修改配置"
        onClick={reset}
      >
        <PencilSimple size={17} aria-hidden="true" />
      </Modal.Trigger>
      <Modal.Backdrop variant="blur" isDismissable>
        <Modal.Container placement="center" size="lg">
          <Modal.Dialog>
            {({ close }) => (
              <form onSubmit={(event) => save(event, close)}>
                <Modal.Header>
                  <div>
                    <Modal.Heading>修改 AI 配置</Modal.Heading>
                    <p className="ai-edit-description">API Key 留空时会保留原密钥。</p>
                  </div>
                  <Modal.CloseTrigger aria-label="关闭修改配置窗口" />
                </Modal.Header>
                <Modal.Body>
                  <div className="ai-edit-grid">
                    <ModelNameField form={form} onChange={(value) => updateField("modelName", value)} />
                    <TextField value={form.apiKey} onChange={(value) => updateField("apiKey", value)}>
                      <Label>API Key</Label>
                      <Input
                        variant="secondary"
                        type="password"
                        placeholder={`留空则保留 ${configuration.apiKey}`}
                        autoComplete="new-password"
                      />
                    </TextField>
                    <TextField value={form.baseUrl} onChange={(value) => updateField("baseUrl", value)} isRequired>
                      <Label>Base URL</Label>
                      <Input variant="secondary" autoComplete="off" />
                    </TextField>
                    <Select
                      className="ai-model-type-select"
                      variant="secondary"
                      selectedKey={form.modelType}
                      onSelectionChange={(key) => updateField("modelType", key ? String(key) : "text")}
                      isRequired
                    >
                      <Label>模型类型</Label>
                      <Select.Trigger>
                        <Select.Value />
                        <Select.Indicator />
                      </Select.Trigger>
                      <Select.Popover>
                        <ListBox>
                          {MODEL_TYPES.map((type) => (
                            <ListBox.Item key={type.id} id={type.id} textValue={type.label}>
                              <Label>{type.label}</Label>
                              <ListBox.ItemIndicator />
                            </ListBox.Item>
                          ))}
                        </ListBox>
                      </Select.Popover>
                    </Select>
                  </div>
                </Modal.Body>
                <Modal.Footer>
                  <Button slot="close" variant="secondary" isDisabled={isSaving}>取消</Button>
                  <Button
                    type="submit"
                    variant="primary"
                    isDisabled={isSaving || !form.modelName.trim() || !form.baseUrl.trim()}
                  >
                    {isSaving ? "正在保存…" : "保存修改"}
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

function ConfigurationCard({ configuration, busy, onToggle, onEdit, onDelete }) {
  return (
    <article className={`ai-config-card${configuration.enabled ? " is-enabled" : ""}`}>
      <div className="ai-config-card-identity">
        <span className="ai-config-card-icon" aria-hidden="true"><Cpu size={20} weight="duotone" /></span>
        <div>
          <h3>{configuration.modelName}</h3>
          <p>
            <span className={`ai-config-type is-${configuration.modelType || "text"}`}>
              {MODEL_TYPE_LABELS[configuration.modelType] || "文本模型"}
            </span>
            添加于 {formatTime(configuration.createdAt)}
          </p>
        </div>
      </div>
      <div className="ai-config-card-controls">
        <StatusButton configuration={configuration} busy={busy} onToggle={onToggle} />
        <EditConfigurationModal configuration={configuration} onSave={onEdit} />
        <DeleteConfigurationButton configuration={configuration} onDelete={onDelete} />
      </div>
      <div className="ai-config-card-summary">
        <span>{configuration.baseUrl}</span>
        <strong>{configuration.apiKey}</strong>
      </div>
    </article>
  );
}

function AiModelsSettings({ onBack, copy }) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [configurations, setConfigurations] = useState([]);
  const [busyIds, setBusyIds] = useState(() => new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [connectionResult, setConnectionResult] = useState(null);

  async function loadConfigurations() {
    setIsLoading(true);
    setLoadError("");
    try {
      setConfigurations(await getAiConfigurations());
    } catch (error) {
      setLoadError(error.message || "暂时无法读取设置");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => { loadConfigurations(); }, []);

  function updateForm(key, value) {
    setForm((current) => ({ ...current, [key]: value,
      ...(key === "modelType" && value === "image" && current.modelType !== "image" ? { modelName: "gpt-image-2" } : {}),
    }));
  }

  function setBusy(id, busy) {
    setBusyIds((current) => {
      const next = new Set(current);
      if (busy) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  async function createConfiguration(event, close) {
    event.preventDefault();
    const values = {
      modelName: form.modelName.trim(),
      apiKey: form.apiKey.trim(),
      baseUrl: form.baseUrl.trim(),
      modelType: form.modelType,
    };
    if (!values.modelName || !values.apiKey || !values.baseUrl) return;
    setIsCreating(true);
    try {
      setConfigurations(await addAiConfiguration(values));
      setForm(EMPTY_FORM);
      toast.success("AI 配置已添加", {
        description: `${MODEL_TYPE_LABELS[values.modelType]}已保存，并在同类型配置中启用。`,
      });
      close?.();
    } catch (error) {
      toast.danger("添加失败", { description: error.message });
    } finally {
      setIsCreating(false);
    }
  }

  async function toggleConfiguration(configuration) {
    setBusy(configuration.id, true);
    try {
      setConfigurations(await setAiConfigurationEnabled(configuration.id, !configuration.enabled));
      toast.success(configuration.enabled ? "配置已停用" : "配置已启用");
    } catch (error) {
      toast.danger("操作失败", { description: error.message });
    } finally {
      setBusy(configuration.id, false);
    }
  }

  async function editConfiguration(configuration, values) {
    setBusy(configuration.id, true);
    try {
      setConfigurations(await updateAiConfiguration(configuration.id, values));
      toast.success("AI 配置已更新");
      return true;
    } catch (error) {
      toast.danger("修改失败", { description: error.message });
      return false;
    } finally {
      setBusy(configuration.id, false);
    }
  }

  async function removeConfiguration(configuration) {
    setBusy(configuration.id, true);
    try {
      setConfigurations(await deleteAiConfiguration(configuration.id));
      toast.success("AI 配置已删除");
      return true;
    } catch (error) {
      toast.danger("删除失败", { description: error.message });
      return false;
    } finally {
      setBusy(configuration.id, false);
    }
  }

  async function testConnection() {
    setIsTesting(true);
    setConnectionResult(null);
    try {
      const result = await testAiConnection();
      const status = result.modelAvailable === false ? "warning" : "success";
      const message = `${result.message} · ${result.latencyMs} ms`;
      setConnectionResult({ status, message });
      toast.success("连通性测试完成", { description: message });
    } catch (error) {
      setConnectionResult({ status: "danger", message: error.message });
      toast.danger("连通性测试失败", { description: error.message });
    } finally {
      setIsTesting(false);
    }
  }

  const canCreate = form.modelName.trim() && form.apiKey.trim() && form.baseUrl.trim();
  const groupedConfigurations = MODEL_TYPES.map((type) => ({
    ...type,
    configurations: configurations.filter((configuration) => (configuration.modelType || "text") === type.id),
  }));

  return (
    <section className="settings-page ai-models-page" aria-label="AI 模型设置">
      <header className="ai-models-header">
        <div><SettingsBackButton onBack={onBack} copy={copy} /><h1>{copy.aiModels}</h1><p>{copy.aiModelsDescription}</p></div>
        <div className="ai-models-header-actions">
          <Button variant="secondary" className="ai-test-connection" isDisabled={isLoading || isTesting} onPress={testConnection}>
            <Plug size={15} weight="bold" aria-hidden="true" />{isTesting ? "测试中…" : "测试连通性"}
          </Button>
          <Modal>
            <Modal.Trigger className="settings-primary-button" onClick={() => setForm(EMPTY_FORM)}><Plus size={15} weight="bold" />添加配置</Modal.Trigger>
            <Modal.Backdrop variant="blur" isDismissable><Modal.Container placement="center" size="lg"><Modal.Dialog>{({ close }) => <form onSubmit={(event) => createConfiguration(event, close)}>
              <Modal.Header><div><Modal.Heading>添加 AI 配置</Modal.Heading><p className="ai-edit-description">配置模型名称、密钥和兼容服务地址。</p></div><Modal.CloseTrigger /></Modal.Header>
              <Modal.Body><div className="ai-edit-grid">
                <Select className="ai-model-type-select" variant="secondary" selectedKey={form.modelType} onSelectionChange={(key) => updateForm("modelType", key ? String(key) : "text")} isRequired>
                  <Label>模型类型</Label><Select.Trigger><Select.Value /><Select.Indicator /></Select.Trigger><Select.Popover><ListBox>{MODEL_TYPES.map((type) => <ListBox.Item key={type.id} id={type.id} textValue={type.label}><Label>{type.label}</Label><ListBox.ItemIndicator /></ListBox.Item>)}</ListBox></Select.Popover>
                </Select>
                <ModelNameField form={form} onChange={(value) => updateForm("modelName", value)} />
                <TextField value={form.apiKey} onChange={(value) => updateForm("apiKey", value)} isRequired><Label>API Key</Label><Input variant="secondary" type="password" placeholder="输入 API Key" autoComplete="new-password" /></TextField>
                <TextField value={form.baseUrl} onChange={(value) => updateForm("baseUrl", value)} isRequired><Label>Base URL</Label><Input variant="secondary" placeholder="https://api.openai.com/v1" autoComplete="off" /></TextField>
              </div></Modal.Body>
              <Modal.Footer><Button slot="close" variant="secondary" isDisabled={isCreating}>取消</Button><Button type="submit" isDisabled={isCreating || !canCreate}>{isCreating ? "正在添加…" : "添加配置"}</Button></Modal.Footer>
            </form>}</Modal.Dialog></Modal.Container></Modal.Backdrop>
          </Modal>
        </div>
      </header>

      {connectionResult && <div className={`ai-connection-result is-${connectionResult.status}`} role="status" aria-live="polite"><span aria-hidden="true" />{connectionResult.message}</div>}

      {isLoading ? <div className="ai-settings-state" role="status">正在读取设置…</div> : loadError ? <div className="ai-settings-state is-error" role="alert"><span>{loadError}</span><Button variant="secondary" onPress={loadConfigurations}>重新加载</Button></div> : configurations.length ? (
        <div className="ai-model-groups">
          {groupedConfigurations.map((group) => group.configurations.length > 0 && <section className="ai-model-group" key={group.id} aria-labelledby={`ai-model-${group.id}`}>
            <div className="ai-model-group-heading"><div><h2 id={`ai-model-${group.id}`}>{group.label}</h2><p>{group.id === "text" ? "用于内容理解、改写和稿件生成。" : "用于内容配图生成和图片编辑。"}</p></div><span>{group.configurations.length} 项配置</span></div>
            <div className="ai-config-card-grid">{group.configurations.map((configuration) => <ConfigurationCard key={configuration.id} configuration={configuration} busy={busyIds.has(configuration.id)} onToggle={toggleConfiguration} onEdit={editConfiguration} onDelete={removeConfiguration} />)}</div>
          </section>)}
        </div>
      ) : <div className="ai-config-empty">还没有配置，请添加第一个 AI 模型。</div>}
    </section>
  );
}

export default function SettingsPage({ language = "zh", onLanguageChange = () => {} }) {
  const [view, setView] = useState("home");
  const copy = SETTINGS_COPY[language] || SETTINGS_COPY.zh;
  if (view === "personal") return <PersonalDetails onBack={() => setView("home")} language={language} onLanguageChange={onLanguageChange} copy={copy} />;
  if (view === "notifications") return <NotificationPreferences onBack={() => setView("home")} copy={copy} />;
  if (view === "ai-models") return <AiModelsSettings onBack={() => setView("home")} copy={copy} />;
  return <SettingsHub onOpen={setView} copy={copy} />;
}
