# TokenDrift

CLI tool that scans codebases for design system drift (hardcoded colors, off-scale spacing, low token adoption) and generates a scored, shareable HTML report. Domain: usetokendrift.com. npm: `tokendrift`.

Full spec lives in `docs/tokendrift-prd.md` — read it before making product decisions.

## Current phase

**Phase 1 (Share MVP) and Phase 2 (badge + capture) are done.** Phase 3
(public launch) is in progress — real teardowns are live, but the 500
cumulative-scan exit target from the PRD's rollout plan hasn't been hit
yet, since launch posts haven't been published.

**Phase 4 (paid product) has been started deliberately ahead of that
exit target** — GitHub App, PR ratchet checks, drift-delta PR comments,
a minimal dashboard, Slack digests, and Stripe billing are now in scope.
See `ROADMAP.md` for per-feature status. Full accounts/auth are still
not automatically in scope just because Phase 4 is — the identity model
for the dashboard (GitHub App installation vs. a separate login) is an
open decision, not a foregone one; raise it before building the
dashboard specifically. See "Out of scope" below for what's still
excluded regardless of phase.

## Architecture

- **`packages/cli`** — the scanner. Node ≥ 18, ESM. **ZERO runtime dependencies — this is a hard product constraint, not a preference.** No commander, no chalk, no glob libs. Use `node:` builtins (`fs`, `path`, `util.parseArgs`, `fs.glob` if available on target Node, else hand-rolled walker).
- **`apps/web`** — Next.js app on Vercel: landing page + hosted report pages (`/r/[id]`) + upload API route.
- Report is a **self-contained HTML file** (inline CSS/JS, no external assets). The same renderer produces the local file and the hosted page.

## Scanner spec (v1)

Detect in `.css`, `.scss`, `.tsx`, `.jsx`, `.ts`, `.js`:
1. **Hardcoded colors:** hex (3/4/6/8), rgb/rgba(), hsl/hsla(), CSS named colors. In JSX: style props, styled-components templates, Tailwind arbitrary values (`text-[#3B82F6]`).
2. **Off-scale spacing:** px/rem values not on the detected or configured scale; Tailwind arbitrary spacing (`mt-[13px]`).
3. **Token adoption rate:** ratio of tokenized values (var(--x), theme() refs, Tailwind scale classes) to raw values, per category.

Token sources (auto-detect, overridable in `tokendrift.config.js`): CSS custom properties in the repo, `tailwind.config.{js,ts}`, token JSON (W3C design tokens format).

**Drift Score (0–100):** weighted — token adoption % (50%), violation density per KLOC (30%), violation concentration (20%). Deterministic: same input ⇒ same score. Version the formula (`scoreVersion` in JSON output).

Ignore by default: `node_modules`, `dist`, `build`, `.next`, `coverage`, lockfiles, `*.min.*`, generated files. Respect `.gitignore`.

## `--share` behavior

- Opt-in only. Uploads the report artifact (JSON: aggregates, file paths, flagged value snippets) — NEVER full source files.
- Run secret-pattern scrubbing on snippets before upload (common key/token regexes).
- POST to the web app, get back `https://usetokendrift.com/r/{id}` (unguessable nanoid, ≥ 21 chars) + a deletion token printed once.

## Conventions

- TypeScript everywhere; CLI compiles to a single bundled JS file (bundling dev-deps are fine; the *published artifact* has zero deps).
- Tests: `node:test` in the CLI package (keeps zero-dep purity); vitest in web.
- Every scanner rule gets fixture-based tests: `fixtures/<rule>/input` + expected findings JSON.
- Exit codes: 0 clean/report-only, 1 threshold failure (`--fail-on-new`, `--max-score-drop`), 2 config/runtime error.
- No interactive prompts in the CLI — it must run cleanly in CI.
- Performance target: 200 KLOC repo in < 30s.

## Out of scope (do not build even if it seems helpful)

Auto-fix/codemods, IDE extensions, Vue/Svelte/Angular support, Figma sync,
settings UI. Full user accounts (email/password signup, sessions) stay out
of scope unless a specific Phase 4 feature genuinely can't work without
one — prefer scoping identity through the GitHub App installation and
Stripe customer records first.
