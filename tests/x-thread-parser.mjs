import { spawnSync } from "node:child_process";
import path from "node:path";

const projectDirectory = path.resolve(import.meta.dirname, "..");
const testScript = path.join(
  projectDirectory,
  "spider",
  "推特爬虫",
  "test_thread_detail.py",
);
const pythonCommand = process.env.PYTHON_COMMAND
  || (process.platform === "win32" ? "python" : "python3");
const result = spawnSync(pythonCommand, ["-X", "utf8", testScript], {
  cwd: path.dirname(testScript),
  encoding: "utf8",
  windowsHide: true,
  env: { ...process.env, PYTHONIOENCODING: "utf-8", PYTHONUTF8: "1" },
});

if (result.stdout) process.stdout.write(result.stdout);
if (result.stderr) process.stderr.write(result.stderr);
if (result.error) throw result.error;
if (result.status !== 0) {
  throw new Error(`作者续帖解析测试失败，退出码 ${result.status}`);
}
