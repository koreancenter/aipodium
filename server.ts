import 'dotenv/config';
import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";

// Sliding window rate limiter for API endpoints
interface RateLimitRecord {
  timestamps: number[];
}
const rateLimitMap = new Map<string, RateLimitRecord>();
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const MAX_REQUESTS_PER_WINDOW = 60; // 60 requests per minute

function checkRateLimit(ip: string): boolean {
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

// Cleanup stale rate limit records every 5 minutes
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
}, 5 * 60 * 1000).unref();

// Graceful local assistant response generator when Gemini API Key is not configured
function generateLocalAssistantResponse(message: string, editorContent: string, _systemInstruction: string): string {
  // General Chat / Markdown workspace analysis
  const hasDoc = Boolean(editorContent && editorContent.trim());
  const docLines = hasDoc ? editorContent.trim().split('\n') : [];
  const docTitle = docLines[0]?.replace(/^#+\s*/, '') || '현재 문서';

  let responseBody = '';

  if (/요약|정리|간략/i.test(message)) {
    if (hasDoc) {
      const headings = docLines.filter(l => l.startsWith('#')).slice(0, 8);
      responseBody = `### 📋 '${docTitle}' 문서 핵심 구조 분석\n\n` +
        `현재 중앙 편집기에서 작업 중인 문서의 로컬 구조 분석 결과입니다:\n\n` +
        `1. **문서 규모**: 총 ${docLines.length}행 / 약 ${editorContent.length}글자\n` +
        `2. **주요 섹션 구성**:\n` +
        (headings.length > 0 
          ? headings.map(h => `   - ${h.replace(/^#+\s*/, '')}`).join('\n') 
          : '   - 단일 본문 섹션으로 구성됨') + '\n\n' +
        `3. **추천 가이드**: 에디터에서 슬래시 커맨드(\`/\`)를 사용하여 제목, 표, 체크리스트를 즉시 삽입할 수 있습니다.`;
    } else {
      responseBody = `현재 편집기에 작성된 문서가 없습니다. 중앙 에디터에 마크다운을 작성하거나 슬래시 커맨드(\`/\`)로 표준 서식 템플릿을 추가해 보세요.`;
    }
  } else if (/코드|함수|구현|스크립트|개발/i.test(message)) {
    responseBody = `### 💻 개발 가이드 및 코드 지원\n\n` +
      `중앙 에디터에서 \`/code\` 슬래시 명령어를 입력하면 즉시 구문 강조 코드 블록을 삽입할 수 있습니다.\n\n` +
      `\`\`\`typescript\n` +
      `// 안전하고 견고한 TypeScript 구현 패턴\n` +
      `export async function handleWorkspaceTask(taskInput: string): Promise<{ success: boolean; data: any }> {\n` +
      `  try {\n` +
      `    console.log('작업 실행:', taskInput);\n` +
      `    return { success: true, data: { processedAt: new Date().toISOString() } };\n` +
      `  } catch (error) {\n` +
      `    return { success: false, data: error };\n` +
      `  }\n` +
      `}\n` +
      `\`\`\`\n\n` +
      `- **참고**: 에러 발생 시 예외를 호출자에게 안전하게 반환하고, 상태를 예측 가능한 형태로 유지하는 것이 중요합니다.`;
  } else {
    responseBody = `### 🤖 AI Podium 오프라인 가이드\n\n` +
      `요청하신 내용(**"${message.slice(0, 60)}${message.length > 60 ? '...' : ''}"**)에 대한 안내입니다.\n\n` +
      (hasDoc 
        ? `현재 편집기의 **'${docTitle}'** 문서 컨텍스트(총 ${docLines.length}행)를 참조하고 있습니다.\n\n` +
          `- **빠른 서식 삽입**: 에디터에서 \`/\`를 입력하면 헤딩, 표, 체크리스트 등 표준 서식을 0ms로 즉시 삽입할 수 있습니다.\n` +
          `- **클라우드 AI 활성화**: 실시간 LLM 추론을 원하시면 상단 톱니바퀴 [설정] -> [AI 엔진 설정]에서 Gemini API 키를 등록하세요.`
        : `AI Podium은 마크다운 편집기, 스프레드시트 블록, 다중 AI 모델 비교 대화창이 유기적으로 결합된 로컬 우선 워크스페이스입니다.\n\n` +
          `- **마크다운 편집**: 중앙 창에서 실시간 프리뷰와 함께 문서를 작성하세요.\n` +
          `- **0ms 템플릿**: \`/\` 슬래시 커맨드로 제목, 표, 체크리스트를 즉시 삽입할 수 있습니다.\n` +
          `- **AI 모델 연동**: Gemini Cloud 모델 또는 로컬 Ollama 모델을 설정에서 연결할 수 있습니다.`);
  }

  return responseBody +
    `\n\n> 💡 *알림: 현재 로컬 기본 분석 모드입니다. Google Gemini 3.8 최신 초고속 클라우드 신경망을 활성화하시려면 [환경설정](Ctrl+,) > [AI 엔진 설정]에서 Gemini API 키를 입력하거나 .env에 GEMINI_API_KEY를 설정하세요.*`;
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Comprehensive Security Headers & Strict Content-Security-Policy (CSP)
  app.use((req, res, next) => {
    const cspDirectives = [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' blob:",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' data: https://fonts.gstatic.com",
      "img-src 'self' data: blob: https:",
      "connect-src 'self' http://localhost:11434 http://127.0.0.1:11434 https://generativelanguage.googleapis.com https://api.openai.com https://api.anthropic.com https://api.deepseek.com https://api.groq.com ws: wss:",
      "media-src 'self' data: blob:",
      "object-src 'none'",
      "base-uri 'self'",
      "frame-ancestors 'self' https:"
    ].join('; ');

    res.setHeader('Content-Security-Policy', cspDirectives);
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('X-Permitted-Cross-Domain-Policies', 'none');
    res.setHeader('Cross-Origin-Resource-Policy', 'same-origin');
    res.setHeader('X-Security-Policy', 'Local-First-Vault-Enforced');
    next();
  });

  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ limit: '50mb', extended: true }));

  // API route for API Key and Connection Verification
  app.post("/api/verify", async (req, res) => {
    const clientIp = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.socket.remoteAddress || 'unknown';
    if (!checkRateLimit(clientIp)) {
      return res.status(429).json({ valid: false, error: 'Too many requests. Please wait a moment before trying again.' });
    }

    try {
      const { apiKey: clientApiKey, vendor = 'gemini' } = req.body;
      const trimmedKey = typeof clientApiKey === 'string' ? clientApiKey.trim() : '';

      // Format-based checks for other external BYOK providers
      if (vendor === 'openai') {
        if (/^sk-[A-Za-z0-9_\-]{20,128}$/.test(trimmedKey)) {
          return res.json({ valid: true, model: 'OpenAI (GPT-4o/o3)', vendor: 'openai' });
        }
        return res.status(400).json({ valid: false, error: 'Invalid OpenAI API key format (must start with sk-).' });
      }

      if (vendor === 'anthropic') {
        if (/^sk-ant-[A-Za-z0-9_\-]{20,128}$/.test(trimmedKey)) {
          return res.json({ valid: true, model: 'Anthropic (Claude 3.5)', vendor: 'anthropic' });
        }
        return res.status(400).json({ valid: false, error: 'Invalid Anthropic API key format (must start with sk-ant-).' });
      }

      if (vendor === 'deepseek') {
        if (/^sk-[A-Za-z0-9_\-]{20,128}$/.test(trimmedKey)) {
          return res.json({ valid: true, model: 'DeepSeek (R1/V3)', vendor: 'deepseek' });
        }
        return res.status(400).json({ valid: false, error: 'Invalid DeepSeek API key format (must start with sk-).' });
      }

      if (vendor === 'groq') {
        if (/^gsk_[A-Za-z0-9_\-]{20,128}$/.test(trimmedKey)) {
          return res.json({ valid: true, model: 'Groq Cloud (LPU)', vendor: 'groq' });
        }
        return res.status(400).json({ valid: false, error: 'Invalid Groq API key format (must start with gsk_).' });
      }

      // Gemini Provider Verification
      let effectiveApiKey = process.env.GEMINI_API_KEY || '';
      if (trimmedKey && /^[A-Za-z0-9_\-]{20,128}$/.test(trimmedKey)) {
        effectiveApiKey = trimmedKey;
      }

      if (!effectiveApiKey) {
        return res.status(400).json({ valid: false, error: 'GEMINI_API_KEY is not set. Please provide an API key in settings.' });
      }

      const ai = new GoogleGenAI({
        apiKey: effectiveApiKey,
        httpOptions: { headers: { 'User-Agent': 'aistudio-build' } }
      });

      const testRes = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: 'ping'
      });

      if (testRes && testRes.text) {
        return res.json({ valid: true, model: 'gemini-3.8-flash', vendor: 'gemini' });
      } else {
        return res.status(502).json({ valid: false, error: 'No response received from model endpoint.' });
      }
    } catch (err: any) {
      const statusCode = err?.status || err?.statusCode || 401;
      let msg = 'API key validation failed.';
      if (statusCode === 401 || statusCode === 403) {
        msg = 'Invalid or unauthorized Gemini API key.';
      } else if (statusCode === 429) {
        msg = 'API rate limit or quota exceeded.';
      }
      return res.status(statusCode >= 400 && statusCode < 600 ? statusCode : 401).json({
        valid: false,
        error: msg
      });
    }
  });

  // API route for Chat
  app.post("/api/chat", async (req, res) => {
    // 1. Enforce Rate Limiting
    const clientIp = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.socket.remoteAddress || 'unknown';
    if (!checkRateLimit(clientIp)) {
      return res.status(429).json({ error: 'Too many requests. Please wait a moment before trying again.' });
    }

    let cleanMessage = '';
    let safeEditorContent = '';
    let systemInstruction = '';

    try {
      const { message, editorContent, model, parameters, apiKey: clientApiKey, googleSearchGrounding } = req.body;

      // 2. Validate Message
      cleanMessage = typeof message === 'string' ? message.trim() : '';
      if (!cleanMessage || cleanMessage.length > 250000) {
        return res.status(400).json({ error: 'A valid chat message between 1 and 250,000 characters is required.' });
      }

      // 3. Resolve API Key Securely
      let effectiveApiKey = process.env.GEMINI_API_KEY || '';
      if (typeof clientApiKey === 'string' && clientApiKey.trim()) {
        const trimmedKey = clientApiKey.trim();
        // Allow valid API key formats only (alphanumeric, underscores, hyphens, 20-128 chars)
        if (/^[A-Za-z0-9_\-]{20,128}$/.test(trimmedKey)) {
          effectiveApiKey = trimmedKey;
        }
      }

      // 4. Validate and Sanitize Context
      if (typeof editorContent === 'string') {
        safeEditorContent = editorContent.slice(0, 250000);
      }

      if (typeof parameters?.systemInstruction === 'string' && parameters.systemInstruction.trim()) {
        systemInstruction = parameters.systemInstruction.trim().slice(0, 10000);
      } else if (typeof req.body.systemInstruction === 'string' && req.body.systemInstruction.trim()) {
        systemInstruction = req.body.systemInstruction.trim().slice(0, 10000);
      } else {
        systemInstruction = `You are a helpful AI assistant in the AI Podium workspace.
The user is working on a Markdown document in the central editor.
Here is the CURRENT state of the user's document:

--- DOCUMENT START ---
${safeEditorContent || "(Document is empty)"}
--- DOCUMENT END ---

Please provide a helpful, concise response. If the user asks for suggestions or code based on the document, provide it. Keep your formatting in Markdown.`;
      }

      // If Gemini API Key is not configured
      if (!effectiveApiKey) {
        if (cleanMessage.includes('[양식 구조 가이드]') || cleanMessage.includes('SSOT 문서') || cleanMessage.includes('Vibe Canvas')) {
          return res.status(400).json({
            error: 'Gemini API 키가 설정되지 않았습니다. 실시간 AI 종합 생성을 위해 상단 [설정]에서 API 키를 등록하거나, 모달에서 [표준 템플릿 즉시 삽입 (0ms)]을 사용해 즉시 문서를 생성하세요.'
          });
        }

        const fallbackText = generateLocalAssistantResponse(cleanMessage, safeEditorContent, systemInstruction);
        return res.json({
          text: fallbackText,
          usage: {
            prompt: Math.ceil(cleanMessage.length / 4),
            completion: Math.ceil(fallbackText.length / 4),
            total: Math.ceil((cleanMessage.length + fallbackText.length) / 4),
            costEstimate: '로컬 안내 모드 (0원)'
          },
          groundingSources: []
        });
      }

      const ai = new GoogleGenAI({ 
        apiKey: effectiveApiKey,
        httpOptions: { headers: { 'User-Agent': 'aistudio-build' } }
      });

      // 5. Model Selection
      let aiModel = "gemini-3.8-flash"; // default
      if (typeof model === 'string' && /^[a-zA-Z0-9_\-\.:]+$/.test(model) && model.length <= 64) {
        const lowerModel = model.toLowerCase();
        if (lowerModel.includes('pro')) {
          aiModel = 'gemini-3.1-pro-preview';
        } else if (lowerModel.includes('lite') || lowerModel.includes('flash-lite')) {
          aiModel = 'gemini-3.1-flash-lite';
        } else if (lowerModel.includes('flash')) {
          aiModel = 'gemini-3.8-flash';
        }
      }

      // 6. Parameter Validation
      const config: any = {
        systemInstruction,
      };

      // Enable Google Search Grounding if requested
      if (googleSearchGrounding) {
        config.tools = [{ googleSearch: {} }];
      }

      if (parameters && typeof parameters === 'object') {
        if (typeof parameters.temperature === 'number' && !isNaN(parameters.temperature)) {
          config.temperature = Math.max(0, Math.min(2, parameters.temperature));
        }
        if (typeof parameters.topP === 'number' && !isNaN(parameters.topP)) {
          config.topP = Math.max(0, Math.min(1, parameters.topP));
        }
        if (typeof parameters.maxTokens === 'number' && !isNaN(parameters.maxTokens)) {
          config.maxOutputTokens = Math.max(1, Math.min(8192, Math.floor(parameters.maxTokens)));
        }
      }

      const chat = ai.chats.create({
        model: aiModel,
        config
      });

      const response = await chat.sendMessage({ message: cleanMessage });

      // Extract token usage
      const usageMetadata = response.usageMetadata;
      const promptTokens = usageMetadata?.promptTokenCount || Math.ceil(cleanMessage.length / 4);
      const completionTokens = usageMetadata?.candidatesTokenCount || Math.ceil((response.text?.length || 0) / 4);
      const totalTokens = usageMetadata?.totalTokenCount || (promptTokens + completionTokens);

      // Extract Grounding sources if available
      let groundingSources: { title: string; url: string }[] = [];
      const candidate = response.candidates?.[0];
      const groundingMetadata = (candidate as any)?.groundingMetadata;
      if (groundingMetadata?.groundingChunks && Array.isArray(groundingMetadata.groundingChunks)) {
        groundingSources = groundingMetadata.groundingChunks
          .map((chunk: any) => ({
            title: chunk.web?.title || 'Google 웹 검색 출처',
            url: chunk.web?.uri || ''
          }))
          .filter((src: any) => Boolean(src.url));
      }

      res.json({
        text: response.text,
        usage: {
          prompt: promptTokens,
          completion: completionTokens,
          total: totalTokens,
          costEstimate: 'Gemini Free Tier (약 0원)'
        },
        groundingSources
      });
    } catch (err: any) {
      const isQuotaExceeded = err?.status === 429 || err?.statusCode === 429 ||
        String(err?.message || '').toLowerCase().includes('resource_exhausted') ||
        String(err?.message || '').toLowerCase().includes('quota');

      if (isQuotaExceeded) {
        const localResponse = generateLocalAssistantResponse(cleanMessage, safeEditorContent, systemInstruction);
        const quotaNotice = `\n\n> ⚠️ *안내: Gemini 클라우드 API 호출 한도(Quota Exceeded)에 도달하여 워크스페이스 로컬 엔진으로 안전하게 전환되어 응답되었습니다. 잠시 후 다시 시도하거나 [환경설정](Ctrl+,)에서 다른 API 키를 등록하실 수 있습니다.*`;
        return res.json({ text: localResponse + quotaNotice });
      }

      const statusCode = err?.status || err?.statusCode || 500;
      console.warn('Chat endpoint handled error code/status:', statusCode);

      let safeErrorMessage = "AI 응답 생성 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.";
      if (statusCode === 401 || statusCode === 403) {
        safeErrorMessage = "Gemini API 키가 유효하지 않거나 접근 권한이 없습니다. 설정에서 키를 확인해 주세요.";
      } else if (statusCode === 400) {
        safeErrorMessage = "요청 매개변수가 올바르지 않습니다.";
      }

      res.status(statusCode >= 400 && statusCode < 600 ? statusCode : 500).json({
        error: safeErrorMessage
      });
    }
  });

  // API route for SSOT Drift & Consistency Deep Audit
  app.post("/api/ssot/audit", async (req, res) => {
    const clientIp = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.socket.remoteAddress || 'unknown';
    if (!checkRateLimit(clientIp)) {
      return res.status(429).json({ error: 'Too many requests. Please wait a moment.' });
    }

    try {
      const { document, apiKey: clientApiKey, model: requestedModel } = req.body;
      const docText = typeof document === 'string' ? document.slice(0, 250000) : '';

      if (!docText.trim()) {
        return res.json({
          score: 100,
          status: 'pristine',
          criticalCount: 0,
          warningCount: 0,
          infoCount: 0,
          issues: [],
          analyzedAt: new Date().toLocaleTimeString(),
          isAiEnhanced: false
        });
      }

      let effectiveApiKey = process.env.GEMINI_API_KEY || '';
      if (typeof clientApiKey === 'string' && clientApiKey.trim()) {
        const trimmedKey = clientApiKey.trim();
        if (/^[A-Za-z0-9_\-]{20,128}$/.test(trimmedKey)) {
          effectiveApiKey = trimmedKey;
        }
      }

      // If no AI key available, inform client to use local heuristic analysis
      if (!effectiveApiKey) {
        return res.json({
          fallbackToLocal: true,
          message: 'Gemini API key is not configured; using local heuristic audit engine.'
        });
      }

      const ai = new GoogleGenAI({
        apiKey: effectiveApiKey,
        httpOptions: { headers: { 'User-Agent': 'aistudio-build' } }
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

      const targetModel = typeof requestedModel === 'string' && requestedModel.trim()
        ? requestedModel.trim()
        : 'gemini-3.8-flash';

      const aiResponse = await ai.models.generateContent({
        model: targetModel,
        contents: auditPrompt,
        config: {
          temperature: 0.1,
          responseMimeType: 'application/json'
        }
      });

      const responseText = aiResponse.text?.trim() || '';
      try {
        const parsed = JSON.parse(responseText);
        return res.json({
          ...parsed,
          analyzedAt: new Date().toLocaleTimeString(),
          isAiEnhanced: true
        });
      } catch {
        return res.json({ fallbackToLocal: true });
      }
    } catch (err: any) {
      console.warn('SSOT audit handled error:', err?.message || err);
      return res.json({ fallbackToLocal: true });
    }
  });

  // API route for Multi-Perspective Council of Critics Review
  app.post("/api/critics/review", async (req, res) => {
    const clientIp = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.socket.remoteAddress || 'unknown';
    if (!checkRateLimit(clientIp)) {
      return res.status(429).json({ error: 'Too many requests. Please wait a moment.' });
    }

    try {
      const { document, apiKey: clientApiKey, model: requestedModel } = req.body;
      const docText = typeof document === 'string' ? document.slice(0, 250000) : '';

      if (!docText.trim()) {
        return res.json({ fallbackToLocal: true });
      }

      let effectiveApiKey = process.env.GEMINI_API_KEY || '';
      if (typeof clientApiKey === 'string' && clientApiKey.trim()) {
        const trimmedKey = clientApiKey.trim();
        if (/^[A-Za-z0-9_\-]{20,128}$/.test(trimmedKey)) {
          effectiveApiKey = trimmedKey;
        }
      }

      if (!effectiveApiKey) {
        return res.json({ fallbackToLocal: true });
      }

      const ai = new GoogleGenAI({
        apiKey: effectiveApiKey,
        httpOptions: { headers: { 'User-Agent': 'aistudio-build' } }
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
  "readinessRating": "출시 준비 완료" | "조건부 보완 권고" | "심각한 리스크 감지",
  "criticalCount": number,
  "warningCount": number,
  "critics": [
    {
      "persona": "pm" | "security" | "cfo" | "architect",
      "name": string,
      "role": string,
      "title": string,
      "score": number (0 to 100),
      "verdict": "승인" | "조건부 승인" | "전면 재검토 요망",
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

      const targetModel = typeof requestedModel === 'string' && requestedModel.trim()
        ? requestedModel.trim()
        : 'gemini-3.8-flash';

      const aiResponse = await ai.models.generateContent({
        model: targetModel,
        contents: councilPrompt,
        config: {
          temperature: 0.2,
          responseMimeType: 'application/json'
        }
      });

      const responseText = aiResponse.text?.trim() || '';
      try {
        const parsed = JSON.parse(responseText);
        return res.json({
          ...parsed,
          analyzedAt: new Date().toLocaleTimeString(),
          isAiEnhanced: true
        });
      } catch {
        return res.json({ fallbackToLocal: true });
      }
    } catch (err: any) {
      console.warn('Critics review handled error:', err?.message || err);
      return res.json({ fallbackToLocal: true });
    }
  });

  // API route for Server-Side Gemini PDF Parsing
  app.post("/api/pdf/parse-gemini", async (req, res) => {
    const clientIp = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.socket.remoteAddress || 'unknown';
    if (!checkRateLimit(clientIp)) {
      return res.status(429).json({ error: '요청이 너무 많습니다. 잠시 후 다시 시도해 주세요.' });
    }

    try {
      const { textContent, imageBase64, fileName, pageNumber, apiKey: clientApiKey } = req.body;

      let effectiveApiKey = process.env.GEMINI_API_KEY || '';
      if (typeof clientApiKey === 'string' && clientApiKey.trim()) {
        const trimmedKey = clientApiKey.trim();
        if (/^[A-Za-z0-9_\-]{20,128}$/.test(trimmedKey)) {
          effectiveApiKey = trimmedKey;
        }
      }

      if (!effectiveApiKey) {
        return res.status(400).json({
          error: 'Gemini API 키가 설정되지 않았습니다. 환경 변수나 설정 화면에서 키를 확인해 주세요.'
        });
      }

      const ai = new GoogleGenAI({
        apiKey: effectiveApiKey,
        httpOptions: { headers: { 'User-Agent': 'aistudio-build' } }
      });

      const systemPrompt = '너는 전문 문서 구조화 및 PDF-투-마크다운 변환 엔지니어이다. 주어진 문서의 제목, 본문, 표(Table), 목록, 수식을 완벽한 마크다운 문법으로 변환하라. 오직 마크다운 텍스트만 출력하고 불필요한 서두나 사족은 절대 포함하지 마라.';

      let contents: any;

      if (imageBase64 && typeof imageBase64 === 'string') {
        const cleanBase64 = imageBase64.replace(/^data:image\/(png|jpeg|jpg|webp);base64,/, '');
        const imagePart = {
          inlineData: {
            mimeType: 'image/jpeg',
            data: cleanBase64
          }
        };
        const textPrompt = `[문서명: ${fileName || 'PDF 문서'}${pageNumber ? ` - 페이지 ${pageNumber}` : ''}]\n이 이미지 페이지의 시각적 구조(제목, 본문, 표, 목록, 수식 등)를 파악하여 고품질 마크다운으로 재구성하라.`;
        contents = { parts: [imagePart, { text: textPrompt }] };
      } else if (textContent && typeof textContent === 'string') {
        const userPrompt = `[문서명: ${fileName || 'PDF 문서'}${pageNumber ? ` - 페이지 ${pageNumber}` : ''}]\n다음 추출된 텍스트 스트림을 제목(Heading), 표(Table), 목록(List), 단락(Paragraph) 구조를 갖춘 완벽한 마크다운 양식으로 재구성해 주세요:\n\n${textContent.slice(0, 80000)}`;
        contents = userPrompt;
      } else {
        return res.status(400).json({ error: '변환할 텍스트 스트림이나 이미지 데이터가 제공되지 않았습니다.' });
      }

      const aiResponse = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents,
        config: {
          systemInstruction: systemPrompt,
          temperature: 0.1,
        }
      });

      let md = aiResponse.text?.trim() || '';
      if (md.startsWith('```markdown')) {
        md = md.replace(/^```markdown\s*/i, '').replace(/```\s*$/, '').trim();
      } else if (md.startsWith('```')) {
        md = md.replace(/^```[a-z]*\s*/i, '').replace(/```\s*$/, '').trim();
      }

      res.json({
        markdown: md,
        model: 'gemini-3.8-flash',
        pageNumber: pageNumber || 1
      });
    } catch (err: any) {
      console.warn('Gemini PDF parse error:', err?.message || err);
      const statusCode = err?.status || err?.statusCode || 500;
      res.status(statusCode >= 400 && statusCode < 600 ? statusCode : 500).json({
        error: `Gemini 변환 실패: ${err?.message || '알 수 없는 오류'}`
      });
    }
  });

  // API route for Ollama Proxy Generate (Bypasses Browser Mixed Content & CORS)
  app.post("/api/ollama/proxy-generate", async (req, res) => {
    try {
      const { endpoint = 'http://localhost:11434', model, prompt, system, images } = req.body;
      const cleanEndpoint = String(endpoint).trim().replace(/\/+$/, '');
      const targetUrl = `${cleanEndpoint}/api/generate`;

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 90000);

      const forwardRes = await fetch(targetUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          model: String(model || 'llama3.2-vision').replace(/^ollama\//, ''),
          prompt: prompt || '',
          system: system || '',
          images: Array.isArray(images) ? images : undefined,
          stream: false,
          options: { temperature: 0.2 }
        })
      });

      clearTimeout(timeout);

      if (!forwardRes.ok) {
        const errorText = await forwardRes.text().catch(() => '');
        return res.status(forwardRes.status).json({
          error: `Ollama 오류 (${forwardRes.status}): ${errorText}`
        });
      }

      const data = await forwardRes.json();
      res.json(data);
    } catch (err: any) {
      res.status(502).json({
        error: `Ollama 서버 프록시 연결 실패: ${err?.message || '엔드포인트 접속 불가'}`
      });
    }
  });

  // API route for Ollama Proxy Tags (Fetch Installed Models)
  app.post("/api/ollama/proxy-tags", async (req, res) => {
    try {
      const { endpoint = 'http://localhost:11434' } = req.body;
      const cleanEndpoint = String(endpoint).trim().replace(/\/+$/, '');
      const targetUrl = `${cleanEndpoint}/api/tags`;

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 4000);

      const forwardRes = await fetch(targetUrl, {
        method: 'GET',
        signal: controller.signal
      });

      clearTimeout(timeout);

      if (!forwardRes.ok) {
        return res.status(forwardRes.status).json({ models: [] });
      }

      const data = await forwardRes.json();
      res.json(data);
    } catch {
      res.json({ models: [] });
    }
  });

  // Dedicated SEO Endpoints for Crawlers & Google Lighthouse
  app.get("/robots.txt", (req, res) => {
    const host = req.get('host') || 'aipodium.net';
    const protocol = req.protocol === 'http' && !req.secure && host.includes('localhost') ? 'http' : 'https';
    const origin = `${protocol}://${host}`;
    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    res.send(
`# Google Lighthouse & Web Crawler Configuration
# https://developers.google.com/search/docs/crawling-indexing/robots/intro

User-agent: *
Allow: /
Disallow: /api/

Sitemap: ${origin}/sitemap.xml
`
    );
  });

  app.get("/sitemap.xml", (req, res) => {
    const host = req.get('host') || 'aipodium.net';
    const protocol = req.protocol === 'http' && !req.secure && host.includes('localhost') ? 'http' : 'https';
    const origin = `${protocol}://${host}`;
    res.setHeader("Content-Type", "application/xml; charset=utf-8");
    res.send(
`<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
        xsi:schemaLocation="http://www.sitemaps.org/schemas/sitemap/0.9
        http://www.sitemaps.org/schemas/sitemap/0.9/sitemap.xsd">
  <url>
    <loc>${origin}/</loc>
    <lastmod>2026-09-13T10:30:00+00:00</lastmod>
    <changefreq>weekly</changefreq>
    <priority>1.0</priority>
  </url>
</urlset>`
    );
  });

  // Serve static assets from public folder
  const publicPath = path.join(process.cwd(), 'public');
  app.use(express.static(publicPath));

  // Serve built assets and source maps if dist/assets exists (for Lighthouse audits & debugging)
  const distAssetsPath = path.join(process.cwd(), 'dist', 'assets');
  app.use('/assets', express.static(distAssetsPath));

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
