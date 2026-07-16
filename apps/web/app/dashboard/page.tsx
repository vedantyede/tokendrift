import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { slugFromRemoteUrl } from 'tokensdrift/repoIdentity';
import { SESSION_COOKIE, verifySession } from '@/lib/session';
import { getGithubInstallStore, type Installation } from '@/lib/githubInstallStore';
import { getBadgeStore } from '@/lib/badgeStore';
import { getScoreHistoryStore, type ScoreHistoryEntry } from '@/lib/scoreHistoryStore';
import { getBillingStore, type PlanId } from '@/lib/billingStore';
import { getEntitlement, type Entitlement } from '@/lib/entitlement';
import { BillingPortalButton } from './billing-portal-button';
import { CheckoutButtons } from './checkout-buttons';
import { ScoreSparkline } from './score-sparkline';

const ALL_PLANS: PlanId[] = ['pro', 'team'];
const PLAN_LABELS: Record<PlanId, string> = { pro: 'Pro', team: 'Team' };

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

interface RepoRow {
  fullName: string;
  score: number | null;
  reportId: string | null;
  history: ScoreHistoryEntry[];
}

async function loadRepoRows(repos: string[]): Promise<RepoRow[]> {
  const [badgeStore, scoreHistoryStore] = await Promise.all([getBadgeStore(), getScoreHistoryStore()]);
  return Promise.all(
    repos.map(async (fullName) => {
      const slug = slugFromRemoteUrl(`https://github.com/${fullName}`);
      const [badge, history] = await Promise.all([badgeStore.get(slug), scoreHistoryStore.list(slug)]);
      return {
        fullName,
        score: badge?.score ?? null,
        reportId: badge?.reportId ?? null,
        history,
      };
    }),
  );
}

export default async function DashboardPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  const session = token ? verifySession(token) : null;

  if (!session) {
    return (
      <Shell>
        <p style={{ color: 'var(--ink-soft)', lineHeight: 1.6 }}>
          Sign in with the GitHub account that installed the TokensDrift App to see your repos,
          latest scores, and billing.
        </p>
        <a href="/api/auth/github/login" style={ctaStyle}>
          Sign in with GitHub
        </a>
      </Shell>
    );
  }

  const installStore = await getGithubInstallStore();
  const installations = (
    await Promise.all(session.installationIds.map((id) => installStore.get(id)))
  ).filter((i): i is Installation => i !== null);

  return (
    <Shell>
      <div style={{ color: 'var(--ink-soft)', display: 'flex', gap: 6, alignItems: 'center' }}>
        <span>
          Signed in as <strong>{session.githubLogin}</strong>
        </span>
        ·
        <form action="/api/auth/logout" method="POST" style={{ display: 'inline' }}>
          <button type="submit" style={linkButtonStyle}>
            Sign out
          </button>
        </form>
      </div>

      {installations.length === 0 ? (
        <p style={{ color: 'var(--ink-soft)' }}>
          No TokensDrift installations found for this account.{' '}
          <a href="/install" style={{ color: 'var(--token)' }}>
            Install the GitHub App
          </a>{' '}
          to get started.
        </p>
      ) : (
        installations.map((install) => (
          <InstallationCard key={install.installationId} install={install} />
        ))
      )}
    </Shell>
  );
}

