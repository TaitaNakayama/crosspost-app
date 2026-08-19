# Cross-Posting App

Mobile-first social cross-posting app (React Native/Expo + Node/TS backend).
One user manages multiple of their own accounts across platforms — not team/agency management.

## Build order

X and Threads first (fastest access, no heavy review gate).
- X: no audit/review gate, just developer signup — pay-per-use cost (~$0.015/post), not a time problem.
- Threads: can build and test the full flow against your own account in development mode immediately; App Review (~1-2 weeks typically) runs in parallel for real users. **v1 is text-only** — Threads media goes through the Graph API's public-HTTPS-URL requirement, so restricting v1 to text keeps the media CDN off the launch critical path. Adding media to Threads means standing up the CDN first, not just a code change.
- Instagram and TikTok later — both are audit/review-gated with longer lead times (Instagram needs Business Verification before App Review; TikTok needs a formal use-case audit). Start these in parallel once the core loop works on X/Threads.
- LinkedIn — least predictable timeline of all four, treat as an ongoing background task, don't block launch on it.

See docs/api-gates-and-constraints.md for full platform gates, timelines, costs, and architecture rationale before touching posting-API code for any new platform.

## Target platforms

iOS, Android, and web — all three from one Expo codebase (Expo Router + react-native-web). Web may come later, but the constraints below are cheap now and expensive to retrofit, so respect them from the first commit.

- **Platform access tokens never touch the client.** The app holds only a session token for our own backend; `ConnectedAccount.access_token` lives server-side and every publish call originates from the backend. This is the one that matters most — it sidesteps the fact that `expo-secure-store` has no web implementation, and it's the correct security posture regardless of target.
- **Register native *and* web OAuth redirect URIs upfront** with every platform provider (custom scheme / universal link for native, HTTPS callback for web). Adding a redirect URI later can trigger re-review on Meta — see docs/api-gates-and-constraints.md.
- **No native-only dependency without a web fallback.** Check web support before adding any package; prefer Expo SDK modules, which are already web-aware.
- **Media capture/picking differs per target** (file input on web, native picker on device). Upload and transcode are already server-side, so keep the platform-specific surface confined to picking the file.
- **App Store / Play review is a third gate category**, separate from the platform API gates. Apple in particular rejects thin wrappers and takes a cut of in-app subscriptions — if this is ever paid, billing on web via Stripe avoids that, which is an argument for the web target being more than an afterthought.

## Data model

`ConnectedAccount` (not User, not Platform) is the core entity everything else references — a user can have multiple accounts on the same platform (e.g. two X accounts), each with its own token.

```
User
 └── ConnectedAccount (many)
       - platform, platform_account_id, display_name/handle/avatar_url
       - access_token, refresh_token, expires_at
       - status (active / needs_reauth / revoked)
```

`Post` fans out into one `PostTarget` per selected account — including multiple accounts on the same platform:

```
Post
 └── PostTarget (many)
       - connected_account_id (FK — a specific account, not a platform)
       - status (queued / publishing / published / failed)
       - platform_post_id, error_message, published_at
```

Process `PostTarget` rows independently (not per-platform) for failure isolation, per-account rate limiting, and per-account token refresh.

**Shared caption across all targets in v1** — no per-account override UI. Schema has a nullable caption-override column on `PostTarget` reserved for later, but leave the editing UI unbuilt until real users ask for it.

## Known structural constraints

- **Music**: platform-licensed music does not travel across platforms (rights are platform-specific by design). Don't build or market a "pick a trending sound" feature — let users bring their own/licensed-for-all-platforms audio instead.
- **Autocaptions**: no platform dependency, pure own-pipeline feature (transcription service + burn-in or caption track). Build whenever convenient.
- **Video**: needs per-platform transcoding (aspect ratio, duration, codec, size) via server-side ffmpeg — don't do this on-device, iOS background execution time is capped.
- **Media hosting**: Instagram/Threads Graph API requires publicly reachable HTTPS URLs for media, not raw upload — need a CDN/storage layer in place before those integrations work at all.
