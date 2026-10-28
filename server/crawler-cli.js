import "dotenv/config";

import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const currentDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectDirectory = path.resolve(currentDirectory, "..");
const crawlerScript = path.resolve(projectDirectory, "spider/推特爬虫/main.py");
const pythonCommand = process.env.PYTHON_COMMAND
  || (process.platform === "win32" ? "python" : "python3");
const child = spawn(pythonCommand, [crawlerScript, ...process.argv.slice(2)], {
  cwd: projectDirectory,
  stdio: "inherit",
  env: { ...process.env, PYTHONIOENCODING: "utf-8", PYTHONUTF8: "1" },
});

child.on("error", (error) => {
  console.error(`无法启动 Python（${pythonCommand}）：${error.message}`);
  process.exitCode = 1;
});

child.on("exit", (code, signal) => {
  if (signal) {
    console.error(`爬虫进程被信号 ${signal} 终止`);
    process.exitCode = 1;
    return;
  }
  process.exitCode = code ?? 1;
});
