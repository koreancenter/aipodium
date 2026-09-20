export type AuthLang = 'KR' | 'ENG';

export interface AuthStrings {
  brandName: string;
  betaTag: string;
  subtitle: string;
  heroTitle: string;
  heroDesc: string;
  card1Title: string;
  card1CompactTitle: string;
  card1Desc: string;
  card2Title: string;
  card2CompactTitle: string;
  card2Desc: string;
  card3Title: string;
  card3CompactTitle: string;
  card3Desc: string;
  copyright: string;
  privacyPolicy: string;
  termsOfUse: string;
  academicDisclaimer: string;
  offlineReady: string;
  encryptedStorage: string;
  welcomeTitle: string;
  welcomeDesc: string;
  openWorkspace: string;
  enablePinLock: string;
  academicConfidentialityTitle: string;
  academicConfidentialityDesc: string;
  configurePinTitle: string;
  newPinLabel: string;
  newPinPlaceholder: string;
  confirmPinLabel: string;
  confirmPinPlaceholder: string;
  savePinAndGenKey: string;
  cancel: string;
  unlockTitle: string;
  unlockDesc: string;
  pinLabel: string;
  pinPlaceholder: string;
  unlockWorkspace: string;
  deviceEncryptionActive: string;
  notesLockedInMemory: string;
  forgotPinPrompt: string;
  resetLockPrompt: string;
  recoveryKeyTitle: string;
  recoveryKeySubtitle: string;
  recoveryKeyNoticeHeader: string;
  recoveryKeyNoticeBody: string;
  copyRecoveryKeyTitle: string;
  recoveryKeySavedCheckbox: string;
  openWorkspaceAfterRecovery: string;
  recoveryVerificationTitle: string;
  recoveryVerificationDesc: string;
  recoveryKeyPlaceholder: string;
  verifyRecoveryKeyButton: string;
  recoveryVerifiedSuccessPrompt: string;
  newPinAfterRecoveryPlaceholder: string;
  confirmNewPinAfterRecoveryPlaceholder: string;
  saveNewPinButton: string;
  purgeModalTitle: string;
  purgeModalSubtitle: string;
  purgeModalDesc: string;
  purgeConfirmPrompt: string;
  purgeConfirmButton: string;
  pinLengthError: string;
  pinMismatchError: string;
  enterPinError: string;
  enterRecoveryKeyError: string;
  confirmRecoverySavedError: string;
  invalidRecoveryKeyError: string;
  cooldownActive: string;
  pinConfiguredSuccess: string;
  unlockedSuccess: string;
  purgeSuccess: string;
  purgeFailed: string;
  showPassword: string;
  hidePassword: string;
  termsAllAgree: string;
  termsApiKeyAgree: string;
  termsLocalStorageAgree: string;
  termsAiOutputAgree: string;
  termsViewDetails: string;
  termsHideDetails: string;
}

