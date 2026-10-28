import { useEffect, useState } from "react";
import { ArrowLeft } from "@phosphor-icons/react/ArrowLeft";
import { ArrowRight } from "@phosphor-icons/react/ArrowRight";
import { CheckCircle } from "@phosphor-icons/react/CheckCircle";
import { Eye } from "@phosphor-icons/react/Eye";
import { EyeSlash } from "@phosphor-icons/react/EyeSlash";
import { LockKey } from "@phosphor-icons/react/LockKey";
import { Sparkle } from "@phosphor-icons/react/Sparkle";
import "./auth-page.css";

const AUTH_PREVIEW_KEY = "flexiblefox-auth-preview";

export default function AuthPage({ mode }) {
  const isRegister = mode === "register";
  const [showPassword, setShowPassword] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", password: "", agreement: false });
  const [errors, setErrors] = useState({});

  useEffect(() => {
    document.documentElement.dataset.theme = "dark";
    document.documentElement.style.colorScheme = "dark";
  }, []);

  function updateField(name, value) {
    setForm((current) => ({ ...current, [name]: value }));
    setErrors((current) => ({ ...current, [name]: "" }));
  }

  function submit(event) {
    event.preventDefault();
    const nextErrors = {};
    if (isRegister && !form.name.trim()) nextErrors.name = "请输入你的称呼";
    if (!/^\S+@\S+\.\S+$/.test(form.email)) nextErrors.email = "请输入有效的邮箱地址";
    if (form.password.length < 6) nextErrors.password = "密码至少需要 6 位";
    if (isRegister && !form.agreement) nextErrors.agreement = "请先阅读并同意服务条款";
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    try {
      window.sessionStorage.setItem(
        AUTH_PREVIEW_KEY,
        JSON.stringify({ name: form.name.trim() || form.email.split("@")[0], email: form.email }),
      );
    } catch {
      // 无法使用会话存储时仍允许进入界面预览。
    }
    window.location.assign("/workspace");
  }

  return (
    <main className="auth-page">
      <div className="auth-grid" aria-hidden="true" />
      <a className="auth-back" href="/">
        <ArrowLeft size={16} weight="bold" />
        返回首页
      </a>

      <section className="auth-story" aria-label="FlexibleFox 产品简介">
        <a className="auth-brand" href="/" aria-label="FlexibleFox 首页">
          <img src="/assets/flexiblefox-logo-mark.png" alt="" aria-hidden="true" />
          <strong>FlexibleFox</strong>
          <span>灵狐</span>
        </a>
        <div className="auth-story-copy">
          <span className="auth-story-badge"><Sparkle size={14} weight="fill" /> 智能内容工作台</span>
          <h1>{isRegister ? "从一条灵感，开启持续创作。" : "欢迎回来，继续你的创作。"}</h1>
          <p>
            把内容发现、AI 创作与多平台发布放进一条清晰的工作流，让好内容稳定发生。
          </p>
          <div className="auth-benefits">
            <span><CheckCircle size={17} weight="fill" /> 统一管理内容源与发布账号</span>
            <span><CheckCircle size={17} weight="fill" /> 沉淀可复用的提示词与创作模板</span>
            <span><CheckCircle size={17} weight="fill" /> 随时掌握稿件和发布进度</span>
          </div>
        </div>
        <p className="auth-story-footer">让灵感自然流动，让好内容持续发生。</p>
      </section>

      <section className="auth-panel" aria-label={isRegister ? "注册账号" : "登录账号"}>
        <div className="auth-card">
          <div className="auth-heading">
            <span className="auth-lock"><LockKey size={18} weight="duotone" /></span>
            <h2>{isRegister ? "创建你的账号" : "登录工作台"}</h2>
            <p>{isRegister ? "免费开始，建立属于你的内容工作流。" : "输入账号信息，回到你的创作空间。"}</p>
          </div>

          <div className="auth-switch" aria-label="切换登录或注册">
            <a className={!isRegister ? "is-active" : ""} href="/login">登录</a>
            <a className={isRegister ? "is-active" : ""} href="/register">注册</a>
          </div>

          <form className="auth-form" onSubmit={submit} noValidate>
            {isRegister && (
              <label className="auth-field">
                <span>你的称呼</span>
                <input
                  type="text"
                  value={form.name}
                  onChange={(event) => updateField("name", event.target.value)}
                  placeholder="怎么称呼你？"
                  autoComplete="name"
                  aria-invalid={Boolean(errors.name)}
                />
                {errors.name && <small>{errors.name}</small>}
              </label>
            )}

            <label className="auth-field">
              <span>邮箱地址</span>
              <input
                type="email"
                value={form.email}
                onChange={(event) => updateField("email", event.target.value)}
                placeholder="name@example.com"
                autoComplete="email"
                aria-invalid={Boolean(errors.email)}
              />
              {errors.email && <small>{errors.email}</small>}
            </label>

            <label className="auth-field">
              <span className="auth-field-label">
                密码
                {!isRegister && <a href="#password-help">忘记密码？</a>}
              </span>
              <span className="auth-password">
                <input
                  type={showPassword ? "text" : "password"}
                  value={form.password}
                  onChange={(event) => updateField("password", event.target.value)}
                  placeholder={isRegister ? "至少 6 位密码" : "输入你的密码"}
                  autoComplete={isRegister ? "new-password" : "current-password"}
                  aria-invalid={Boolean(errors.password)}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((current) => !current)}
                  aria-label={showPassword ? "隐藏密码" : "显示密码"}
                >
                  {showPassword ? <EyeSlash size={18} /> : <Eye size={18} />}
                </button>
              </span>
              {errors.password && <small>{errors.password}</small>}
            </label>

            {isRegister && (
              <label className="auth-agreement">
                <input
                  type="checkbox"
                  checked={form.agreement}
                  onChange={(event) => updateField("agreement", event.target.checked)}
                />
                <span>我已阅读并同意 <a href="#terms">服务条款</a> 与 <a href="#privacy">隐私政策</a></span>
                {errors.agreement && <small>{errors.agreement}</small>}
              </label>
            )}

            <button className="auth-submit" type="submit">
              {isRegister ? "创建账号" : "登录并进入工作台"}
              <ArrowRight size={18} weight="bold" />
            </button>
          </form>

          <p className="auth-alternate">
            {isRegister ? "已经有账号？" : "还没有账号？"}
            <a href={isRegister ? "/login" : "/register"}>{isRegister ? "直接登录" : "免费注册"}</a>
          </p>

          <div className="auth-preview-link">
            <span />
            <a href="/workspace">暂不登录，先预览工作台</a>
            <span />
          </div>
        </div>
        <p className="auth-security"><LockKey size={13} /> 当前为账号流程界面预览</p>
      </section>
    </main>
  );
}
