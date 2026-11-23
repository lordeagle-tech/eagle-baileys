# Baileys Capability Audit

**Repository:** `lordeagle-tech/eagle-baileys`  
**Audited commit:** `bc9c642`  
**Package:** `@lordeagle21/baileys@2.3.0`  
**Audit date:** 2026-11-04

> **2026-11-23 addendum (v3.0.0):** The P0 pairing-code finding above was already resolved in this fork (`DEFAULT_PAIRING_CODE` is `undefined`), and `lib/index.d.ts` plus prepack/smoke/storage/feature checks now exist. This release also makes the reconnect wrapper's connection helpers stable across replacements, clears stale pairing state on close, adds poll-vote generation/encryption and `sendPollVote`, adds `checkNumber`, `blockContact`/`unblockContact`/`pinChat`, `downloadViewOnce`, and Close Friends status audience support. The remaining findings below are unchanged unless explicitly superseded. Full reportSpam requests, scheduled channel posts, channel poll votes/view receipts, Close Friends list management, and sticker pack app-state patches are still protocol-gated rather than guessed.

## Overall assessment

The fork is a substantial implementation rather than a minimal WhatsApp client. Its local feature suite passes, the package is publishable, and the implementation is broadly source-parallel with current Baileys in messaging, media, groups, newsletters, calls, history sync, LID/PN mapping, and app-state handling.

It should not yet be presented as a current-protocol production baseline. Current upstream Baileys is in the 7.x line and documents breaking changes involving LID-first Signal sessions, authentication-state keys, alternate JIDs, successful-delivery acknowledgements, protobuf helpers, and ESM/API behavior. The fork is still version 2.3.0 and has not established a compatibility matrix against that baseline. [1] [2] [3]

The most urgent issue is the fixed default pairing code `NCKTECH1`. A stable reusable pairing code is a security risk and diverges from current upstream behavior, which generates a fresh code for each request when no custom code is supplied. [4]

## Updates needed before a public production release

### P0: Remove the fixed pairing-code default

Change `DEFAULT_PAIRING_CODE = 'NCKTECH1'` so a new pairing request receives a fresh random Crockford code, or require the caller to provide a code explicitly. If a fixed code remains available as an opt-in test/debug setting, it should never be the production default and should be clearly marked unsafe.

The current pairing flow has good hardening: it normalizes phone numbers, validates the code alphabet, waits for the socket to open, sends `companion_hello` immediately, and suppresses blind reconnects while pairing is incomplete. Keep those improvements. Add lifecycle cleanup so temporary `pairingCode` and `pairingJid` values are cleared after successful pairing, expiry, and failed attempts. Add mocked protocol tests for `companion_hello`, `companion_finish`, `pair-success`, QR expiry, immediate pairing-code requests, and reconnect during pending pairing. [4] [5]

### P0: Establish a deliberate 7.x compatibility baseline

The largest technical risk is protocol drift. Current upstream is `7.0.0-rc14`, while this fork is `2.3.0`. The v7 migration includes LID-first Signal behavior, alternate JID changes, auth-state changes, removed successful-delivery ACKs, slimmer protobuf helpers, and related breaking API changes. [1] [2] [3]

The fork should either rebase/port the relevant upstream changes or explicitly support an older pinned WhatsApp Web revision. In particular, review the receive path because it still sends normal success acknowledgements/receipts. Determine which acknowledgements are still required for errors, retries, and protocol semantics, then add regression tests before changing behavior.

### P0: Refresh the client revision and WAProto together

The fork pins a WhatsApp Web version in `lib/Defaults/index.js`, while its generated protocol schema and current upstream use different moving revisions. This is not automatically a bug because WhatsApp revisions and schema snapshots can differ, but shipping an old hard-coded revision without a declared support baseline is risky.

Refresh the pinned revision and `WAProto` as one tested change. Validate optional and oneof fields, 64-bit values, unknown-field preservation, generated-code parity, LID fields, and message encryption/decryption. Follow upstream’s warning not to fetch the newest Web version on every connection unless the matching protobufs are known to work. [6] [7]

### P1: Make durable `getMessage` storage part of the production contract

