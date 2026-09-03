// Sample Workspace documents auto-populated for Guest Mode sessions

export const GUEST_WELCOME_DOC = `# 🚀 Welcome to AI Podium (Guest Mode)

안녕하세요! **AI Podium**에 게스트 모드로 오신 것을 환영합니다.

AI Podium은 파편화된 정보와 지식을 모아 **단일 진실 공급원(SSOT, Single Source of Truth)**으로 만들고, 다양한 산출물로 재가공하는 **차세대 지식 엔지니어링 & AI 오케스트레이션 워크스페이스**입니다.

---

## 🛡️ 게스트 모드(Guest Mode) 보안 및 동작 방식

- **100% 브라우저 로컬 격리 (Client-Side Only)**:
  - 게스트 세션의 모든 마크다운 파일, 프로젝트 폴더, 대화 기록은 사용자의 브라우저 로컬 스토리지(\`IndexedDB\` & \`localStorage\`)에만 안전하게 보관됩니다.
  - 서버나 외부 데이터베이스(Cloudflare D1)로 문서가 전송되거나 기록되지 않습니다.
- **BYOK (Bring Your Own Key) & Local AI**:
  - 사용자 본인의 API Key(Gemini, OpenAI 등)를 직접 등록하여 사용하거나, 로컬에서 실행 중인 **Ollama**(\`http://localhost:11434\`)를 무료로 연결하여 무제한 AI 코딩 및 추론을 수행할 수 있습니다.
- **서버 비용 제로 & 완전한 프라이버시**:
  - 로컬 AI 모델 이용 시 외부 인터넷 연결 없이도 오프라인에서 안전하게 AI 지식 작업을 수행할 수 있습니다.

---

## ⚡ 빠른 시작 가이드

1. **3-Pane 인터페이스 둘러보기**:
   - **좌측 패널 (AI Chat)**: AI 어시스턴트와 실시간 대화 및 브레인스토밍
   - **중앙 패널 (SSOT Markdown Editor)**: 실시간 양방향 마크다운 에디터 & 뷰어
   - **우측 패널 (Project Explorer)**: 워크스페이스 파일 및 폴더 구조 관리
2. **AI 대화 내용을 SSOT 문서로 수집하기**:
   - 좌측 채팅에서 AI 응답 하단의 **[SSOT 에디터로 보내기]** 버튼을 클릭하면 실시간으로 현재 문서에 지식이 축적됩니다.
3. **2차 통합 가공 엔진 실행**:
   - 상단 메뉴의 **[SSOT 생성] (Ctrl+K)** 또는 툴바의 **2차 가공 버튼**을 눌러 매뉴얼, 슬라이드, 스프레드시트 등으로 즉시 변환해 보세요.

---

*💡 게스트 모드에서 작업한 모든 내용은 상단 프로필을 통해 계정을 생성하거나 로그인 시 그대로 보존되어 계정에 연동됩니다.*
`;

export const GUEST_AI_GUIDE_DOC = `# 🤖 AI Podium 지식 가공 및 오케스트레이션 가이드

본 문서는 AI Podium의 **Single · Routing · Multi** 모드와 **2차 가공 파이프라인**을 활용하는 실전 가이드입니다.

---

## 1. AI 오케스트레이션 3대 모드

| 모드 | 동작 방식 | 추천 사용 시나리오 |
| :--- | :--- | :--- |
| **Single 모드** | 선택한 단일 AI 모델(Gemini, Claude, Llama3 등)과 1:1 대화 | 일반 질의응답, 빠른 마크다운 초안 작성 |
| **Routing 모드** | 질문의 난이도와 유형에 따라 최적의 모델로 자동 라우팅 | 복잡한 코딩, 논리 추론, 창의적 글쓰기 분기 |
| **Multi 모드** | 하나의 프롬프트로 여러 AI 모델의 답변을 동시에 받아 비교 | 모델 간 교차 검증, 최적의 솔루션 탐색 |

---

## 2. Local AI (Ollama) 연결 방법

AI Podium은 로컬 PC나 온프레미스 서버에서 구동되는 **Ollama** 모델을 완벽하게 지원합니다.

\`\`\`bash
# 1. Ollama 설치 후 모델 실행 (터미널)
ollama run llama3:8b

# 2. CORS 허용 설정 (필요 시)
OLLAMA_ORIGINS="*" ollama serve
\`\`\`

- **연결 설정**: 상단 메뉴의 **[설정 (Alt+,)] ➔ AI 모델 & Provider**에서 \`Local (Ollama)\`를 선택하고 엔드포인트 주소(\`http://localhost:11434\`)를 확인하세요.

---

## 3. 2차 산출물 가공 (Secondary Processing)

축적된 SSOT 문서는 다음과 같은 다양한 비즈니스 문서로 1-Click 자동 생성됩니다:

- 📑 **PRD & 기술 기획서 (Product Requirements Document)**
- 📖 **시스템 운영 매뉴얼 & API 가이드**
- 📊 **실시간 필터링 지원 AI 스프레드시트 (HTML/CSV)**
- 🎯 **반응형 인터랙티브 발표 슬라이드 (Presentation)**
- 📅 **프로젝트 마일스톤 & iCal(.ics) 캘린더 일정**

---

*Ready to build something amazing with AI Podium!*
`;

export const GUEST_SAMPLE_FILES: Record<string, string> = {
  'welcome.md': GUEST_WELCOME_DOC,
  'ai_guide.md': GUEST_AI_GUIDE_DOC,
};

export const GUEST_SAMPLE_FOLDERS: Record<string, string> = {
  'welcome.md': '시작 가이드 (Getting Started)',
  'ai_guide.md': '시작 가이드 (Getting Started)',
};
