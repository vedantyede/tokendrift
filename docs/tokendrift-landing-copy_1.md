# TokensDrift — Landing Page Copy (tokensdrift.com)

Copy for every section, top to bottom, with layout notes in *italics*. Voice: direct, developer-to-developer, zero marketing fluff. The page has one job: get the visitor to run one command.

---

## 1. Hero

*Layout: headline, subhead, command box with copy button, one line of trust text. No signup form. The command IS the CTA.*

**Headline:**
Your design system is drifting. Here's your score.

**Subhead:**
TokensDrift scans your codebase for hardcoded colors, off-scale spacing, and unused design tokens — then gives you a shareable report with a score your whole team understands.

**Primary CTA (command box):**
```
npx tokensdrift
```
*(copy button; beneath it, small text:)*
Free · No signup · Runs locally · Nothing leaves your machine

**Secondary CTA (link):**
See a live report →

---

## 2. Social proof strip

*Layout: thin bar under hero. Pre-launch, use stats instead of logos.*

**2,400+ scans run** · **180 repos badged** · **Zero dependencies**

*(Swap in real numbers; if too small at launch, use: "Zero-dependency CLI · Works with React, Tailwind, and CSS variables · MIT-friendly report format")*

---

## 3. Problem section

*Layout: short prose block, then a 3-item row. This section makes the visitor feel seen.*

**Section heading:**
You built a design system. Your codebase stopped using it.

**Body:**
It starts small. One `#3B82F6` hardcoded under deadline pressure. One `margin: 13px` that's *almost* on the scale. Six months later there are 300 of them, your "single source of truth" covers 60% of your UI, and nobody can say when it happened — because nothing was measuring it.

**Three-up row:**

- **Manual audits go stale.** The spreadsheet from last quarter's audit was outdated before the meeting ended.
- **Linters don't see drift.** Generic rules flag syntax, not adoption. They can't tell you your token coverage dropped 4% this sprint.
- **Nobody owns the number.** Design blames engineering, engineering blames deadlines, and there's no score anyone can point at.

---

## 4. How it works

*Layout: 3 numbered steps, each with a small visual (terminal snippet, report screenshot, badge).*

**Section heading:**
One command. One score. One argument your team can't ignore.

**Step 1 — Scan**
Run `npx tokensdrift` in any repo. It auto-detects your tokens from CSS variables, Tailwind config, or token JSON — no setup, no account, nothing uploaded.

**Step 2 — Score**
Get a Drift Score out of 100, a category breakdown, and the exact files responsible. Not just "you have 340 violations" — but "fix these 10 files and eliminate 60% of your drift."

**Step 3 — Share**
Add `--share` to get a hosted report URL. Paste it in Slack, drop it in a PR, show it in design review. Add the README badge so the score stays visible.

*(Show the badge: `Drift Score: 87`)*

---

## 5. Report showcase

*Layout: large screenshot or embedded live demo report. This section sells harder than any copy — invest in making the report beautiful.*

**Section heading:**
A report that makes the case for you.

**Caption:**
Every report is a self-contained page: score, trends, top offenders, and a prioritized fix list. Built to be forwarded to the person who approves the cleanup sprint.

**CTA link:** Explore a live report →

---

## 6. Paid tier — the ratchet

*Layout: dark band. This is the pitch to the design-system engineer who just ran a scan.*

**Section heading:**
The scan tells you where you are. The ratchet makes sure you never go back.

**Body:**
Install the TokensDrift GitHub App and drift can only go down. Every PR gets scanned; any PR that introduces new hardcoded values fails the check — with a comment showing the author exactly what to fix. Your score history becomes the chart you show leadership.

**Feature bullets:**
- **PR checks (ratchet mode):** new drift fails CI. Existing debt doesn't block anyone — it just can't grow.
- **Drift delta comments:** authors see the impact in the PR, not in a dashboard they'll never open.
- **Score history:** the trend line that proves the design system investment is working.
- **Slack digests:** weekly score updates and regression alerts where your team already is.

**CTA button:** Install the GitHub App — 14-day free trial, no card required

---

## 7. Pricing

*Layout: 3 cards. Free card is visually equal to paid — it's the growth engine, don't bury it.*

**Free — $0 forever**
- Unlimited local scans
- Shareable hosted reports
- README badge
- *CTA: `npx tokensdrift`*

**Pro — $29/mo per repo**
- Everything in Free
- GitHub PR checks (ratchet mode)
- Drift delta PR comments
- Score history & trends
- *CTA: Start free trial*

**Team — $79/mo up to 10 repos**
- Everything in Pro
- Slack digests & alerts
- Monorepo support
- Priority support
- *CTA: Start free trial*

*(Under cards:)* Questions about bigger teams? Email founder@tokensdrift.com — you'll get me, not a sales team.

---

## 8. Privacy / trust section

*Layout: short, plain, icon-free. Devs are deciding whether to run your code on their employer's repo.*

**Section heading:**
Your code never leaves your machine.

**Body:**
Scans run 100% locally. The CLI has zero dependencies — read the source before you run it. Sharing is opt-in: `--share` uploads only the report (aggregate stats and violation locations), never your source code, and every upload is scrubbed for secret patterns first. Reports live at unguessable URLs, are deletable by you, and expire automatically unless you claim them.

---

## 9. FAQ

**Does it work with Tailwind?**
Yes — it reads your Tailwind config as a token source and flags arbitrary values (`mt-[13px]`, `text-[#3B82F6]`) as drift.

**What stacks are supported?**
React codebases using CSS, CSS variables, Tailwind, or standard token JSON formats. More frameworks are on the roadmap — the scanner is format-based, not framework-locked.

**How is the Drift Score calculated?**
It's a weighted blend of token adoption rate, violation density, and violation concentration. The formula is public and versioned — every score links to the full violation list behind it.

**Will the PR check block my team on existing debt?**
No. Ratchet mode only fails PRs that add *new* drift. Your existing debt is baselined — it just isn't allowed to grow.

**What exactly gets uploaded with `--share`?**
The report artifact only: scores, per-category stats, file paths, and the flagged value snippets. Never full source files. Don't want anything uploaded? Don't pass `--share` — everything works offline.

**Is there a GitLab version?**
Not yet. If you need it, email me — enough requests moves it up the roadmap.

---

## 10. Final CTA

*Layout: centered, minimal. Repeat the hero command.*

**Heading:**
Find out your score in the next 60 seconds.

```
npx tokensdrift
```

*(Small text:)* Free · No signup · Your code stays local

---

## Meta / SEO

- **Title tag:** TokensDrift — Design System Drift Scanner & Score for Your Codebase
- **Meta description:** Scan your codebase for hardcoded colors, off-scale spacing, and low design token adoption. Get a shareable Drift Score in 60 seconds with one command: npx tokensdrift. Free, local, zero dependencies.
- **OG image:** a report screenshot with a big score (e.g., 62/100) — the score is the scroll-stopper.
- **Target queries:** design system drift, design token adoption, detect hardcoded colors, design system audit tool, tailwind arbitrary values lint.
