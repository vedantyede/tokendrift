import { NextRequest, NextResponse } from 'next/server';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { getGithubInstallStore } from '@/lib/githubInstallStore';
import { runPrCheck } from '@/lib/prCheck';

const PR_CHECK_ACTIONS = new Set(['opened', 'synchronize', 'reopened']);

interface GithubRepoRef {
  full_name: string;
}

function verifySignature(rawBody: string, signatureHeader: string | null, secret: string): boolean {
  if (!signatureHeader) return false;
  const expected = `sha256=${createHmac('sha256', secret).update(rawBody).digest('hex')}`;
  const a = Buffer.from(expected);
  const b = Buffer.from(signatureHeader);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function POST(req: NextRequest) {
  const secret = process.env.GITHUB_APP_WEBHOOK_SECRET;
  const rawBody = await req.text();
  const signature = req.headers.get('x-hub-signature-256');

  if (!secret || !verifySignature(rawBody, signature, secret)) {
    return NextResponse.json({ error: 'invalid signature' }, { status: 401 });
  }

  const event = req.headers.get('x-github-event');
  const payload = JSON.parse(rawBody);
  const store = await getGithubInstallStore();

  if (event === 'ping') {
    return NextResponse.json({ ok: true });
  }

  if (event === 'installation') {
    const { action, installation } = payload;
    if (action === 'created') {
      const repositories = (payload.repositories as GithubRepoRef[] | undefined) ?? [];
      await store.put(installation.id, {
        installationId: installation.id,
        accountLogin: installation.account.login,
        accountType: installation.account.type,
        repositorySelection: installation.repository_selection,
        repositories: repositories.map((r) => r.full_name),
        createdAt: Date.now(),
      });
    } else if (action === 'deleted') {
      await store.remove(installation.id);
    }
    return NextResponse.json({ ok: true });
  }

  if (event === 'installation_repositories') {
    const { installation, repository_selection } = payload;
    const added = (payload.repositories_added as GithubRepoRef[] | undefined) ?? [];
    const removed = (payload.repositories_removed as GithubRepoRef[] | undefined) ?? [];
    const removedNames = new Set(removed.map((r) => r.full_name));

    const existing = await store.get(installation.id);
    if (existing) {
      const remaining = existing.repositories.filter((r) => !removedNames.has(r));
      const addedNames = added.map((r) => r.full_name);
      await store.put(installation.id, {
        ...existing,
        repositorySelection: repository_selection,
        repositories: Array.from(new Set([...remaining, ...addedNames])),
      });
    }
    return NextResponse.json({ ok: true });
  }

  if (event === 'pull_request' && PR_CHECK_ACTIONS.has(payload.action)) {
    try {
      await runPrCheck(payload);
    } catch (err) {
      // A scan failure shouldn't cause GitHub to retry the whole webhook —
      // log and still ack. Known v1 gap: no alerting if this happens
      // repeatedly, just Vercel's function logs.
      console.error('PR check failed:', err);
    }
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ ok: true, ignored: event });
}
