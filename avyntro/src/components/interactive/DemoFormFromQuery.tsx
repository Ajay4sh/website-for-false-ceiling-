'use client';

import { useSearchParams } from 'next/navigation';
import { DemoForm } from './DemoForm';

type Intent = 'demo' | 'sales' | 'interest';

/** Reads ?intent= and ?product= so links can pre-select the form, keeping the page static. */
export function DemoFormFromQuery({ fallbackIntent = 'demo' }: { fallbackIntent?: Intent }) {
  const params = useSearchParams();
  const raw = params.get('intent');
  const intent: Intent = raw === 'sales' || raw === 'interest' || raw === 'demo' ? raw : fallbackIntent;
  return <DemoForm key={intent} intent={intent} defaultProduct={params.get('product') ?? undefined} />;
}
