# Cross-Posting App — API Gates & Technical Constraints

A reference sheet of every major blocker, with possible fixes, expected timeline, and cost.

---

## Platform-Specific Gates

### TikTok — Content Posting API

**The constraint:** All content posted by an unaudited API client is forced to `SELF_ONLY` (private) visibility, server-side, no way around it in code. Unaudited apps are also capped at 5 creator accounts authorizing in any 24-hour window. To lift this, TikTok requires a formal audit of your app's use case, UX compliance (must show creator name/avatar pre-post, expose a privacy selector, expose duet/stitch/comment controls), and content policy adherence.

**Solutions:**
1. **Do the audit yourself.** Build the full flow in sandbox mode first (posts stay private but the flow works), record your audit demo video there, then submit. Budget for multiple rejection/resubmit cycles.
2. **Route through a unified posting API** (e.g. Blotato, Zernio, bundle.social, PostPeer) that has already cleared TikTok's audit — you post through their endpoint instead of TikTok's directly. Trades control and margin for speed.
3. **Launch without TikTok** in v1, ship the audit-gated platforms first, add TikTok once your own audit clears in parallel.

**Timeline:** 2–4 weeks for the audit itself, but expect it to stretch further — rejections for UX-guideline misses are common and each resubmit adds days.

**Cost:** API itself is free. No published per-call fee.

---

### Instagram / Facebook — Graph API (Meta)

