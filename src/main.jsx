import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import Auth2 from "./auth-2";
import HomePage from "./HomePage";
import "./styles.css";

const normalizedPath = window.location.pathname.replace(/\/+$/, "") || "/";
const isWorkspace = normalizedPath === "/workspace";
const authMode = normalizedPath === "/register"
  ? "register"
  : normalizedPath === "/login"
    ? "login"
    : null;

document.title = isWorkspace
  ? "FlexibleFox 灵狐 · 创作工作台"
  : authMode === "register"
    ? "注册 · FlexibleFox 灵狐"
    : authMode === "login"
      ? "登录 · FlexibleFox 灵狐"
      : "FlexibleFox 灵狐 · 让灵感自然流动";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    {isWorkspace ? <App /> : authMode ? <Auth2 mode={authMode} /> : <HomePage />}
  </React.StrictMode>,
);
