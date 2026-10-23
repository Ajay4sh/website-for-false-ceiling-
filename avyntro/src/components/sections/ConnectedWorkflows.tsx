import { getProduct } from '@/content/products';
import type { Availability } from '@/content/types';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { ReviewMarker } from '@/components/ui/ReviewMarker';
import { cn } from '@/lib/cn';

type Step = { label: string; module: 'hrms' | 'erp' | 'crm' };
const flows: { title: string; steps: Step[]; note: string; verified: boolean }[] = [
  {
    title: 'Lead to invoice',
    steps: [
      { label: 'Lead', module: 'crm' },
      { label: 'Opportunity', module: 'crm' },
      { label: 'Sales order', module: 'erp' },
      { label: 'Fulfilment', module: 'erp' },
      { label: 'Invoice', module: 'erp' },
    ],
    note: 'Example of a potential cross-module workflow. The lead and opportunity steps depend on the planned CRM module and are not available today.',
    verified: true,
  },
  {
    title: 'Employee onboarding',
    steps: [
      { label: 'Offer accepted', module: 'hrms' },
      { label: 'Employee record', module: 'hrms' },
      { label: 'Documents', module: 'hrms' },
      { label: 'Manager tasks', module: 'hrms' },
      { label: 'Payroll inputs', module: 'hrms' },
    ],
    note: 'Example workflow within HRMS.',
    verified: getProduct('hrms').workflows.find((w) => w.title === 'Employee onboarding')?.verified ?? false,
  },
];

export function ConnectedWorkflows() {
  return (
    <div className="grid gap-8">
      {flows.map((f) => (
        <figure key={f.title} className="m-0 rounded-2xl border border-border-dark bg-surface-dark p-6 md:p-8">
          <div className="flex flex-wrap items-center gap-3">
            <h3 className="text-lg font-semibold text-white">{f.title}</h3>
            <ReviewMarker verified={f.verified} />
          </div>
          <ol className="mt-6 grid gap-3 sm:grid-cols-5 sm:gap-0">
            {f.steps.map((s, i) => {
              const status: Availability = getProduct(s.module).availability;
              const live = status === 'live';
              return (
                <li key={s.label} className="relative flex items-center gap-3 sm:flex-col sm:items-start sm:pr-4">
                  {i < f.steps.length - 1 && (
                    <span aria-hidden="true" className={cn('absolute hidden h-px sm:block sm:left-10 sm:right-0 sm:top-5', live ? 'bg-primary-soft/50' : 'border-t border-dashed border-text-on-dark-muted/50')} />
                  )}
                  <span className={cn('relative z-(--z-raised) grid size-10 shrink-0 place-items-center rounded-full text-sm font-semibold', live ? 'bg-primary-strong text-white' : 'border border-dashed border-text-on-dark-muted text-text-on-dark-muted')}>
                    {i + 1}
                  </span>
                  <span>
                    <span className={cn('block font-medium', live ? 'text-white' : 'text-text-on-dark-muted')}>{s.label}</span>
                    <span className="mt-1 flex items-center gap-2 text-xs text-text-on-dark-muted">
                      {getProduct(s.module).shortName}
                      {!live && <StatusBadge status={status} />}
                    </span>
                  </span>
                </li>
              );
            })}
          </ol>
          <figcaption className="mt-6 text-sm text-text-on-dark-muted">{f.note}</figcaption>
        </figure>
      ))}
    </div>
  );
}
