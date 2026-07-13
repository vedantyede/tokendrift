import { createSign } from 'node:crypto';

function base64url(input: string | Buffer): string {
  const buf = typeof input === 'string' ? Buffer.from(input) : input;
  return buf.toString('base64url');
}

// GitHub App auth: a short-lived JWT signed with the app's private key
// (RS256), used only to exchange for a per-installation access token —
// hand-rolled with node:crypto rather than pulling in a JWT library, since
// it's a handful of lines and apps/web already leans on built-ins where
// reasonable.
export function signAppJwt(): string {
  const appId = process.env.GITHUB_APP_ID;
  const privateKey = process.env.GITHUB_APP_PRIVATE_KEY;
  if (!appId || !privateKey) {
    throw new Error('GITHUB_APP_ID / GITHUB_APP_PRIVATE_KEY not configured');
  }

  const now = Math.floor(Date.now() / 1000);
  const iat = now - 60; // backdated for clock drift tolerance
  const header = { alg: 'RS256', typ: 'JWT' };
  // GitHub caps exp at 600s after iat, not after "now" — with iat already
  // backdated 60s, the exp offset from iat must stay under 600 total.
  const payload = { iat, exp: iat + 570, iss: appId };

  const signingInput = `${base64url(JSON.stringify(header))}.${base64url(JSON.stringify(payload))}`;
  const signature = createSign('RSA-SHA256').update(signingInput).sign(privateKey);
  return `${signingInput}.${base64url(signature)}`;
}

export async function getInstallationToken(installationId: number): Promise<string> {
  const jwt = signAppJwt();
  const res = await fetch(`https://api.github.com/app/installations/${installationId}/access_tokens`, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${jwt}`,
      accept: 'application/vnd.github+json',
    },
  });
  if (!res.ok) {
    throw new Error(`Failed to get installation token: ${res.status} ${await res.text()}`);
  }
  const data = (await res.json()) as { token: string };
  return data.token;
}
