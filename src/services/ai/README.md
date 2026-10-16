# AI Engine Core

`@koreancenter/ai-engine-core` contains provider-neutral inference types, profiles, adapters, and the `AiClient` facade. It has no dependency on AI Podium authentication, browser storage, UI components, or the application's WebLLM service.

## Build

Run `npm run build` from this directory. The package build emits an ESM bundle and TypeScript declarations into `dist/`. Only `dist/` is included in the package.

## Host integrations

- Configure `CloudAdapter` with the host's chat and health endpoints and an optional asynchronous API-key resolver.
- Configure `WebLlmAdapter` with a `WebLlmRuntime` implementation for availability, model loading, progress, and streaming.
- `OllamaAdapter` uses the standard Ollama HTTP API; the host is responsible for browser CORS policy and endpoint configuration.
- Create an `AiClient` and register configured adapters. Authentication, secret storage, application error presentation, and runtime lifecycle remain in the host application.

The AI Podium-specific wiring is kept outside this package entry point in `src/services/aiPodiumIntegration.ts`.
