import { headers } from 'next/headers';

export default async function GithubAppSetupPage() {
  const h = await headers();
  const host = h.get('host');
  const proto = h.get('x-forwarded-proto') ?? 'https';
  const origin = `${proto}://${host}`;

  const manifest = {
    name: 'TokenDrift',
    url: 'https://tokendrift-vedantyedes-projects.vercel.app',
    hook_attributes: { url: `${origin}/api/github/webhook` },
    redirect_url: `${origin}/api/github/manifest-callback`,
    public: true,
    default_permissions: {
      checks: 'write',
      pull_requests: 'write',
      contents: 'read',
      metadata: 'read',
    },
    // installation and installation_repositories are sent automatically to
    // every GitHub App regardless of subscribed events (they're not tied
    // to a resource permission, unlike pull_request/check_run) — listing
    // them here is invalid and GitHub rejects the manifest.
    default_events: ['pull_request', 'check_run'],
  };

  return (
    <main
      style={{
        maxWidth: 480,
        margin: '96px auto',
        padding: '0 24px',
        display: 'flex',
        flexDirection: 'column',
        gap: 20,
        fontFamily: 'system-ui, sans-serif',
      }}
    >
      <h1 style={{ fontSize: 28, margin: 0 }}>Create the TokenDrift GitHub App</h1>
      <p style={{ color: '#666', lineHeight: 1.6, margin: 0 }}>
        One click registers the app on GitHub with the right permissions already filled in
        (checks: write, pull requests: write, contents: read). You&rsquo;ll get credentials to
        save afterward — this only needs to run once.
      </p>
      <form action="https://github.com/settings/apps/new" method="post">
        <input type="hidden" name="manifest" value={JSON.stringify(manifest)} />
        <button
          type="submit"
          style={{
            fontSize: 15,
            fontWeight: 600,
            padding: '12px 20px',
            borderRadius: 6,
            border: 'none',
            background: '#111',
            color: '#fff',
            cursor: 'pointer',
          }}
        >
          Create GitHub App
        </button>
      </form>
    </main>
  );
}
