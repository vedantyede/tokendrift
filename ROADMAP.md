# TokensDrift — Roadmap

This lists what's built, what's next, and in what order. It follows the phases
laid out in `docs/tokensdrift-prd_1.md` — this file is the plain-language,
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
- [x] Published to npm — `npx tokensdrift` works for anyone
- [x] Web app live on Vercel with a real homepage and hosted report pages

- [x] Report deletion via a tokenized link — `--share` now prints
      `{url}/delete?token=...`; visiting it shows a confirm button that calls
      the existing delete API
- [x] Automatic 90-day report expiry, end to end — Redis TTL removes the
      lookup key, and a new daily Vercel Cron (`/api/cleanup`, protected by
      `CRON_SECRET`) deletes the underlying blob once it's past the same TTL,
      so expired reports don't linger as orphaned public URLs forever

**Not yet done from Phase 1:**
- [ ] Custom domain (`tokensdrift.com`) — deliberately deferred (not
      purchased/connected yet). The CLI's default `--share` target still
      points at this domain, so until it's connected, `--share` needs
      `--share-url` pointed at the current `.vercel.app` URL. **Promoted to
      the first task of Phase 3** (see below) — do it before any launch
      post, not after.

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
- [x] "Published by TokensDrift" mode for public teardowns of open-source
      repos. `--teardown-title`/`--teardown-note` render a distinct
      branded banner (headline + short editorial note) and override the
      page `<title>`. Pure rendering choice, not hosting-dependent — works
      in both the local file and `--share`'d pages. Note: use `--share` for
      anything actually published — the local file's hero card shows the
      full local path, while `--share` correctly reduces it to just the
      repo's folder name.

**Exit target:** 20 badges live in the wild, email list started.

---

## Phase 3 — Public launch — In progress (strict order)

Order matters here, not just the list of tasks:

1. [ ] **Connect `tokensdrift.com` first** — before any launch post.
       Links posted publicly are permanent; a `.vercel.app` URL in a Show HN
       post reads as abandoned a year later in a way a real domain doesn't.
2. [ ] **Launch posts, one per week — not all at once:** Show HN, then
       r/webdev (in the Showoff Saturday megathread — see
       `docs/launch-posts.md`), then dev.to. Three separate traffic spikes
       teach more than a single simultaneous blast, and each gets its own
       bug-fix window before the next one lands. **Deliberately not done by
       me** — posting under your identity/reputation on a third-party
       platform is your call. Draft copy is ready in `docs/launch-posts.md`.
3. [ ] **Budget a bug-fix window after each post.** Real users will hit
       scanner edge cases the teardowns didn't — the teardowns alone
       surfaced four real bugs (EMFILE crash, named-color false positives,
       test-file false positives, plus the bespoke-token-source limitation),
       and launch traffic is a different, larger sample than three
       hand-picked repos.
4. [x] 2–3 open-source teardowns published using the badge/teardown mode above.
      Three live, real, independently-verified:
      - [Dub — 82/100, 93% adoption](https://tokensdrift-vedantyedes-projects.vercel.app/r/9GNaJ2M_jc81GDZ_9B9Z5Q)
      - [Twenty — 77/100, 80% adoption](https://tokensdrift-vedantyedes-projects.vercel.app/r/60K5vksSV58e7yNR4oRh1w)
      - [Formbricks — 87/100, 96% adoption](https://tokensdrift-vedantyedes-projects.vercel.app/r/JuKMkzk5IYM2dc7R19DsMQ)

      Producing these surfaced and fixed two more real scanner bugs (in
      addition to the two from the outreach-drafting work): named colors
      inside bespoke non-CSS palette/theme files and raw HTML email
      templates read as "violations" when they're not (documented as a
      known v1 scope limit, not fixed — no generic way to recognize
      arbitrary token-source formats), and test files full of intentional
      color literals as fixtures (fixed — test files now excluded by
      default). Every number cited was independently checked against the
      actual file content before publishing, not just taken from the raw
      scan output.
5. [x] Track shares-per-scan — as an honest proxy, not the literal PRD metric.
      True total scans can't be counted without breaking the "your code
      never leaves your machine" promise (local scans are never reported at
      all), so there's no real denominator for "shares per scan." What's
      actually measurable: `GET /api/stats` returns `reportsCreated`,
      `totalViews`, and `viewsPerReport` (hosted-report views ÷ reports
      shared) — unauthenticated, since it's aggregate counts only, no
      per-user data. Verified live: shared a report, viewed it 3 times, a
      404 to a nonexistent report correctly didn't count, `viewsPerReport`
      came back as exactly 3. **The 0.15 guardrail itself doesn't map
      cleanly onto this proxy** — `viewsPerReport` measures something
      related but not identical to the PRD's "opened by ≥1 non-creator"
      definition. Worth revisiting once there's real traffic to look at.

**Exit target:** 500 cumulative scans — using `viewsPerReport` plus npm
download counts together as the honest denominator, since neither alone
captures true total scans.

---

## Phase 4 — Paid product — In progress (strict order)

**Started deliberately ahead of Phase 3's exit target** (500 cumulative
scans — not yet hit, since launch posts haven't been published). This was
an explicit decision, not an oversight — see `CLAUDE.md` for the current
phase note. Full user accounts are still not automatically in scope; see
`CLAUDE.md`'s "Out of scope" section for the identity-model caveat.

Order matters here too — ship in this sequence, not the order the features
were originally listed in:

1. [ ] **Stripe billing first.** Pro $29/mo/repo, Team $79/mo up to 10
       repos. You can't convert a trial without a way to pay, but you *can*
       convert one without a dashboard — billing unblocks revenue sooner
       than the other three items. Includes checkout, the customer portal,
       and plan gating on the GitHub App.
2. [ ] **Drift-delta PR comments second** (one comment per PR, updated in
       place) — the retention feature. The check run blocks a merge once;
       the PR comment is what gets read on every PR, daily.
3. [ ] **Minimal dashboard third** — repo list, score trend chart, latest
       report link, billing portal link. Four things; resist adding a
       fifth before these four are solid.
4. [ ] **Slack weekly digest + regression alerts last** — needs teams with
       real repos connected to exist first, or there's nothing to digest.
5. [x] GitHub App (`tokensdrift`, least-privilege: checks/PRs write,
       contents read). Registered via GitHub's manifest flow
       (`/setup/github-app`) rather than manual setup. Installation
       tracking verified live against a real install (25 repos, correct
       account/repo data stored).
6. [x] PR check run — scans the diff, fails on new drift vs. the base
       branch ("ratchet mode": existing debt never blocks, new debt always
       does). Fetches file content via GitHub's API (no `git` binary in
       Vercel's serverless runtime, so cloning wasn't an option) and
       reuses the CLI's own fingerprint-based diff logic
       (`tokensdrift/scan`), so "new violation" means the same thing here
       as in `--fail-on-new`. Verified with a real throwaway PR: 2
       intentional new hex-color violations correctly detected, Check Run
       correctly failed with the exact file/line/value, existing debt
       correctly excluded.

