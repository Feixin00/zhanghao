import { useEffect, useState } from "react";
import { AlertDialog } from "@heroui/react/alert-dialog";
import { Button } from "@heroui/react/button";
import { FieldError } from "@heroui/react/field-error";
import { Input } from "@heroui/react/input";
import { Label } from "@heroui/react/label";
import { ListBox } from "@heroui/react/list-box";
import { Modal } from "@heroui/react/modal";
import { Select } from "@heroui/react/select";
import { Surface } from "@heroui/react/surface";
import { TextArea } from "@heroui/react/textarea";
import { TextField } from "@heroui/react/textfield";
import { toast } from "@heroui/react/toast";
import { ListBullets } from "@phosphor-icons/react/ListBullets";
import { MagicWand } from "@phosphor-icons/react/MagicWand";
import { PencilSimple } from "@phosphor-icons/react/PencilSimple";
import { Plus } from "@phosphor-icons/react/Plus";
import { Trash } from "@phosphor-icons/react/Trash";
import {
  createPrompt as createPromptRequest,
  deletePrompt as deletePromptRequest,
  deletePromptAccountType as deletePromptAccountTypeRequest,
  getPromptLibrary,
  setPromptEnabled,
  updatePrompt as updatePromptRequest,
} from "../../api/prompts";
import "./prompt-library.css";

const PLATFORMS = ["X", "Reddit", "抖音", "小红书", "微博"];

const EMPTY_FORM = {
  title: "",
  content: "",
  platform: null,
  accountTypeMode: "new",
  accountTypeId: null,
  newAccountTypeName: "",
};

function getFormErrors(form) {
  const errors = {};
  if (!form.title.trim()) errors.title = "请输入提示词名称";
  if (!form.content.trim()) errors.content = "请输入提示词内容";
  if (!form.platform) errors.platform = "请选择归属平台";
  if (form.accountTypeMode === "existing" && !form.accountTypeId) {
    errors.accountType = "请选择账号类型";
  }
  if (form.accountTypeMode === "new" && !form.newAccountTypeName.trim()) {
    errors.accountType = "请输入新的账号类型";
  }
  return errors;
}

