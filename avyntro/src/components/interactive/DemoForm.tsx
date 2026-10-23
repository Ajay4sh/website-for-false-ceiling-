'use client';

import Link from 'next/link';
import { useEffect, useId, useRef, useState, type FormEvent } from 'react';
import {
  demoRequestSchema, fieldErrors, LIMITS, productInterestLabels, productInterestValues,
  type DemoRequestInput,
} from '@/lib/demo/schema';
import { companySizes } from '@/lib/solution-finder';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/cn';

type Intent = 'demo' | 'sales' | 'interest';
type Status = { kind: 'idle' } | { kind: 'submitting' } | { kind: 'success'; id: string } | { kind: 'error'; message: string };

const copy: Record<Intent, { submit: string; success: string; product: string }> = {
  demo: { submit: 'Request a demo', success: 'Thank you. Your demo request has been received.', product: 'Which product would you like to see?' },
  sales: { submit: 'Contact sales', success: 'Thank you. Your message has been received.', product: 'Which product are you interested in?' },
  interest: { submit: 'Register interest', success: 'Thank you. Your interest has been registered.', product: 'Which upcoming product interests you?' },
};

/**
 * Demo / sales / interest form.
 * - Client validation uses the same schema as the server.
 * - Success is shown ONLY when the API confirms the request was delivered.
 * - Double submission is blocked while a request is in flight.
 */
