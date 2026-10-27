# Cross-Posting App

A mobile-first app for posting to several social platforms at once. One person manages multiple of their own accounts (including more than one account on the same platform) and publishes a single post to any mix of them. It is not a team or agency tool.

**Status:** planning. The first code scaffold was cleared back to the design docs; this repo currently holds the plan and the platform research.

## Planned stack

- **Client:** React Native with Expo (Expo Router + react-native-web), targeting iOS, Android and web from one codebase
- **Backend:** Node/TypeScript API that holds every platform token and makes every publish call
- **Media:** server-side ffmpeg for per-platform transcoding, plus a CDN/storage layer for platforms that require public HTTPS media URLs

## Build order

1. **X and Threads first.** No heavy review gate, so the full flow can be built and tested right away. Threads v1 is text-only.
2. **Instagram and TikTok next.** Both need audits or App Review with long lead times, so those start in parallel once the core loop works.
3. **LinkedIn** runs as a background task and does not block launch.

## Key design decisions

- **Platform tokens never reach the client.** The app holds only a session token for our backend.
- **`ConnectedAccount` is the core entity**, not the user or the platform. A `Post` fans out into one `PostTarget` per selected account, and each target is processed on its own for failure isolation, per-account rate limits and token refresh.
- **One shared caption across all targets in v1.** The schema reserves a per-target override for later.
- **No "trending sound" feature.** Platform-licensed music does not carry across platforms; users bring their own audio.

## Docs

- [`CLAUDE.md`](CLAUDE.md): product scope, target platforms, data model and constraints
- [`docs/api-gates-and-constraints.md`](docs/api-gates-and-constraints.md): each platform's API access gates, review timelines, costs and the reasoning behind the architecture