The default `getMessage` callback returns `undefined`. That means retry and re-encryption can fail after the in-memory retry cache is evicted or after a process restart. Production users should provide a durable message store, and the README should state this clearly. Add tests for message eviction, restart, missing-message retries, Signal-session recreation, and re-encryption through `getMessage`. [8]

### P1: Fix community response parsing

`lib/Socket/communities.js` assumes a `<community>` response in paths where WhatsApp/current upstream usage can return a group-shaped response. This can cause community metadata and invite operations to throw, while participating-community fetches can silently return an empty result. Accept both response shapes where appropriate, or return a classified error instead of dereferencing a missing node. Add wire-level tests for metadata, invite info, description updates, participating communities, participant changes, and settings. [9]

### P1: Add release-quality build, types, and CI

The package has no published TypeScript declarations, no `types` field, no build/typecheck gate, no lint gate, no prepack validation, and no tracked CI workflow. Current upstream publishes declarations and runs automated CI and release workflows. [10] [11] [12]

At minimum, add:

- `lib/index.d.ts` or a TypeScript build that emits declarations.
- A `types` entry in `package.json`.
- `build`, `typecheck`, `lint`, and `prepack` checks.
- CI for install, WAProto generation, smoke tests, feature tests, package contents, and supported Node versions.
- Public-import contract tests and TypeScript compilation tests.
- A compatibility matrix covering QR pairing, pairing codes, restart/reconnect, LID-only recipients, alternate group JIDs, offline notifications, and server close/error cases.

## Capability-by-capability findings

### Authentication, pairing, QR, reconnect, and linked devices

**Status: needs update, high priority.** The local flow is carefully hardened and includes pairing notifications, QR refresh, reconnect backoff, linked-device events, and device-list queries. The fixed pairing default and missing lifecycle tests are the main problems.

### Core messaging, media, retries, and encryption

**Status: needs update, high priority.** Media encryption, streaming downloads, upload host failover, encrypted media retry, Signal-session recreation, and retry caches are substantial strengths. The main gaps are current-protocol alignment, a durable `getMessage` contract, and the absence of direct media/crypto/retry tests. [8] [13] [14]

### Buttons, lists, native flows, polls, reactions, edits, and rich HTML

**Status: usable but compatibility-risk.** Local construction and parsing tests pass. Standard reactions, polls, and edits are close to upstream. Classic buttons and lists should be documented as best-effort because current upstream discussions report delivery/rendering problems and button deprecation concerns. Native flows need live interoperability tests. The custom rich HTML envelope is fork-specific and experimental because it is not an official upstream contract. [15] [16] [17]

### Groups and communities

**Status: groups healthy; communities need a high-priority parser fix.** Core group operations, invitations, membership requests, LID/PN fields, ephemeral settings, and community operations are broad. The wrong response-shape assumptions in community parsing are the main concrete defect. Suggested community subgroup approval should not be treated as a local missing feature because current upstream reports it as an API/protocol limitation. [9] [18]

### Status, newsletters, calls, contacts, and profiles

**Status: generally healthy, low update priority.** The fork has a broad newsletter/channel surface, status sending, profile and privacy helpers, contacts, presence, call event processing, and call-link creation. Add protocol-level tests for serialized IQ/MEX/call stanzas, offline ordering, newsletter notifications, profile privacy tokens, and call transitions. Current upstream does not expose a materially broader required surface here. [19] [20] [21]

### History sync, app-state sync, LID/PN mapping, auth stores, and caching

**Status: generally healthy, low update priority.** History sync, app-state retry behavior, LID/PN mapping, SQLite auth, multi-file auth, and caches are strong areas. The missing piece is first-party regression coverage for compressed history, LTHash recovery, auth round trips, SQLite migration/rollback, cache invalidation, and mapping fallbacks. Multi-file auth could also use atomic temp-file/rename writes for better crash durability.

### Protocol, crypto, WAProto, and transport

**Status: needs update, high priority.** Noise, Curve, AES, HKDF, certificate validation, transport counters, reconnect timeouts, and LID-aware behavior are structurally strong. The lack of current revision alignment and deterministic protocol vectors is the main blocker. Add Noise/certificate vectors, transport fragmentation/counter tests, prekey tests, protobuf golden tests, and alternate-JID encryption tests. [3] [6] [7]

