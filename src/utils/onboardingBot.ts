import type { ChatActionButton } from '../types';

export const SAMPLE_KNOWLEDGE_MARKDOWN = `# 기술 노트: AI 기반 지식 체계화 가이드

AI Podium은 파편화된 메모와 기술 명세를 하나의 일관된 마크다운 문서로 통합 관리할 수 있는 지능형 작업 환경입니다.

### 📌 단일 진실 공급원 원칙
- **일원화된 문서화**: 프로젝트 기획, 아키텍처 다이어그램, 코드 명세를 단일 문서에서 통합 관리합니다.
- **실시간 양방향 동기화**: 위지윅 에디터와 원본 마크다운 간에 지연 없이 즉각적인 변환을 지원합니다.
- **지능형 버전 비교**: AI 제안본과 현재 작업 문서를 한눈에 비교하고 필요한 부분만 선택적으로 병합합니다.

### 📋 지식 체계화 워크플로우
| 단계 | 주요 활동 | 활용 도구 |
| :--- | :--- | :--- |
| **요구사항 정의** | 기능 범위 및 페르소나 정의 | AI 비서 질의응답 |
| **초안 작성** | 마크다운 양식 기반 본문 작성 | 실시간 분할 편집기 |
| **검증 및 보완** | 문서 완성도 및 누락 검토 | 비평가 위원회 엔진 |

> 💡 **안내:** 이 샘플 문서를 현재 에디터에 적용해 보시려면 아래 **[에디터 삽입]** 버튼이나 상단 툴바의 전송 버튼을 클릭하세요.`;

export const GEMINI_API_GUIDE_MARKDOWN = `### 🔑 Gemini API 키 무료 발급 및 등록 방법

Google AI Studio를 통해 무료로 API 키를 발급받아 등록하면 모든 최신 Gemini 모델을 무료로 사용할 수 있습니다.

1. **Google AI Studio 접속**:
   [Google AI Studio (aistudio.google.com)](https://aistudio.google.com/)에 접속하여 Google 계정으로 로그인합니다.
2. **API 키 생성**:
   좌측 상단 **[Get API Key]** 메뉴를 누르고 **[Create API Key]**를 클릭하여 새 API 키를 복사합니다.
3. **AI Podium에 등록**:
   아래 **[설정 열기 - AI 엔진 탭]** 버튼을 클릭하거나 상단 톱니바퀴 [설정] 메뉴로 이동합니다.
4. **키 입력 및 저장**:
   **Gemini API Key** 입력란에 복사한 키를 붙여넣고 **[연결 확인 및 저장]**을 누르면 즉시 실시간 AI 추론이 활성화됩니다.`;

export const OLLAMA_GUIDE_MARKDOWN = `### 🖥️ Ollama 로컬 AI 연결 및 CORS 설정 가이드

인터넷 연결 없이 완전히 독립된 PC 환경에서 AI 모델을 구동할 수 있습니다.

#### 1. Ollama 설치 및 추천 모델 다운로드
터미널을 열고 원하는 모델을 다운로드합니다:
\`\`\`bash
# 경량 고속 모델 (2.4B)
ollama run exaone3.5:2.4b

# 범용 Llama 3 모델 (8B)
ollama run llama3
\`\`\`

#### 2. CORS 허용 구동 (중요)
웹 브라우저의 보안 정책(CORS)으로 인해 반드시 도메인 접근을 허용하는 환경변수를 설정하고 실행해야 합니다:

- **Windows (PowerShell):**
  \`\`\`powershell
  $env:OLLAMA_ORIGINS="*" ; ollama serve
  \`\`\`
- **macOS / Linux:**
  \`\`\`bash
  OLLAMA_ORIGINS="*" ollama serve
  \`\`\`

#### 3. AI Podium에서 로컬 모드 선택
상단 모드 선택기에서 **[Local PC (Ollama)]**를 선택하면 로컬에 설치된 모델이 자동으로 목록에 표시됩니다.`;

export const GENERAL_ONBOARDING_MARKDOWN = `안녕하세요! **AI 지식 비서**입니다.

현재 **게스트 온보딩 모드**로 동작하고 있습니다. 별도의 외부 API 키 없이도 마크다운 문서 작성, 위지윅 편집, 지식 정리 체험을 자유롭게 이용하실 수 있습니다.

### 💡 주요 기능 안내
- **중앙 에디터**: 상단 탭에서 위지윅, 마크다운 원본, 분할 뷰를 전환할 수 있습니다.
- **AI 지식 연동**: API 키를 등록하거나 로컬 Ollama를 연결하면 실시간 질문 답변, 문서 요약, 시맨틱 차이 비교 기능을 사용할 수 있습니다.

원하시는 가이드를 아래 버튼에서 선택해 보세요.`;

export interface OnboardingResponse {
  text: string;
  actionButtons?: ChatActionButton[];
}

export function getOnboardingResponse(input: string): OnboardingResponse {
  const query = (input || '').trim().toLowerCase();

  if (query === 'gemini-key' || query.includes('gemini') || query.includes('api 키') || query.includes('키 등록') || query.includes('발급')) {
    return {
      text: GEMINI_API_GUIDE_MARKDOWN,
      actionButtons: [
        {
          label: '설정 열기 - AI 엔진 탭',
          actionType: 'open-settings-ai'
        }
      ]
    };
  }

  if (query === 'ollama-guide' || query.includes('ollama') || query.includes('로컬') || query.includes('cors') || query.includes('오프라인')) {
    return {
      text: OLLAMA_GUIDE_MARKDOWN,
      actionButtons: [
        {
          label: '설정 열기 - AI 엔진 탭',
          actionType: 'open-settings-ai'
        }
      ]
    };
  }

  if (query === 'demo-knowledge' || query.includes('체험') || query.includes('샘플') || query.includes('가상') || query.includes('지식 정리')) {
    return {
      text: SAMPLE_KNOWLEDGE_MARKDOWN,
      actionButtons: [
        {
          label: '에디터 삽입',
          actionType: 'insert-editor',
          payload: SAMPLE_KNOWLEDGE_MARKDOWN
        }
      ]
    };
  }

  return {
    text: GENERAL_ONBOARDING_MARKDOWN,
    actionButtons: [
      {
        label: 'Gemini API 키 등록 방법',
        actionType: 'open-settings-ai'
      },
      {
        label: '가상 지식 정리 체험',
        actionType: 'insert-editor',
        payload: SAMPLE_KNOWLEDGE_MARKDOWN
      }
    ]
  };
}