async function InstallationCard({ install }: { install: Installation }) {
  const [rows, entitlement, billingStore] = await Promise.all([
    loadRepoRows(install.repositories),
    getEntitlement(install.installationId),
    getBillingStore(),
  ]);
  const billing = await billingStore.get(install.installationId);
  const activePlan = billing?.plan ?? null;
  // ALL_PLANS is ordered low-to-high tier, so only offer plans above the
  // current one — a Team subscriber shouldn't see a "downgrade to Pro" CTA.
  const activeTier = activePlan ? ALL_PLANS.indexOf(activePlan) : -1;
  const availablePlans = ALL_PLANS.filter((_, i) => i > activeTier);

  return (
    <section
      style={{
        border: '1px solid var(--rule)',
        borderRadius: 4,
        padding: 20,
        display: 'flex',
        flexDirection: 'column',
        gap: 16,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 20, margin: 0 }}>
          {install.accountLogin}
        </h2>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          {activePlan && <span style={{ color: 'var(--ink-soft)', fontSize: 14 }}>{PLAN_LABELS[activePlan]} plan</span>}
          {billing && <BillingPortalButton installationId={install.installationId} />}
        </div>
      </div>

      <PlanStatus entitlement={entitlement} hasBilling={billing !== null} />
      <CheckoutButtons installationId={install.installationId} availablePlans={availablePlans} />

      {rows.length === 0 ? (
        <p style={{ color: 'var(--ink-soft)', fontSize: 14.5, margin: 0 }}>No repos on this installation.</p>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14.5 }}>
          <thead>
            <tr style={{ textAlign: 'left', color: 'var(--ink-soft)' }}>
              <th style={{ fontWeight: 600, padding: '4px 0' }}>Repo</th>
              <th style={{ fontWeight: 600, padding: '4px 0' }}>Latest score</th>
              <th style={{ fontWeight: 600, padding: '4px 0' }}>Trend</th>
              <th style={{ fontWeight: 600, padding: '4px 0' }}>Report</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.fullName} style={{ borderTop: '1px solid var(--rule)' }}>
                <td style={{ padding: '8px 0' }}>{row.fullName}</td>
                <td style={{ padding: '8px 0' }}>{row.score ?? '—'}</td>
                <td style={{ padding: '8px 0' }}>
                  <ScoreSparkline history={row.history} />
                </td>
                <td style={{ padding: '8px 0' }}>
                  {row.reportId ? (
                    <a href={`/r/${row.reportId}`} style={{ color: 'var(--token)' }}>
                      View report
                    </a>
                  ) : (
                    <span style={{ color: 'var(--ink-soft)' }}>No scan yet</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}

function PlanStatus({ entitlement, hasBilling }: { entitlement: Entitlement; hasBilling: boolean }) {
  const daysLeft = Math.max(0, Math.ceil((entitlement.trialEndsAt - Date.now()) / (24 * 60 * 60 * 1000)));

  if (entitlement.reason === 'subscribed') return null;
  if (entitlement.reason === 'trial') {
    return (
      <p style={{ color: 'var(--ink-soft)', fontSize: 14, margin: 0 }}>
        Trial — {daysLeft} day{daysLeft === 1 ? '' : 's'} left. PR checks stay enabled until then.
      </p>
    );
  }
  return (
    <p style={{ color: 'var(--drift)', fontSize: 14, margin: 0 }}>
      {hasBilling ? 'Trial ended' : 'No subscription'} — PR checks are paused on this installation until you upgrade.
    </p>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main
      style={{
        maxWidth: 720,
        margin: '64px auto',
        padding: '0 24px',
        display: 'flex',
        flexDirection: 'column',
        gap: 24,
        fontFamily: 'var(--font-body)',
        color: 'var(--ink)',
      }}
    >
      <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 28, margin: 0 }}>Dashboard</h1>
      {children}
    </main>
  );
}

const ctaStyle: React.CSSProperties = {
  fontFamily: 'var(--font-body)',
  fontSize: 15,
  fontWeight: 600,
  padding: '12px 20px',
  borderRadius: 3,
  border: 'none',
  background: 'var(--token)',
  color: 'var(--paper-raised)',
  cursor: 'pointer',
  width: 'fit-content',
  textDecoration: 'none',
};

const linkButtonStyle: React.CSSProperties = {
  font: 'inherit',
  color: 'var(--token)',
  background: 'none',
  border: 'none',
  padding: 0,
  cursor: 'pointer',
  textDecoration: 'underline',
};
