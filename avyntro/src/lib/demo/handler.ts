import { randomUUID } from 'node:crypto';
import { demoRequestSchema, fieldErrors, LIMITS, spamFieldsSchema } from './schema';
import type { Deliver } from './deliver';
import type { RateLimiter } from './rate-limit';

export interface HandlerDeps {
  deliver: Deliver;
  limiter: RateLimiter;
  now?: () => number;
  log?: (event: Record<string, unknown>) => void;
}

export interface HandlerResult {
  status: number;
  body: { ok: boolean; id?: string; message: string; errors?: Record<string, string> };
  headers?: Record<string, string>;
}

const GENERIC_FAIL = 'We could not send your request. Please try again in a few minutes.';

/**
 * Framework-independent request handler (unit-tested).
 * Order: size → content type → rate limit → JSON → spam checks → validation → delivery.
 * Logs contain no personal data: only an id, the outcome and the intent.
 */
export async function handleDemoRequest(
  input: { contentType: string | null; contentLength: string | null; rawBody: string; clientKey: string },
  deps: HandlerDeps,
): Promise<HandlerResult> {
  const now = deps.now ?? Date.now;
  const log = deps.log ?? (() => {});
  const id = randomUUID();

  const declared = Number(input.contentLength ?? '0');
  if (declared > LIMITS.body || Buffer.byteLength(input.rawBody) > LIMITS.body) {
    log({ id, outcome: 'rejected', reason: 'too-large' });
    return { status: 413, body: { ok: false, message: 'Your request is too large.' } };
  }
  if (!input.contentType?.toLowerCase().startsWith('application/json')) {
    return { status: 415, body: { ok: false, message: 'Unsupported content type.' } };
  }

  const rl = deps.limiter.check(input.clientKey, now());
  if (!rl.allowed) {
    log({ id, outcome: 'rejected', reason: 'rate-limited' });
    return {
      status: 429,
      headers: { 'retry-after': String(rl.retryAfterSeconds) },
      body: { ok: false, message: 'Too many requests. Please wait a few minutes and try again.' },
    };
  }

  let json: unknown;
  try {
    json = JSON.parse(input.rawBody);
  } catch {
    return { status: 400, body: { ok: false, message: 'The request could not be read.' } };
  }
  if (typeof json !== 'object' || json === null) {
    return { status: 400, body: { ok: false, message: 'The request could not be read.' } };
  }

  const spam = spamFieldsSchema.safeParse(json);
  const tooFast = spam.success && spam.data.startedAt !== undefined && now() - spam.data.startedAt < LIMITS.minFillMs;
  if (!spam.success || (spam.data.website && spam.data.website.length > 0) || tooFast) {
    log({ id, outcome: 'rejected', reason: 'spam-check' });
    return { status: 400, body: { ok: false, message: 'Your request could not be processed. Please try again.' } };
  }

  const parsed = demoRequestSchema.safeParse(json);
  if (!parsed.success) {
    log({ id, outcome: 'rejected', reason: 'validation' });
    return { status: 422, body: { ok: false, message: 'Please correct the highlighted fields.', errors: fieldErrors(parsed.error) } };
  }

  const result = await deps.deliver(parsed.data, { id, receivedAt: new Date(now()).toISOString() });
  if (!result.ok) {
    log({ id, outcome: 'failed', reason: result.reason, intent: parsed.data.intent });
    return {
      status: result.reason === 'not-configured' ? 503 : 502,
      body: { ok: false, message: GENERIC_FAIL },
    };
  }

  log({ id, outcome: 'accepted', intent: parsed.data.intent });
  return { status: 200, body: { ok: true, id, message: 'Request received.' } };
}