export function DemoForm({ intent = 'demo', defaultProduct }: { intent?: Intent; defaultProduct?: string }) {
  const id = useId();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<Status>({ kind: 'idle' });
  const inFlight = useRef(false);
  const startedAt = useRef<number>(0);
  const formRef = useRef<HTMLFormElement>(null);
  const successRef = useRef<HTMLHeadingElement>(null);
  const errorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    startedAt.current = Date.now();
  }, []);
  useEffect(() => {
    if (status.kind === 'success') successRef.current?.focus();
    if (status.kind === 'error') errorRef.current?.focus();
  }, [status]);

  const productOptions = intent === 'interest'
    ? (['crm', 'project-management', 'not-sure'] as const)
    : productInterestValues;
  const initialProduct = (productOptions as readonly string[]).includes(defaultProduct ?? '') ? defaultProduct : '';

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (inFlight.current) return;
    const fd = new FormData(e.currentTarget);
    const data: DemoRequestInput & { website: string; startedAt: number } = {
      intent,
      fullName: String(fd.get('fullName') ?? ''),
      email: String(fd.get('email') ?? ''),
      company: String(fd.get('company') ?? ''),
      role: String(fd.get('role') ?? ''),
      companySize: String(fd.get('companySize') ?? '') as DemoRequestInput['companySize'],
      product: String(fd.get('product') ?? '') as DemoRequestInput['product'],
      requirements: String(fd.get('requirements') ?? ''),
      phone: String(fd.get('phone') ?? ''),
      consent: (fd.get('consent') === 'on') as true,
      website: String(fd.get('website') ?? ''),
      startedAt: startedAt.current,
    };

    const parsed = demoRequestSchema.safeParse(data);
    if (!parsed.success) {
      const errs = fieldErrors(parsed.error);
      setErrors(errs);
      setStatus({ kind: 'idle' });
      const first = Object.keys(errs)[0];
      if (first) formRef.current?.querySelector<HTMLElement>(`[name="${first}"]`)?.focus();
      return;
    }
    setErrors({});
    inFlight.current = true;
    setStatus({ kind: 'submitting' });
    try {
      const res = await fetch('/api/demo', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(data),
      });
      const body = (await res.json().catch(() => null)) as { ok?: boolean; id?: string; message?: string; errors?: Record<string, string> } | null;
      if (res.ok && body?.ok && body.id) {
        setStatus({ kind: 'success', id: body.id });
      } else {
        if (body?.errors) setErrors(body.errors);
        setStatus({ kind: 'error', message: body?.message ?? 'We could not send your request. Please try again in a few minutes.' });
      }
    } catch {
      setStatus({ kind: 'error', message: 'We could not reach our server. Check your connection and try again.' });
    } finally {
      inFlight.current = false;
    }
  }

  if (status.kind === 'success') {
    return (
      <div className="rounded-2xl border border-success/20 bg-success-bg p-8" role="status">
        <h2 ref={successRef} tabIndex={-1} className="text-xl font-semibold text-success">{copy[intent].success}</h2>
        <p className="mt-3 text-text-primary">Our team will reply to the email address you provided.</p>
        <p className="mt-2 text-sm text-text-secondary">Reference: <span className="font-mono">{status.id}</span></p>
        <Link href="/platform" className="mt-6 inline-block font-semibold text-primary-strong hover:underline">Explore the platform while you wait</Link>
      </div>
    );
  }

  const field = (name: string) => ({
    name,
    id: `${id}-${name}`,
    'aria-invalid': errors[name] ? true : undefined,
    'aria-describedby': errors[name] ? `${id}-${name}-error` : undefined,
  });
  const input = (name: string) =>
    cn('mt-2 block w-full rounded-md border bg-surface px-3 text-sm text-text-primary placeholder:text-text-secondary', errors[name] ? 'border-danger' : 'border-border');
  const err = (name: string) =>
    errors[name] ? <p id={`${id}-${name}-error`} className="mt-1.5 text-sm text-danger">{errors[name]}</p> : null;
  const submitting = status.kind === 'submitting';
  const errorCount = Object.keys(errors).length;

  return (
    <form ref={formRef} noValidate onSubmit={onSubmit} className="grid gap-5" aria-describedby={`${id}-required`} data-testid="demo-form">
      <p id={`${id}-required`} className="text-sm text-text-secondary">Fields marked * are required.</p>

      {status.kind === 'error' && (
        <div ref={errorRef} tabIndex={-1} role="alert" className="rounded-lg border border-danger/20 bg-danger-bg px-4 py-3 text-sm text-danger">
          {status.message}
        </div>
      )}
      {errorCount > 0 && status.kind !== 'error' && (
        <p role="alert" className="text-sm font-medium text-danger">
          Please correct {errorCount === 1 ? '1 field' : `${errorCount} fields`} below.
        </p>
      )}

      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label htmlFor={`${id}-fullName`} className="text-sm font-medium">Full name *</label>
          <input {...field('fullName')} type="text" autoComplete="name" maxLength={LIMITS.name} className={cn(input('fullName'), 'h-11')} />
          {err('fullName')}
        </div>
        <div>
          <label htmlFor={`${id}-email`} className="text-sm font-medium">Business email *</label>
          <input {...field('email')} type="email" autoComplete="email" inputMode="email" maxLength={254} className={cn(input('email'), 'h-11')} />
          {err('email')}
        </div>
        <div>
          <label htmlFor={`${id}-company`} className="text-sm font-medium">Company *</label>
          <input {...field('company')} type="text" autoComplete="organization" maxLength={LIMITS.company} className={cn(input('company'), 'h-11')} />
          {err('company')}
        </div>
        <div>
          <label htmlFor={`${id}-role`} className="text-sm font-medium">Job role</label>
          <input {...field('role')} type="text" autoComplete="organization-title" maxLength={LIMITS.role} className={cn(input('role'), 'h-11')} />
          {err('role')}
        </div>
        <div>
          <label htmlFor={`${id}-companySize`} className="text-sm font-medium">Company size *</label>
          <select {...field('companySize')} defaultValue="" className={cn(input('companySize'), 'h-11')}>
            <option value="" disabled>Select…</option>
            {companySizes.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
          {err('companySize')}
        </div>
        <div>
          <label htmlFor={`${id}-product`} className="text-sm font-medium">{copy[intent].product} *</label>
          <select {...field('product')} defaultValue={initialProduct} className={cn(input('product'), 'h-11')}>
            <option value="" disabled>Select…</option>
            {productOptions.map((p) => <option key={p} value={p}>{productInterestLabels[p]}</option>)}
          </select>
          {err('product')}
        </div>
      </div>

      <div>
        <label htmlFor={`${id}-requirements`} className="text-sm font-medium">What would you like to achieve?</label>
        <textarea {...field('requirements')} rows={4} maxLength={LIMITS.requirements} className={cn(input('requirements'), 'py-2.5')} placeholder="For example: the processes you want to improve, systems you use today, number of users." />
        {err('requirements')}
      </div>

      <div className="sm:max-w-[50%] sm:pr-2.5">
        <label htmlFor={`${id}-phone`} className="text-sm font-medium">Phone (optional)</label>
        <input {...field('phone')} type="tel" autoComplete="tel" inputMode="tel" maxLength={LIMITS.phone} className={cn(input('phone'), 'h-11')} />
        {err('phone')}
      </div>

      {/* Honeypot: hidden from people and assistive technology. */}
      <div aria-hidden="true" className="absolute -left-[9999px] h-px w-px overflow-hidden">
        <label htmlFor={`${id}-website`}>Website</label>
        <input id={`${id}-website`} name="website" type="text" tabIndex={-1} autoComplete="off" defaultValue="" />
      </div>

      <div>
        <div className="flex items-start gap-3">
          <input {...field('consent')} type="checkbox" className="mt-1 size-4 shrink-0 accent-(--color-primary-strong)" />
          <label htmlFor={`${id}-consent`} className="text-sm">
            I agree that Avyntro may use these details to respond to this request. See our{' '}
            <Link href="/privacy" className="font-medium text-primary-strong underline">privacy policy</Link>. *
          </label>
        </div>
        {err('consent')}
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <Button type="submit" size="lg" disabled={submitting} aria-disabled={submitting}>
          {submitting && (
            <svg className="size-4 animate-spin" viewBox="0 0 24 24" aria-hidden="true">
              <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeOpacity=".3" strokeWidth="3" />
              <path d="M21 12a9 9 0 0 0-9-9" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
            </svg>
          )}
          {submitting ? 'Sending…' : copy[intent].submit}
        </Button>
        <span role="status" aria-live="polite" className="sr-only">{submitting ? 'Sending your request' : ''}</span>
      </div>
      <p className="text-xs text-text-secondary">
        We ask only for the details needed to respond to your request.
      </p>
    </form>
  );
}
