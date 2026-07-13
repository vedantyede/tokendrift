const SCANNABLE_EXTENSIONS = /\.(css|scss|tsx|jsx|ts|js)$/;

export interface PrFile {
  filename: string;
  status: string;
}

function encodePath(path: string): string {
  // GitHub's contents API wants literal `/` between segments, not %2F.
  return path.split('/').map(encodeURIComponent).join('/');
}

async function githubFetch(token: string, url: string, init?: RequestInit): Promise<Response> {
  return fetch(url, {
    ...init,
    headers: {
      authorization: `Bearer ${token}`,
      accept: 'application/vnd.github+json',
      ...init?.headers,
    },
  });
}

export async function listPrFiles(
  token: string,
  owner: string,
  repo: string,
  prNumber: number,
): Promise<PrFile[]> {
  const files: PrFile[] = [];
  let page = 1;
  for (;;) {
    const res = await githubFetch(
      token,
      `https://api.github.com/repos/${owner}/${repo}/pulls/${prNumber}/files?per_page=100&page=${page}`,
    );
    if (!res.ok) throw new Error(`listPrFiles failed: ${res.status} ${await res.text()}`);
    const batch = (await res.json()) as PrFile[];
    files.push(...batch);
    if (batch.length < 100) break;
    page++;
  }
  return files.filter((f) => SCANNABLE_EXTENSIONS.test(f.filename) && f.status !== 'removed');
}

/** Returns null for a 404 (file didn't exist at that ref — e.g. a newly added file has no base version). */
export async function fetchFileContent(
  token: string,
  owner: string,
  repo: string,
  path: string,
  ref: string,
): Promise<string | null> {
  const res = await githubFetch(
    token,
    `https://api.github.com/repos/${owner}/${repo}/contents/${encodePath(path)}?ref=${ref}`,
  );
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`fetchFileContent failed for ${path}@${ref}: ${res.status}`);
  const data = (await res.json()) as { content: string; encoding: string };
  if (data.encoding !== 'base64') throw new Error(`unexpected encoding for ${path}: ${data.encoding}`);
  return Buffer.from(data.content, 'base64').toString('utf8');
}

export async function createCheckRun(
  token: string,
  owner: string,
  repo: string,
  params: { name: string; headSha: string; conclusion: 'success' | 'failure'; title: string; summary: string },
): Promise<void> {
  const res = await githubFetch(token, `https://api.github.com/repos/${owner}/${repo}/check-runs`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      name: params.name,
      head_sha: params.headSha,
      status: 'completed',
      conclusion: params.conclusion,
      output: { title: params.title, summary: params.summary },
    }),
  });
  if (!res.ok) throw new Error(`createCheckRun failed: ${res.status} ${await res.text()}`);
}
