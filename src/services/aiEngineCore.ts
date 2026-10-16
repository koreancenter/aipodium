/**
<<<<<<< HEAD
 * Legacy compatibility shim for aiEngineCore.
 * All core AI engine functionality has been migrated to `src/services/ai/`.
 * @deprecated Import directly from `src/services/ai` instead.
 */

export * from './ai';
=======
 * Legacy compatibility shim for the application AI engine facade.
 * Import provider-neutral APIs from `src/services/ai` and host integrations from `src/services/aiPodiumIntegration`.
 * @deprecated Import directly from the corresponding entry point instead.
 */

export * from './ai';
export * from './aiPodiumIntegration';
>>>>>>> main
