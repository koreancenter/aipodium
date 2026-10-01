# AIPodium 리팩토링 및 고도화 실행 로드맵 (roadmap.md)

본 문서는 `App.tsx`의 모놀리식 구조를 해체하고, AI 엔진 및 에디터 계층을 타 앱에서 즉시 재사용 가능한 독립 모듈로 격리하며, 핵심 기능 오류 수정 및 번역 기능을 체계적으로 안착시키기 위한 단계별 실행 계획서입니다.

---

## 📌 실행 원칙
1. **Defect Fix First**: 신규 기능 추가 전 기존 차단 버그(SSOT 생성 실패 등)를 우선 해소하여 테스트 베이스라인을 확보합니다.
2. **Decoupling Before Expansion**: 거대 컴포넌트에 살을 붙이지 않고, 통신/에디터 계층을 먼저 캡슐화한 뒤 신규 인터페이스를 주입합니다.
3. **DESIGN.md v2.1 Compliance**: 모든 UI 수정 시 이중 테두리(Box-in-Box)를 배제하고 바닥 밀착형(Bottom-Flush) 플랫 구조를 유지합니다.

---

## 🗺️ 단계별 추진 계획

### [Phase 1] 긴급 버그 수정 및 안정화 (Stabilization)
*목표: 작업 흐름을 차단하는 기준문서(SSOT) 생성 오류와 엔진 연동 오류 해결*

- [ ] **1.1. SSOT 생성기 빈 세션 대응 (`src/components/SSOTGeneratorModal.tsx`)**
  - 탐색기에 저장된 `.md` 파일이 없는 초기 상태(`availableFiles.length === 0`)에서도 에디터 현재 본문(`editorContent`) 및 대화 내역을 참조하여 생성 허용
  - `activeSessionId` 불일치 시 `sessions[0]`로 안전하게 폴백되도록 세션 식별 가드레일 보강
- [ ] **1.2. SSOT 생성 엔진 분기 연동**
  - 하드코딩된 외부 엔드포인트 호출을 제거하고, 활성화된 엔진(`provider`: Cloud, Ollama, WebLLM) 컨텍스트를 주입받아 동작하도록 수정
- [ ] **1.3. 온보딩 모달 및 엔진 가동 버그 최종 검증**
  - `aipodium_engine_dont_show !== 'true'` 기준 단일화 유지
  - Ollama 엔드포인트 Ping 테스트 및 WebLLM 가중치 로딩 누락 방지

---

### [Phase 2] 코어 엔진 계층 분리 및 모듈화 (Engine & Editor Modularization)
*목표: UI 종속성이 0%인 순수 TypeScript AI SDK 구축 및 에디터 통합*

- [ ] **2.1. 독립 AI 엔진 코어 분리 (`src/services/ai/`)**
  - `AiProviderAdapter` 공통 인터페이스 정의 (`stream`, `getModels`, `isAvailable`)
  - 프로바이더별 어댑터 클래스 격리:
    - `CloudAdapter.ts` (Gemini, OpenAI, Claude SSE 스트리밍 및 키 복호화)
    - `OllamaAdapter.ts` (로컬 11434 태그 탐색 및 통신)
    - `WebLlmAdapter.ts` (WebGPU 가중치 캐싱 및 웹워커 스트리밍)
  - 단일 진입점 클라이언트(`AiClient.ts`) 구현 및 `App.tsx` 내 통신 로직 대체
- [ ] **2.2. 통합 에디터 컴포넌트화 (`<UnifiedEditor />`)**
  - `src/components/editor/UnifiedEditor.tsx`로 Tiptap 서식 모드와 마크다운 소스 편집기 단일화
  - 표 빌더(`TableGridPicker`), 플로팅 버블 메뉴(`Text/TableFloatingBubbleMenu`), 필기 오버레이(`FreeformDrawingOverlay`)를 에디터 내부로 캡슐화
  - 외부 인터페이스를 Controlled Component 규격(`value`, `onChange`, `mode`, `onSave`)으로 표준화

---

### [Phase 3] App.tsx 뷰 계층 구조화 (Layout Deconstruction)
*목표: App.tsx를 순수 레이아웃 및 최상위 이벤트 오케스트레이터로 경량화*

- [ ] **3.1. 좌측 대화 패널 분리 (`src/components/chat/ChatPanel.tsx`)**
  - 메시지 리스트 뷰 및 스크롤 제어 로직 캡슐화
  - 하단 프롬프트 바(`UniversalPromptInput`)의 바닥 밀착형(Bottom-Flush) 플랫 스타일 안착
  - 고스트 라이터 모드 시 한/영 양방향 높이 동기화(`Math.max`) 로직 내장
- [ ] **3.2. 우측 워크스페이스 탐색기 분리 (`src/components/explorer/WorkspaceDrawer.tsx`)**
  - 드로워 접힘/열림 상태의 `localStorage` 영구 보존 로직 통합
  - 트리 탐색 및 파일 생성/삭제 이벤트 격리

---

### [Phase 4] 신규 지능형 기능 탑재 (Feature Enhancement)
*목표: 다국어 번역 편의성 제공 및 타 앱 이식용 프로필 체계 완성*

- [ ] **4.1. AI 메시지 인라인 원클릭 번역 기능 구현**
  - `src/components/AiMessageBubble.tsx` 툴바에 번역 액션 버튼(`Languages` 아이콘) 추가
  - 분리된 `AiClient`의 경량 번역 호출 연동 및 메시지별 번역 상태(`translatedText`, 토글 뷰) 렌더링
- [ ] **4.2. 도메인 프로필(Domain Profile) 체계 구축**
  - `AiDomainProfile` 인터페이스 정의 (페르소나 지침, `temperature`, 권장 모델, `responseFormat`)
  - 문서 요약, 일정 관리 등 앱 유형별 프리셋 템플릿 작성
- [ ] **4.3. 저장소 분리 준비 (Git Package Submodule / Private Repo)**
  - `src/services/ai/`를 독립 레포지토리(`@koreancenter/ai-engine-core`)로 배포 가능한 구조로 정리

---

## 📈 작업 체크리스트 진행 현황
| 단계 | 세부 작업 | 상태 | 담당 모듈 |
| :--- | :--- | :---: | :--- |
| **Phase 1** | SSOT 생성 빈 세션 오류 디버깅 | 대기 | `SSOTGeneratorModal.tsx` |
| **Phase 1** | SSOT 엔진 컨텍스트 연동 | 대기 | `SSOTGeneratorModal.tsx`, `App.tsx` |
| **Phase 2** | AI 통신 어댑터 코어 분리 | 대기 | `src/services/ai/` |
| **Phase 2** | 에디터 통합 모듈화 (`UnifiedEditor`) | 대기 | `src/components/editor/` |
| **Phase 3** | App.tsx 패널 분리 (Chat / Explorer) | 대기 | `App.tsx` |
| **Phase 4** | 인라인 AI 메시지 번역 기능 | 대기 | `AiMessageBubble.tsx`, `AiClient` |
| **Phase 4** | 도메인 프로필 주입 체계 정의 | 대기 | `src/services/ai/profiles/` |