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

- [x] **1.1. SSOT 생성기 빈 세션 대응 (`src/components/SSOTGeneratorModal.tsx`)**
  - 탐색기에 저장된 `.md` 파일이 없는 초기 상태(`availableFiles.length === 0`)에서도 에디터 현재 본문(`editorContent`) 및 대화 내역을 참조하여 생성 허용
  - `activeSessionId` 불일치 시 `sessions[0]`로 안전하게 폴백되도록 세션 식별 가드레일 보강
- [x] **1.2. SSOT 생성 엔진 분기 연동**
  - 하드코딩된 외부 엔드포인트 호출을 제거하고, 활성화된 엔진(`provider`: Cloud, Ollama, WebLLM) 컨텍스트를 주입받아 동작하도록 수정
- [x] **1.3. 온보딩 모달 및 엔진 가동 버그 최종 검증**
  - `aipodium_engine_dont_show !== 'true'` 기준 단일화 유지
  - Ollama 엔드포인트 Ping 테스트 및 WebLLM 가중치 로딩 누락 방지

---

### [Phase 2] 코어 엔진 계층 분리 및 모듈화 (Engine & Editor Modularization)
*목표: UI 종속성이 0%인 순수 TypeScript AI SDK 구축 및 에디터 통합*

- [x] **2.1. 독립 AI 엔진 코어 분리 (`src/services/ai/`)**
  - `AiProviderAdapter` 공통 인터페이스 정의 (`stream`, `getModels`, `isAvailable`)
  - 프로바이더별 어댑터 클래스 격리:
    - `CloudAdapter.ts` (Gemini, OpenAI, Claude SSE 스트리밍 및 키 복호화)
    - `OllamaAdapter.ts` (로컬 11434 태그 탐색 및 통신)
    - `WebLlmAdapter.ts` (WebGPU 가중치 캐싱 및 웹워커 스트리밍)
  - 단일 진입점 클라이언트(`AiClient.ts`) 구현 및 `App.tsx` 내 통신 로직 대체
- [x] **2.2. 통합 에디터 컴포넌트화 (`<UnifiedEditor />`)**
  - `src/components/editor/UnifiedEditor.tsx`로 Tiptap 서식 모드와 마크다운 소스 편집기 단일화
  - 표 빌더(`TableGridPicker`), 플로팅 버블 메뉴(`Text/TableFloatingBubbleMenu`), 필기 오버레이(`FreeformDrawingOverlay`)를 에디터 내부로 캡슐화
  - 외부 인터페이스를 Controlled Component 규격(`value`, `onChange`, `mode`, `onSave`)으로 표준화

---

### [Phase 3] App.tsx 뷰 계층 구조화 (Layout Deconstruction)
*목표: App.tsx를 순수 레이아웃 및 최상위 이벤트 오케스트레이터로 경량화*

- [x] **3.1. 좌측 대화 패널 분리 (`src/components/chat/ChatPanel.tsx`)**
  - 메시지 리스트 뷰 및 스크롤 제어 로직 캡슐화
  - 하단 프롬프트 바(`UniversalPromptInput`)의 바닥 밀착형(Bottom-Flush) 플랫 스타일 안착
  - 고스트 라이터 모드 시 한/영 양방향 높이 동기화(`Math.max`) 로직 내장
- [x] **3.2. 우측 워크스페이스 탐색기 분리 (`src/components/explorer/WorkspaceDrawer.tsx`)**
  - 드로워 접힘/열림 상태의 `localStorage` 영구 보존 로직 통합
  - 트리 탐색 및 파일 생성/삭제 이벤트 격리

---

### [Phase 4] 신규 지능형 기능 탑재 (Feature Enhancement)
*목표: 다국어 번역 편의성 제공 및 타 앱 이식용 프로필 체계 완성*

- [x] **4.1. AI 메시지 인라인 원클릭 번역 기능 구현**
  - `src/components/AiMessageBubble.tsx` 툴바에 번역 액션 버튼(`Languages` 아이콘) 추가
  - 분리된 `AiClient`의 경량 번역 호출 연동 및 메시지별 번역 상태(`translatedText`, 토글 뷰) 렌더링
- [x] **4.2. 도메인 프로필(Domain Profile) 체계 구축**
  - `AiDomainProfile` 인터페이스 정의 (페르소나 지침, `temperature`, 권장 모델, `responseFormat`)
  - 문서 요약, 일정 관리 프리셋을 정의하고 AI 요청 및 프로바이더별 출력 형식 처리에 연결
