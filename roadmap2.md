# Security and Code Quality Roadmap

## Priorities

### P0 — Close the Ollama proxy SSRF risk

- Validate the `endpoint` accepted by the Ollama tags proxy.
- Allow only the intended protocols and destinations; reject malformed URLs and disallowed hosts.
- Prevent access to loopback, private, link-local, and other restricted IP ranges where they are not explicitly required.
- Account for DNS resolution and redirects so validation cannot be bypassed.
- Add rate limiting and access controls appropriate to the deployment.
- Return explicit, sanitized errors rather than forwarding arbitrary upstream responses.
- Add tests for valid Ollama endpoints and blocked schemes, hosts, IP ranges, redirects, and malformed input.

### P1 — Harden and verify security headers

- Remove `unsafe-inline` and `unsafe-eval` from `script-src` where the app permits; use nonces or hashes if inline scripts are required.
- Restrict `frame-ancestors` to `'self'` or explicitly trusted origins.
- Confirm headers are applied in every deployment path, especially the static asset deployment configured in `wrangler.jsonc`.
- Add or update deployment header configuration if production responses lack the intended policy.
- Verify the effective CSP and other headers against development, preview, and production responses.

### P2 — Reduce third-party font dependency

- Decide whether Google Fonts requests are acceptable for the project’s privacy and availability goals.
- If not, self-host the required font files and update `index.html`.
- Check licensing and verify the app renders correctly without external font requests.

## Code-quality cleanup

### P3 — Simplify the model selector

- Remove the unused `provider` prop from `InlineModelSelector` and its call site, or document and implement its intended use.
- Replace the small `chipLabel` `useMemo` calculation with a direct expression unless profiling shows a benefit.
- Consolidate legacy model-ID normalization into one helper and use it consistently.
- Add tests for single, multi, and routing selection labels and model-ID normalization.

### P4 — Fix fallback-tag selection feedback

- Make fallback-tag behavior consistent with the active mode.
- Ensure selecting an already-selected tag cannot toggle it off while displaying a success toast.
- Show feedback that matches the actual result, including when a selection is removed or unchanged.
- Add tests for selecting and deselecting fallback tags in single, multi, and routing modes.

## Completion criteria

- SSRF regression tests pass and the proxy accepts only intended destinations.
- Security headers are present and verified in all supported deployment environments.
- The selector’s props and normalization logic contain no known dead or duplicated code.
- Fallback-tag actions and notifications accurately reflect selection state.
- Type checks, relevant tests, and the production build pass.
