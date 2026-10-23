import { describe, expect, it, vi } from 'vitest';
import { handleDemoRequest } from '@/lib/demo/handler';
import { createRateLimiter } from '@/lib/demo/rate-limit';
import { createDeliver, type Deliver } from '@/lib/demo/deliver';
import { demoRequestSchema } from '@/lib/demo/schema';

const NOW = 1_800_000_000_000;
const valid = {
  intent: 'demo', fullName: 'Asha Rao', email: 'Asha@Example.com', company: 'Example Ltd',
  companySize: '11-50', product: 'hrms', consent: true, website: '', startedAt: NOW - 20_000,
};
const call = (body: unknown, deliver: Deliver = vi.fn(async () => ({ ok: true as const })), opts: Partial<{ contentType: string; limiter: ReturnType<typeof createRateLimiter> }> = {}) => {
  const raw = typeof body === 'string' ? body : JSON.stringify(body);
  return handleDemoRequest(
    { contentType: opts.contentType ?? 'application/json', contentLength: String(raw.length), rawBody: raw, clientKey: '1.2.3.4' },
    { deliver, limiter: opts.limiter ?? createRateLimiter(5, 60_000), now: () => NOW },
  );
};

describe('demo request schema', () => {
  it('normalises email and strips empty optionals', () => {
    const r = demoRequestSchema.parse({ ...valid, role: '  ', phone: '' });
    expect(r.email).toBe('asha@example.com');
    expect(r.role).toBeUndefined();
    expect(r.phone).toBeUndefined();
  });
  it('requires consent', () => {
    expect(demoRequestSchema.safeParse({ ...valid, consent: false }).success).toBe(false);
  });
  it('rejects bad phone and email', () => {
    expect(demoRequestSchema.safeParse({ ...valid, phone: 'abc' }).success).toBe(false);
    expect(demoRequestSchema.safeParse({ ...valid, email: 'nope' }).success).toBe(false);
  });
});

describe('demo request handler', () => {
  it('accepts a valid request only after delivery succeeds', async () => {
    const deliver = vi.fn(async () => ({ ok: true as const }));
    const r = await call(valid, deliver);
    expect(r.status).toBe(200);
    expect(r.body.ok).toBe(true);
    expect(deliver).toHaveBeenCalledOnce();
    const [req] = deliver.mock.calls[0] as unknown as [Record<string, unknown>];
    expect(req).not.toHaveProperty('website');
    expect(req).not.toHaveProperty('startedAt');
  });

  it('returns 503 and never success when delivery is not configured', async () => {
    const r = await call(valid, createDeliver({}));
    expect(r.status).toBe(503);
    expect(r.body.ok).toBe(false);
  });

  it('returns 502 when the downstream service fails', async () => {
    const r = await call(valid, vi.fn<Deliver>(async () => ({ ok: false, reason: 'downstream-error' })));
    expect(r.status).toBe(502);
    expect(r.body.ok).toBe(false);
  });

  it('returns field errors for invalid input without calling delivery', async () => {
    const deliver = vi.fn(async () => ({ ok: true as const }));
    const r = await call({ ...valid, fullName: '', companySize: 'huge' }, deliver);
    expect(r.status).toBe(422);
    expect(r.body.errors).toHaveProperty('fullName');
    expect(r.body.errors).toHaveProperty('companySize');
    expect(deliver).not.toHaveBeenCalled();
  });

  it('rejects honeypot, too-fast submissions, bad JSON, wrong type and oversize bodies', async () => {
    expect((await call({ ...valid, website: 'spam.example' })).status).toBe(400);
    expect((await call({ ...valid, startedAt: NOW - 500 })).status).toBe(400);
    expect((await call('{not json')).status).toBe(400);
    expect((await call(valid, undefined, { contentType: 'text/plain' })).status).toBe(415);
    expect((await call({ ...valid, requirements: 'x'.repeat(9000) })).status).toBe(413);
  });

  it('rate limits repeated submissions', async () => {
    const limiter = createRateLimiter(2, 60_000);
    expect((await call(valid, undefined, { limiter })).status).toBe(200);
    expect((await call(valid, undefined, { limiter })).status).toBe(200);
    const third = await call(valid, undefined, { limiter });
    expect(third.status).toBe(429);
    expect(third.headers?.['retry-after']).toBe('60');
  });
});

describe('delivery adapters', () => {
  it('webhook posts JSON with an HMAC signature', async () => {
    const fetchMock = vi.fn(async () => new Response(null, { status: 204 }));
    const deliver = createDeliver({ mode: 'webhook', webhookUrl: 'https://hooks.example/x', webhookSecret: 's3cret' }, fetchMock as unknown as typeof fetch);
    const res = await deliver(demoRequestSchema.parse(valid), { id: 'id1', receivedAt: 't' });
    expect(res).toEqual({ ok: true });
    const [, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect((init.headers as Record<string, string>)['x-avyntro-signature']).toMatch(/^[a-f0-9]{64}$/);
  });
  it('reports downstream errors', async () => {
    const deliver = createDeliver({ mode: 'webhook', webhookUrl: 'https://hooks.example/x' }, (async () => new Response(null, { status: 500 })) as unknown as typeof fetch);
    expect(await deliver(demoRequestSchema.parse(valid), { id: 'i', receivedAt: 't' })).toEqual({ ok: false, reason: 'downstream-error' });
  });
  it('treats incomplete resend config as not configured', async () => {
    const deliver = createDeliver({ mode: 'resend', resendApiKey: 'k' });
    expect(await deliver(demoRequestSchema.parse(valid), { id: 'i', receivedAt: 't' })).toEqual({ ok: false, reason: 'not-configured' });
  });
});
