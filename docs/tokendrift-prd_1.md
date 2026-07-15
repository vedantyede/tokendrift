# PRD: TokensDrift

**Author:** Vedant
**Status:** Draft v1.1 (final name: TokensDrift · domain: tokensdrift.com)
**Last updated:** July 11, 2026

---

## 1. Overview

### 1.1 One-liner

TokensDrift is a CLI-first tool that scans codebases for design system drift (hardcoded colors, off-scale spacing, low token adoption), generates a shareable scored report, and — for paying teams — enforces drift limits in CI so design debt can only go down.

### 1.2 Naming and identity

- **Product name:** TokensDrift (one word, capital T and D in prose; `tokensdrift` in code contexts)
- **Domain:** tokensdrift.com ("use" prefix is a domain workaround only — never part of the brand name in copy, README, badge, or npm)
- **npm:** `tokensdrift` → `npx tokensdrift`
- **GitHub org:** `tokensdrift` (verify and claim at registration time)
- **Future:** acquire tokensdrift.dev as a premium purchase post-revenue; 301 tokensdrift.com to it

### 1.3 Problem statement

Teams invest heavily in design systems and design tokens, but adoption silently erodes: developers hardcode hex values under deadline pressure, spacing drifts off-scale, and no one notices until a redesign or audit exposes hundreds of violations. Today the only options are (a) manual audits (slow, stale the moment they finish), (b) generic linters (noisy, not drift-aware, no reporting layer for non-engineers), or (c) nothing. There is no lightweight tool that measures drift, communicates it to a mixed engineering/design audience, and prevents regression continuously.

### 1.4 Product thesis

The CLI and free report are the acquisition channel; the CI ratchet and history are the business. The report is designed to be shared (Slack, PRs, design reviews), and every shared report, README badge, and PR comment exposes new users to the product. Distribution is built into the artifact the product produces.

---

## 2. Goals and non-goals

### 2.1 Goals

1. A developer can go from zero to a hosted, shareable drift report in under 2 minutes with a single `npx tokensdrift` command and no signup.
2. A team can install a GitHub App that blocks PRs introducing new drift within 15 minutes of first scan.
3. The free report is persuasive enough that recipients share it (target: ≥ 0.3 shares per scan).
4. Reach first 10 paying teams within 90 days of paid launch.

### 2.2 Non-goals (v1)

- **Auto-fix / codemods.** Deferred to a future premium tier; large scope, separate risk profile.
- **IDE extensions** (VS Code, JetBrains).
- **Framework breadth.** v1 targets React + CSS/Tailwind/CSS-variable stacks only. No Vue, Svelte, Angular, native mobile.
- **Figma/design-tool integration.** Code-side only for v1.
- **Settings UI.** All configuration lives in `tokensdrift.config.js`; no web-based config editor.

---

## 3. Target users and personas

### 3.1 Primary: Frontend/design-system engineer ("Priya")

Owns or champions the design system at a 10–200-engineer company. Feels the pain of drift personally, has authority to add a CI check, can expense $29–79/mo without procurement. **Buys the CI ratchet.**

### 3.2 Secondary: Design engineering lead / EM ("Marcus")

Needs to justify design-system investment to leadership. Wants a number that trends over time. **Buys the score history and reporting.**

### 3.3 Tertiary (free-tier only): Freelancer / consultant ("Sam")

Runs one-off audits for clients. Uses free scans and shared reports as client deliverables. Low willingness to pay, high report-sharing rate — valuable for distribution, not revenue.

---

## 4. User stories

| # | As a… | I want to… | So that… | Priority |
|---|-------|-----------|----------|----------|
| U1 | Developer | run `npx tokensdrift` with no config | I get a drift report on any repo instantly | P0 |
| U2 | Developer | add `--share` to get a hosted URL | I can paste the report in Slack/a PR | P0 |
| U3 | Developer | add a drift-score badge to my README | the team sees the score continuously | P1 |
| U4 | DS engineer | install a GitHub App with a PR check | PRs that add new hardcoded values fail | P0 (paid) |
| U5 | DS engineer | see a drift delta comment on each PR | authors see impact without leaving GitHub | P1 (paid) |
| U6 | EM | view score history per repo | I can show leadership the trend | P1 (paid) |
| U7 | DS engineer | configure token sources and ignore paths in a config file | scans match our actual system | P0 |
| U8 | DS engineer | run in "ratchet mode" | drift can only decrease, never increase | P0 (paid) |
| U9 | Team admin | manage repos and billing in a minimal dashboard | I can control spend | P1 (paid) |

---

## 5. Functional requirements

### 5.1 CLI (free, open distribution)

- **F1.** Zero-dependency Node.js CLI, runnable via `npx tokensdrift` on Node ≥ 18. No install, no login for local scans.
- **F2.** Detects: hardcoded color values (hex, rgb/rgba, hsl, named), off-scale spacing values (vs. detected or configured scale), token adoption rate (tokenized vs. raw values per category).
- **F3.** Auto-detects token sources where possible (CSS custom properties, Tailwind config, common token JSON formats); overridable in `tokensdrift.config.js`.
- **F4.** Outputs a self-contained static HTML report (no external assets) plus machine-readable JSON.
- **F5.** Computes a **Drift Score (0–100)** with a documented, stable formula (weighted: token adoption %, violation density per KLOC, violation concentration). Formula changes are versioned.
- **F6.** `--share` uploads the report and returns a public URL (`tokensdrift.com/r/{id}`). Sharing is opt-in; local scans never transmit code. Uploads contain the report artifact only (aggregates + violation locations/snippets), never the full source.
- **F7.** Exit codes suitable for CI use (`--max-score-drop`, `--fail-on-new`).

