export type AuthLang = 'KR' | 'ENG';

export interface AuthStrings {
  brandName: string;
  betaTag: string;
  subtitle: string;
  heroTitle: string;
  heroDesc: string;
  card1Title: string;
  card1Desc: string;
  card2Title: string;
  card2Desc: string;
  card3Title: string;
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
}

export const AUTH_TRANSLATIONS: Record<AuthLang, AuthStrings> = {
  KR: {
    brandName: 'AI Podium',
    betaTag: '베타',
    subtitle: '연구 지식 단일 진실 공급원 워크스페이스',
    heroTitle: '연구자를 위한 비공개 지식 워크스페이스',
    heroDesc: 'AI Podium은 외부 서버 동기화 없이 완벽한 연구 프라이버시가 보장되는 환경에서 파편화된 학술 지식을 정제하여 단일 진실 공급원 문서로 통합합니다.',
    card1Title: '완전한 로컬 격리 보관',
    card1Desc: '작성한 연구 노트와 인용문은 사용자 브라우저의 격리된 로컬 저장소에만 안전하게 보관됩니다. 외부 클라우드 데이터베이스나 추적 서버가 전혀 없습니다.',
    card2Title: '원활한 학술 노트 및 문헌 종합 분석',
    card2Desc: '복잡한 연구 논문과 강의 노트를 직관적인 마크다운 요약본, 구조화된 개요 및 정밀한 참고 자료 표로 신속하게 정리할 수 있습니다.',
    card3Title: '비상 마스터 복구 키 지원',
    card3Desc: '독립적인 16자리 백업 키를 통해 원격 계정이나 외부 지원 없이도 연구 자료에 대한 접근 권한을 언제든 안전하게 직접 복원할 수 있습니다.',
    copyright: '© 2026 aipodium.net · AI Podium',
    privacyPolicy: '개인정보 처리방침',
    termsOfUse: '이용약관',
    academicDisclaimer: '학술 면책 고지',
    offlineReady: '오프라인 단독 작동 보장',
    encryptedStorage: '암호화 로컬 보안 저장소',
    welcomeTitle: 'AI Podium에 오신 것을 환영합니다',
    welcomeDesc: '연구 논문, 학술 노트 및 AI 분석 결과를 기기 내에 안전하게 보관하세요.',
    openWorkspace: '연구 워크스페이스 시작하기',
    enablePinLock: '워크스페이스 PIN 보안 잠금 설정',
    academicConfidentialityTitle: '학술 연구 보안 및 로컬 저장소 보증',
    academicConfidentialityDesc: '모든 연구 노트, 초안 및 업로드된 문헌은 로컬 컴퓨터에 안전하게 격리됩니다. 도서관이나 강의실 등 네트워크가 없는 환경에서도 언제든 작업할 수 있습니다.',
    configurePinTitle: '워크스페이스 PIN 설정',
    newPinLabel: '워크스페이스 PIN',
    newPinPlaceholder: '최소 4자리 이상 입력',
    confirmPinLabel: 'PIN 확인',
    confirmPinPlaceholder: 'PIN 다시 입력',
    savePinAndGenKey: 'PIN 저장 및 복구 키 생성',
    cancel: '취소',
    unlockTitle: '연구 워크스페이스 잠금 해제',
    unlockDesc: '연구 논문, 노트 및 로컬 자료에 접근하려면 PIN을 입력하세요.',
    pinLabel: '워크스페이스 PIN',
    pinPlaceholder: '워크스페이스 PIN 입력',
    unlockWorkspace: '연구 워크스페이스 잠금 해제',
    deviceEncryptionActive: '로컬 기기 암호화 활성화됨',
    notesLockedInMemory: '연구 노트가 기기의 로컬 브라우저 메모리에 안전하게 잠겨 있습니다.',
    forgotPinPrompt: 'PIN을 잊으셨나요? 비상 마스터 복구 키 사용',
    resetLockPrompt: '보안 잠금 초기화',
    recoveryKeyTitle: '비상 마스터 복구 키',
    recoveryKeySubtitle: '16자리 백업 키',
    recoveryKeyNoticeHeader: '연구자를 위한 중요 안내',
    recoveryKeyNoticeBody: '본 워크스페이스는 중앙 서버 계정 없이 100% 로컬로 작동하므로, PIN을 잊어버린 경우 이 복구 키가 연구 자료를 복구할 수 있는 유일한 수단입니다.',
    copyRecoveryKeyTitle: '비상 마스터 복구 키 복사',
    recoveryKeySavedCheckbox: '비상 마스터 복구 키를 복사하여 안전한 곳에 별도로 보관했습니다.',
    openWorkspaceAfterRecovery: '연구 워크스페이스 시작하기',
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
  },
  ENG: {
    brandName: 'AI Podium',
    betaTag: 'Beta',
    subtitle: 'Refined Research Knowledge Workspace',
    heroTitle: 'Private Knowledge Workspace for Researchers',
    heroDesc: 'AI Podium refines fragmented research literature and notes into a unified Single Source of Truth in a strictly private, local-first environment without external server dependencies.',
    card1Title: 'Complete Local Isolation',
    card1Desc: "Your research notes and citations are stored exclusively inside your browser's local sandbox with zero external sync.",
    card2Title: 'Academic Literature Synthesis',
    card2Desc: 'Distill papers, journals, and lecture notes into living syntheses, structured outlines, and precise data tables.',
    card3Title: 'Emergency Master Access Key',
    card3Desc: 'Self-sovereign 16-character recovery key ensuring uninterrupted access to your research work without remote dependencies.',
    copyright: '© 2026 aipodium.net · AI Podium',
    privacyPolicy: 'Privacy Policy',
    termsOfUse: 'Terms of Use',
    academicDisclaimer: 'Academic Disclaimer',
    offlineReady: 'Offline Capable',
    encryptedStorage: 'Encrypted Storage',
    welcomeTitle: 'Welcome to AI Podium',
    welcomeDesc: 'Organize your research papers, notes, and AI insights locally on your device.',
    openWorkspace: 'Open Research Workspace',
    enablePinLock: 'Enable Workspace PIN Lock',
    academicConfidentialityTitle: 'Academic Confidentiality & Local Storage',
    academicConfidentialityDesc: 'All research notes, drafts, and uploaded literature remain safely isolated on your local computer. Work offline anytime in libraries or lecture halls.',
    configurePinTitle: 'Configure Workspace PIN',
    newPinLabel: 'Workspace PIN',
    newPinPlaceholder: 'Enter 4+ characters',
    confirmPinLabel: 'Confirm PIN',
    confirmPinPlaceholder: 'Re-enter PIN',
    savePinAndGenKey: 'Save PIN & Generate Access Key',
    cancel: 'Cancel',
    unlockTitle: 'Unlock Research Workspace',
    unlockDesc: 'Enter your PIN to access your research papers, notes, and local archives.',
    pinLabel: 'Workspace PIN',
    pinPlaceholder: 'Enter workspace PIN',
    unlockWorkspace: 'Unlock Research Workspace',
    deviceEncryptionActive: 'Local Device Encryption Active',
    notesLockedInMemory: "Your notes are safely locked inside your device's browser memory.",
    forgotPinPrompt: 'Forgot PIN? Use Emergency Master Access Key',
    resetLockPrompt: 'Reset Security Lock',
    recoveryKeyTitle: 'Emergency Master Access Key',
    recoveryKeySubtitle: '16-character backup key',
    recoveryKeyNoticeHeader: 'Important Notice for Researchers',
    recoveryKeyNoticeBody: 'Because your workspace operates 100% locally with no central server accounts, this Key is the ONLY way to restore your research archives if you ever forget your PIN.',
    copyRecoveryKeyTitle: 'Copy Emergency Master Access Key',
    recoveryKeySavedCheckbox: 'I have copied and safely stored this Emergency Master Access Key in a secure location.',
    openWorkspaceAfterRecovery: 'Open Research Workspace',
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
  }
};
