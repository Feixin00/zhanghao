import { readFile } from "node:fs/promises";

const stateFlagIndex = process.argv.indexOf("--import-cookies");
const stateFilePath = stateFlagIndex >= 0 ? process.argv[stateFlagIndex + 1] : "";
const expectedFlagIndex = process.argv.indexOf("--expected-handle");
const expectedHandle = expectedFlagIndex >= 0 ? process.argv[expectedFlagIndex + 1] : "";

try {
  const state = JSON.parse(await readFile(stateFilePath, "utf8"));
  const authToken = state.cookies?.find((cookie) => cookie.name === "auth_token")?.value;
  const handleByToken = {
    "test-token": "api_publisher",
    "other-account-token": "other_publisher",
  };
  const authenticatedHandle = handleByToken[authToken] || "";
  if (!authenticatedHandle) {
    console.log("测试状态文件已失效");
    process.exitCode = 3;
  } else {
    console.log(`FLEXIBLEFOX_X_SESSION ${JSON.stringify({ handle: authenticatedHandle })}`);
    if (expectedHandle && expectedHandle.toLowerCase() !== authenticatedHandle.toLowerCase()) {
      console.log(`X_ACCOUNT_MISMATCH expected=@${expectedHandle} actual=@${authenticatedHandle}`);
      process.exitCode = 4;
    }
    console.log("测试状态文件登录正常");
  }
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
