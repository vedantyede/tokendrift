import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { deriveRepoSlug } from '../src/repoIdentity.js';

async function makeRepo(remoteUrl: string | null): Promise<string> {
  const dir = await mkdtemp(path.join(tmpdir(), 'tokendrift-repoid-'));
  await mkdir(path.join(dir, '.git'), { recursive: true });
  const config = remoteUrl
    ? `[core]\n\trepositoryformatversion = 0\n[remote "origin"]\n\turl = ${remoteUrl}\n\tfetch = +refs/heads/*:refs/remotes/origin/*\n`
    : `[core]\n\trepositoryformatversion = 0\n`;
  await writeFile(path.join(dir, '.git', 'config'), config, 'utf8');
  return dir;
}

test('deriveRepoSlug returns the same slug for equivalent remote URL forms', async () => {
  const httpsDir = await makeRepo('https://github.com/acme/widgets.git');
  const sshDir = await makeRepo('git@github.com:acme/widgets.git');
  try {
    const a = deriveRepoSlug(httpsDir);
    const b = deriveRepoSlug(sshDir);
    assert.ok(a);
    assert.equal(a, b);
  } finally {
    await rm(httpsDir, { recursive: true, force: true });
    await rm(sshDir, { recursive: true, force: true });
  }
});

test('deriveRepoSlug returns different slugs for different repos', async () => {
  const dirA = await makeRepo('https://github.com/acme/widgets.git');
  const dirB = await makeRepo('https://github.com/acme/gadgets.git');
  try {
    assert.notEqual(deriveRepoSlug(dirA), deriveRepoSlug(dirB));
  } finally {
    await rm(dirA, { recursive: true, force: true });
    await rm(dirB, { recursive: true, force: true });
  }
});

test('deriveRepoSlug returns null with no origin remote', async () => {
  const dir = await makeRepo(null);
  try {
    assert.equal(deriveRepoSlug(dir), null);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test('deriveRepoSlug returns null with no .git directory at all', async () => {
  const dir = await mkdtemp(path.join(tmpdir(), 'tokendrift-nogit-'));
  try {
    assert.equal(deriveRepoSlug(dir), null);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test('deriveRepoSlug finds .git in a parent directory when scanning a subdirectory', async () => {
  const dir = await makeRepo('https://github.com/acme/widgets.git');
  const subdir = path.join(dir, 'packages', 'app');
  await mkdir(subdir, { recursive: true });
  try {
    assert.equal(deriveRepoSlug(subdir), deriveRepoSlug(dir));
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
