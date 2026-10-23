import { createHmac } from 'node:crypto';
import type { DemoRequest } from './schema';
import { productInterestLabels } from './schema';

/**
 * Delivery adapters: where an accepted request is sent.
 * Each returns { ok: true } only when the downstream service accepted it.
 */
export type DeliveryResult = { ok: true } | { ok: false; reason: 'not-configured' | 'downstream-error' };
export type Deliver = (req: DemoRequest, meta: { id: string; receivedAt: string }) => Promise<DeliveryResult>;

type Fetch = typeof fetch;

export interface DeliveryConfig {
  mode?: string;
  webhookUrl?: string;
  webhookSecret?: string;
  resendApiKey?: string;
  notifyTo?: string;
  notifyFrom?: string;
}

export function readDeliveryConfig(env: NodeJS.ProcessEnv = process.env): DeliveryConfig {
  return {
    mode: env.DEMO_DELIVERY,
    webhookUrl: env.DEMO_WEBHOOK_URL,
    webhookSecret: env.DEMO_WEBHOOK_SECRET,
    resendApiKey: env.RESEND_API_KEY,
    notifyTo: env.DEMO_NOTIFY_TO,
    notifyFrom: env.DEMO_NOTIFY_FROM,
  };
}

const TIMEOUT_MS = 8000;

export function createDeliver(config: DeliveryConfig, fetchImpl: Fetch = fetch): Deliver {
  if (config.mode === 'webhook' && config.webhookUrl) {
    const url = config.webhookUrl;
    return async (req, meta) => {
      const body = JSON.stringify({ ...meta, request: req });
      const headers: Record<string, string> = { 'content-type': 'application/json' };
      if (config.webhookSecret) {
        headers['x-avyntro-signature'] = createHmac('sha256', config.webhookSecret).update(body).digest('hex');
      }
      try {
        const res = await fetchImpl(url, { method: 'POST', headers, body, signal: AbortSignal.timeout(TIMEOUT_MS) });
        return res.ok ? { ok: true } : { ok: false, reason: 'downstream-error' };
      } catch {
        return { ok: false, reason: 'downstream-error' };
      }
    };
  }

  if (config.mode === 'resend' && config.resendApiKey && config.notifyTo && config.notifyFrom) {
    const { resendApiKey, notifyTo, notifyFrom } = config;
    return async (req, meta) => {
      // Plain text only: no user input is ever rendered as HTML.
      const text = [
        `New ${req.intent} request (${meta.id}) received ${meta.receivedAt}`,
        '',
        `Name: ${req.fullName}`,
        `Email: ${req.email}`,
        `Company: ${req.company}`,
        `Role: ${req.role ?? '-'}`,
        `Company size: ${req.companySize}`,
        `Product: ${productInterestLabels[req.product]}`,
        `Phone: ${req.phone ?? '-'}`,
        '',
        'Requirements:',
        req.requirements ?? '-',
      ].join('\n');
      try {
        const res = await fetchImpl('https://api.resend.com/emails', {
          method: 'POST',
          headers: { authorization: `Bearer ${resendApiKey}`, 'content-type': 'application/json' },
          body: JSON.stringify({
            from: notifyFrom,
            to: [notifyTo],
            reply_to: req.email,
            subject: `Avyntro ${req.intent} request: ${req.company}`.slice(0, 200),
            text,
          }),
          signal: AbortSignal.timeout(TIMEOUT_MS),
        });
        return res.ok ? { ok: true } : { ok: false, reason: 'downstream-error' };
      } catch {
        return { ok: false, reason: 'downstream-error' };
      }
    };
  }

  // Not configured: never pretend the request was delivered.
  return async () => ({ ok: false, reason: 'not-configured' });
}
