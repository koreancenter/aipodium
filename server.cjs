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
var import_express = __toESM(require("express"), 1);
var import_path = __toESM(require("path"), 1);
var import_vite = require("vite");
var import_genai = require("@google/genai");
async function startServer() {
  const app = (0, import_express.default)();
  const PORT = 3e3;
  app.use((req, res, next) => {
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
    next();
  });
  app.use(import_express.default.json({ limit: "1mb" }));
  app.post("/api/chat", async (req, res) => {
    try {
      const { message, editorContent, model, parameters } = req.body;
      const cleanMessage = typeof message === "string" ? message.trim() : "";
      if (!cleanMessage || cleanMessage.length > 5e4) {
        return res.status(400).json({ error: "A valid chat message is required." });
      }
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return res.status(500).json({ error: "GEMINI_API_KEY is not configured on the server." });
      }
      const ai = new import_genai.GoogleGenAI({
        apiKey,
        httpOptions: { headers: { "User-Agent": "aistudio-build" } }
      });
      let systemInstruction = parameters?.systemInstruction || req.body.systemInstruction || `You are a helpful AI assistant in the AI Podium workspace.
The user is working on a Markdown document in the central editor.
Here is the CURRENT state of the user's document:

--- DOCUMENT START ---
${editorContent || "(Document is empty)"}
--- DOCUMENT END ---

Please provide a helpful, concise response. If the user asks for suggestions or code based on the document, provide it. Keep your formatting in Markdown.`;
      let aiModel = "gemini-3.7-flash";
      if (typeof model === "string") {
        const lowerModel = model.toLowerCase();
        if (lowerModel.includes("pro")) {
          aiModel = "gemini-3.1-pro-preview";
        } else if (lowerModel.includes("lite") || lowerModel.includes("flash-lite")) {
          aiModel = "gemini-3.1-flash-lite";
        } else if (lowerModel.includes("gemini-3.7-flash") || lowerModel.includes("flash")) {
          aiModel = "gemini-3.7-flash";
        }
      }
      const config = {
        systemInstruction
      };
      if (parameters) {
        if (typeof parameters.temperature === "number") {
          config.temperature = Math.max(0, Math.min(2, parameters.temperature));
        }
        if (typeof parameters.topP === "number") {
          config.topP = Math.max(0, Math.min(1, parameters.topP));
        }
        if (typeof parameters.maxTokens === "number") {
          config.maxOutputTokens = parameters.maxTokens;
        }
      }
      const chat = ai.chats.create({
        model: aiModel,
        config
      });
      const response = await chat.sendMessage({ message });
      res.json({ text: response.text });
    } catch (err) {
      console.error("Chat endpoint error:", err);
      res.status(500).json({ error: err.message || "Failed to generate AI response." });
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
    app.get("*", (req, res) => {
      res.sendFile(import_path.default.join(distPath, "index.html"));
    });
  }
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}
startServer();
//# sourceMappingURL=server.cjs.map