export const AUTH_TRANSLATIONS: Record<AuthLang, AuthStrings> = {
  KR: {
    brandName: 'AI Podium',
    betaTag: '베타',
    subtitle: '통합 지식 관리 워크스페이스',
    heroTitle: '내가 지휘하는 AI 오케스트라',
    heroDesc: '외부 유출 걱정 없는 안전한 환경에서 흩어진 자료를 하나의 명확한 기준 문서로 통합하세요.',
    card1Title: '완벽한 데이터 주권과 보안',
    card1CompactTitle: '완벽한 데이터 로컬 격리',
    card1Desc: '모든 문서와 작업 내용은 외부 클라우드가 아닌 사용자 브라우저에 로컬 격리 보관됩니다.',
    card2Title: '자유로운 AI 모델 연결',
    card2CompactTitle: '자유로운 클라우드 & 로컬 AI',
    card2Desc: '강력한 클라우드 API부터 완전 오프라인 로컬 AI(Ollama, WebLLM)까지 목적에 맞게 자유롭게 구동하세요.',
    card3Title: '원클릭 2차 가공 확장',
    card3CompactTitle: '기준 문서 오케스트레이션',
    card3Desc: '완성된 기준 문서를 바탕으로 발표 슬라이드(Vibe Slide), 보고서 등 다양한 비즈니스 산출물을 즉시 생성합니다.',
    copyright: '© 2026 aipodium.net · AI Podium',
    privacyPolicy: '개인정보 처리방침',
    termsOfUse: '이용약관',
    academicDisclaimer: '면책 고지',
    offlineReady: '오프라인 단독 작동 보장',
    encryptedStorage: '암호화 로컬 보안 저장소',
    welcomeTitle: 'AI Podium에 오신 것을 환영합니다',
    welcomeDesc: '비즈니스 문서, 지식 베이스 및 AI 분석 결과를 기기 내에 안전하게 보관하세요.',
    openWorkspace: '새 워크스페이스 시작하기',
    enablePinLock: '워크스페이스 PIN 보안 잠금 설정',
    academicConfidentialityTitle: '데이터 보안 및 로컬 저장소 보증',
    academicConfidentialityDesc: '모든 문서, 초안 및 참고 자료는 로컬 컴퓨터에 안전하게 격리됩니다. 네트워크가 없는 환경에서도 언제든 작업할 수 있습니다.',
    configurePinTitle: '워크스페이스 PIN 설정',
    newPinLabel: '워크스페이스 PIN',
    newPinPlaceholder: '최소 4자리 이상 입력',
    confirmPinLabel: 'PIN 확인',
    confirmPinPlaceholder: 'PIN 다시 입력',
    savePinAndGenKey: 'PIN 저장 및 복구 키 생성',
    cancel: '취소',
    unlockTitle: '워크스페이스 잠금 해제',
    unlockDesc: '문서, 노트 및 로컬 자료에 접근하려면 PIN을 입력하세요.',
    pinLabel: '워크스페이스 PIN',
    pinPlaceholder: '워크스페이스 PIN 입력',
    unlockWorkspace: '워크스페이스 잠금 해제',
    deviceEncryptionActive: '로컬 기기 암호화 활성화됨',
    notesLockedInMemory: '문서와 작업 내용이 기기의 로컬 브라우저 메모리에 안전하게 잠겨 있습니다.',
    forgotPinPrompt: 'PIN을 잊으셨나요? 비상 마스터 복구 키 사용',
    resetLockPrompt: '보안 잠금 초기화',
    recoveryKeyTitle: '비상 마스터 복구 키',
    recoveryKeySubtitle: '16자리 백업 키',
    recoveryKeyNoticeHeader: '워크스페이스 중요 안내',
    recoveryKeyNoticeBody: '본 워크스페이스는 중앙 서버 계정 없이 100% 로컬로 작동하므로, PIN을 잊어버린 경우 이 복구 키가 자료를 복구할 수 있는 유일한 수단입니다.',
    copyRecoveryKeyTitle: '비상 마스터 복구 키 복사',
    recoveryKeySavedCheckbox: '비상 마스터 복구 키를 복사하여 안전한 곳에 별도로 보관했습니다.',
    openWorkspaceAfterRecovery: '새 워크스페이스 시작하기',
    recoveryVerificationTitle: '비상 마스터 복구 키 확인',
    recoveryVerificationDesc: 'PIN을 재설정하려면 16자리 비상 마스터 복구 키를 입력하세요.',
    recoveryKeyPlaceholder: 'XXXX-XXXX-XXXX-XXXX',
    verifyRecoveryKeyButton: '마스터 복구 키 확인',
    recoveryVerifiedSuccessPrompt: '복구 키가 확인되었습니다. 새로운 워크스페이스 PIN을 설정하세요.',
    newPinAfterRecoveryPlaceholder: '새 워크스페이스 PIN 입력',
    confirmNewPinAfterRecoveryPlaceholder: '새 PIN 다시 입력',
    saveNewPinButton: '새 PIN 저장 및 계속하기',
    purgeModalTitle: '워크스페이스 보안 초기화',
    purgeModalSubtitle: '보안 잠금 및 세션 키 초기화',
    purgeModalDesc: '워크스페이스 PIN과 비상 마스터 복구 키를 모두 분실한 경우, 보안 잠금을 초기화하여 다시 접근할 수 있도록 설정합니다.',
    purgeConfirmPrompt: '초기화를 확인하려면 RESET을 입력하세요.',
    purgeConfirmButton: '초기화 확인',
    pinLengthError: '워크스페이스 PIN은 최소 4자 이상이어야 합니다.',
    pinMismatchError: 'PIN 확인 값이 일치하지 않습니다. 다시 입력해 주세요.',
    enterPinError: '워크스페이스 PIN을 입력해 주세요.',
    enterRecoveryKeyError: '16자리 비상 마스터 복구 키를 입력해 주세요.',
    confirmRecoverySavedError: '비상 마스터 복구 키를 안전하게 보관했는지 확인해 주세요.',
    invalidRecoveryKeyError: '유효하지 않은 비상 마스터 복구 키입니다. 16자리 문자를 다시 확인해 주세요.',
    cooldownActive: '연속 입력 실패로 인한 보안 대기 시간이 활성화되었습니다.',
    pinConfiguredSuccess: '워크스페이스 PIN 및 비상 마스터 복구 키가 성공적으로 구성되었습니다.',
    unlockedSuccess: '워크스페이스 잠금이 해제되었습니다.',
    purgeSuccess: '로컬 보안 잠금 및 세션 키가 초기화되었습니다.',
    purgeFailed: '보안 초기화에 실패했습니다.',
    showPassword: '비밀번호 표시',
    hidePassword: '비밀번호 숨기기',
    termsAllAgree: '[필수] API Key 비용 책임, 로컬 데이터 보관 및 AI 면책 조항에 모두 동의합니다.',
    termsApiKeyAgree: '[필수] 개인 AI API Key 관리 및 사용 비용은 사용자 본인 책임입니다.',
    termsLocalStorageAgree: '[필수] 로컬 브라우저 저장 특성상 캐시 삭제/세션 만료 시 데이터 유실 위험을 인지하고 동의합니다.',
    termsAiOutputAgree: '[필수] AI 모델이 생성한 결과물의 정확성 검증 책임은 사용자에게 있습니다.',
    termsViewDetails: '상세 항목',
    termsHideDetails: '접기',
  },
  ENG: {
    brandName: 'AI Podium',
    betaTag: 'Beta',
    subtitle: 'Unified Knowledge Workspace',
    heroTitle: 'Your AI Orchestra, Conducted by You',
    heroDesc: 'Consolidate scattered information into a single clear source of truth in a secure environment with zero external leakage.',
    card1Title: 'Complete Data Sovereignty & Security',
    card1CompactTitle: 'Complete Local Data Isolation',
    card1Desc: "All documents and work remain isolated inside your browser's local sandbox with zero external sync.",
    card2Title: 'Flexible AI Model Integration',
    card2CompactTitle: 'Flexible Cloud & Local AI',
    card2Desc: 'Seamlessly run powerful cloud APIs or completely offline local AI (Ollama, WebLLM) tailored to your needs.',
    card3Title: 'One-Click Derivative Expansion',
    card3CompactTitle: 'Core Document Orchestration',
    card3Desc: 'Instantly generate presentation slides (Vibe Slide), reports, and various business outputs from your core document.',
    copyright: '© 2026 aipodium.net · AI Podium',
    privacyPolicy: 'Privacy Policy',
    termsOfUse: 'Terms of Use',
    academicDisclaimer: 'Disclaimer',
    offlineReady: 'Offline Capable',
    encryptedStorage: 'Encrypted Storage',
    welcomeTitle: 'Welcome to AI Podium',
    welcomeDesc: 'Organize your business documents, notes, and AI insights locally on your device.',
    openWorkspace: 'Start New Workspace',
    enablePinLock: 'Enable Workspace PIN Lock',
    academicConfidentialityTitle: 'Data Security & Local Storage Guarantee',
    academicConfidentialityDesc: 'All documents, drafts, and uploaded materials remain safely isolated on your local computer. Work offline anytime.',
    configurePinTitle: 'Configure Workspace PIN',
    newPinLabel: 'Workspace PIN',
    newPinPlaceholder: 'Enter 4+ characters',
    confirmPinLabel: 'Confirm PIN',
    confirmPinPlaceholder: 'Re-enter PIN',
    savePinAndGenKey: 'Save PIN & Generate Access Key',
    cancel: 'Cancel',
    unlockTitle: 'Unlock Workspace',
    unlockDesc: 'Enter your PIN to access your documents, notes, and local archives.',
    pinLabel: 'Workspace PIN',
    pinPlaceholder: 'Enter workspace PIN',
    unlockWorkspace: 'Unlock Workspace',
    deviceEncryptionActive: 'Local Device Encryption Active',
    notesLockedInMemory: "Your documents are safely locked inside your device's browser memory.",
    forgotPinPrompt: 'Forgot PIN? Use Emergency Master Access Key',
    resetLockPrompt: 'Reset Security Lock',
    recoveryKeyTitle: 'Emergency Master Access Key',
    recoveryKeySubtitle: '16-character backup key',
    recoveryKeyNoticeHeader: 'Important Notice for Users',
    recoveryKeyNoticeBody: 'Because your workspace operates 100% locally with no central server accounts, this Key is the ONLY way to restore your workspace if you ever forget your PIN.',
    copyRecoveryKeyTitle: 'Copy Emergency Master Access Key',
    recoveryKeySavedCheckbox: 'I have copied and safely stored this Emergency Master Access Key in a secure location.',
    openWorkspaceAfterRecovery: 'Start New Workspace',
    recoveryVerificationTitle: 'Emergency Master Access Verification',
    recoveryVerificationDesc: 'Enter your 16-character Emergency Master Access Key to reset your PIN.',
    recoveryKeyPlaceholder: 'XXXX-XXXX-XXXX-XXXX',
    verifyRecoveryKeyButton: 'Verify Master Access Key',
    recoveryVerifiedSuccessPrompt: 'Access Key verified. Please set your new workspace PIN:',
    newPinAfterRecoveryPlaceholder: 'New Workspace PIN',
    confirmNewPinAfterRecoveryPlaceholder: 'Confirm new PIN',
    saveNewPinButton: 'Save New PIN & Continue',
    purgeModalTitle: 'Reset Workspace Security',
    purgeModalSubtitle: 'Clear security lock and session keys',
    purgeModalDesc: 'If you have misplaced both your workspace PIN and Emergency Master Access Key, resetting will clear the security lock so you can regain access.',
    purgeConfirmPrompt: 'Type RESET to confirm:',
    purgeConfirmButton: 'Confirm Reset',
    pinLengthError: 'Workspace PIN must contain at least 4 characters.',
    pinMismatchError: 'PIN confirmation does not match. Please re-enter.',
    enterPinError: 'Please enter your workspace PIN.',
    enterRecoveryKeyError: 'Please enter your 16-character Emergency Master Access Key.',
    confirmRecoverySavedError: 'Please confirm that you have stored your Emergency Master Access Key.',
    invalidRecoveryKeyError: 'Invalid Emergency Master Access Key. Please check the 16 characters.',
    cooldownActive: 'Security cooldown active due to repeated failures.',
    pinConfiguredSuccess: 'Workspace PIN and Emergency Master Access Key configured successfully.',
    unlockedSuccess: 'Workspace unlocked successfully.',
    purgeSuccess: 'Local security lock and session keys have been reset.',
    purgeFailed: 'Failed to complete reset.',
    showPassword: 'Show password',
    hidePassword: 'Hide password',
    termsAllAgree: '[Required] I agree to API billing responsibility, local data storage, and AI disclaimer.',
    termsApiKeyAgree: "[Required] Individual AI API key management and usage costs are the user's responsibility.",
    termsLocalStorageAgree: '[Required] I acknowledge and accept the risk of data loss on browser cache clearing or session expiry.',
    termsAiOutputAgree: '[Required] The user is responsible for verifying the accuracy of AI-generated content.',
    termsViewDetails: 'Details',
    termsHideDetails: 'Collapse',
  }
};
