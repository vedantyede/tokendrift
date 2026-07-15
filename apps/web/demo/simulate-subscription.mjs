// Paddle sandbox can't reach a localhost webhook URL, so after the demo
// clicks through the real Paddle sandbox checkout overlay, this fires the
// same subscription.created webhook Paddle would send in production —
// signed with the real PADDLE_WEBHOOK_SECRET from .env.local, hitting our
// own /api/paddle/webhook — so the dashboard reflects "subscribed" state
// through the actual webhook handler code path, not a hand-written record.
import { readFile } from 'node:fs/promises';
import { createHmac } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const webRoot = path.resolve(__dirname, '..');
const baseUrl = 'http://localhost:3000';

async function loadEnvLocal() {
  const raw = await readFile(path.join(webRoot, '.env.local'), 'utf8');
  const env = {};
  for (const line of raw.split('\n')) {
    const m = line.match(/^([A-Z0-9_]+)="?(.*?)"?\s*$/);
    if (m) env[m[1]] = m[2];
  }
  return env;
}

async function createSandboxCustomer(apiKey, installationId) {
  const email = `demo-install-${installationId}@tokensdrift.com`;
  const res = await fetch('https://sandbox-api.paddle.com/customers', {
    method: 'POST',
    headers: { authorization: `Bearer ${apiKey}`, 'content-type': 'application/json' },
    body: JSON.stringify({ email, name: 'Demo Org' }),
  });
  const body = await res.json();
  if (res.ok) return body.data.id;

  if (body.error?.code === 'customer_already_exists') {
    const lookup = await fetch(`https://sandbox-api.paddle.com/customers?email=${encodeURIComponent(email)}`, {
      headers: { authorization: `Bearer ${apiKey}` },
    });
    const lookupBody = await lookup.json();
    const existing = lookupBody.data?.[0]?.id;
    if (existing) return existing;
  }
  throw new Error(`Paddle sandbox customer create failed: ${res.status} ${JSON.stringify(body)}`);
}

export async function simulateSubscriptionCreated(installationId, plan) {
  const env = await loadEnvLocal();
  const secret = env.PADDLE_WEBHOOK_SECRET;
  const apiKey = env.PADDLE_API_KEY;
  if (!secret) throw new Error('missing PADDLE_WEBHOOK_SECRET in .env.local');
  if (!apiKey) throw new Error('missing PADDLE_API_KEY in .env.local');

  // A fabricated customer id would make the "Manage billing" button's real
  // call to Paddle's sandbox API fail (unknown customer) — creating a real
  // sandbox customer here keeps that step genuinely working in the demo.
  const customerId = await createSandboxCustomer(apiKey, installationId);

  const now = new Date();
  const nowIso = now.toISOString();
  const periodEnd = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString();

  const body = {
    event_id: `evt_demo_${now.getTime()}`,
    notification_id: `ntf_demo_${now.getTime()}`,
    event_type: 'subscription.created',
    occurred_at: nowIso,
    data: {
      // Left empty rather than fabricated: a fake subscription id would make
      // the "Manage billing" button's real Paddle portal-session call fail
      // (Paddle validates the subscription belongs to the customer). An
      // empty id is falsy, so billingStore records no subscription and the
      // portal route scopes the session to the (real) customer only.
      id: '',
      status: 'active',
      transaction_id: `txn_demo_${now.getTime()}`,
      customer_id: customerId,
      address_id: 'add_demo',
      business_id: null,
      currency_code: 'USD',
      created_at: nowIso,
      updated_at: nowIso,
      started_at: nowIso,
      first_billed_at: nowIso,
      next_billed_at: periodEnd,
      paused_at: null,
      canceled_at: null,
      discount: null,
      collection_mode: 'automatic',
      billing_details: null,
      current_billing_period: { starts_at: nowIso, ends_at: periodEnd },
      billing_cycle: { interval: 'month', frequency: 1 },
      scheduled_change: null,
      items: [],
      custom_data: { installationId: String(installationId), plan },
      import_meta: null,
    },
  };

  const rawBody = JSON.stringify(body);
  const ts = Math.floor(Date.now() / 1000);
  const h1 = createHmac('sha256', secret).update(`${ts}:${rawBody}`).digest('hex');

  const res = await fetch(`${baseUrl}/api/paddle/webhook`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'paddle-signature': `ts=${ts};h1=${h1}`,
    },
    body: rawBody,
  });
  if (!res.ok) throw new Error(`paddle webhook failed: ${res.status} ${await res.text()}`);
}

if (path.resolve(fileURLToPath(import.meta.url)) === path.resolve(process.argv[1] ?? '')) {
  const [installationId, plan] = process.argv.slice(2);
  simulateSubscriptionCreated(Number(installationId), plan).then(
    () => console.log('subscription synced'),
    (err) => {
      console.error(err);
      process.exit(1);
    },
  );
}
