import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

type Tone = 'light' | 'muted' | 'dark';
const tones: Record<Tone, string> = {
  light: 'bg-surface text-text-primary',
  muted: 'bg-background-light text-text-primary',
  dark: 'on-dark bg-background-dark text-text-on-dark',
};

export function Section({ id, tone = 'light', className, children, labelledBy }: { id?: string; tone?: Tone; className?: string; children: ReactNode; labelledBy?: string }) {
  return (
    <section id={id} aria-labelledby={labelledBy} className={cn('py-section', tones[tone], className)}>
      <div className="container-content">{children}</div>
    </section>
  );
}

export function SectionHeading({
  id, eyebrow, title, intro, align = 'left', tone = 'light', as: As = 'h2', className, children,
}: {
  id?: string; eyebrow?: string; title: ReactNode; intro?: ReactNode; align?: 'left' | 'center'; tone?: Tone; as?: 'h1' | 'h2'; className?: string; children?: ReactNode;
}) {
  const dark = tone === 'dark';
  return (
    <div className={cn('mb-10 max-w-(--container-prose) md:mb-14', align === 'center' && 'mx-auto text-center', className)}>
      {eyebrow && <p className={cn('eyebrow mb-3', dark ? 'text-secondary-soft' : 'text-secondary-strong')}>{eyebrow}</p>}
      <As id={id} className={cn('font-semibold', As === 'h1' ? 'text-display-lg' : 'text-display-md', dark ? 'text-white' : 'text-text-primary')}>
        {title}
      </As>
      {intro && <p className={cn('mt-4 text-lg', dark ? 'text-text-on-dark-muted' : 'text-text-secondary')}>{intro}</p>}
      {children}
    </div>
  );
}
