# tokensdrift

Scan a codebase for design system drift — hardcoded colors, off-scale spacing,
and low design-token adoption — and generate a scored, shareable HTML report.

Zero runtime dependencies.

## Usage

```
npx tokensdrift <dir> [options]
```

| Flag | Purpose |
|---|---|
| `-o, --output <path>` | HTML report path (default `tokensdrift-report.html`) |
| `--json <path>` | Also write the raw scan aggregate as JSON |
| `--baseline <path>` | Compare against a previous `--json` scan |
| `--fail-on-new` | Exit 1 if new violations exist vs. baseline |
| `--max-score-drop <n>` | Exit 1 if the score drops by more than `n` |
| `--share` | Upload the report and print a hosted URL (opt-in; nothing is uploaded otherwise) |
| `--quiet` | Suppress the stdout summary |
| `-h, --help` | Show help |
| `-v, --version` | Print the tool version |

Exit codes: `0` clean/report-only, `1` threshold failure, `2` config/runtime error.

## What it detects

- Hardcoded colors (hex, rgb/rgba, hsl/hsla, named colors) in CSS, SCSS, JS/TS/JSX/TSX
- Off-scale spacing (px/rem values, Tailwind arbitrary values)
- Token adoption rate per category

Token sources are auto-detected from CSS custom properties, `tailwind.config.{js,ts}`,
or a W3C design tokens JSON file — override via `tokensdrift.config.js`.

## License

MIT
