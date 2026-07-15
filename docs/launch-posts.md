# Launch post drafts

Ready-to-post copy for Show HN, r/webdev, and dev.to. All claims are things
that are actually true right now — no placeholder stats, no invented
numbers. Swap `[Your name]` and post whenever you're ready; I'm not
posting these myself.

---

## Show HN

**Title** (80 char HN limit):

```text
Show HN: TokensDrift – find hardcoded colors/spacing hiding in your CSS
```

**Body** (goes in the URL/text field, or as the first comment if you
submit a link instead):

```text
Hi HN — I built TokensDrift, a CLI that scans a codebase for design
system drift: hardcoded colors and off-scale spacing that quietly
bypass your design tokens.

npx tokensdrift .

It's zero-dependency Node, runs entirely locally, and gives you a
Drift Score (0-100) plus a report showing exactly which files and
lines are responsible. --share is opt-in and uploads only the report
data (never source), if you want a link to paste in a PR or Slack.

Why I built it: every design system I've worked with rots the same
way. Someone hardcodes #3B82F6 under deadline pressure, someone else
does margin: 13px instead of the actual spacing scale, and six months
later nobody can say when "mostly following the system" became
"barely following it" — because nothing was measuring it.

Three real examples, not staged demos — I ran it against open-source
repos and checked every number by hand before publishing:
- Dub (dub.co): 82/100, 93% token adoption
  https://tokensdrift-vedantyedes-projects.vercel.app/r/9GNaJ2M_jc81GDZ_9B9Z5Q
- Formbricks: 87/100, 96% adoption
  https://tokensdrift-vedantyedes-projects.vercel.app/r/JuKMkzk5IYM2dc7R19DsMQ
- Twenty (CRM): 77/100, 80% adoption — one CSS file explains most of
  the gap: it declares its own tokens at the top and then falls back
  to a dozen+ different raw hex values in the rest of the file anyway.
  https://tokensdrift-vedantyedes-projects.vercel.app/r/60K5vksSV58e7yNR4oRh1w

Current scope: CSS/SCSS/JS/TS/JSX/TSX, auto-detects tokens from CSS
custom properties, Tailwind config, or W3C token JSON. No Vue/Svelte
support yet, no auto-fix (by design — I'd rather show you where the
drift is than guess at a rewrite).

Source: https://github.com/vedantyede/tokendrift
npm: https://www.npmjs.com/package/tokensdrift

Happy to answer questions about the scoring formula, the false
positives I found and fixed while building this (test files count as
drift by default in a naive version — worth watching for if you build
something similar), or anything else.
```

---

## r/webdev

**Important:** r/webdev's rules require project self-promotion to go in
the weekly **"Showoff Saturday"** stickied megathread, not as a standalone
post — a standalone post like this would likely get removed under Rule 3
(no self-promotion) and Rule 5 (no soliciting feedback outside that
thread). Post this as a **comment inside that week's Showoff Saturday
thread** instead (pinned at the top of the subreddit on Saturdays).
Megathread comments are also expected to be shorter than a standalone
post — trimmed accordingly below.

**Comment (for the Showoff Saturday thread):**

```text
TokensDrift — a CLI that scores how much a codebase has drifted from
its own design tokens (hardcoded colors, off-scale spacing).

    npx tokensdrift .

Zero dependencies, runs 100% locally, opt-in --share if you want a
hosted link instead of just a local HTML file.

Sanity-checked it against a few real open-source repos instead of
just synthetic tests, which turned up real bugs (a crash on repos
with tens of thousands of files, and named colors like "red"/"blue"
getting flagged even in plain data objects with nothing to do with
styling). Fixed both. Results:

- Dub: 82/100 — https://tokensdrift-vedantyedes-projects.vercel.app/r/9GNaJ2M_jc81GDZ_9B9Z5Q
- Formbricks: 87/100 — https://tokensdrift-vedantyedes-projects.vercel.app/r/JuKMkzk5IYM2dc7R19DsMQ
- Twenty: 77/100 — https://tokensdrift-vedantyedes-projects.vercel.app/r/60K5vksSV58e7yNR4oRh1w

CSS/SCSS/JS/TS/JSX/TSX, auto-detects tokens from CSS variables,
Tailwind config, or token JSON. No Vue/Svelte yet.

Source: https://github.com/vedantyede/tokendrift

Would love to know what it finds (or gets wrong) on your codebase.
```

---

## dev.to

**Title:**

```text
How much has your codebase drifted from your own design system? I built a CLI to find out.
```

**Tags:** `webdev`, `css`, `showdev`, `opensource`

**Article body:**

