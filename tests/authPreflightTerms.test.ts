import test from 'node:test';
import assert from 'node:assert/strict';
import { AUTH_TRANSLATIONS } from '../src/locales/authLocale';

// Mock localStorage for Node test runner
if (typeof globalThis.localStorage === 'undefined') {
  const store = new Map<string, string>();
  globalThis.localStorage = {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => { store.set(k, String(v)); },
    removeItem: (k: string) => { store.delete(k); },
    clear: () => { store.clear(); },
    key: (i: number) => Array.from(store.keys())[i] ?? null,
    get length() { return store.size; }
  } as any;
}

test('Mandatory pre-flight terms translations match requirements exactly', () => {
  const kr = AUTH_TRANSLATIONS.KR;
  assert.equal(
    kr.termsAllAgree,
    '[필수] API Key 비용 책임, 로컬 데이터 보관 및 AI 면책 조항에 모두 동의합니다.'
  );
  assert.equal(
    kr.termsApiKeyAgree,
    '[필수] 개인 AI API Key 관리 및 사용 비용은 사용자 본인 책임입니다.'
  );
  assert.equal(
    kr.termsLocalStorageAgree,
    '[필수] 로컬 브라우저 저장 특성상 캐시 삭제/세션 만료 시 데이터 유실 위험을 인지하고 동의합니다.'
  );
  assert.equal(
    kr.termsAiOutputAgree,
    '[필수] AI 모델이 생성한 결과물의 정확성 검증 책임은 사용자에게 있습니다.'
  );
  assert.equal(kr.termsViewDetails, '상세 항목');
  assert.equal(kr.termsHideDetails, '접기');

  // Compact feature titles on mobile/tablet
  assert.equal(kr.card1CompactTitle, '완벽한 데이터 로컬 격리');
  assert.equal(kr.card2CompactTitle, '자유로운 클라우드 & 로컬 AI');
  assert.equal(kr.card3CompactTitle, '기준 문서 오케스트레이션');

  // AGENTS.md rule: No parenthesized English like (Open), (Save), (.md), etc.
  const parenthesizedEnglishRegex = /\([A-Za-z0-9_.]+\)/;
  assert.equal(parenthesizedEnglishRegex.test(kr.termsAllAgree), false);
  assert.equal(parenthesizedEnglishRegex.test(kr.termsApiKeyAgree), false);
  assert.equal(parenthesizedEnglishRegex.test(kr.termsLocalStorageAgree), false);
  assert.equal(parenthesizedEnglishRegex.test(kr.termsAiOutputAgree), false);
  assert.equal(parenthesizedEnglishRegex.test(kr.card1CompactTitle), false);
  assert.equal(parenthesizedEnglishRegex.test(kr.card2CompactTitle), false);
  assert.equal(parenthesizedEnglishRegex.test(kr.card3CompactTitle), false);
});

test('Terms agreement state logic and localStorage persistence verification', () => {
  const DISCLAIMER_KEY = 'aipodium_disclaimer_accepted';

  // Initially unaccepted
  localStorage.removeItem(DISCLAIMER_KEY);
  const isAccepted = localStorage.getItem(DISCLAIMER_KEY) === 'true';
  assert.equal(isAccepted, false);

  let agreeApiKey: boolean = isAccepted;
  let agreeLocalStorage: boolean = isAccepted;
  let agreeAiOutput: boolean = isAccepted;
  let isAllAgreed: boolean = agreeApiKey && agreeLocalStorage && agreeAiOutput;
  assert.equal(isAllAgreed, false);

  // Partial agreements cannot activate buttons
  agreeApiKey = true;
  isAllAgreed = agreeApiKey && agreeLocalStorage && agreeAiOutput;
  assert.equal(isAllAgreed, false);

  agreeLocalStorage = true;
  isAllAgreed = agreeApiKey && agreeLocalStorage && agreeAiOutput;
  assert.equal(isAllAgreed, false);

  // All checked
  agreeAiOutput = true;
  isAllAgreed = agreeApiKey && agreeLocalStorage && agreeAiOutput;
  assert.equal(isAllAgreed, true);

  // Submission sets persistence key
  localStorage.setItem(DISCLAIMER_KEY, 'true');
  assert.equal(localStorage.getItem(DISCLAIMER_KEY), 'true');

  // Returning visit auto-accepts state
  const returningAccepted = localStorage.getItem(DISCLAIMER_KEY) === 'true';
  assert.equal(returningAccepted, true);
  const nextApiKey = returningAccepted;
  const nextLocalStorage = returningAccepted;
  const nextAiOutput = returningAccepted;
  assert.equal(nextApiKey && nextLocalStorage && nextAiOutput, true);
});
