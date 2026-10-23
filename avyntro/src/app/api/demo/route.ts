import { NextResponse, type NextRequest } from 'next/server';
import { handleDemoRequest } from '@/lib/demo/handler';
import { createDeliver, readDeliveryConfig } from '@/lib/demo/deliver';
import { createRateLimiter } from '@/lib/demo/rate-limit';
import { LIMITS } from '@/lib/demo/schema';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const limiter = createRateLimiter(
  Number(process.env.DEMO_RATE_LIMIT_MAX) || 5,
  (Number(process.env.DEMO_RATE_LIMIT_WINDOW_SECONDS) || 600) * 1000,
);

/** Read the body with a hard size cap, without trusting Content-Length. */
async function readLimited(req: NextRequest, max: number): Promise<string | null> {
  if (!req.body) return '';
  const reader = req.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > max) {
      await reader.cancel();
      return null;
    }
    chunks.push(value);
  }
  return Buffer.concat(chunks).toString('utf8');
}

function clientKey(req: NextRequest): string {
  // Behind a trusted proxy (e.g. Vercel), the first X-Forwarded-For entry is the client.
  const fwd = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  return fwd || req.headers.get('x-real-ip') || 'unknown';
}

export async function POST(req: NextRequest) {
  const raw = await readLimited(req, LIMITS.body);
  const result = await handleDemoRequest(
    {
      contentType: req.headers.get('content-type'),
      contentLength: req.headers.get('content-length'),
      rawBody: raw ?? 'x'.repeat(LIMITS.body + 1),
      clientKey: clientKey(req),
    },
    {
      deliver: createDeliver(readDeliveryConfig()),
      limiter,
      // Structured, PII-free log line.
      log: (event) => console.info(JSON.stringify({ event: 'demo_request', ...event })),
    },
  );
  return NextResponse.json(result.body, {
    status: result.status,
    headers: { 'cache-control': 'no-store', ...result.headers },
  });
}

export function GET() {
  return NextResponse.json({ ok: false, message: 'Method not allowed.' }, { status: 405, headers: { allow: 'POST' } });
}