```markdown
## The problem nobody's tracking

Every team I've worked with eventually hits the same wall: they build
a design system, adoption is great for the first few months, and then
it just... erodes. Someone hardcodes `#3B82F6` because the deadline is
today and the token name isn't at their fingertips. Someone writes
`margin: 13px` because it looks close enough to the spacing scale.

Nobody notices, because nothing is measuring it. The only options are
a manual audit (stale before the meeting where you present it ends) or
a generic linter (which flags syntax, not *adoption* — it can't tell
you your token coverage dropped 4% this sprint).

So I built [TokensDrift](https://github.com/vedantyede/tokendrift), a
CLI that scans a codebase and turns "design system drift" into one
number.

## What it does

    npx tokensdrift .

It walks your `.css`, `.scss`, `.tsx`, `.jsx`, `.ts`, and `.js` files
and finds:

1. **Hardcoded colors** — hex, `rgb()`/`hsl()`, named colors, and
   Tailwind arbitrary values like `bg-[#1D4ED8]`
2. **Off-scale spacing** — px/rem values that don't match your spacing
   scale, including `mt-[13px]`-style Tailwind arbitrary values
3. **Token adoption rate** — tokenized vs. raw values, per category

It auto-detects your tokens from CSS custom properties, a Tailwind
config, or a W3C design tokens JSON file — no setup required for most
projects. Everything rolls up into a **Drift Score** (0-100), with a
category breakdown and the exact files responsible.

It's zero-dependency Node and runs entirely on your machine. `--share`
is opt-in — pass it and it uploads *only* the report (scores, file
paths, flagged snippets — never your source) and gives you back a
hosted link plus a one-time delete link.

## Testing it against real code (and what broke)

I didn't want to ship this on the strength of synthetic test fixtures
alone, so I ran it against a few real open-source repos. That turned
up real bugs I wouldn't have found otherwise:

- **A crash on large repos.** The scanner read every matched file
  concurrently with no cap. Fine on small projects, but a 26,000-file
  repo blew past the OS file-descriptor limit — `EMFILE`. Fixed with a
  bounded worker pool.
- **False positives outside real style code.** The color-word rule
  (`red`, `blue`, etc.) matched the text `color: <word>` anywhere in a
  `.ts`/`.tsx` file. That's fine in a stylesheet, but it also flagged
  things like `{ label: 'Akron', color: 'blue' }` in a plain dropdown
  options array — English color words show up constantly in data that
  has nothing to do with styling. Hex codes and `rgb()`/`hsl()` don't
  have this problem (they're unambiguous wherever they appear), so I
  restricted the named-color rule specifically to real style
  contexts — CSS/SCSS files, JSX `style={{}}` props, and
  styled-components-style tagged templates.
- **Test files as false positives.** A color-parsing test suite
  (`styles.test.ts`) was the single biggest "violation" offender in
  one repo, packed with color literals used as intentional test data.
  Test files are now excluded by default.

Every one of these came from actually running the tool on real code,
not from imagining edge cases in advance.

## Real examples

After fixing those, here's what three real open-source repos actually
score (I checked every "top offender" file by hand before citing it —
a couple of tempting numbers turned out to be a brand-color palette
file and a raw HTML email template, neither of which is real drift):

| Repo | Score | Token adoption |
|---|---|---|
| [Dub](https://tokensdrift-vedantyedes-projects.vercel.app/r/9GNaJ2M_jc81GDZ_9B9Z5Q) | 82/100 | 93% |
| [Formbricks](https://tokensdrift-vedantyedes-projects.vercel.app/r/JuKMkzk5IYM2dc7R19DsMQ) | 87/100 | 96% |
| [Twenty](https://tokensdrift-vedantyedes-projects.vercel.app/r/60K5vksSV58e7yNR4oRh1w) | 77/100 | 80% |

Twenty's report is a good example of what this is actually for: one
CSS file declares its own custom properties at the top, then falls
back to a dozen+ different raw hex values in the rest of the file
instead of using them. That's exactly the kind of partial-adoption
pattern that's invisible without something measuring it.

## What's next

Current scope is CSS/SCSS/JS/TS/JSX/TSX — no Vue, Svelte, or Angular
yet. No auto-fix, on purpose: I'd rather show you precisely where the
drift is than guess at a rewrite. If there's real interest, a CI mode
that fails a PR on *new* drift (without blocking on existing debt) is
next.

Source is open: https://github.com/vedantyede/tokendrift
npm: https://www.npmjs.com/package/tokensdrift

Would genuinely like to know what it finds (or gets wrong) on your
codebase.
```