### 5.2 Hosted reports (free)

- **F8.** Public report page: score headline, category breakdown, top-10 offending files, "fix these 10 files to eliminate X% of drift" summary, TokensDrift branding, and a "Scan your codebase" CTA.
- **F9.** Report URLs are unguessable (long random IDs), deletable by creator via a tokenized link, and auto-expire after 90 days unless claimed by an account.
- **F10.** SVG badge endpoint (`tokensdrift.com/badge/{repoId}.svg`) rendering the latest score for README embedding.
- **F11.** Optional email capture on report pages ("email me when this score changes") — feeds the paid-launch list.

### 5.3 GitHub App + dashboard (paid)

- **F12.** GitHub App with least-privilege permissions (checks: write, PRs: write, contents: read on selected repos only).
- **F13.** PR check run: scans the diff/branch, compares against base, fails per ratchet policy (`fail-on-new` default).
- **F14.** PR comment with drift delta: score change, new violations introduced, files affected. One comment per PR, updated in place (no spam).
- **F15.** Dashboard: repo list, score trend chart, latest report link, billing. Nothing else in v1.
- **F16.** Slack webhook: weekly score digest + regression alerts.
- **F17.** Stripe billing: Pro $29/mo per repo; Team $79/mo up to 10 repos + Slack integration. 14-day trial, no card required for trial.

### 5.4 Configuration

- **F18.** Single `tokensdrift.config.js` (or `.json`): token sources, spacing scale, include/ignore globs, severity overrides, allowed exceptions (with required justification comments). Config is the source of truth for both CLI and CI.

---

## 6. Non-functional requirements

- **N1. Performance:** scan of a 200 KLOC repo completes in < 30s on a typical laptop; PR-diff scans in CI < 60s p95.
- **N2. Privacy/security:** local-only by default; shared reports contain no secrets (secret-pattern scrubbing before upload); GitHub App never clones to persistent storage beyond scan lifetime; SOC-2-friendly posture documented even pre-certification.
- **N3. Reliability:** report hosting ≥ 99.5% uptime; a hosting outage must never break local CLI scans.
- **N4. Score stability:** identical codebase + config ⇒ identical score across runs and machines (deterministic ordering, versioned rules).
- **N5. Zero-dependency constraint preserved** for the CLI core (differentiator and trust signal).

---

## 7. Growth mechanics (product requirements, not marketing)

1. **PR comments** (F14) expose the product to every teammate of a paying user. Comment footer includes product name + link.
2. **README badges** (F10) are persistent backlinks and social proof; badge click lands on the repo's public score page.
3. **Shared reports** (F8) must function as an *argument* for action, not a data dump — the "top 10 files = X% of drift" framing is a requirement, not a nicety.
4. **Public teardowns:** the report renderer must support a "published by TokensDrift" mode for editorial teardowns of open-source repos (content marketing powered by the product itself).

---

## 8. Success metrics

| Metric | Target (90 days post-launch) |
|---|---|
| Free scans / week | 500 |
| Shares per scan (report URL opened by ≥1 non-creator) | ≥ 0.3 |
| Scan → account signup | ≥ 8% |
| Signup → GitHub App install (trial) | ≥ 20% |
| Trial → paid | ≥ 25% |
| Paying teams | 10 |
| README badges live | 100 |

**North-star metric:** weekly active repos under CI enforcement (leading indicator of durable revenue).

Guardrail: if shares-per-scan < 0.15 after launch, stop feature work and iterate on report persuasiveness first.

---

## 9. Rollout plan

| Phase | Weeks | Scope | Exit criteria |
|---|---|---|---|
| 1. Share MVP | 1–2 | F1–F9 (CLI + hosted reports) | `npx tokensdrift → shared URL` works end-to-end |
| 2. Badge + capture | 3–4 | F10–F11 | 20 badges in the wild; email list started |
| 3. Launch (free) | 4 | Show HN, r/webdev, dev.to + 3 open-source teardowns | 500 cumulative scans |
| 4. Paid product | 5–8 | F12–F17 | First 5 trials converted from scan list |
| 5. Outreach fold-in | ongoing | Send prospects their own report as the cold-outreach artifact | Booked demos from report sends |

---

## 10. Risks and mitigations

| Risk | Likelihood | Mitigation |
|---|---|---|
| Scanner is easy to clone (an LLM can write a crude version quickly) | High | Moat = ratchet + history data + badge network, not detection rules. Prioritize GitHub App over rule polish. |
| Noisy results (false positives) kill trust on first run | High | Conservative defaults; auto-detected scales require confidence threshold; first-run report labels "needs config" items separately from violations. |
| Devs won't upload anything from their codebase | Medium | Local-first default, explicit `--share`, publish exactly what is transmitted, secret scrubbing (N2). |
| GitHub marketplace/app review delays | Medium | Start app review in week 5, not week 8. |
| Free tier cannibalizes paid | Low | Free = point-in-time snapshot; paid = enforcement + history. Different jobs. |
| Score formula disputes ("why is my score 62?") | Medium | Publish the formula; every score links to its full violation list. |

---

## 11. Open questions

1. Per-repo vs. per-seat pricing at Team tier — validate in the next 5 customer interviews.
2. Should report expiry (F9) be 90 days or 30? Shorter drives account creation but weakens the sharing loop.
3. GitLab support demand — punt unless ≥ 3 of first 10 prospects require it.
4. Monorepo scoring: one score per workspace/package or one blended score? Leaning per-package with a roll-up.

---

## 12. Out of scope (explicit)

Auto-fix codemods, IDE extensions, Figma sync, non-React frameworks, on-prem deployment, SSO/SAML, web-based config editing. Revisit after 25 paying teams.
