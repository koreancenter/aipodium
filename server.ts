import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
    if (process.env.NODE_ENV === 'production') {
      res.setHeader(
        'Content-Security-Policy',
        "default-src 'self'; img-src 'self' data: https:; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline'; connect-src 'self' https://api.github.com https://www.googleapis.com https://raw.githubusercontent.com"
      );
    }
    next();
  });

  app.use(express.json({ limit: '1mb' }));

  // API route for Chat
  app.post("/api/chat", async (req, res) => {
    try {
      const { message, editorContent, model } = req.body;
      const cleanMessage = typeof message === 'string' ? message.trim() : '';
      if (!cleanMessage || cleanMessage.length > 20000) {
        return res.status(400).json({ error: 'A valid chat message is required.' });
      }
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return res.status(500).json({ error: "GEMINI_API_KEY is not set. Please configure it in Settings > Secrets." });
      }
      
      const ai = new GoogleGenAI({ 
        apiKey,
        httpOptions: { headers: { 'User-Agent': 'aistudio-build' } }
      });

      let systemInstruction = req.body.systemInstruction || `You are a helpful AI assistant in the AI Podium workspace.
The user is working on a Markdown document in the central editor.
Here is the CURRENT state of the user's document:

--- DOCUMENT START ---
${editorContent || "(Document is empty)"}
--- DOCUMENT END ---

Please provide a helpful, concise response. If the user asks for suggestions or code based on the document, provide it. Keep your formatting in Markdown.`;

      // Map local model selection aliases to actual genai model strings
      let aiModel = "gemini-3.7-flash"; // default
      if (model && model.includes("pro")) {
        aiModel = "gemini-3.1-pro-preview";
      } else if (model && model.includes("lite")) {
        aiModel = "gemini-3.1-flash-lite";
      }

      const chat = ai.chats.create({
        model: aiModel,
        config: { systemInstruction }
      });

      const response = await chat.sendMessage({ message });
      res.json({ text: response.text });
    } catch (err: any) {
      console.error(err);
      res.status(500).json({ error: err.message || "Failed to generate AI response." });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
