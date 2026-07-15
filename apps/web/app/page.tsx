import Link from 'next/link';
import styles from './page.module.css';

const findings = [
  { color: '#F5F5F5', loc: 'Card.tsx:4', before: "backgroundColor: '#F5F5F5'", after: 'var(--color-surface)' },
  { color: '#1D4ED8', loc: 'Card.tsx:5', before: 'bg-[#1D4ED8]', after: 'bg-blue-700' },
  { color: 'gray', loc: 'Card.tsx:7', before: "color: 'gray'", after: 'var(--color-muted)' },
  { color: 'rgba(0,0,0,0.1)', loc: 'styles.css:9', before: 'rgba(0, 0, 0, 0.1)', after: 'var(--color-border)' },
  { color: 'transparent', loc: 'styles.css:10', before: 'padding: 13px', after: 'var(--space-3) · 12px' },
  { color: 'transparent', loc: 'styles.css:24', before: 'padding: 10px 17px', after: 'var(--space-4) · 16px' },
];

export default function Home() {
  return (
    <>
      <header className={styles.header}>
        <div className={styles.wordmark}>
          tokens<span>drift</span>
        </div>
        <nav>
          <Link href="#scan">Sample scan</Link>
        </nav>
      </header>

      <main className={styles.main}>
        <section className={styles.hero}>
          <div className={styles.eyebrow}>Design system drift detection</div>
          <h1>Your design system is drifting. Here&rsquo;s your score.</h1>
          <p className={styles.heroSub}>
            TokensDrift scans your codebase for hardcoded colors, off-scale spacing, and unused
            design tokens &mdash; then gives you a shareable report with a <strong>score</strong>{' '}
            your whole team understands.
          </p>

          <div className={styles.driftStrip} role="img" aria-label="Row of design tokens drifting into misaligned hardcoded values">
            <div className={`${styles.chip} ${styles.tokenized}`}><div className={styles.swatch} style={{ background: '#2f6f5a' }} /><div className={styles.chipLabel}>--space-2</div></div>
            <div className={`${styles.chip} ${styles.tokenized}`}><div className={styles.swatch} style={{ background: '#3d8a70' }} /><div className={styles.chipLabel}>--space-3</div></div>
            <div className={`${styles.chip} ${styles.tokenized}`}><div className={styles.swatch} style={{ background: '#4ba384' }} /><div className={styles.chipLabel}>--color-ink</div></div>
            <div className={`${styles.chip} ${styles.tokenized}`}><div className={styles.swatch} style={{ background: '#5cb996' }} /><div className={styles.chipLabel}>--color-brand</div></div>
            <div className={`${styles.chip} ${styles.drifted}`}><div className={styles.swatch} style={{ background: '#F5F5F5' }} /><div className={styles.chipLabel}>#F5F5F5</div></div>
            <div className={`${styles.chip} ${styles.drifted}`}><div className={styles.swatch} style={{ background: '#1D4ED8' }} /><div className={styles.chipLabel}>#1D4ED8</div></div>
            <div className={`${styles.chip} ${styles.drifted}`}><div className={styles.swatch} style={{ background: 'gray' }} /><div className={styles.chipLabel}>gray</div></div>
            <div className={`${styles.chip} ${styles.drifted}`}><div className={styles.swatch} style={{ background: '#333' }} /><div className={styles.chipLabel}>13px</div></div>
          </div>
          <div className={styles.driftCaption}>
            <span>On system</span>
            <span>Drifted</span>
          </div>

          <div className={styles.ctaRow}>
            <div className={styles.commandBox}>
              <span className={styles.prompt}>$</span> npx tokensdrift
            </div>
            <Link className={styles.btn} href="#scan">
              See a live report &rarr;
            </Link>
          </div>
          <div className={styles.trustLine}>Free &middot; No signup &middot; Runs locally &middot; Nothing leaves your machine</div>
        </section>

        <section className={styles.section}>
          <div className={styles.sectionHead}>
            <div className={styles.eyebrow}>The problem</div>
            <h2>You built a design system. Your codebase stopped using it.</h2>
            <p>
              It starts small. One <code>#3B82F6</code> hardcoded under deadline pressure. One{' '}
              <code>margin: 13px</code> that&rsquo;s <em>almost</em> on the scale. Six months later
              there are 300 of them, and nobody can say when it happened &mdash; because nothing
              was measuring it.
            </p>
          </div>
          <div className={styles.threeUp}>
            <div>
              <h3>Manual audits go stale</h3>
              <p>The spreadsheet from last quarter&rsquo;s audit was outdated before the meeting ended.</p>
            </div>
            <div>
              <h3>Linters don&rsquo;t see drift</h3>
              <p>Generic rules flag syntax, not adoption. They can&rsquo;t tell you token coverage dropped 4% this sprint.</p>
            </div>
            <div>
              <h3>Nobody owns the number</h3>
              <p>Design blames engineering, engineering blames deadlines &mdash; there&rsquo;s no score anyone can point at.</p>
            </div>
          </div>
        </section>

        <section className={styles.section} id="how">
          <div className={styles.sectionHead}>
            <div className={styles.eyebrow}>How it works</div>
            <h2>One command. One score. No dashboard login required.</h2>
          </div>
          <div className={styles.steps}>
            <div className={styles.step}>
              <div className={styles.stepIndex}>01</div>
              <h3>Scan</h3>
              <p>
                Run <code>npx tokensdrift</code> in any repo. It auto-detects your tokens from CSS
                variables, Tailwind config, or token JSON &mdash; no setup, no account, nothing
                uploaded.
              </p>
            </div>
            <div className={styles.step}>
              <div className={styles.stepIndex}>02</div>
              <h3>Score</h3>
              <p>
                Get a Drift Score out of 100, a category breakdown, and the exact files
                responsible &mdash; not just a violation count.
              </p>
            </div>
            <div className={styles.step}>
              <div className={styles.stepIndex}>03</div>
              <h3>Share</h3>
              <p>
                Add <code>--share</code> for a hosted report URL. Paste it in Slack, drop it in a
                PR, show it in design review.
              </p>
            </div>
          </div>
        </section>

        <section className={styles.section} id="scan">
          <div className={styles.sectionHead}>
            <div className={styles.eyebrow}>Not a mockup</div>
            <h2>This is an actual scan output.</h2>
            <p>
              Run against a small sample component and stylesheet. Every value below is a real
              finding &mdash; file, line, and the fix.
            </p>
          </div>

          <div className={styles.scanPanel}>
            <div className={styles.scanPanelTop}>
              <span className={styles.path}>tokensdrift examples/sample-repo</span>
              <span>2 files &middot; 37 lines</span>
            </div>
            <div className={styles.scanBody}>
              <div className={styles.scoreBlock}>
                <div>
                  <div className={styles.scoreNumber}>
                    36<span>/100</span>
                  </div>
                  <div className={styles.scoreCaption}>
                    Drift Score &mdash; lower means more raw values slipping past your tokens.
                  </div>
                </div>
                <div className={styles.bars}>
                  <div className={styles.barRow}>
                    <div className={styles.barLabel}>
                      <span>Token adoption</span>
                      <span>31.6%</span>
                    </div>
                    <div className={styles.barTrack}>
                      <div className={styles.barFill} style={{ width: '31.6%' }} />
                    </div>
                  </div>
                  <div className={styles.barRow}>
                    <div className={styles.barLabel}>
                      <span>Violation density</span>
                      <span>high</span>
                    </div>
                    <div className={styles.barTrack}>
                      <div className={styles.barFill} style={{ width: '92%' }} />
                    </div>
                  </div>
                  <div className={styles.barRow}>
                    <div className={styles.barLabel}>
                      <span>Concentration</span>
                      <span>2 files</span>
                    </div>
                    <div className={styles.barTrack}>
                      <div className={styles.barFill} style={{ width: '60%' }} />
                    </div>
                  </div>
                </div>
              </div>

              <div className={styles.findings}>
                {findings.map((f) => (
                  <div className={styles.finding} key={f.loc}>
                    <div className={styles.findingSwatch} style={{ background: f.color }} />
                    <div className={styles.findingMain}>
                      <div className={styles.findingLoc}>{f.loc}</div>
                      <div className={styles.findingSnippet}>{f.before}</div>
                    </div>
                    <div className={styles.findingFix}>{f.after}</div>
                  </div>
                ))}
              </div>
            </div>
            <div className={styles.scanFooter}>
              <span>13 violations total</span>
              <span>scoreVersion 1</span>
            </div>
          </div>
        </section>

        <section className={styles.section}>
          <div className={styles.sectionHead}>
            <div className={styles.eyebrow}>Privacy</div>
            <h2>Your code never leaves your machine.</h2>
          </div>
          <p className={styles.privacyBody}>
            Scans run 100% locally. The CLI has zero runtime dependencies &mdash; read the source
            before you run it. Sharing is opt-in: <code>--share</code> uploads only the report
            (aggregate stats and violation locations), never your source code, and every upload is
            scrubbed for secret patterns first. Reports live at unguessable URLs, are deletable by
            you, and expire automatically unless you claim them.
          </p>
        </section>

        <section className={styles.section}>
          <div className={styles.sectionHead}>
            <div className={styles.eyebrow}>FAQ</div>
            <h2>Common questions</h2>
          </div>
          <div className={styles.faqList}>
            <div className={styles.faqItem}>
              <h3>Does it work with Tailwind?</h3>
              <p>
                Yes &mdash; it reads your Tailwind config as a token source and flags arbitrary
                values (<code>mt-[13px]</code>, <code>text-[#3B82F6]</code>) as drift.
              </p>
            </div>
            <div className={styles.faqItem}>
              <h3>What stacks are supported?</h3>
              <p>
                CSS, SCSS, and JS/TS/JSX/TSX files using CSS variables, Tailwind, or standard token
                JSON formats. The scanner is format-based, not framework-locked.
              </p>
            </div>
            <div className={styles.faqItem}>
              <h3>How is the Drift Score calculated?</h3>
              <p>
                A weighted blend of token adoption rate, violation density, and violation
                concentration. The formula is public and versioned &mdash; every score links to
                the full violation list behind it.
              </p>
            </div>
            <div className={styles.faqItem}>
              <h3>What exactly gets uploaded with --share?</h3>
              <p>
                The report artifact only: scores, per-category stats, file paths, and the flagged
                value snippets. Never full source files. Don&rsquo;t want anything uploaded?
                Don&rsquo;t pass <code>--share</code> &mdash; everything works offline.
              </p>
            </div>
          </div>
        </section>

        <section className={`${styles.section} ${styles.finalCta}`}>
          <div className={styles.sectionHead}>
            <div className={styles.eyebrow}>Try it now</div>
            <h2>Find out your score in the next 60 seconds.</h2>
          </div>
          <div className={styles.codeBlock}>
            <span className={styles.comment}># scans the current directory, writes tokensdrift-report.html</span>
            <br />
            <span className={styles.prompt}>$</span> npx tokensdrift .
          </div>
          <div className={styles.trustLine}>Free &middot; No signup &middot; Your code stays local</div>
        </section>
      </main>

      <footer className={styles.footer}>
        <span>tokensdrift</span>
        <span>tokensdrift.com</span>
      </footer>
    </>
  );
}