### Public API, documentation, packaging, and release readiness

**Status: needs update, high priority.** The default/named export shape, package metadata, README, and current ad hoc tests are useful. The absence of declarations, CI, build validation, a compatibility baseline, and a semver/release policy prevents a strong public compatibility claim. [10] [11] [12]

## Recommended order of work

1. Remove the fixed pairing-code default and add pairing lifecycle tests.
2. Choose and document the supported WhatsApp Web/upstream baseline.
3. Refresh WAProto and the client revision together, then audit ACK behavior and LID-first session handling.
4. Fix community response parsing and add wire-level group/community tests.
5. Make durable `getMessage` storage a documented production requirement.
6. Add declarations, build/typecheck/prepack checks, CI, and a compatibility matrix.
7. Add media, crypto, sync, and transport regression vectors.
8. Label classic buttons/lists and rich HTML as compatibility-risk or experimental features and add live interoperability tests.

## Conclusion

The fork is already capable enough for controlled internal use, but I would hold a public production release until the fixed pairing code is removed, protocol/version drift is addressed, community parsing is fixed, durable message retrieval is documented, and release-quality tests/types/CI are added. The status, newsletter, call, history, app-state, and LID/PN areas are comparatively strong and can follow after the protocol and release blockers.

## References

[1]: https://github.com/WhiskeySockets/Baileys "Current WhiskeySockets Baileys repository"
[2]: https://baileys.wiki/migration/v7 "Baileys v7 migration guide"
[3]: https://www.npmjs.com/package/@whiskeysockets/baileys "Current Baileys npm package"
[4]: https://raw.githubusercontent.com/WhiskeySockets/Baileys/master/src/Socket/socket.ts "Current upstream pairing-code implementation"
[5]: https://baileys.wiki/authentication/pairing-code "Baileys pairing-code documentation"
[6]: https://raw.githubusercontent.com/WhiskeySockets/Baileys/master/src/Defaults/index.ts "Current upstream connection defaults"
[7]: https://baileys.wiki/faq "Baileys FAQ and Web-version compatibility guidance"
[8]: https://github.com/WhiskeySockets/Baileys/blob/master/README.md "Baileys README and message-store guidance"
[9]: https://github.com/WhiskeySockets/Baileys/issues/2753 "Baileys community metadata response-shape issue"
[10]: https://raw.githubusercontent.com/WhiskeySockets/Baileys/master/package.json "Current upstream package metadata and scripts"
[11]: https://raw.githubusercontent.com/WhiskeySockets/Baileys/master/.github/workflows/test.yml "Current upstream test workflow"
[12]: https://raw.githubusercontent.com/WhiskeySockets/Baileys/master/tsconfig.build.json "Current upstream declaration/build configuration"
[13]: https://raw.githubusercontent.com/WhiskeySockets/Baileys/master/src/Utils/messages-media.ts "Current upstream media implementation"
[14]: https://raw.githubusercontent.com/WhiskeySockets/Baileys/master/src/Utils/message-retry-manager.ts "Current upstream message retry manager"
[15]: https://github.com/WhiskeySockets/Baileys/issues/2465 "Current list-message delivery/rendering issue"
[16]: https://github.com/WhiskeySockets/Baileys/issues/2471 "Current buttons deprecation discussion"
[17]: https://raw.githubusercontent.com/WhiskeySockets/Baileys/master/src/Utils/messages.ts "Current upstream message construction"
[18]: https://github.com/WhiskeySockets/Baileys/issues/2536 "Current community subgroup approval limitation"
[19]: https://raw.githubusercontent.com/WhiskeySockets/Baileys/master/src/Socket/newsletter.ts "Current upstream newsletter implementation"
[20]: https://raw.githubusercontent.com/WhiskeySockets/Baileys/master/src/Socket/chats.ts "Current upstream chats, profile, presence, and call-link implementation"
[21]: https://raw.githubusercontent.com/WhiskeySockets/Baileys/master/src/Socket/messages-recv.ts "Current upstream receive and call/newsletter processing"
