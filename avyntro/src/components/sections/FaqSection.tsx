import { AccordionItem } from '@/components/ui/Accordion';
import { ReviewMarker } from '@/components/ui/ReviewMarker';
import { Section, SectionHeading } from '@/components/ui/Section';
import type { FaqItem } from '@/content/types';

export function FaqSection({ items, title = 'Frequently asked questions', tone = 'light' }: { items: FaqItem[]; title?: string; tone?: 'light' | 'muted' }) {
  return (
    <Section tone={tone} labelledBy="faq-heading" id="faq">
      <div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr]">
        <SectionHeading id="faq-heading" eyebrow="FAQ" title={title} intro="Straight answers to common questions. If yours is not here, ask us during a demo." />
        <div className="border-t border-border">
          {items.map((f) => (
            <AccordionItem key={f.question} title={<>{f.question} <ReviewMarker verified={f.verified} className="ml-1" /></>}>
              <p>{f.answer}</p>
            </AccordionItem>
          ))}
        </div>
      </div>
    </Section>
  );
}
