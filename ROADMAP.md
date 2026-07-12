# TokenDrift — Roadmap

This lists what's built, what's next, and in what order. It follows the phases
laid out in `docs/tokendrift-prd_1.md` — this file is the plain-language,
status-tracked version of that plan.

---

## Phase 1 — Share MVP — ✅ Done

The core loop works end to end, live in production:

- [x] CLI scans a repo and finds hardcoded colors + off-scale spacing
- [x] Token adoption rate calculated per category
- [x] Auto-detects tokens from CSS variables, Tailwind config, or token JSON
- [x] Drift Score (0–100), versioned formula
- [x] Self-contained HTML report, plus `--json` for raw data
- [x] `--share` uploads the report and returns a hosted URL
- [x] Secret scrubbing before any upload
- [x] Exit codes for CI (`--fail-on-new`, `--max-score-drop`)
- [x] Published to npm — `npx tokendrift` works for anyone
- [x] Web app live on Vercel with a real homepage and hosted report pages

- [x] Report deletion via a tokenized link — `--share` now prints
      `{url}/delete?token=...`; visiting it shows a confirm button that calls
      the existing delete API
- [x] Automatic 90-day report expiry, end to end — Redis TTL removes the
      lookup key, and a new daily Vercel Cron (`/api/cleanup`, protected by
      `CRON_SECRET`) deletes the underlying blob once it's past the same TTL,
      so expired reports don't linger as orphaned public URLs forever

**Not yet done from Phase 1:**
- [ ] Custom domain (`usetokendrift.com`) — deliberately deferred (not
      purchased/connected yet). The CLI's default `--share` target still
      points at this domain, so until it's connected, `--share` needs
      `--share-url` pointed at the current `.vercel.app` URL.

---

## Phase 2 — Badge + capture — Done

Makes the free tool self-promoting before any paid feature exists.

- [x] SVG badge endpoint (`/badge/{repoSlug}.svg`) showing the latest Drift
      Score, for embedding in a project README. Tracks a *repo*, not a single
      scan: the CLI derives a stable slug from the git origin remote (no
      account needed — see `packages/cli/src/repoIdentity.ts`), and each
      `--share` upserts that repo's badge pointer. `--share` now prints
      ready-to-paste badge markdown when a git remote is found. Unregistered
      slugs render a neutral "no data" badge (200, not a broken-image icon).
- [x] Optional email capture on hosted report pages ("email me when this
      score changes"). Lives only on the hosted page, never the local file —
      `renderReport()` takes an optional `reportId`; the form, its script,
      and even its CSS are entirely inside that conditional, so a locally
      generated report can't ship a non-functional form pointing at nothing.
      Captures land in a simple append-only list (`email-captures` in Redis)
      for the future paid-launch outreach (PRD F11) — no automated emails
      sent yet, just the capture.
- [x] "Published by TokenDrift" mode for public teardowns of open-source
      repos. `--teardown-title`/`--teardown-note` render a distinct
      branded banner (headline + short editorial note) and override the
      page `<title>`. Pure rendering choice, not hosting-dependent — works
      in both the local file and `--share`'d pages. Note: use `--share` for
      anything actually published — the local file's hero card shows the
      full local path, while `--share` correctly reduces it to just the
      repo's folder name.

**Exit target:** 20 badges live in the wild, email list started.

---

## Phase 3 — Public launch — Not started

- [ ] Launch posts: Show HN, r/webdev, dev.to
- [ ] 2–3 open-source teardowns published using the badge/teardown mode above
- [ ] Track shares-per-scan; if it falls below 0.15, pause new features and
      fix report persuasiveness first (this is a hard guardrail from the PRD,
      not a suggestion)

**Exit target:** 500 cumulative scans.

---

## Phase 4 — Paid product — Not started

Everything here is explicitly **out of scope right now** per `CLAUDE.md` —
listed here so the shape of "later" is visible, not as permission to start
building it.

- [ ] GitHub App (least-privilege: checks/PRs write, contents read on
      selected repos only)
- [ ] PR check run — scans the diff, fails on new drift vs. the base branch
      ("ratchet mode": existing debt never blocks, new debt always does)
- [ ] Drift-delta PR comments (one comment per PR, updated in place)
- [ ] Minimal dashboard: repo list, score trend chart, latest report link,
      billing — nothing else
- [ ] Slack weekly digest + regression alerts
- [ ] Stripe billing: Pro ($29/mo/repo), Team ($79/mo up to 10 repos)

**Exit target:** first 5 trials converted from the free-scan list.

---

## Phase 5 — Outreach fold-in — Ongoing, once Phase 4 ships

- [ ] Use a prospect's own scan report as the cold-outreach artifact
      ("here's your score" instead of a generic pitch)

**Exit target:** booked demos sourced from sent reports.

---

## Explicitly not on this roadmap

These come up naturally as ideas but are deliberately excluded — revisit only
after 25 paying teams, per the PRD:

- Auto-fix / codemods
- IDE extensions (VS Code, JetBrains)
- Vue, Svelte, Angular, or native mobile support
- Figma / design-tool sync
- A web-based settings UI (config stays in `tokendrift.config.js`)
- On-prem deployment, SSO/SAML

---

## Open questions that block later phases

Carried over from the PRD — decide these before starting Phase 4:

1. Per-repo vs. per-seat pricing at the Team tier
2. Report expiry: 90 days (current) or 30 — shorter drives account
   creation but weakens the sharing loop
3. GitLab support — only if ≥3 of the first 10 prospects need it
4. Monorepo scoring — one score per package with a roll-up, or one blended
   score (current lean: per-package with roll-up)
