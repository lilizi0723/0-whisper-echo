// 临时脚本：在 index.ts 的 // --- Podcasts --- 前插入 env-check 路由
// 运行: node backend/src/transcribe-env-check-patch.js
const fs = require("fs");
const path = require("path");
const file = path.join(__dirname, "index.ts");
let s = fs.readFileSync(file, "utf8");
const needle = "// --- Health ---\napp.get(\"/api/health\"";
const block = `
/** 检查语音转文字所需环境变量是否已配置（不返回密钥值） */
app.get("/api/transcribe/env-check", (req, res) => {
  res.json({
    tencentSecretIdSet: Boolean(TENCENT_SECRET_ID),
    tencentSecretKeySet: Boolean(TENCENT_SECRET_KEY),
    openaiApiKeySet: Boolean(OPENAI_API_KEY),
    hint: "语音转文字接口为 POST /api/podcasts/:id/generate-transcript",
  });
});
`;
if (s.includes("api/transcribe/env-check")) {
  console.log("Already patched.");
  process.exit(0);
}
const before = "// --- Podcasts ---\napp.get(\"/api/podcasts\"";
if (!s.includes(before)) {
  console.log("Could not find insertion point.");
  process.exit(1);
}
s = s.replace(before, block + "\n" + before);
fs.writeFileSync(file, s);
console.log("Patched index.ts: added GET /api/transcribe/env-check");
