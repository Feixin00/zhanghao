"use client";

import { useEffect, useState } from "react";
import { MotionConfig, motion } from "motion/react";
import { Eye, EyeOff } from "lucide-react";

export function Auth2({ mode = "login" }) {
  const isRegister = mode === "register";
  const [showPassword, setShowPassword] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [notice, setNotice] = useState("");
  useEffect(() => {
    let theme = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    try { theme = localStorage.getItem("flexiblefox-theme") || theme; } catch {}
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = theme;
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    // Preserve the existing preview flow. Never store or log passwords.
    try {
      sessionStorage.setItem("flexiblefox-auth-preview", JSON.stringify({
        name: name.trim() || email.split("@")[0], email,
      }));
    } catch {}
    window.location.assign("/workspace");
  };

  return (
    <MotionConfig reducedMotion="user"><div className="auth2-page min-h-screen w-full flex bg-white dark:bg-neutral-950">
      <div className="hidden lg:flex lg:w-1/2 p-4 bg-white dark:bg-neutral-950">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6 }}
          className="w-full rounded-md p-12 flex flex-col justify-between relative overflow-hidden"
        >
          <div
            className="absolute inset-0 bg-cover bg-bottom"
            style={{
              backgroundImage:
                "url('https://images.unsplash.com/photo-1623410439361-22ac19216577?q=80&w=774&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D')",
              transform: "scale(1.2)",
            }}
          />

          <div className="relative z-10 flex flex-col justify-between h-full">
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-neutral-900 flex items-center justify-center">
                  <img className="w-7 h-7 object-contain" src="/assets/flexiblefox-logo-mark.png" alt="" />
                </div>
                <span className="text-2xl font-bold text-neutral-900">
                  FlexibleFox
                </span>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
            >
              <h2 className="text-4xl font-bold text-neutral-900 leading-tight">
                你的专属
                <br />
                AI 内容工作台
              </h2>
            </motion.div>
          </div>
        </motion.div>
      </div>

      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-8 lg:p-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="w-full max-w-md"
        >
          <h1 className="text-3xl sm:text-4xl font-bold text-neutral-900 dark:text-white mb-8">
            {isRegister ? "注册" : "登录"}
          </h1>

          <div className="space-y-3 mb-6">
            <motion.button
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.3 }}
              type="button"
              onClick={() => setNotice(`Apple ${isRegister ? "注册" : "登录"}尚未接入，当前可使用邮箱预览工作台。`)}
              className="w-full px-6 py-3 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white font-medium hover:bg-neutral-50 dark:hover:bg-neutral-750 transition-colors duration-200 flex items-center justify-center gap-3"
            >
              <svg
                className="w-5 h-5"
                viewBox="0 0 814 1000"
                fill="currentColor"
              >
                <path d="M788.1 340.9c-5.8 4.5-108.2 62.2-108.2 190.5 0 148.4 130.3 200.9 134.2 202.2-.6 3.2-20.7 71.9-68.7 141.9-42.8 61.6-87.5 123.1-155.5 123.1s-85.5-39.5-164-39.5c-76.5 0-103.7 40.8-165.9 40.8s-105.6-57-155.5-127C46.7 790.7 0 663 0 541.8c0-194.4 126.4-297.5 250.8-297.5 66.1 0 121.2 43.4 162.7 43.4 39.5 0 101.1-46 176.3-46 28.5 0 130.9 2.6 198.3 99.2zm-234-181.5c31.1-36.9 53.1-88.1 53.1-139.3 0-7.1-.6-14.3-1.9-20.1-50.6 1.9-110.8 33.7-147.1 75.8-28.5 32.4-55.1 83.6-55.1 135.5 0 7.8 1.3 15.6 1.9 18.1 3.2.6 8.4 1.3 13.6 1.3 45.4 0 102.5-30.4 135.5-71.3z" />
              </svg>
              使用 Apple {isRegister ? "注册" : "登录"}
            </motion.button>

            <motion.button
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.35 }}
              type="button"
              onClick={() => setNotice(`Google ${isRegister ? "注册" : "登录"}尚未接入，当前可使用邮箱预览工作台。`)}
              className="w-full px-6 py-3 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white font-medium hover:bg-neutral-50 dark:hover:bg-neutral-750 transition-colors duration-200 flex items-center justify-center gap-3"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  fill="#4285F4"
                />
                <path
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  fill="#34A853"
                />
                <path
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  fill="#FBBC05"
                />
                <path
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  fill="#EA4335"
                />
                <path d="M1 1h22v22H1z" fill="none" />
              </svg>
              使用 Google {isRegister ? "注册" : "登录"}
            </motion.button>
          </div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4, delay: 0.4 }}
            className="flex items-center gap-4 mb-6"
          >
            <div className="flex-1 h-px bg-neutral-200 dark:bg-neutral-800" />
            <span className="text-sm text-neutral-500 dark:text-neutral-500">
              或
            </span>
            <div className="flex-1 h-px bg-neutral-200 dark:bg-neutral-800" />
          </motion.div>

          <motion.form
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4, delay: 0.45 }}
            onSubmit={handleSubmit}
            className="space-y-4"
          >
            {isRegister && (
              <div>
                <input
                  id="name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="你的称呼"
                  aria-label="你的称呼"
                  autoComplete="name"
                  required
                  className="w-full px-4 py-3 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-neutral-900 dark:text-white placeholder:text-neutral-500 dark:placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-neutral-400 dark:focus:ring-neutral-600 focus:border-neutral-400 dark:focus:border-neutral-600 transition-all duration-200"
                />
              </div>
            )}
            <div>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="邮箱地址"
                aria-label="邮箱地址"
                autoComplete="email"
                required
                className="w-full px-4 py-3 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-neutral-900 dark:text-white placeholder:text-neutral-500 dark:placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-neutral-400 dark:focus:ring-neutral-600 focus:border-neutral-400 dark:focus:border-neutral-600 transition-all duration-200"
              />
            </div>

            <div className="relative">
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="密码"
                aria-label="密码"
                autoComplete={isRegister ? "new-password" : "current-password"}
                minLength={6}
                required
                className="w-full px-4 py-3 pr-12 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-neutral-900 dark:text-white placeholder:text-neutral-500 dark:placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-neutral-400 dark:focus:ring-neutral-600 focus:border-neutral-400 dark:focus:border-neutral-600 transition-all duration-200"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-neutral-900 dark:hover:text-white transition-colors"
                aria-label={showPassword ? "隐藏密码" : "显示密码"}
              >
                {showPassword ? (
                  <Eye className="w-5 h-5" />
                ) : (
                  <EyeOff className="w-5 h-5" />
                )}
              </button>
            </div>

            <button
              type="submit"
              className="w-full px-6 py-3 rounded-xl bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 font-medium hover:bg-neutral-800 dark:hover:bg-neutral-200 transition-colors duration-200"
            >
              {isRegister ? "注册" : "登录"}
            </button>
          </motion.form>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4, delay: 0.5 }}
            className="mt-6 space-y-3 text-center"
          >
            {!isRegister && (
              <a
                href="#password-help"
                onClick={(event) => { event.preventDefault(); setNotice("当前为账号界面预览，尚未接入密码找回服务。"); }}
                className="block text-sm text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 font-medium transition-colors no-underline"
              >
                忘记密码？
              </a>
            )}
            <p className="text-sm text-neutral-600 dark:text-neutral-400">
              {isRegister ? "已经有账号？" : "还没有账号？"}{" "}
              <a
                href={isRegister ? "/login" : "/register"}
                className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 font-medium transition-colors no-underline"
              >
                {isRegister ? "登录" : "注册"}
              </a>
            </p>
          </motion.div>
          {notice && <p role="status" className="mt-4 text-center text-sm text-neutral-500">{notice}</p>}
        </motion.div>
      </div>
    </div></MotionConfig>
  );
}

export default Auth2;
