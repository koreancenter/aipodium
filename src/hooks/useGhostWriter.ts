import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { GhostWriterLevel } from '../types';

export function useGhostWriter(
  initialLevel: GhostWriterLevel = 'off',
  showToast: (msg: string, type?: 'success' | 'warn' | 'info' | 'error') => void,
  onSendMessage?: (prompt: string, meta?: any) => void
) {
  const [ghostWriterLevel, setGhostWriterLevel] = useState<GhostWriterLevel>(initialLevel);
  const [ghostWriterModel, setGhostWriterModel] = useState<string>(() => {
    try {
      return localStorage.getItem('aipodium_ghost_writer_model') || 'gemini-3.7-flash';
    } catch {
      return 'gemini-3.7-flash';
    }
  });

  const [ghostTargetEnglish, setGhostTargetEnglish] = useState<string>('');
  const [ghostTemplateText, setGhostTemplateText] = useState<string>('');
  const [ghostUserInput, setGhostUserInput] = useState<string>('');
  const [ghostTypoCount, setGhostTypoCount] = useState<number>(0);
  const [ghostShowFullAnswer, setGhostShowFullAnswer] = useState<boolean>(false);
  const [isGhostLoading, setIsGhostLoading] = useState<boolean>(false);
  const [isGhostModelDropdownOpen, setIsGhostModelDropdownOpen] = useState<boolean>(false);
  const [isChatGhostModelOpen, setIsChatGhostModelOpen] = useState<boolean>(false);
  const [ghostModelHighlightIndex, setGhostModelHighlightIndex] = useState<number>(0);

  const ghostInputRef = useRef<HTMLTextAreaElement>(null);
  const ghostModelOptionRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const ghostWriterModelOptions = useMemo(() => [
    { id: 'gemini-3.7-flash', name: 'Gemini 3.7 Flash', tier: '⚡ Ultra Fast • 1x Credits', desc: 'Credit-saving fast translation & drafting' },
    { id: 'gemini-3.1-pro-preview', name: 'Gemini 3.1 Pro', tier: '💎 Premium Depth • 3x Credits', desc: 'Maximum context depth' },
    { id: 'deepseek-r1', name: 'DeepSeek R1', tier: '🧠 High Reasoning • 2x Credits', desc: 'Deep technical reasoning & logic' },
    { id: 'qwen-2.5-coder', name: 'Qwen 2.5 Coder 32B', tier: '💻 Code Specialist • 1.5x Credits', desc: 'Optimal for code refactoring' },
    { id: 'llama-3.3-70b', name: 'Llama 3.3 70B (Local)', tier: '🏠 Free (0 Credits)', desc: 'Local Ollama execution' },
  ], []);

  useEffect(() => {
    try {
      localStorage.setItem('aipodium_ghost_writer_model', ghostWriterModel);
    } catch {}
  }, [ghostWriterModel]);

  const translateToEnglishPrompt = useCallback((koreanText: string): string => {
    const trimmed = koreanText.trim();
    if (!trimmed) return '';

    const isMainlyEnglish = /^[\x00-\x7F\s\d.,!?'"-]+$/.test(trimmed) && /[a-zA-Z]{3,}/.test(trimmed);
    if (isMainlyEnglish) {
      return trimmed;
    }

    if (/^정말\s*영어로\s*번역이\s*되나\??$/i.test(trimmed) || /^정말\s*영어로\s*번역이\s*되나요\??$/i.test(trimmed)) {
      return 'Does it really translate into English?';
    }
    if (/^영어로\s*번역해줘\??$/i.test(trimmed) || /^영작해줘\??$/i.test(trimmed)) {
      return 'Please translate this into natural, professional English.';
    }
    if (/^안녕(하세요)?\??$/i.test(trimmed) || /^반가워(요)?\??$/i.test(trimmed)) {
      return 'Hello, how can I assist you with your project today?';
    }

    if (
      (trimmed.includes('REST') && trimmed.includes('GraphQL') && (trimmed.includes('캐싱') || trimmed.includes('caching'))) ||
      trimmed.includes('REST API와 GraphQL의 캐싱 전략 차이점을 비교해줘') ||
      trimmed.includes('REST API와 GraphQL의 캐싱 전략')
    ) {
      return 'Compare the differences in caching strategies between REST API and GraphQL.';
    }

    if (trimmed.includes('REST') && trimmed.includes('GraphQL')) {
      return 'Compare the architectural trade-offs, performance characteristics, and schema design between REST API and GraphQL.';
    }

    if (trimmed.includes('Redis') || (trimmed.includes('캐시') && trimmed.includes('전략'))) {
      return 'Explain distributed caching strategies, TTL policies, and cache invalidation patterns using Redis.';
    }

    if (trimmed.includes('도커') || trimmed.includes('Docker') || trimmed.includes('컨테이너')) {
      return 'Provide a step-by-step technical guide for building a containerized deployment pipeline with Docker.';
    }

    if (trimmed.includes('쿠버네티스') || trimmed.includes('Kubernetes') || trimmed.includes('K8s')) {
      return 'Explain Kubernetes cluster architecture, Pod lifecycle management, and Service ingress routing.';
    }

    if (trimmed.includes('React') || trimmed.includes('리액트')) {
      if (trimmed.includes('상태') || trimmed.includes('Zustand') || trimmed.includes('Redux')) {
        return 'Compare modern React state management solutions including Zustand, TanStack Query, and Redux Toolkit.';
      }
      if (trimmed.includes('성능') || trimmed.includes('최적화')) {
        return 'Explain React 19 performance optimization techniques and concurrent rendering features.';
      }
      return 'Explain React 19 Server Components, concurrent rendering features, and performance optimization techniques.';
    }

    if (trimmed.includes('OAuth') || trimmed.includes('JWT') || trimmed.includes('인증') || trimmed.includes('로그인')) {
      return 'Explain secure authentication and authorization flows using OAuth 2.0, OpenID Connect, and JWT tokens.';
    }

    if (trimmed.includes('마이크로서비스') || trimmed.includes('MSA')) {
      return 'Explain microservices architecture design principles, API Gateway patterns, and distributed tracing.';
    }

    const krToEnMap: Record<string, string> = {
      '데이터베이스': 'database systems',
      '아키텍처': 'system architecture',
      '네트워크': 'network protocols',
      '서버': 'server-side engineering',
      '클라이언트': 'client frontend',
      '비동기': 'asynchronous concurrency',
      '동시성': 'concurrency handling',
      '테스트': 'automated testing',
      '배포': 'CI/CD deployment pipelines',
      '트래픽': 'high-throughput traffic management',
      '설계': 'software design patterns',
      '메모리': 'memory optimization',
      '보안': 'security hardening',
      '인증': 'authentication flows',
      '인가': 'authorization controls',
      '파이프라인': 'data pipelines',
      '웹소켓': 'real-time WebSocket communication',
      '에러': 'error debugging and resolution',
      '버그': 'bug fixing',
      '스토리지': 'persistent storage',
      '스프링': 'Spring Boot backend',
      '노드': 'Node.js runtime',
      '파이썬': 'Python data processing',
      '자바스크립트': 'JavaScript development',
      '타입스크립트': 'TypeScript type safety',
      '클라우드': 'cloud infrastructure'
    };

    let prefix = 'Explain in detail the concepts, architecture, and practical implementation regarding';
    if (/비교|차이|versus|vs/i.test(trimmed)) {
      prefix = 'Compare the key differences, architectural trade-offs, and best practices between';
    } else if (/구현|작성|만들|개발|코딩/i.test(trimmed)) {
      prefix = 'Write a comprehensive technical guide and clean code implementation for';
    } else if (/분석|원인|디버깅|해결|고치/i.test(trimmed)) {
      prefix = 'Analyze the underlying root causes, mechanisms, and scalable solutions for';
    } else if (/장단점|평가|선택|추천/i.test(trimmed)) {
      prefix = 'Evaluate the pros, cons, and architectural selection criteria for';
    } else if (/구축|설정|세팅|배치/i.test(trimmed)) {
      prefix = 'Provide a step-by-step setup and configuration guide for';
    } else if (/방법|어떻게|가이드/i.test(trimmed)) {
      prefix = 'Provide a practical, step-by-step guide and best practices for';
    } else if (/\?|인가요|되나|할까|있나/i.test(trimmed)) {
      prefix = 'Explain and clarify the technical details regarding';
    }

    const enWords = trimmed.match(/[A-Za-z0-9_+#.-]+/g) || [];
    const extractedTerms = [...enWords];
    Object.keys(krToEnMap).forEach((k) => {
      if (trimmed.includes(k) && !extractedTerms.includes(krToEnMap[k])) {
        extractedTerms.push(krToEnMap[k]);
      }
    });

    if (extractedTerms.length > 0) {
      return `${prefix} ${extractedTerms.join(' and ')} in modern software development.`;
    }

    if (trimmed.endsWith('?') || trimmed.endsWith('.')) {
      return `Please explain and provide comprehensive insights regarding ${trimmed.replace(/[?.!]/g, '')}.`;
    }

    return `${prefix} ${trimmed}.`;
  }, []);

  const generateGhostTemplate = useCallback((englishText: string, level: GhostWriterLevel): string => {
    if (!englishText) return '';
    if (level === '100') {
      return englishText;
    }

    const words = englishText.split(' ');

    if (level === '70') {
      return words.map((w, idx) => {
        const clean = w.replace(/[^a-zA-Z0-9]/g, '');
        const punct = w.replace(/[a-zA-Z0-9]/g, '');
        if (clean.length >= 5 && (idx % 3 === 0 || idx % 4 === 0)) {
          return `(            )${punct}`;
        }
        return w;
      }).join(' ');
    }

    if (level === '50') {
      const structureWords = new Set([
        'compare', 'the', 'differences', 'in', 'between', 'and', 'for', 'to', 'of', 'how', 'explain',
        'provide', 'a', 'an', 'with', 'using', 'regarding', 'on', 'is', 'are', 'by', 'from', 'into',
        'write', 'evaluate', 'analyze', 'step-by-step', 'modern', 'guide', 'does', 'it', 'can', 'this',
        'really', 'please', 'help', 'me', 'in'
      ]);

      return words.map((w) => {
        const clean = w.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
        const punct = w.replace(/[a-zA-Z0-9]/g, '');
        if (clean === 'graphql') return w;
        if (!structureWords.has(clean) && clean.length > 2) {
          return `(            )${punct}`;
        }
        return w;
      }).join(' ');
    }

    if (level === '30') {
      const bareWords = new Set(['compare', 'explain', 'write', 'the', 'in', 'and', 'to', 'between', 'does', 'can', 'please']);
      return words.map((w) => {
        const clean = w.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
        const punct = w.replace(/[a-zA-Z0-9]/g, '');
        if (!bareWords.has(clean)) {
          return `(        )${punct}`;
        }
        return w;
      }).join(' ');
    }

    return englishText;
  }, []);

  const handleGenerateGhostText = useCallback(async (inputText: string) => {
    const raw = inputText.trim();
    if (!raw) {
      showToast('⚠️ 한국어 질문 또는 개념을 먼저 입력해주세요.');
      return;
    }

    setIsGhostLoading(true);
    setGhostTargetEnglish('');
    setGhostTemplateText('');
    setGhostUserInput('');
    setGhostTypoCount(0);
    setGhostShowFullAnswer(false);
    
    let targetEn = translateToEnglishPrompt(raw);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: `Translate the following Korean query into a professional, concise, and highly effective English prompt for an AI assistant. Output ONLY the translated English prompt text, with no introductory words, quotes, or markdown wrappers.\n\nQuery: ${raw}`,
          editorContent: '',
          model: ghostWriterModel,
          systemInstruction: 'You are an expert technical translator and prompt engineer. Your sole task is to translate Korean queries into professional English prompts. Provide ONLY the translated English text. Do not provide explanations, markdown code blocks, or conversational filler.'
        })
      });
      const data = await res.json();
      if (res.ok && data.text) {
        targetEn = data.text.trim().replace(/^["'](.*)["']$/s, '$1');
      }
    } catch {
      showToast('⚠️ API 번역에 실패하여 기본 템플릿으로 생성되었습니다.');
    }

    setGhostTargetEnglish(targetEn);

    const template = generateGhostTemplate(targetEn, ghostWriterLevel);
    setGhostTemplateText(template);
    setIsGhostLoading(false);

    setTimeout(() => {
      ghostInputRef.current?.focus();
    }, 50);

    showToast('👻 영작 고스트 텍스트가 생성되었습니다. 오른쪽 창에서 영작을 연습하세요!');
  }, [ghostWriterModel, ghostWriterLevel, translateToEnglishPrompt, generateGhostTemplate, showToast]);

  useEffect(() => {
    if (ghostWriterLevel !== 'off' && ghostTargetEnglish) {
      const template = generateGhostTemplate(ghostTargetEnglish, ghostWriterLevel);
      setGhostTemplateText(template);
    }
  }, [ghostWriterLevel, ghostTargetEnglish, generateGhostTemplate]);

  const handleGhostUserInputChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setGhostUserInput(val);

    if (!ghostTargetEnglish) return;

    let typos = 0;
    for (let i = 0; i < val.length; i++) {
      if (i < ghostTargetEnglish.length) {
        if (val[i].toLowerCase() !== ghostTargetEnglish[i].toLowerCase()) {
          typos++;
        }
      } else {
        typos++;
      }
    }

    setGhostTypoCount(typos);

    if (typos >= 3 && !ghostShowFullAnswer) {
      setGhostShowFullAnswer(true);
      showToast('⚠️ 3회 오타가 감지되어 정답 가이드가 고스트 텍스트로 자동 표시됩니다.');
    }
  }, [ghostTargetEnglish, ghostShowFullAnswer, showToast]);

  const handleSendGhostMessage = useCallback((chatInputFallback = '') => {
    const promptToSend = ghostUserInput.trim() || ghostTargetEnglish;
    if (!promptToSend && !chatInputFallback.trim()) return;

    if (onSendMessage) {
      onSendMessage(promptToSend || chatInputFallback, {
        originalText: chatInputFallback.trim(),
        translatedText: promptToSend,
        ghostWriterLevel: ghostWriterLevel
      });
    }

    setGhostUserInput('');
    setGhostTypoCount(0);
    setGhostShowFullAnswer(false);
  }, [ghostUserInput, ghostTargetEnglish, ghostWriterLevel, onSendMessage]);

  const handleGhostInputKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>, chatInputFallback = '') => {
    if (e.key === 'Tab') {
      e.preventDefault();
      if (ghostTargetEnglish) {
        setGhostUserInput(ghostTargetEnglish);
        setGhostTypoCount(0);
        showToast('✨ 영작 가이드 문장이 자동 완성되었습니다.');
      }
      return;
    }

    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      handleSendGhostMessage(chatInputFallback);
    }
  }, [ghostTargetEnglish, handleSendGhostMessage, showToast]);

  return {
    ghostWriterLevel,
    setGhostWriterLevel,
    ghostWriterModel,
    setGhostWriterModel,
    ghostWriterModelOptions,
    ghostTargetEnglish,
    ghostTemplateText,
    ghostUserInput,
    ghostTypoCount,
    ghostShowFullAnswer,
    isGhostLoading,
    isGhostModelDropdownOpen,
    setIsGhostModelDropdownOpen,
    isChatGhostModelOpen,
    setIsChatGhostModelOpen,
    ghostModelHighlightIndex,
    setGhostModelHighlightIndex,
    ghostInputRef,
    ghostModelOptionRefs,
    handleGenerateGhostText,
    handleGhostUserInputChange,
    handleGhostInputKeyDown,
    handleSendGhostMessage
  };
}
