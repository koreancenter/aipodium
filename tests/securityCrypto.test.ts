import test from 'node:test';
import assert from 'node:assert/strict';

import {
  hashPasscode,
  verifyPasscodeHash,
  encryptDataWithPasscode,
  decryptDataWithPasscode,
  isEncryptedPayload,
  generateMasterRecoveryKey,
  hashRecoveryKey,
  verifyRecoveryKey,
  getLockoutStatus,
  recordFailedAttempt,
  resetFailedAttempts
} from '../src/utils/securityCrypto.ts';

test('hashPasscode produces PBKDF2 formatted hash with salt', async () => {
  const hash = await hashPasscode('master_pin_123');
  assert.equal(hash.startsWith('PBKDF2:SHA256:100000:'), true);
  const parts = hash.split(':');
  assert.equal(parts.length, 5);
  assert.equal(parts[3].length, 32); // 16 bytes hex salt
  assert.equal(parts[4].length, 64); // 32 bytes hex hash
});

test('verifyPasscodeHash validates correct passcode and rejects wrong passcode', async () => {
  const hash = await hashPasscode('secret_key_456');
  const valid = await verifyPasscodeHash('secret_key_456', hash);
  assert.equal(valid, true);

  const invalid = await verifyPasscodeHash('wrong_key', hash);
  assert.equal(invalid, false);
});

