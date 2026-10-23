import { trustTopics } from '@/content/misc';
import { contentReview } from '@/lib/env';
import { ReviewMarker } from '@/components/ui/ReviewMarker';
import { Section, SectionHeading } from '@/components/ui/Section';

/**
 * Trust and transparency. Only verified topics are published. In review mode
 * the unverified topics are listed as placeholders so reviewers see the gap.
 */
export function Trust() {
  const verified = trustTopics.filter((t) => t.verified);
  const pending = trustTopics.filter((t) => !t.verified);
  return (
    <Section tone="muted" labelledBy="trust-heading">
      <SectionHeading
        id="trust-heading"
        eyebrow="Trust and transparency"
        title="Clear answers on security, data and support"
        intro={
          verified.length
            ? 'What we can tell you today about how Avyntro is operated.'
            : 'We publish details here only once they are verified. Until then, ask us about security, permissions, data handling and support during your demo.'
        }
      />
      {(verified.length > 0 || contentReview) && (
        <dl className="grid gap-px overflow-hidden rounded-xl border border-border bg-border sm:grid-cols-2 lg:grid-cols-3">
          {verified.map((t) => (
            <div key={t.title} className="bg-surface p-6">
              <dt className="font-semibold">{t.title}</dt>
              <dd className="mt-2 text-sm text-text-secondary">{t.description}</dd>
            </div>
          ))}
          {contentReview &&
            pending.map((t) => (
              <div key={t.title} className="bg-surface p-6">
                <dt className="flex flex-wrap items-center gap-2 font-semibold">{t.title} <ReviewMarker verified={false} label="Placeholder" /></dt>
                <dd className="mt-2 text-sm text-text-secondary">{t.description} Details to be supplied and verified before publication.</dd>
              </div>
            ))}
        </dl>
      )}
    </Section>
  );
}
