var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// server.ts
var import_config = require("dotenv/config");
var import_express = __toESM(require("express"), 1);
var import_path = __toESM(require("path"), 1);
var import_vite = require("vite");
var import_genai = require("@google/genai");
var rateLimitMap = /* @__PURE__ */ new Map();
var RATE_LIMIT_WINDOW_MS = 60 * 1e3;
var MAX_REQUESTS_PER_WINDOW = 60;
function checkRateLimit(ip) {
  const now = Date.now();
  const record = rateLimitMap.get(ip) || { timestamps: [] };
  const recent = record.timestamps.filter((ts) => now - ts < RATE_LIMIT_WINDOW_MS);
  if (recent.length >= MAX_REQUESTS_PER_WINDOW) {
    return false;
  }
  recent.push(now);
  rateLimitMap.set(ip, { timestamps: recent });
  return true;
}
setInterval(() => {
  const now = Date.now();
  for (const [ip, record] of rateLimitMap.entries()) {
    const active = record.timestamps.filter((ts) => now - ts < RATE_LIMIT_WINDOW_MS);
    if (active.length === 0) {
      rateLimitMap.delete(ip);
    } else {
      rateLimitMap.set(ip, { timestamps: active });
    }
  }
}, 5 * 60 * 1e3).unref();
function generateLocalAssistantResponse(message, editorContent, _systemInstruction) {
  const hasDoc = Boolean(editorContent && editorContent.trim());
  const docLines = hasDoc ? editorContent.trim().split("\n") : [];
  const docTitle = docLines[0]?.replace(/^#+\s*/, "") || "\uD604\uC7AC \uBB38\uC11C";
  let responseBody = "";
  if (/요약|정리|간략/i.test(message)) {
    if (hasDoc) {
      const headings = docLines.filter((l) => l.startsWith("#")).slice(0, 8);
      responseBody = `### \u{1F4CB} '${docTitle}' \uBB38\uC11C \uD575\uC2EC \uAD6C\uC870 \uBD84\uC11D

\uD604\uC7AC \uC911\uC559 \uD3B8\uC9D1\uAE30\uC5D0\uC11C \uC791\uC5C5 \uC911\uC778 \uBB38\uC11C\uC758 \uB85C\uCEEC \uAD6C\uC870 \uBD84\uC11D \uACB0\uACFC\uC785\uB2C8\uB2E4:

1. **\uBB38\uC11C \uADDC\uBAA8**: \uCD1D ${docLines.length}\uD589 / \uC57D ${editorContent.length}\uAE00\uC790
2. **\uC8FC\uC694 \uC139\uC158 \uAD6C\uC131**:
` + (headings.length > 0 ? headings.map((h) => `   - ${h.replace(/^#+\s*/, "")}`).join("\n") : "   - \uB2E8\uC77C \uBCF8\uBB38 \uC139\uC158\uC73C\uB85C \uAD6C\uC131\uB428") + `

3. **\uCD94\uCC9C \uAC00\uC774\uB4DC**: \uC5D0\uB514\uD130\uC5D0\uC11C \uC2AC\uB798\uC2DC \uCEE4\uB9E8\uB4DC(\`/\`)\uB97C \uC0AC\uC6A9\uD558\uC5EC \uC81C\uBAA9, \uD45C, \uCCB4\uD06C\uB9AC\uC2A4\uD2B8\uB97C \uC989\uC2DC \uC0BD\uC785\uD560 \uC218 \uC788\uC2B5\uB2C8\uB2E4.`;
    } else {
      responseBody = `\uD604\uC7AC \uD3B8\uC9D1\uAE30\uC5D0 \uC791\uC131\uB41C \uBB38\uC11C\uAC00 \uC5C6\uC2B5\uB2C8\uB2E4. \uC911\uC559 \uC5D0\uB514\uD130\uC5D0 \uB9C8\uD06C\uB2E4\uC6B4\uC744 \uC791\uC131\uD558\uAC70\uB098 \uC2AC\uB798\uC2DC \uCEE4\uB9E8\uB4DC(\`/\`)\uB85C \uD45C\uC900 \uC11C\uC2DD \uD15C\uD50C\uB9BF\uC744 \uCD94\uAC00\uD574 \uBCF4\uC138\uC694.`;
    }
  } else if (/코드|함수|구현|스크립트|개발/i.test(message)) {
    responseBody = `### \u{1F4BB} \uAC1C\uBC1C \uAC00\uC774\uB4DC \uBC0F \uCF54\uB4DC \uC9C0\uC6D0

\uC911\uC559 \uC5D0\uB514\uD130\uC5D0\uC11C \`/code\` \uC2AC\uB798\uC2DC \uBA85\uB839\uC5B4\uB97C \uC785\uB825\uD558\uBA74 \uC989\uC2DC \uAD6C\uBB38 \uAC15\uC870 \uCF54\uB4DC \uBE14\uB85D\uC744 \uC0BD\uC785\uD560 \uC218 \uC788\uC2B5\uB2C8\uB2E4.

\`\`\`typescript
// \uC548\uC804\uD558\uACE0 \uACAC\uACE0\uD55C TypeScript \uAD6C\uD604 \uD328\uD134
export async function handleWorkspaceTask(taskInput: string): Promise<{ success: boolean; data: any }> {
  try {
    console.log('\uC791\uC5C5 \uC2E4\uD589:', taskInput);
    return { success: true, data: { processedAt: new Date().toISOString() } };
  } catch (error) {
    return { success: false, data: error };
  }
}
\`\`\`

- **\uCC38\uACE0**: \uC5D0\uB7EC \uBC1C\uC0DD \uC2DC \uC608\uC678\uB97C \uD638\uCD9C\uC790\uC5D0\uAC8C \uC548\uC804\uD558\uAC8C \uBC18\uD658\uD558\uACE0, \uC0C1\uD0DC\uB97C \uC608\uCE21 \uAC00\uB2A5\uD55C \uD615\uD0DC\uB85C \uC720\uC9C0\uD558\uB294 \uAC83\uC774 \uC911\uC694\uD569\uB2C8\uB2E4.`;
  } else {
    responseBody = `### \u{1F916} AI Podium \uC624\uD504\uB77C\uC778 \uAC00\uC774\uB4DC

\uC694\uCCAD\uD558\uC2E0 \uB0B4\uC6A9(**"${message.slice(0, 60)}${message.length > 60 ? "..." : ""}"**)\uC5D0 \uB300\uD55C \uC548\uB0B4\uC785\uB2C8\uB2E4.

` + (hasDoc ? `\uD604\uC7AC \uD3B8\uC9D1\uAE30\uC758 **'${docTitle}'** \uBB38\uC11C \uCEE8\uD14D\uC2A4\uD2B8(\uCD1D ${docLines.length}\uD589)\uB97C \uCC38\uC870\uD558\uACE0 \uC788\uC2B5\uB2C8\uB2E4.

- **\uBE60\uB978 \uC11C\uC2DD \uC0BD\uC785**: \uC5D0\uB514\uD130\uC5D0\uC11C \`/\`\uB97C \uC785\uB825\uD558\uBA74 \uD5E4\uB529, \uD45C, \uCCB4\uD06C\uB9AC\uC2A4\uD2B8 \uB4F1 \uD45C\uC900 \uC11C\uC2DD\uC744 0ms\uB85C \uC989\uC2DC \uC0BD\uC785\uD560 \uC218 \uC788\uC2B5\uB2C8\uB2E4.
- **\uD074\uB77C\uC6B0\uB4DC AI \uD65C\uC131\uD654**: \uC2E4\uC2DC\uAC04 LLM \uCD94\uB860\uC744 \uC6D0\uD558\uC2DC\uBA74 \uC0C1\uB2E8 \uD1B1\uB2C8\uBC14\uD034 [\uC124\uC815] -> [AI \uC5D4\uC9C4 \uC124\uC815]\uC5D0\uC11C Gemini API \uD0A4\uB97C \uB4F1\uB85D\uD558\uC138\uC694.` : `AI Podium\uC740 \uB9C8\uD06C\uB2E4\uC6B4 \uD3B8\uC9D1\uAE30, \uC2A4\uD504\uB808\uB4DC\uC2DC\uD2B8 \uBE14\uB85D, \uB2E4\uC911 AI \uBAA8\uB378 \uBE44\uAD50 \uB300\uD654\uCC3D\uC774 \uC720\uAE30\uC801\uC73C\uB85C \uACB0\uD569\uB41C \uB85C\uCEEC \uC6B0\uC120 \uC6CC\uD06C\uC2A4\uD398\uC774\uC2A4\uC785\uB2C8\uB2E4.

- **\uB9C8\uD06C\uB2E4\uC6B4 \uD3B8\uC9D1**: \uC911\uC559 \uCC3D\uC5D0\uC11C \uC2E4\uC2DC\uAC04 \uD504\uB9AC\uBDF0\uC640 \uD568\uAED8 \uBB38\uC11C\uB97C \uC791\uC131\uD558\uC138\uC694.
- **0ms \uD15C\uD50C\uB9BF**: \`/\` \uC2AC\uB798\uC2DC \uCEE4\uB9E8\uB4DC\uB85C \uC81C\uBAA9, \uD45C, \uCCB4\uD06C\uB9AC\uC2A4\uD2B8\uB97C \uC989\uC2DC \uC0BD\uC785\uD560 \uC218 \uC788\uC2B5\uB2C8\uB2E4.
- **AI \uBAA8\uB378 \uC5F0\uB3D9**: Gemini Cloud \uBAA8\uB378 \uB610\uB294 \uB85C\uCEEC Ollama \uBAA8\uB378\uC744 \uC124\uC815\uC5D0\uC11C \uC5F0\uACB0\uD560 \uC218 \uC788\uC2B5\uB2C8\uB2E4.`);
  }
  return responseBody + `

> \u{1F4A1} *\uC54C\uB9BC: \uD604\uC7AC \uB85C\uCEEC \uAE30\uBCF8 \uBD84\uC11D \uBAA8\uB4DC\uC785\uB2C8\uB2E4. Google Gemini 3.8 \uCD5C\uC2E0 \uCD08\uACE0\uC18D \uD074\uB77C\uC6B0\uB4DC \uC2E0\uACBD\uB9DD\uC744 \uD65C\uC131\uD654\uD558\uC2DC\uB824\uBA74 [\uD658\uACBD\uC124\uC815](Ctrl+,) > [AI \uC5D4\uC9C4 \uC124\uC815]\uC5D0\uC11C Gemini API \uD0A4\uB97C \uC785\uB825\uD558\uAC70\uB098 .env\uC5D0 GEMINI_API_KEY\uB97C \uC124\uC815\uD558\uC138\uC694.*`;
}
async function startServer() {
  const app = (0, import_express.default)();
  const PORT = 3e3;
  app.use((req, res, next) => {
    const cspDirectives = [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' blob:",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' data: https://fonts.gstatic.com",
      "img-src 'self' data: blob: https:",
      "connect-src 'self' https://generativelanguage.googleapis.com https://api.openai.com https://api.anthropic.com https://api.deepseek.com https://api.groq.com ws: wss:",
      "media-src 'self' data: blob:",
      "object-src 'none'",
      "base-uri 'self'",
      "frame-ancestors 'self' https:"
    ].join("; ");
    res.setHeader("Content-Security-Policy", cspDirectives);
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
    res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
    res.setHeader("X-XSS-Protection", "1; mode=block");
    res.setHeader("X-Permitted-Cross-Domain-Policies", "none");
    res.setHeader("Cross-Origin-Resource-Policy", "same-origin");
    res.setHeader("X-Security-Policy", "Local-First-Vault-Enforced");
    next();
  });
  app.use(import_express.default.json({ limit: "500kb" }));
  app.post("/api/verify", async (req, res) => {
    const clientIp = req.headers["x-forwarded-for"]?.split(",")[0]?.trim() || req.socket.remoteAddress || "unknown";
    if (!checkRateLimit(clientIp)) {
      return res.status(429).json({ valid: false, error: "Too many requests. Please wait a moment before trying again." });
    }
    try {
      const { apiKey: clientApiKey, vendor = "gemini" } = req.body;
      const trimmedKey = typeof clientApiKey === "string" ? clientApiKey.trim() : "";
      if (vendor === "openai") {
        if (/^sk-[A-Za-z0-9_\-]{20,128}$/.test(trimmedKey)) {
          return res.json({ valid: true, model: "OpenAI (GPT-4o/o3)", vendor: "openai" });
        }
        return res.status(400).json({ valid: false, error: "Invalid OpenAI API key format (must start with sk-)." });
      }
      if (vendor === "anthropic") {
        if (/^sk-ant-[A-Za-z0-9_\-]{20,128}$/.test(trimmedKey)) {
          return res.json({ valid: true, model: "Anthropic (Claude 3.5)", vendor: "anthropic" });
        }
        return res.status(400).json({ valid: false, error: "Invalid Anthropic API key format (must start with sk-ant-)." });
      }
      if (vendor === "deepseek") {
        if (/^sk-[A-Za-z0-9_\-]{20,128}$/.test(trimmedKey)) {
          return res.json({ valid: true, model: "DeepSeek (R1/V3)", vendor: "deepseek" });
        }
        return res.status(400).json({ valid: false, error: "Invalid DeepSeek API key format (must start with sk-)." });
      }
      if (vendor === "groq") {
        if (/^gsk_[A-Za-z0-9_\-]{20,128}$/.test(trimmedKey)) {
          return res.json({ valid: true, model: "Groq Cloud (LPU)", vendor: "groq" });
        }
        return res.status(400).json({ valid: false, error: "Invalid Groq API key format (must start with gsk_)." });
      }
      let effectiveApiKey = process.env.GEMINI_API_KEY || "";
      if (trimmedKey && /^[A-Za-z0-9_\-]{20,128}$/.test(trimmedKey)) {
        effectiveApiKey = trimmedKey;
      }
      if (!effectiveApiKey) {
        return res.status(400).json({ valid: false, error: "GEMINI_API_KEY is not set. Please provide an API key in settings." });
      }
      const ai = new import_genai.GoogleGenAI({
        apiKey: effectiveApiKey,
        httpOptions: { headers: { "User-Agent": "aistudio-build" } }
      });
      const testRes = await ai.models.generateContent({
        model: "gemini-3.8-flash",
        contents: "ping"
      });
      if (testRes && testRes.text) {
        return res.json({ valid: true, model: "gemini-3.8-flash", vendor: "gemini" });
      } else {
        return res.status(502).json({ valid: false, error: "No response received from model endpoint." });
      }
    } catch (err) {
      const statusCode = err?.status || err?.statusCode || 401;
      let msg = "API key validation failed.";
      if (statusCode === 401 || statusCode === 403) {
        msg = "Invalid or unauthorized Gemini API key.";
      } else if (statusCode === 429) {
        msg = "API rate limit or quota exceeded.";
      }
      return res.status(statusCode >= 400 && statusCode < 600 ? statusCode : 401).json({
        valid: false,
        error: msg
      });
    }
  });
  app.post("/api/chat", async (req, res) => {
    const clientIp = req.headers["x-forwarded-for"]?.split(",")[0]?.trim() || req.socket.remoteAddress || "unknown";
    if (!checkRateLimit(clientIp)) {
      return res.status(429).json({ error: "Too many requests. Please wait a moment before trying again." });
    }
    let cleanMessage = "";
    let safeEditorContent = "";
    let systemInstruction = "";
    try {
      const { message, editorContent, model, parameters, apiKey: clientApiKey, googleSearchGrounding } = req.body;
      cleanMessage = typeof message === "string" ? message.trim() : "";
      if (!cleanMessage || cleanMessage.length > 5e4) {
        return res.status(400).json({ error: "A valid chat message between 1 and 50,000 characters is required." });
      }
      let effectiveApiKey = process.env.GEMINI_API_KEY || "";
      if (typeof clientApiKey === "string" && clientApiKey.trim()) {
        const trimmedKey = clientApiKey.trim();
        if (/^[A-Za-z0-9_\-]{20,128}$/.test(trimmedKey)) {
          effectiveApiKey = trimmedKey;
        }
      }
      if (typeof editorContent === "string") {
        safeEditorContent = editorContent.slice(0, 1e5);
      }
      if (typeof parameters?.systemInstruction === "string" && parameters.systemInstruction.trim()) {
        systemInstruction = parameters.systemInstruction.trim().slice(0, 1e4);
      } else if (typeof req.body.systemInstruction === "string" && req.body.systemInstruction.trim()) {
        systemInstruction = req.body.systemInstruction.trim().slice(0, 1e4);
      } else {
        systemInstruction = `You are a helpful AI assistant in the AI Podium workspace.
The user is working on a Markdown document in the central editor.
Here is the CURRENT state of the user's document:

--- DOCUMENT START ---
${safeEditorContent || "(Document is empty)"}
--- DOCUMENT END ---

Please provide a helpful, concise response. If the user asks for suggestions or code based on the document, provide it. Keep your formatting in Markdown.`;
      }
      if (!effectiveApiKey) {
        if (cleanMessage.includes("[\uC591\uC2DD \uAD6C\uC870 \uAC00\uC774\uB4DC]") || cleanMessage.includes("SSOT \uBB38\uC11C") || cleanMessage.includes("Vibe Canvas")) {
          return res.status(400).json({
            error: "Gemini API \uD0A4\uAC00 \uC124\uC815\uB418\uC9C0 \uC54A\uC558\uC2B5\uB2C8\uB2E4. \uC2E4\uC2DC\uAC04 AI \uC885\uD569 \uC0DD\uC131\uC744 \uC704\uD574 \uC0C1\uB2E8 [\uC124\uC815]\uC5D0\uC11C API \uD0A4\uB97C \uB4F1\uB85D\uD558\uAC70\uB098, \uBAA8\uB2EC\uC5D0\uC11C [\uD45C\uC900 \uD15C\uD50C\uB9BF \uC989\uC2DC \uC0BD\uC785 (0ms)]\uC744 \uC0AC\uC6A9\uD574 \uC989\uC2DC \uBB38\uC11C\uB97C \uC0DD\uC131\uD558\uC138\uC694."
          });
        }
        const fallbackText = generateLocalAssistantResponse(cleanMessage, safeEditorContent, systemInstruction);
        return res.json({
          text: fallbackText,
          usage: {
            prompt: Math.ceil(cleanMessage.length / 4),
            completion: Math.ceil(fallbackText.length / 4),
            total: Math.ceil((cleanMessage.length + fallbackText.length) / 4),
            costEstimate: "\uB85C\uCEEC \uC548\uB0B4 \uBAA8\uB4DC (0\uC6D0)"
          },
          groundingSources: []
        });
      }
      const ai = new import_genai.GoogleGenAI({
        apiKey: effectiveApiKey,
        httpOptions: { headers: { "User-Agent": "aistudio-build" } }
      });
      let aiModel = "gemini-3.8-flash";
      if (typeof model === "string" && /^[a-zA-Z0-9_\-\.:]+$/.test(model) && model.length <= 64) {
        const lowerModel = model.toLowerCase();
        if (lowerModel.includes("pro")) {
          aiModel = "gemini-3.1-pro-preview";
        } else if (lowerModel.includes("lite") || lowerModel.includes("flash-lite")) {
          aiModel = "gemini-3.1-flash-lite";
        } else if (lowerModel.includes("flash")) {
          aiModel = "gemini-3.8-flash";
        }
      }
      const config = {
        systemInstruction
      };
      if (googleSearchGrounding) {
        config.tools = [{ googleSearch: {} }];
      }
      if (parameters && typeof parameters === "object") {
        if (typeof parameters.temperature === "number" && !isNaN(parameters.temperature)) {
          config.temperature = Math.max(0, Math.min(2, parameters.temperature));
        }
        if (typeof parameters.topP === "number" && !isNaN(parameters.topP)) {
          config.topP = Math.max(0, Math.min(1, parameters.topP));
        }
        if (typeof parameters.maxTokens === "number" && !isNaN(parameters.maxTokens)) {
          config.maxOutputTokens = Math.max(1, Math.min(8192, Math.floor(parameters.maxTokens)));
        }
      }
      const chat = ai.chats.create({
        model: aiModel,
        config
      });
      const response = await chat.sendMessage({ message: cleanMessage });
      const usageMetadata = response.usageMetadata;
      const promptTokens = usageMetadata?.promptTokenCount || Math.ceil(cleanMessage.length / 4);
      const completionTokens = usageMetadata?.candidatesTokenCount || Math.ceil((response.text?.length || 0) / 4);
      const totalTokens = usageMetadata?.totalTokenCount || promptTokens + completionTokens;
      let groundingSources = [];
      const candidate = response.candidates?.[0];
      const groundingMetadata = candidate?.groundingMetadata;
      if (groundingMetadata?.groundingChunks && Array.isArray(groundingMetadata.groundingChunks)) {
        groundingSources = groundingMetadata.groundingChunks.map((chunk) => ({
          title: chunk.web?.title || "Google \uC6F9 \uAC80\uC0C9 \uCD9C\uCC98",
          url: chunk.web?.uri || ""
        })).filter((src) => Boolean(src.url));
      }
      res.json({
        text: response.text,
        usage: {
          prompt: promptTokens,
          completion: completionTokens,
          total: totalTokens,
          costEstimate: "Gemini Free Tier (\uC57D 0\uC6D0)"
        },
        groundingSources
      });
    } catch (err) {
      const isQuotaExceeded = err?.status === 429 || err?.statusCode === 429 || String(err?.message || "").toLowerCase().includes("resource_exhausted") || String(err?.message || "").toLowerCase().includes("quota");
      if (isQuotaExceeded) {
        const localResponse = generateLocalAssistantResponse(cleanMessage, safeEditorContent, systemInstruction);
        const quotaNotice = `

> \u26A0\uFE0F *\uC548\uB0B4: Gemini \uD074\uB77C\uC6B0\uB4DC API \uD638\uCD9C \uD55C\uB3C4(Quota Exceeded)\uC5D0 \uB3C4\uB2EC\uD558\uC5EC \uC6CC\uD06C\uC2A4\uD398\uC774\uC2A4 \uB85C\uCEEC \uC5D4\uC9C4\uC73C\uB85C \uC548\uC804\uD558\uAC8C \uC804\uD658\uB418\uC5B4 \uC751\uB2F5\uB418\uC5C8\uC2B5\uB2C8\uB2E4. \uC7A0\uC2DC \uD6C4 \uB2E4\uC2DC \uC2DC\uB3C4\uD558\uAC70\uB098 [\uD658\uACBD\uC124\uC815](Ctrl+,)\uC5D0\uC11C \uB2E4\uB978 API \uD0A4\uB97C \uB4F1\uB85D\uD558\uC2E4 \uC218 \uC788\uC2B5\uB2C8\uB2E4.*`;
        return res.json({ text: localResponse + quotaNotice });
      }
      const statusCode = err?.status || err?.statusCode || 500;
      console.warn("Chat endpoint handled error code/status:", statusCode);
      let safeErrorMessage = "AI \uC751\uB2F5 \uC0DD\uC131 \uC911 \uC624\uB958\uAC00 \uBC1C\uC0DD\uD588\uC2B5\uB2C8\uB2E4. \uC7A0\uC2DC \uD6C4 \uB2E4\uC2DC \uC2DC\uB3C4\uD574 \uC8FC\uC138\uC694.";
      if (statusCode === 401 || statusCode === 403) {
        safeErrorMessage = "Gemini API \uD0A4\uAC00 \uC720\uD6A8\uD558\uC9C0 \uC54A\uAC70\uB098 \uC811\uADFC \uAD8C\uD55C\uC774 \uC5C6\uC2B5\uB2C8\uB2E4. \uC124\uC815\uC5D0\uC11C \uD0A4\uB97C \uD655\uC778\uD574 \uC8FC\uC138\uC694.";
      } else if (statusCode === 400) {
        safeErrorMessage = "\uC694\uCCAD \uB9E4\uAC1C\uBCC0\uC218\uAC00 \uC62C\uBC14\uB974\uC9C0 \uC54A\uC2B5\uB2C8\uB2E4.";
      }
      res.status(statusCode >= 400 && statusCode < 600 ? statusCode : 500).json({
        error: safeErrorMessage
      });
    }
  });
  app.post("/api/ssot/audit", async (req, res) => {
    const clientIp = req.headers["x-forwarded-for"]?.split(",")[0]?.trim() || req.socket.remoteAddress || "unknown";
    if (!checkRateLimit(clientIp)) {
      return res.status(429).json({ error: "Too many requests. Please wait a moment." });
    }
    try {
      const { document, apiKey: clientApiKey } = req.body;
      const docText = typeof document === "string" ? document.slice(0, 1e5) : "";
      if (!docText.trim()) {
        return res.json({
          score: 100,
          status: "pristine",
          criticalCount: 0,
          warningCount: 0,
          infoCount: 0,
          issues: [],
          analyzedAt: (/* @__PURE__ */ new Date()).toLocaleTimeString(),
          isAiEnhanced: false
        });
      }
      let effectiveApiKey = process.env.GEMINI_API_KEY || "";
      if (typeof clientApiKey === "string" && clientApiKey.trim()) {
        const trimmedKey = clientApiKey.trim();
        if (/^[A-Za-z0-9_\-]{20,128}$/.test(trimmedKey)) {
          effectiveApiKey = trimmedKey;
        }
      }
      if (!effectiveApiKey) {
        return res.json({
          fallbackToLocal: true,
          message: "Gemini API key is not configured; using local heuristic audit engine."
        });
      }
      const ai = new import_genai.GoogleGenAI({
        apiKey: effectiveApiKey,
        httpOptions: { headers: { "User-Agent": "aistudio-build" } }
      });
      const auditPrompt = `You are the SSOT (Single Source of Truth) Document Consistency & Drift Auditor.
Analyze the following markdown document for internal contradictions, timeline conflicts, numeric/budget discrepancies, ambiguous placeholders (TBD, TODO), or unassigned dangling tasks.

Return a strictly valid JSON object with the following structure (no markdown fences, just pure JSON):
{
  "score": number (0 to 100, where 100 is pristine consistency),
  "status": "pristine" | "healthy" | "warning" | "critical",
  "criticalCount": number,
  "warningCount": number,
  "infoCount": number,
  "issues": [
    {
      "id": string,
      "type": "timeline" | "metric" | "contradiction" | "task" | "ambiguity" | "architecture",
      "severity": "critical" | "warning" | "info",
      "title": string (concise title in Korean),
      "description": string (clear explanation in Korean),
      "location": {
        "line": number (estimated 1-indexed line number in document),
        "text": string (exact short quote of problematic text in document)
      },
      "suggestedFix": string (actionable resolution in Korean),
      "reconciliationPatch": {
        "original": string (exact substring to replace),
        "replacement": string (exact proposed reconciled text)
      }
    }
  ]
}

DOCUMENT TO AUDIT:
${docText}
`;
      const aiResponse = await ai.models.generateContent({
        model: "gemini-3.8-flash",
        contents: auditPrompt,
        config: {
          temperature: 0.1,
          responseMimeType: "application/json"
        }
      });
      const responseText = aiResponse.text?.trim() || "";
      try {
        const parsed = JSON.parse(responseText);
        return res.json({
          ...parsed,
          analyzedAt: (/* @__PURE__ */ new Date()).toLocaleTimeString(),
          isAiEnhanced: true
        });
      } catch {
        return res.json({ fallbackToLocal: true });
      }
    } catch (err) {
      console.warn("SSOT audit handled error:", err?.message || err);
      return res.json({ fallbackToLocal: true });
    }
  });
  app.post("/api/critics/review", async (req, res) => {
    const clientIp = req.headers["x-forwarded-for"]?.split(",")[0]?.trim() || req.socket.remoteAddress || "unknown";
    if (!checkRateLimit(clientIp)) {
      return res.status(429).json({ error: "Too many requests. Please wait a moment." });
    }
    try {
      const { document, apiKey: clientApiKey } = req.body;
      const docText = typeof document === "string" ? document.slice(0, 1e5) : "";
      if (!docText.trim()) {
        return res.json({ fallbackToLocal: true });
      }
      let effectiveApiKey = process.env.GEMINI_API_KEY || "";
      if (typeof clientApiKey === "string" && clientApiKey.trim()) {
        const trimmedKey = clientApiKey.trim();
        if (/^[A-Za-z0-9_\-]{20,128}$/.test(trimmedKey)) {
          effectiveApiKey = trimmedKey;
        }
      }
      if (!effectiveApiKey) {
        return res.json({ fallbackToLocal: true });
      }
      const ai = new import_genai.GoogleGenAI({
        apiKey: effectiveApiKey,
        httpOptions: { headers: { "User-Agent": "aistudio-build" } }
      });
      const councilPrompt = `You are the "Council of Critics", a 4-member executive review committee conducting a rigorous, adversarial audit of this technical/business specification.

The 4 members are:
1. Elena Rostova (Skeptical Product Lead) - Evaluates UX, target user personas, customer value, edge cases, acceptance criteria.
2. Dr. Marcus Vance (Chief Security Auditor) - Evaluates credentials leaks, access control (RBAC), data encryption, vulnerability threat models.
3. Julian Sterling (CFO & Budget Controller) - Evaluates financial feasibility, headcount/timeline, cloud infrastructure cost, ROI.
4. Kai Nakamura (Principal Systems Architect) - Evaluates scalability, concurrency, latency SLAs, caching, single points of failure.

Provide a thorough, honest, adversarial review in Korean. Return a valid JSON object matching this schema:
{
  "overallScore": number (0 to 100),
  "readinessRating": "\uCD9C\uC2DC \uC900\uBE44 \uC644\uB8CC" | "\uC870\uAC74\uBD80 \uBCF4\uC644 \uAD8C\uACE0" | "\uC2EC\uAC01\uD55C \uB9AC\uC2A4\uD06C \uAC10\uC9C0",
  "criticalCount": number,
  "warningCount": number,
  "critics": [
    {
      "persona": "pm" | "security" | "cfo" | "architect",
      "name": string,
      "role": string,
      "title": string,
      "score": number (0 to 100),
      "verdict": "\uC2B9\uC778" | "\uC870\uAC74\uBD80 \uC2B9\uC778" | "\uC804\uBA74 \uC7AC\uAC80\uD1A0 \uC694\uB9DD",
      "strengths": [string],
      "issues": [
        {
          "id": string,
          "severity": "critical" | "warning" | "info",
          "title": string,
          "description": string,
          "recommendation": string,
          "targetLine": number (estimated 1-indexed line number in document)
        }
      ]
    }
  ],
  "revisedDocument": string (A complete revised markdown document incorporating the council's fixes, keeping original tone and adding necessary sections)
}

DOCUMENT TO AUDIT:
${docText}
`;
      const aiResponse = await ai.models.generateContent({
        model: "gemini-3.8-flash",
        contents: councilPrompt,
        config: {
          temperature: 0.2,
          responseMimeType: "application/json"
        }
      });
      const responseText = aiResponse.text?.trim() || "";
      try {
        const parsed = JSON.parse(responseText);
        return res.json({
          ...parsed,
          analyzedAt: (/* @__PURE__ */ new Date()).toLocaleTimeString(),
          isAiEnhanced: true
        });
      } catch {
        return res.json({ fallbackToLocal: true });
      }
    } catch (err) {
      console.warn("Critics review handled error:", err?.message || err);
      return res.json({ fallbackToLocal: true });
    }
  });
  if (process.env.NODE_ENV !== "production") {
    const vite = await (0, import_vite.createServer)({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    const distPath = import_path.default.join(process.cwd(), "dist");
    app.use(import_express.default.static(distPath));
    app.get("*all", (req, res) => {
      res.sendFile(import_path.default.join(distPath, "index.html"));
    });
  }
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}
startServer();
//# sourceMappingURL=server.cjs.map