test('verifyPasscodeHash maintains backward compatibility with legacy SHA-256 hash', async () => {
  // Legacy hash calculation: SHA-256('aipodium_salt_prefix_' + passcode)
  const enc = new TextEncoder();
  const data = enc.encode('aipodium_salt_prefix_legacy_pin');
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const legacyHash = Array.from(new Uint8Array(hashBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');

  const valid = await verifyPasscodeHash('legacy_pin', legacyHash);
  assert.equal(valid, true);

  const invalid = await verifyPasscodeHash('wrong_pin', legacyHash);
  assert.equal(invalid, false);
});

test('encryptDataWithPasscode and decryptDataWithPasscode round-trip with AES-256-GCM', async () => {
  const plaintext = 'AIzaSyExampleSecretApiKey12345';
  const passcode = 'MySecurePasscode!@#';

  const encrypted = await encryptDataWithPasscode(plaintext, passcode);
  assert.equal(isEncryptedPayload(encrypted), true);
  assert.equal(encrypted.includes(plaintext), false);

  const decrypted = await decryptDataWithPasscode(encrypted, passcode);
  assert.equal(decrypted, plaintext);
});

test('generateMasterRecoveryKey generates 16-character key with formatted groups', () => {
  const key = generateMasterRecoveryKey();
  assert.equal(key.length, 19); // 4 * 4 chars + 3 hyphens
  const rawKey = key.replace(/-/g, '');
  assert.equal(rawKey.length, 16);
  // Ensure no ambiguous characters (0, O, 1, I, L)
  assert.equal(/[0O1IL]/.test(rawKey), false);
});

test('verifyRecoveryKey correctly validates recovery key hash', async () => {
  const recoveryKey = generateMasterRecoveryKey();
  const hash = await hashRecoveryKey(recoveryKey);
  assert.equal(hash.startsWith('PBKDF2:SHA256:100000:'), true);

  const isValid = await verifyRecoveryKey(recoveryKey, hash);
  assert.equal(isValid, true);

  // Case and hyphen insensitive
  const normalizedKey = recoveryKey.replace(/-/g, '').toLowerCase();
  const isAlsoValid = await verifyRecoveryKey(normalizedKey, hash);
  assert.equal(isAlsoValid, true);

  const isInvalid = await verifyRecoveryKey('WRONGKEY12345678', hash);
  assert.equal(isInvalid, false);
});

test('rate limiting locks out after 5 consecutive failed attempts for 30 seconds', () => {
  // Reset initial state
  resetFailedAttempts();
  assert.equal(getLockoutStatus().isLockedOut, false);
  assert.equal(getLockoutStatus().attempts, 0);

  // 4 failed attempts should not lock out
  for (let i = 1; i <= 4; i++) {
    const status = recordFailedAttempt();
    assert.equal(status.attempts, i);
    assert.equal(status.isLockedOut, false);
  }

  // 5th failed attempt triggers 30s lockout
  const lockout = recordFailedAttempt();
  assert.equal(lockout.attempts, 5);
  assert.equal(lockout.isLockedOut, true);
  assert.equal(lockout.remainingSeconds > 0, true);

  // Reset clears lockout
  resetFailedAttempts();
  assert.equal(getLockoutStatus().isLockedOut, false);
  assert.equal(getLockoutStatus().attempts, 0);
});

test('Master Vault Key dual-encryption, unlock with PIN and Recovery Key, and DRE object round-trip', async () => {
  const pin = '8921';
  const recoveryKey = 'A3DF-89KM-PT2Z-XY99';

  // 1. Initialize vault key
  const {
    initMasterVault,
    unlockVaultWithPin,
    unlockVaultWithRecoveryKey,
    encryptObjectWithVaultKey,
    decryptObjectWithVaultKey,
    isEncryptedPayload
  } = await import('../src/utils/securityCrypto.ts');

  const initialVaultKey = await initMasterVault(pin, recoveryKey);
  assert.equal(initialVaultKey.length, 64); // 32 bytes hex

  // 2. Unlock with PIN
  const unlockedWithPin = await unlockVaultWithPin(pin);
  assert.equal(unlockedWithPin, initialVaultKey);

  // Wrong PIN fails to unlock
  const wrongPin = await unlockVaultWithPin('0000');
  assert.equal(wrongPin, null);

  // 3. Unlock with Recovery Key
  const unlockedWithRec = await unlockVaultWithRecoveryKey(recoveryKey);
  assert.equal(unlockedWithRec, initialVaultKey);

  // Wrong Recovery Key fails to unlock
  const wrongRec = await unlockVaultWithRecoveryKey('AAAA-BBBB-CCCC-DDDD');
  assert.equal(wrongRec, null);

  // 4. Data-at-Rest Encryption (DRE) of confidential document objects
  const confidentialDocs = {
    'architecture.md': '# Top Secret SSOT Architecture\nConfidential client data.',
    'credentials.json': '{"token": "sk-secret-byok-key"}'
  };

  const encryptedBundle = await encryptObjectWithVaultKey(confidentialDocs, initialVaultKey);
  assert.equal(isEncryptedPayload(encryptedBundle), true);
  assert.equal(encryptedBundle.startsWith('ENC:AES256:VAULT:'), true);
  assert.equal(encryptedBundle.includes('Top Secret'), false);
  assert.equal(encryptedBundle.includes('sk-secret-byok-key'), false);

  // Decrypt back with valid vault key
  const decryptedDocs = await decryptObjectWithVaultKey<typeof confidentialDocs>(encryptedBundle, initialVaultKey);
  assert.deepEqual(decryptedDocs, confidentialDocs);
});

test('Clipboard anti-skimming: copySensitiveWithAutoClear and clearSensitiveClipboard lifecycle', async () => {
  const { copySensitiveWithAutoClear, clearSensitiveClipboard } = await import('../src/utils/securityCrypto.ts');
  
  let clipboardContent = '';
  // Safely define clipboard on navigator in Node environment
  Object.defineProperty(globalThis.navigator, 'clipboard', {
    value: {
      writeText: async (text: string) => {
        clipboardContent = text;
      }
    },
    configurable: true,
    writable: true
  });

  const ok = await copySensitiveWithAutoClear('SECRET_RECOVERY_KEY_1234', 1);
  assert.equal(ok, true);
  assert.equal(clipboardContent, 'SECRET_RECOVERY_KEY_1234');

  await clearSensitiveClipboard();
  assert.equal(clipboardContent, '');
});

test('Markdown and HTML renderer protects links with rel="noopener noreferrer" and target="_blank"', async () => {
  const { renderMarkdownToHtml } = await import('../src/utils/markdownParser.ts');
  const rawMarkdown = '[External Resource](https://malicious-phishing.example.com)';
  const rendered = renderMarkdownToHtml(rawMarkdown);

  assert.equal(rendered.includes('target="_blank"'), true);
  assert.equal(rendered.includes('rel="noopener noreferrer"'), true);
  assert.equal(rendered.includes('https://malicious-phishing.example.com'), true);
});

test('purgeGuestWorkspaceData completely purges unencrypted guest files, editor contents, sessions, and keys', async () => {
  const { purgeGuestWorkspaceData } = await import('../src/utils/securityCrypto.ts');

  // Simulate guest user storing files and sessions in localStorage
  if (typeof localStorage !== 'undefined' && localStorage) {
    localStorage.setItem('notebooklm_files', JSON.stringify({ 'test.md': 'Guest test content' }));
    localStorage.setItem('notebooklm_editor_content', 'Guest editor content');
    localStorage.setItem('notebooklm_sessions', JSON.stringify([{ id: 'sess_1', title: 'Guest Session' }]));
    localStorage.setItem('aipodium_guest_init_v1', 'true');
    localStorage.setItem('aipodium_api_keys', JSON.stringify({ gemini: 'test-key' }));

    assert.ok(localStorage.getItem('notebooklm_files'));
    assert.ok(localStorage.getItem('notebooklm_editor_content'));

    // Execute purge
    await purgeGuestWorkspaceData();

    // Verify all guest artifacts are wiped to null
    assert.equal(localStorage.getItem('notebooklm_files'), null);
    assert.equal(localStorage.getItem('notebooklm_editor_content'), null);
    assert.equal(localStorage.getItem('notebooklm_sessions'), null);
    assert.equal(localStorage.getItem('aipodium_guest_init_v1'), null);
    assert.equal(localStorage.getItem('aipodium_api_keys'), null);
  }
});

test('hasMasterPinConfigured correctly distinguishes guest from PIN user and preserves registered PIN data', async () => {
  const {
    hasMasterPinConfigured,
    initMasterVault,
    unlockVaultWithPin,
    encryptObjectWithVaultKey,
    decryptObjectWithVaultKey,
    purgeVaultKey,
    LOCAL_PIN_HASH_KEY
  } = await import('../src/utils/securityCrypto.ts');

  // 1. Initial guest state: no PIN registered
  purgeVaultKey();
  if (typeof localStorage !== 'undefined' && localStorage) {
    localStorage.removeItem(LOCAL_PIN_HASH_KEY);
  }
  assert.equal(hasMasterPinConfigured(), false);

  // 2. User registers PIN
  const testPin = '889911';
  const testRecoveryKey = 'ABCD-EFGH-IJKL-MNOP';
  const vaultKey = await initMasterVault(testPin, testRecoveryKey);
  if (typeof localStorage !== 'undefined' && localStorage) {
    localStorage.setItem(LOCAL_PIN_HASH_KEY, 'hashed_pin_value');
  }

  // Now hasMasterPinConfigured must return true
  assert.equal(hasMasterPinConfigured(), true);

  // 3. Registered user data encryption test (Data-at-Rest Encryption)
  const registeredUserFiles = {
    'private_project.md': '# Confidential Corporate Document\nBudget: $500,000'
  };
  const encPayload = await encryptObjectWithVaultKey(registeredUserFiles, vaultKey);

  // Simulating lock: lock workspace and retrieve vault key with PIN
  const unlockedKey = await unlockVaultWithPin(testPin);
  assert.equal(unlockedKey, vaultKey);

  // Decrypt and ensure data integrity is 100% preserved
  const restoredFiles = await decryptObjectWithVaultKey<typeof registeredUserFiles>(encPayload, unlockedKey!);
  assert.deepEqual(restoredFiles, registeredUserFiles);

  // Cleanup
  if (typeof localStorage !== 'undefined' && localStorage) {
    localStorage.removeItem(LOCAL_PIN_HASH_KEY);
    purgeVaultKey();
  }
});



