import { NextRequest, NextResponse } from 'next/server';
import { paddleClient } from '@/lib/paddleClient';
import { getGithubInstallStore } from '@/lib/githubInstallStore';
import { getBillingStore, type PlanId } from '@/lib/billingStore';

// $29/mo/repo (Pro) and $79/mo up to 10 repos (Team) — see ROADMAP.md Phase 4.
// Quantity/repo-cap enforcement is deliberately not wired up here yet: the
// per-repo vs. per-seat pricing question is still open per ROADMAP.md's
// "Open questions" section, so this scaffold checks out a flat quantity of 1
// pending that decision.
const PRICE_IDS: Record<PlanId, string | undefined> = {
  pro: process.env.PADDLE_PRICE_PRO,
  team: process.env.PADDLE_PRICE_TEAM,
};

// Paddle has no Stripe-Checkout-Session-style "create it server-side and
// redirect to a hosted URL" flow — checkout is driven by Paddle.js on the
// client (overlay or inline). This route only creates the Transaction and
// hands back its id; the dashboard's CheckoutButtons opens it with
// `Paddle.Checkout.open({ transactionId })`.
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const installationId = Number(body?.installationId);
  const plan = body?.plan as PlanId;

  if (!installationId || (plan !== 'pro' && plan !== 'team')) {
    return NextResponse.json({ error: 'installationId and plan (pro|team) are required' }, { status: 400 });
  }

  const priceId = PRICE_IDS[plan];
  if (!priceId) {
    return NextResponse.json({ error: `PADDLE_PRICE_${plan.toUpperCase()} not configured` }, { status: 500 });
  }

  const installStore = await getGithubInstallStore();
  const install = await installStore.get(installationId);
  if (!install) {
    return NextResponse.json({ error: 'unknown installation' }, { status: 404 });
  }

  const billingStore = await getBillingStore();
  const existing = await billingStore.get(installationId);

  const paddle = paddleClient();
  const transaction = await paddle.transactions.create({
    items: [{ priceId, quantity: 1 }],
    customerId: existing?.paddleCustomerId,
    customData: { installationId: String(installationId), plan },
  });

  return NextResponse.json({ transactionId: transaction.id });
}