- [x] **4.3. 저장소 분리 준비 (Git Package Submodule / Private Repo)**
  - 앱 인증·키 보안 및 WebLLM 런타임 의존성을 어댑터 주입 경계로 분리
  - `src/services/ai/` 독립 빌드·배포 메타데이터 및 공개 API 구성

---

## 📈 작업 체크리스트 진행 현황
| 단계 | 세부 작업 | 상태 | 담당 모듈 |
| :--- | :--- | :---: | :--- |
| **Phase 1** | SSOT 생성 빈 세션 오류 디버깅 | 완료 | `SSOTGeneratorModal.tsx` |
| **Phase 1** | SSOT 엔진 컨텍스트 연동 | 완료 | `SSOTGeneratorModal.tsx`, `App.tsx` |
| **Phase 1** | 온보딩 모달 및 엔진 가동 검증 | 완료 | `AiEngineOnboardingModal.tsx`, `aiEngineCore.ts` |
| **Phase 2** | AI 통신 어댑터 코어 분리 | 완료 | `src/services/ai/` |
| **Phase 2** | 에디터 통합 모듈화 (`UnifiedEditor`) | 완료 | `src/components/editor/` |
| **Phase 3** | 대화 패널 분리 (`ChatPanel`) | 완료 | `src/components/chat/` |
| **Phase 3** | 워크스페이스 탐색기 분리 (`WorkspaceDrawer`) | 완료 | `src/components/explorer/` |
| **Phase 4** | 인라인 AI 메시지 번역 기능 | 완료 | `AiMessageBubble.tsx`, `AiClient` |
| **Phase 4** | 도메인 프로필 주입 체계 정의 | 완료 | `src/services/ai/profiles/`, `AiClient` |
| **Phase 4** | AI 엔진 저장소 분리 준비 | 완료 | `src/services/ai/`, `aiPodiumIntegration.ts` |

---

### [Phase 5] 앱 UI 다국어 기반 구축 (Internationalization)
*목표: 브라우저 언어를 기본값으로 사용하고, 사용자 선택을 보존하면서 UI 번역을 점진적으로 확대*

- [x] **5.1. 브라우저 우선 언어 감지 및 설정 저장**
  - 브라우저의 우선 언어 목록에서 한국어·영어 중 먼저 지원되는 언어를 선택하고, 미지원 언어는 한국어로 대체
  - 로그인 화면의 기존 언어 선택을 새 설정으로 이전하고, 사용자가 고정한 언어 또는 자동 모드를 저장
  - 브라우저 언어 변경 및 다른 탭에서의 설정 변경을 반영
- [x] **5.2. 로그인 화면 및 언어 설정 연결**
  - 로그인 전환 버튼과 환경 설정에서 브라우저 기본값·한국어·영어 선택을 공통 상태에 연결
  - 문서 루트의 `lang` 속성을 현재 언어와 동기화
- [x] **5.3. 핵심 메뉴 및 탐색기 번역 리소스 도입**
  - `src/locales/coreLocale.ts`에 상단 메뉴, 워크스페이스 탐색기, 채팅 및 입력창 문자열을 중앙 관리
  - 해당 라벨과 빈 상태, 로컬 AI 다운로드 상태를 한국어·영어로 전환
- [ ] **5.4. 나머지 화면·모달 번역 이전**
  - 채팅, 에디터, 설정의 각 섹션, 대화상자, 오류와 알림 문구를 기능별 번역 리소스로 이전
  - 사용자 문서·프롬프트·AI 지침은 UI 언어 변경만으로 자동 수정하지 않도록 유지
  - 진행: 환경 설정 모달, 에디터(툴바·슬래시 메뉴·서식 풍선 메뉴·WYSIWYG 표 편집), `App.tsx` 알림·확인창 이전 완료
  - 저장 데이터 키(기본 폴더명, `새 문서.md` 등)와 AI 프롬프트·샘플 문서는 UI 언어와 무관하게 유지
  - 남은 항목: PDF 뷰어, 구글 드라이브 탐색, 보안 설정, 문서 변환, GitHub·워크스페이스 연결, 프롬프트 라이브러리 등 나머지 모달
- [ ] **5.5. 전체 화면 번역 및 레이아웃 회귀 검증**
  - 번역 키 완전성, 로그인·재실행 후 설정 유지, 긴 문구와 모바일 레이아웃을 점검
