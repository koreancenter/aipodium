import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    next();
  });

  app.use(express.json({ limit: '1mb' }));

  // API route for Chat
  app.post("/api/chat", async (req, res) => {
    try {
      const { message, editorContent, model, parameters } = req.body;
      const cleanMessage = typeof message === 'string' ? message.trim() : '';
      if (!cleanMessage || cleanMessage.length > 50000) {
        return res.status(400).json({ error: 'A valid chat message is required.' });
      }
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return res.status(500).json({ error: "GEMINI_API_KEY is not configured on the server." });
      }
      
      const ai = new GoogleGenAI({ 
        apiKey,
        httpOptions: { headers: { 'User-Agent': 'aistudio-build' } }
      });

      let systemInstruction = parameters?.systemInstruction || req.body.systemInstruction || `You are a helpful AI assistant in the AI Podium workspace.
The user is working on a Markdown document in the central editor.
Here is the CURRENT state of the user's document:

--- DOCUMENT START ---
${editorContent || "(Document is empty)"}
--- DOCUMENT END ---

Please provide a helpful, concise response. If the user asks for suggestions or code based on the document, provide it. Keep your formatting in Markdown.`;

      // Map incoming model selection aliases to supported Google GenAI model strings
      let aiModel = "gemini-3.7-flash"; // default
      if (typeof model === 'string') {
        const lowerModel = model.toLowerCase();
        if (lowerModel.includes('pro')) {
          aiModel = 'gemini-3.1-pro-preview';
        } else if (lowerModel.includes('lite') || lowerModel.includes('flash-lite')) {
          aiModel = 'gemini-3.1-flash-lite';
        } else if (lowerModel.includes('gemini-3.7-flash') || lowerModel.includes('flash')) {
          aiModel = 'gemini-3.7-flash';
        }
      }

      const config: any = {
        systemInstruction,
      };

      if (parameters) {
        if (typeof parameters.temperature === 'number') {
          config.temperature = Math.max(0, Math.min(2, parameters.temperature));
        }
        if (typeof parameters.topP === 'number') {
          config.topP = Math.max(0, Math.min(1, parameters.topP));
        }
        if (typeof parameters.maxTokens === 'number') {
          config.maxOutputTokens = parameters.maxTokens;
        }
      }

      const chat = ai.chats.create({
        model: aiModel,
        config
      });

      const response = await chat.sendMessage({ message });
      res.json({ text: response.text });
    } catch (err: any) {
      console.error('Chat endpoint error:', err);
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