**The constraint:** Multiple stacked gates —
- Users must have a **Business or Creator account** linked to a Facebook Page (personal accounts have zero API access).
- **Standard Access** only works for accounts you own/manage. To serve real users, you need **Advanced Access**, which requires **Business Verification** in Meta Business Manager *before* App Review can succeed — attempting review before verification passes is the most common failure mode.
- App Review itself requires a working demo, screen recordings, and per-permission proof.
- **No native scheduling exists** — you build your own job queue that holds the payload and fires the publish call at the right time.
- Media must be hosted at a **public HTTPS URL** — you can't upload raw bytes directly.
- Rate limits scale with account size (a rolling call budget tied to the account's impressions), not a flat number.

**Solutions:**
1. **Sequence it correctly**: Business Verification → App Review → ship. Doing App Review first is the #1 cause of rejection loops.
2. **Use a unified API with "managed keys"** (e.g. Outstand, Blotato) — some offer to handle Meta's OAuth app setup for you and skip your own review process entirely, at the cost of a subscription fee and less white-labeling.
3. **Stand up your own media CDN early** (even a simple S3/Cloudflare bucket with signed URLs) since the public-HTTPS-URL requirement blocks you until you have one regardless of review status.

**Timeline:** 2–4 weeks for App Review alone; Business Verification can add more time and is a common independent rejection point — plan for 4–8 weeks total before you can serve real (non-test) users.

**Cost:** Free — no per-call charge from Meta. The real cost is engineering time spent on the review cycle, not dollars.

---

### X (Twitter) — Posting API

**The constraint:** As of February 2026, X moved new developers to **pay-per-use pricing by default**, closing the old flat Basic/Pro tiers to new signups. Roughly **$0.015 per post created**. This is a real unit cost that scales with your user base, not a one-time gate.

**Solutions:**
1. **Bake per-post cost into your pricing model from day one** — treat it like a COGS line, not a fixed engineering cost.
2. **Batch/cache to avoid redundant calls** where possible (e.g. don't re-fetch data you already have) to keep the metered surface as small as possible.
3. **Use a unified API reseller** if their bulk rate undercuts what you'd pay X directly at your expected volume — worth comparing at scale.

**Timeline:** No audit/review gate reported for basic posting access — this is a cost problem, not a time problem. Developer signup is fast.

**Cost:** ~$0.015 per API-created post, metered, ongoing (not one-time).

---

### LinkedIn — Posting API

**The constraint:** Historically the most restrictive of the four for third-party posting tools. LinkedIn has required a partnership/access application rather than open developer signup for share/posting permissions, and approval criteria are less transparent than Meta's or TikTok's documented processes.

**Solutions:**
1. **Apply early and treat it as your longest-lead-time item** — start this before you've finished building anything else.
2. **Route through a unified API provider** that already has LinkedIn access approved, if your own application stalls.
3. **De-prioritize LinkedIn for v1** if it's blocking launch — ship text-posting to X/Threads first, add LinkedIn once access clears.

**Timeline:** Historically the slowest and least predictable of the major platforms — plan for it to be your critical path, potentially longer than TikTok's audit.

**Cost:** Free API access once approved; no published per-call fee.

---

## Cross-Cutting Technical Constraints

### OAuth & token lifecycle management across platforms

**The constraint:** Every platform has different token lifespans and refresh mechanics — Instagram long-lived tokens last 60 days and don't auto-renew, TikTok access tokens expire every 24 hours. Managing this per-user, per-platform, at scale is its own subsystem.

**Solutions:**
1. Build a single **token-refresh job scheduler** (cron/queue-based) that tracks expiry per connection and refreshes proactively, not reactively on failure.
2. Store refresh state in a dedicated table keyed by `(user, platform)` so failures are isolated and debuggable per connection.

**Timeline:** Ongoing engineering, not a one-time gate — budget it as core infra, not a feature.
**Cost:** No direct API cost; infra/dev time only.

---

### Video transcoding per platform

**The constraint:** Each platform has different required aspect ratio, max duration, codec, and file size. A single uploaded video needs to become 4–5 different derivative files before it can be posted everywhere.

**Solutions:**
1. Run an **ffmpeg-based transcode pipeline server-side**, triggered on upload, producing per-platform variants asynchronously.
2. On mobile specifically, offload the actual transcode to the backend rather than doing it on-device — iOS background execution time is capped, so a long transcode job started in the app can get killed if you try to do it locally.

**Timeline:** Ongoing engineering; no external gate, but underestimating this is the most common cause of "it works in the demo, breaks in production."
**Cost:** Compute cost (server transcoding time), scales with usage — not a platform fee.

---

### Async publish + status polling

**The constraint:** Video publish calls (especially Instagram, TikTok) don't complete synchronously — you get a container/publish ID back and must poll a status endpoint until it reports success or failure. Naive "fire and check once" implementations are the direct cause of the "post failures happen too often" complaint seen across competitor reviews.

**Solutions:**
1. Build a **retry-with-backoff polling worker**, not a single status check, and surface clear failure states to the user instead of silent failure.
2. Log every publish attempt with enough detail (platform response, timestamps) to debug user-reported failures without asking them to reproduce it.

**Timeline:** Ongoing engineering; no external gate.
**Cost:** No direct fee; polling calls may count against a platform's rate limit budget, so design polling intervals with that in mind.

---

### Recurring re-review on new features

**The constraint:** Meta and TikTok both require re-review when you request new scopes or permissions — adding Stories, DMs, or analytics later can trigger another multi-week review cycle, not just a code change.

**Solutions:**
1. **Request the broadest reasonable scope set upfront** if you're confident you'll need it within the next few months, to avoid a second review cycle.
2. Keep a running document of exactly which permissions are approved vs. pending per platform, since it's easy to lose track once you're juggling 4+ platforms' review states.

**Timeline:** 2–4+ weeks per re-review cycle, same as initial review.
**Cost:** Free (Meta/TikTok); engineering/product time is the real cost.

---

## Music & Autocaptions — Not the Same Kind of Problem

### Autocaptions — engineering task, no external gate

**The constraint:** None, really — this is entirely your own pipeline and doesn't touch any platform's posting API.

**Solutions:**
1. Run uploaded video through a transcription service (Whisper API, AssemblyAI, Deepgram) before it ever reaches a posting call.
2. Burn captions into the video (ffmpeg) or attach as a caption track, whichever a given platform's upload flow expects.

**Timeline:** Build whenever convenient — no review process, no approval, no dependency on the platform-gate work.
**Cost:** ~$0.006–0.02 per minute of audio transcribed, scales with usage.

---

### Music — structural rights wall, not an engineering gap

**The constraint:** Platform-licensed music does not travel across platforms, by design of the underlying rights deals — this is a legal restriction, not something more engineering or a passed review can fix. A Meta Sound Collection track is only cleared for Facebook/Instagram; TikTok's Commercial Sounds may only be shared within TikTok itself; no platform's in-app library grants rights usable elsewhere. There is no version of "pick a trending sound and post it everywhere" that is legally coherent.

**Solutions:**
1. **Let users bring their own audio** (voiceover, original recordings, owned tracks) before upload — sidesteps the licensing question entirely.
2. **Point users to pre-cleared, explicitly cross-platform-licensed catalogs** (e.g. Soundstripe-style libraries) rather than any single platform's native sound library.
3. **Don't build or market a "trending sounds" feature** that implies pulling from a platform's own library — that promise can't be legally kept across destinations.

**Timeline:** Not a review-gated item — this is a product/legal decision to make now, not an engineering task to schedule later.
**Cost:** No API fee; cost is whatever a licensed music catalog subscription costs if you choose to offer one in-app.

---

## Multi-Account Architecture (one user, many of their own accounts)

Target user is a single person managing several of their own accounts — possibly more than one on the same platform (e.g. a personal Instagram + a business Instagram). Not building team/agency permissioning (roles, approval chains, client isolation) — that's a distinct, larger feature for a different customer.

### Core data model

```
User
 └── ConnectedAccount (many)
       - id
       - user_id (FK)
       - platform (enum: instagram, tiktok, x, linkedin, threads, ...)
       - platform_account_id (the platform's own ID for this account)
       - display_name / handle / avatar_url  (for the UI switcher)
       - access_token, refresh_token, expires_at
       - status (active / needs_reauth / revoked)
       - created_at
```

`ConnectedAccount` — not `User` and not `Platform` — is the unit everything else references. A user can have multiple rows with the same `platform` value, each with its own token and handle. Get this right first; it's the part that's expensive to retrofit later.

```
Post
 └── PostTarget (many)
       - id
       - post_id (FK)
       - connected_account_id (FK)   ← a specific account, not a platform
       - status (queued / publishing / published / failed)
       - platform_post_id (once published)
       - error_message (if failed)
       - published_at
```

One composed `Post` fans out into one `PostTarget` row per account the user selected — including multiple accounts on the same platform. **Caption is shared across all targets in v1** — no per-account override. Keeps the composer and data model simple; revisit only if real usage shows people actually want per-account edits.

### Composer flow

1. User writes/uploads content once.
2. Account picker shows every connected account as an individual toggle, grouped by platform but not collapsed into it — "X (@handle1)" and "X (@handle2)" are separate rows, not one "X" checkbox.
3. On submit: one `Post` row, one `PostTarget` per selected account.
4. Job queue processes each `PostTarget` independently, authenticating and publishing with that specific account's token.

### Why per-account (not per-platform) processing matters

- **Failure isolation** — if one account's token expired, only that `PostTarget` fails and shows a clear retry state; every other target still succeeds. Processing per-platform instead would make it ambiguous which account actually failed.
- **Rate limits are per-account** on the platforms that matter (Instagram's rolling call budget, TikTok's per-creator daily cap) — the queue needs to throttle at the `ConnectedAccount` level, or a busy account can look like a false platform-wide rate limit.
- **Token refresh is per-account** — one background job walking `ConnectedAccount` rows by `expires_at`, not one job per platform.

### Schema note for later flexibility

Leaving `PostTarget` with a nullable caption-override column (falling back to `Post.caption` when null) costs nothing now and avoids a data migration if per-account captions are ever needed — but don't build the editing UI for it until real users ask.

---

## Rough Sequencing Suggestion

| Priority | Platform | Why first/last |
|---|---|---|
| 1 | X, Threads (text) | Fastest to get posting access, lets you validate the core product loop early |
| 2 | Meta Business Verification + App Review | Longest-lead gate with a clear, documented process — start immediately, run in parallel with build |
| 3 | TikTok audit | Similar lead time to Meta, start in parallel once sandbox flow is built |
| 4 | LinkedIn | Least predictable timeline — treat as ongoing background task, don't block launch on it |
