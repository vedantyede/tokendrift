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

## Phase 2 — Badge + capture — Not started

Makes the free tool self-promoting before any paid feature exists.

- [ ] SVG badge endpoint (`usetokendrift.com/badge/{repoId}.svg`) showing the
      latest Drift Score, for embedding in a project README
- [ ] Optional email capture on hosted report pages ("email me when this
      score changes") — feeds the future paid-launch list
- [ ] "Published by TokenDrift" mode for public teardowns of open-source
      repos (content marketing using the product itself)

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