function formatDate(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("zh-CN", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function platformClassName(platform) {
  const names = {
    X: "x",
    Reddit: "reddit",
    抖音: "douyin",
    小红书: "xiaohongshu",
    微博: "weibo",
  };
  return names[platform] || "default";
}

function DeletePromptAccountTypeButton({ accountType, onDelete }) {
  const [isDeleting, setIsDeleting] = useState(false);

  async function handleDelete(close) {
    setIsDeleting(true);
    const deleted = await onDelete(accountType.id, accountType.name);
    setIsDeleting(false);
    if (deleted) close();
  }

  return (
    <AlertDialog>
      <AlertDialog.Trigger
        className="prompt-type-delete"
        aria-label={`删除账号类型 ${accountType.name}`}
        title="删除当前账号类型"
      >
        <Trash size={15} aria-hidden="true" />
      </AlertDialog.Trigger>
      <AlertDialog.Backdrop variant="blur" isDismissable isKeyboardDismissDisabled={false}>
        <AlertDialog.Container placement="center" size="xs">
          <AlertDialog.Dialog>
            {({ close }) => (
              <>
                <AlertDialog.Header>
                  <AlertDialog.Icon status="danger" />
                  <AlertDialog.Heading>删除这个账号类型？</AlertDialog.Heading>
                </AlertDialog.Header>
                <AlertDialog.Body>
                  「{accountType.name}」会从后续可选类型中移除。已经归属到该类型的提示词不会被删除，原归属也会保留。
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

function EditPromptModal({ prompt, accountTypes, onSave }) {
  const selectableAccountTypes = accountTypes.some((accountType) => accountType.id === prompt.accountTypeId)
    ? accountTypes
    : [{ id: prompt.accountTypeId, name: prompt.accountTypeName, active: false }, ...accountTypes];
  const [editForm, setEditForm] = useState(() => ({
    title: prompt.title,
    content: prompt.content,
    platform: prompt.platform,
    accountTypeMode: "existing",
    accountTypeId: prompt.accountTypeId,
    newAccountTypeName: "",
  }));
  const [editErrors, setEditErrors] = useState({});
  const [isSaving, setIsSaving] = useState(false);

  function resetForm() {
    setEditForm({
      title: prompt.title,
      content: prompt.content,
      platform: prompt.platform,
      accountTypeMode: "existing",
      accountTypeId: prompt.accountTypeId,
      newAccountTypeName: "",
    });
    setEditErrors({});
    setIsSaving(false);
  }

  function updateField(field, value) {
    setEditForm((current) => ({ ...current, [field]: value }));
    setEditErrors((current) => ({ ...current, [field]: undefined, accountType: undefined }));
  }

  function setMode(mode) {
    setEditForm((current) => ({
      ...current,
      accountTypeMode: mode,
      accountTypeId: mode === "existing" ? current.accountTypeId || prompt.accountTypeId : null,
      newAccountTypeName: mode === "new" ? current.newAccountTypeName : "",
    }));
    setEditErrors((current) => ({ ...current, accountType: undefined }));
  }

  async function save(event, close) {
    event.preventDefault();
    const nextErrors = getFormErrors(editForm);
    setEditErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setIsSaving(true);
    const saved = await onSave(prompt.id, {
      title: editForm.title.trim(),
      content: editForm.content.trim(),
      platform: editForm.platform,
      accountTypeId: editForm.accountTypeMode === "existing" ? editForm.accountTypeId : undefined,
      newAccountTypeName:
        editForm.accountTypeMode === "new" ? editForm.newAccountTypeName.trim() : undefined,
    });
    setIsSaving(false);
    if (saved) close();
  }

  return (
    <Modal>
      <Modal.Trigger
        className="prompt-card-action"
        aria-label={`编辑提示词 ${prompt.title}`}
        title="编辑提示词"
        onClick={resetForm}
      >
        <PencilSimple size={16} aria-hidden="true" />
      </Modal.Trigger>
      <Modal.Backdrop variant="blur" isDismissable>
        <Modal.Container placement="center" size="lg" scroll="inside">
          <Modal.Dialog className="prompt-edit-modal">
            {({ close }) => (
              <form className="prompt-edit-form" onSubmit={(event) => save(event, close)} noValidate>
                <Modal.Header>
                  <div>
                    <Modal.Heading>编辑提示词</Modal.Heading>
                    <p className="prompt-edit-description">修改后会立即同步到提示词列表。</p>
                  </div>
                  <Modal.CloseTrigger aria-label="关闭编辑提示词窗口" />
                </Modal.Header>

                <Modal.Body className="prompt-edit-body">
                  <div className="prompt-edit-grid">
                    <TextField
                      className="prompt-field"
                      value={editForm.title}
                      onChange={(value) => updateField("title", value)}
                      isRequired
                      isInvalid={Boolean(editErrors.title)}
                      validationBehavior="aria"
                    >
                      <Label>提示词名称</Label>
                      <Input variant="secondary" autoComplete="off" />
                      {editErrors.title && <FieldError>{editErrors.title}</FieldError>}
                    </TextField>

                    <Select
                      className="prompt-field"
                      variant="secondary"
                      selectedKey={editForm.platform}
                      onSelectionChange={(key) => updateField("platform", key ? String(key) : null)}
                      isRequired
                      isInvalid={Boolean(editErrors.platform)}
                      validationBehavior="aria"
                    >
                      <Label>归属平台</Label>
                      <Select.Trigger>
                        <Select.Value />
                        <Select.Indicator />
                      </Select.Trigger>
                      <Select.Popover>
                        <ListBox>
                          {PLATFORMS.map((platform) => (
                            <ListBox.Item key={platform} id={platform} textValue={platform}>
                              <Label>{platform}</Label>
                              <ListBox.ItemIndicator />
                            </ListBox.Item>
                          ))}
                        </ListBox>
                      </Select.Popover>
                      {editErrors.platform && <FieldError>{editErrors.platform}</FieldError>}
                    </Select>
                  </div>

                  <div className="prompt-type-field">
                    <div className="prompt-type-heading">
                      <div>
                        <Label>账号类型</Label>
                        <p>可以改用现有类型，也可以新增一个类型。</p>
                      </div>
                      <div className="prompt-type-mode" aria-label="编辑账号类型录入方式">
                        <button
                          type="button"
                          className={editForm.accountTypeMode === "existing" ? "is-active" : ""}
                          onClick={() => setMode("existing")}
                        >
                          选择现有
                        </button>
                        <button
                          type="button"
                          className={editForm.accountTypeMode === "new" ? "is-active" : ""}
                          onClick={() => setMode("new")}
                        >
                          新增类型
                        </button>
                      </div>
                    </div>

                    {editForm.accountTypeMode === "new" ? (
                      <TextField
                        className="prompt-field"
                        value={editForm.newAccountTypeName}
                        onChange={(value) => updateField("newAccountTypeName", value)}
                        isRequired
                        isInvalid={Boolean(editErrors.accountType)}
                        validationBehavior="aria"
                      >
                        <Input variant="secondary" placeholder="输入新的账号类型" autoComplete="off" />
                        {editErrors.accountType && <FieldError>{editErrors.accountType}</FieldError>}
                      </TextField>
                    ) : (
                      <Select
                        className="prompt-field"
                        variant="secondary"
                        selectedKey={editForm.accountTypeId}
                        onSelectionChange={(key) => updateField("accountTypeId", key ? String(key) : null)}
                        isRequired
                        isInvalid={Boolean(editErrors.accountType)}
                        validationBehavior="aria"
                      >
                        <Select.Trigger>
                          <Select.Value />
                          <Select.Indicator />
                        </Select.Trigger>
                        <Select.Popover>
                          <ListBox>
                            {selectableAccountTypes.map((accountType) => (
                              <ListBox.Item
                                key={accountType.id}
                                id={accountType.id}
                                textValue={accountType.name}
                              >
                                <Label>{accountType.name}</Label>
                                <ListBox.ItemIndicator />
                              </ListBox.Item>
                            ))}
                          </ListBox>
                        </Select.Popover>
                        {editErrors.accountType && <FieldError>{editErrors.accountType}</FieldError>}
                      </Select>
                    )}
                  </div>

                  <TextField
                    className="prompt-field prompt-edit-content"
                    value={editForm.content}
                    onChange={(value) => updateField("content", value)}
                    isRequired
                    isInvalid={Boolean(editErrors.content)}
                    validationBehavior="aria"
                  >
                    <Label>提示词内容</Label>
                    <TextArea variant="secondary" rows={6} />
                    {editErrors.content && <FieldError>{editErrors.content}</FieldError>}
                  </TextField>
                </Modal.Body>

                <Modal.Footer>
                  <Button slot="close" variant="secondary" isDisabled={isSaving}>取消</Button>
                  <Button type="submit" variant="primary" isDisabled={isSaving}>
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

function PromptCard({ prompt, accountTypes, isUpdating, onToggle, onEdit, onDelete }) {
  const [isDeleting, setIsDeleting] = useState(false);

  async function handleDelete(close) {
    setIsDeleting(true);
    const deleted = await onDelete(prompt.id, prompt.title);
    setIsDeleting(false);
    if (deleted) close();
  }

  return (
    <article className={`prompt-card${prompt.enabled ? " is-enabled" : " is-disabled"}`}>
      <header className="prompt-card-header">
        <div className="prompt-card-title">
          <span className="prompt-card-icon" aria-hidden="true">
            <MagicWand size={18} weight="fill" />
          </span>
          <div>
            <h3>{prompt.title}</h3>
            <p>添加于 {formatDate(prompt.createdAt)}</p>
          </div>
        </div>
        <div className="prompt-card-controls">
          <button
            type="button"
            className={`prompt-status${prompt.enabled ? " is-enabled" : " is-disabled"}`}
            disabled={isUpdating}
            aria-label={prompt.enabled ? `停用提示词 ${prompt.title}` : `启用提示词 ${prompt.title}`}
            title={prompt.enabled ? "点击停用" : "点击启用"}
            onClick={() => onToggle(prompt)}
          >
            <span aria-hidden="true" />
            {isUpdating ? "保存中" : prompt.enabled ? "已启用" : "已停用"}
          </button>

          <EditPromptModal prompt={prompt} accountTypes={accountTypes} onSave={onEdit} />

          <AlertDialog>
            <AlertDialog.Trigger
              className="prompt-card-action is-danger"
              aria-label={`删除提示词 ${prompt.title}`}
              title="删除提示词"
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
                        <AlertDialog.Heading>删除这个提示词？</AlertDialog.Heading>
                      </AlertDialog.Header>
                      <AlertDialog.Body>
                        删除后，提示词「{prompt.title}」将从提示词库中移除，且无法恢复。
                      </AlertDialog.Body>
                      <AlertDialog.Footer>
                        <Button slot="close" variant="secondary" isDisabled={isDeleting}>取消</Button>
                        <Button
                          variant="danger"
                          isDisabled={isDeleting}
                          onPress={() => handleDelete(close)}
                        >
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
      </header>

      <div className="prompt-card-meta">
        <span className={`prompt-platform platform-${platformClassName(prompt.platform)}`}>
          {prompt.platform}
        </span>
        <span className="prompt-account-type">{prompt.accountTypeName}</span>
      </div>

      <p className="prompt-card-content">{prompt.content}</p>
    </article>
  );
}

export default function PromptLibrary() {
  const [activeTab, setActiveTab] = useState("library");
  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});
  const [prompts, setPrompts] = useState([]);
  const [accountTypes, setAccountTypes] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [updatingIds, setUpdatingIds] = useState(() => new Set());

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setIsLoading(true);
      setLoadError("");
      try {
        const library = await getPromptLibrary();
        if (cancelled) return;
        const nextTypes = library.accountTypes || [];
        setPrompts(library.prompts || []);
        setAccountTypes(nextTypes);
        if (nextTypes.length > 0) {
          setForm((current) => ({
            ...current,
            accountTypeMode: "existing",
            accountTypeId: nextTypes[0].id,
          }));
        }
      } catch (error) {
        if (!cancelled) setLoadError(error.message || "暂时无法读取提示词库");
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  function updateField(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined, accountType: undefined }));
  }

  function setAccountTypeMode(mode) {
    setForm((current) => ({
      ...current,
      accountTypeMode: mode,
      accountTypeId: mode === "existing" ? current.accountTypeId || accountTypes[0]?.id || null : null,
      newAccountTypeName: mode === "new" ? current.newAccountTypeName : "",
    }));
    setErrors((current) => ({ ...current, accountType: undefined }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    const nextErrors = getFormErrors(form);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setIsCreating(true);
    try {
      const result = await createPromptRequest({
        title: form.title.trim(),
        content: form.content.trim(),
        platform: form.platform,
        accountTypeId: form.accountTypeMode === "existing" ? form.accountTypeId : undefined,
        newAccountTypeName:
          form.accountTypeMode === "new" ? form.newAccountTypeName.trim() : undefined,
        enabled: true,
      });
      const nextTypes = result.accountTypes || [];
      setPrompts((current) => [result.prompt, ...current]);
      setAccountTypes(nextTypes);
      setForm({
        ...EMPTY_FORM,
        accountTypeMode: "existing",
        accountTypeId: result.prompt.accountTypeId,
      });
      setErrors({});
      setActiveTab("library");
      toast.success("提示词已添加", {
        description: `「${result.prompt.title}」已加入提示词库并启用。`,
      });
    } catch (error) {
      if (error.details) setErrors(error.details);
      toast.danger("添加失败", { description: error.message });
    } finally {
      setIsCreating(false);
    }
  }

  async function togglePrompt(prompt) {
    setUpdatingIds((current) => new Set(current).add(prompt.id));
    try {
      const updatedPrompt = await setPromptEnabled(prompt.id, !prompt.enabled);
      setPrompts((current) =>
        current.map((item) => (item.id === updatedPrompt.id ? updatedPrompt : item)),
      );
      toast.success(updatedPrompt.enabled ? "提示词已启用" : "提示词已停用", {
        description: `「${updatedPrompt.title}」的状态已保存。`,
      });
    } catch (error) {
      toast.danger("状态保存失败", { description: error.message });
    } finally {
      setUpdatingIds((current) => {
        const next = new Set(current);
        next.delete(prompt.id);
        return next;
      });
    }
  }

  async function editPrompt(id, updates) {
    try {
      const result = await updatePromptRequest(id, updates);
      setPrompts((current) =>
        current.map((prompt) => (prompt.id === result.prompt.id ? result.prompt : prompt)),
      );
      setAccountTypes(result.accountTypes || []);
      toast.success("提示词已更新", {
        description: `「${result.prompt.title}」的修改已保存。`,
      });
      return true;
    } catch (error) {
      toast.danger("修改失败", { description: error.message });
      return false;
    }
  }

  async function deletePrompt(id, title) {
    try {
      await deletePromptRequest(id);
      setPrompts((current) => current.filter((prompt) => prompt.id !== id));
      toast.success("提示词已删除", {
        description: `「${title}」已从提示词库移除。`,
      });
      return true;
    } catch (error) {
      toast.danger("删除失败", { description: error.message });
      return false;
    }
  }

  async function deleteAccountType(id, name) {
    try {
      const result = await deletePromptAccountTypeRequest(id);
      const nextTypes = result.accountTypes || [];
      setAccountTypes(nextTypes);
      setForm((current) => {
        if (current.accountTypeId !== id) return current;
        return {
          ...current,
          accountTypeMode: nextTypes.length > 0 ? "existing" : "new",
          accountTypeId: nextTypes[0]?.id || null,
          newAccountTypeName: "",
        };
      });
      toast.success("账号类型已删除", {
        description: `「${name}」已从可选类型中移除，已有提示词不会受影响。`,
      });
      return true;
    } catch (error) {
      toast.danger("账号类型删除失败", { description: error.message });
      return false;
    }
  }

  const selectedAccountType = accountTypes.find(
    (accountType) => accountType.id === form.accountTypeId,
  );

  return (
    <section className="prompt-library-page" aria-label="提示词库">
      <header className="prompt-library-header">
        <h1>提示词库</h1>
        <nav className="prompt-library-tabs" aria-label="提示词库" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "library"}
            className={`prompt-library-tab${activeTab === "library" ? " is-active" : ""}`}
            onClick={() => setActiveTab("library")}
          >
            已保存
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "create"}
            className={`prompt-library-tab${activeTab === "create" ? " is-active" : ""}`}
            onClick={() => setActiveTab("create")}
          >
            新增提示词
          </button>
        </nav>
      </header>

      {activeTab === "create" ? (
      <Surface className="prompt-form-surface" variant="default">
        <div className="prompt-section-heading">
          <div>
            <h2>新增提示词</h2>
            <p>建立可复用的创作指令，保存后默认启用。</p>
          </div>
        </div>

        <form className="prompt-form" onSubmit={handleSubmit} noValidate>
          <div className="prompt-form-grid">
            <TextField
              className="prompt-field"
              value={form.title}
              onChange={(value) => updateField("title", value)}
              isRequired
              isInvalid={Boolean(errors.title)}
              validationBehavior="aria"
            >
              <Label>提示词名称</Label>
              <Input variant="secondary" placeholder="例如：爆款标题改写" autoComplete="off" />
              {errors.title && <FieldError>{errors.title}</FieldError>}
            </TextField>

            <Select
              className="prompt-field"
              variant="secondary"
              placeholder="选择平台"
              selectedKey={form.platform}
              onSelectionChange={(key) => updateField("platform", key ? String(key) : null)}
              isRequired
              isInvalid={Boolean(errors.platform)}
              validationBehavior="aria"
            >
              <Label>归属平台</Label>
              <Select.Trigger>
                <Select.Value />
                <Select.Indicator />
              </Select.Trigger>
              <Select.Popover>
                <ListBox>
                  {PLATFORMS.map((platform) => (
                    <ListBox.Item key={platform} id={platform} textValue={platform}>
                      <Label>{platform}</Label>
                      <ListBox.ItemIndicator />
                    </ListBox.Item>
                  ))}
                </ListBox>
              </Select.Popover>
              {errors.platform && <FieldError>{errors.platform}</FieldError>}
            </Select>

            <div className="prompt-type-field prompt-type-field-compact">
              <div className="prompt-type-heading">
                <div>
                  <Label>账号类型</Label>
                </div>
                {accountTypes.length > 0 && (
                  <div className="prompt-type-mode" aria-label="账号类型录入方式">
                    <button
                      type="button"
                      className={form.accountTypeMode === "existing" ? "is-active" : ""}
                      onClick={() => setAccountTypeMode("existing")}
                    >
                      选择现有
                    </button>
                    <button
                      type="button"
                      className={form.accountTypeMode === "new" ? "is-active" : ""}
                      onClick={() => setAccountTypeMode("new")}
                    >
                      新增类型
                    </button>
                  </div>
                )}
              </div>

              {accountTypes.length === 0 || form.accountTypeMode === "new" ? (
                <TextField
                  className="prompt-field"
                  value={form.newAccountTypeName}
                  onChange={(value) => updateField("newAccountTypeName", value)}
                  isRequired
                  isInvalid={Boolean(errors.accountType)}
                  validationBehavior="aria"
                >
                  <Input
                    variant="secondary"
                    placeholder={accountTypes.length === 0 ? "请输入新的账号类型" : "输入新的账号类型"}
                    autoComplete="off"
                  />
                  {errors.accountType && <FieldError>{errors.accountType}</FieldError>}
                </TextField>
              ) : (
                <div className="prompt-type-select-row">
                  <Select
                    className="prompt-field"
                    variant="secondary"
                    placeholder="选择已有账号类型"
                    selectedKey={form.accountTypeId}
                    onSelectionChange={(key) => updateField("accountTypeId", key ? String(key) : null)}
                    isRequired
                    isInvalid={Boolean(errors.accountType)}
                    validationBehavior="aria"
                  >
                    <Select.Trigger>
                      <Select.Value />
                      <Select.Indicator />
                    </Select.Trigger>
                    <Select.Popover>
                      <ListBox>
                        {accountTypes.map((accountType) => (
                          <ListBox.Item
                            key={accountType.id}
                            id={accountType.id}
                            textValue={accountType.name}
                          >
                            <Label>{accountType.name}</Label>
                            <ListBox.ItemIndicator />
                          </ListBox.Item>
                        ))}
                      </ListBox>
                    </Select.Popover>
                    {errors.accountType && <FieldError>{errors.accountType}</FieldError>}
                  </Select>
                  {selectedAccountType && (
                    <DeletePromptAccountTypeButton
                      accountType={selectedAccountType}
                      onDelete={deleteAccountType}
                    />
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="prompt-content-row">
            <TextField
              className="prompt-field prompt-content-field"
              value={form.content}
              onChange={(value) => updateField("content", value)}
              isRequired
              isInvalid={Boolean(errors.content)}
              validationBehavior="aria"
            >
              <Label>提示词内容</Label>
              <TextArea
                variant="secondary"
                placeholder="输入需要保存和复用的完整提示词……"
                rows={3}
              />
              {errors.content && <FieldError>{errors.content}</FieldError>}
            </TextField>

            <div className="prompt-form-actions">
              <Button type="submit" variant="primary" size="lg" isDisabled={isCreating}>
                <Plus size={18} weight="bold" />
                {isCreating ? "正在添加…" : "添加提示词"}
              </Button>
            </div>
          </div>
        </form>
      </Surface>
      ) : (
      <>
      <section className="prompt-overview-hero" aria-labelledby="prompt-overview-title">
        <div>
          <h2 id="prompt-overview-title">
            {isLoading ? "正在读取提示词库" : prompts.length > 0 ? `已保存 ${prompts.length} 条提示词` : "还没有提示词"}
          </h2>
          <p>集中管理不同平台和账号类型的创作指令，需要时直接复用。</p>
          <Button variant="primary" onPress={() => setActiveTab("create")}>
            <Plus size={16} weight="bold" />
            新增提示词
          </Button>
        </div>
      </section>

      <Surface className="prompt-list-surface" variant="default">
        <div className="prompt-section-heading prompt-list-heading">
          <div className="prompt-list-title">
            <span aria-hidden="true"><ListBullets size={20} /></span>
            <div>
              <h2>提示词列表</h2>
              <p>{isLoading ? "正在加载…" : `共 ${prompts.length} 条提示词`}</p>
            </div>
          </div>
          <Button className="prompt-list-create" variant="secondary" onPress={() => setActiveTab("create")}>
            <Plus size={15} weight="bold" />
            新增
          </Button>
        </div>

        {isLoading ? (
          <div className="prompt-library-state" role="status">
            <span className="prompt-loader" aria-hidden="true" />
            正在读取提示词库…
          </div>
        ) : loadError ? (
          <div className="prompt-library-state is-error">
            <strong>暂时无法读取提示词库</strong>
            <span>{loadError}</span>
          </div>
        ) : prompts.length === 0 ? (
          <div className="prompt-library-state">
            <MagicWand size={30} aria-hidden="true" />
            <strong>还没有提示词</strong>
            <span>在上方新增第一条提示词，同时建立第一个账号类型。</span>
          </div>
        ) : (
          <div className="prompt-card-list">
            {prompts.map((prompt) => (
              <PromptCard
                key={prompt.id}
                prompt={prompt}
                accountTypes={accountTypes}
                isUpdating={updatingIds.has(prompt.id)}
                onToggle={togglePrompt}
                onEdit={editPrompt}
                onDelete={deletePrompt}
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