**Exit target:** first 5 trials converted from the email-capture list.

**Phase 4 hardening backlog** — real, known limitations, deliberately
deferred until a paying customer actually hits them, not fixed speculatively
now:
- Per-repo `tailwind.config`/token-JSON fetching in the PR check (currently
  `DEFAULT_CONFIG` only — no way yet to honor a repo's own token setup)
- A real job queue for webhook processing (currently synchronous within the
  request, which risks timing out on large PRs)
- Scanning PRs with more than 200 changed files (currently capped, partial
  scan beyond that)

---

## Phase 5 — Outreach fold-in — Ongoing, once Phase 4 ships

- [ ] Use a prospect's own scan report as the cold-outreach artifact
      ("here's your score" instead of a generic pitch)

**Exit target:** booked demos sourced from sent reports.

---

## Expansion A — License & component compliance scanner — GATED

**Gate: 5 paying teams.** Not before — the go-to-market for this is "from
the makers of TokensDrift," which requires TokensDrift to be an established
name first, not a project. Reuses the scanner pipeline, report renderer,
`--share` infra, and badge endpoint nearly wholesale, so the marginal build
cost is low once the gate opens.

MVP when the gate opens:
- [ ] Lockfile-based dependency tree (npm/yarn/pnpm)
- [ ] SPDX license detection + GPL flags; EOL/deprecation via registry +
      endoflife.date
- [ ] Duplicate-library detection (two datepickers, three modals)
- [ ] Compliance Score, versioned formula; 3 public teardowns (same
      playbook as the Drift Score teardowns)
- [ ] Paid: CI fail-on-new-GPL/EOL, PDF export (the agency feature),
      multi-repo rollup — $49/mo agency, $199/mo enterprise

**Exit target:** 3 paying agencies.

---

## Expansion B — Figma token sync — GATED HARD

**Gate: 25 paying teams** — unchanged from the original PRD's own rule for
this feature, kept on purpose rather than loosened. Graduated out of the
permanent exclusion list below into a real gated expansion, since it now
has an actual plan instead of just being deferred indefinitely — but the
gate itself didn't move. Figma plugins are a different runtime, review
process, and support burden than anything else here.

When it opens: variables/styles → Tailwind/CSS vars/Style Dictionary
export; a diff mode ("Figma says #6366F1, code says #6466F2") that points
TokensDrift's existing drift detection at the design side, not just code;
bundle pricing with TokensDrift Team (~$99/mo suite).

---

## Explicitly not on this roadmap

These come up naturally as ideas but are deliberately excluded — revisit only
after 25 paying teams, per the PRD:

- Auto-fix / codemods
- IDE extensions (VS Code, JetBrains)
- Vue, Svelte, Angular, or native mobile support
- A web-based settings UI (config stays in `tokensdrift.config.js`)
- On-prem deployment, SSO/SAML

---

## Open questions that block later phases

Carried over from the PRD — decide these before Stripe billing goes live
(Phase 4, item 1), since pricing/expiry choices are far harder to change
once real customers are paying under them:

1. Per-repo vs. per-seat pricing at the Team tier — **lean per-repo**:
   drift is a property of a codebase, not a person using it. Confirm with
   the first 3 real Team prospects rather than deciding this in the
   abstract.
2. Report expiry: 90 days (current) or 30 — **lean keep 90** until account
   creation actually exists to drive people toward claiming a report;
   shortening it today would only weaken the sharing loop without a
   replacement incentive.
3. GitLab support — only if ≥3 of the first 10 prospects need it
4. Monorepo scoring — one score per package with a roll-up, or one blended
   score (current lean: per-package with roll-up)
