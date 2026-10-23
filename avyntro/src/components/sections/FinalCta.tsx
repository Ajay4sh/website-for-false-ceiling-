import { ArrowIcon, ButtonLink } from '@/components/ui/Button';

export function FinalCta({ title = 'See how Avyntro fits your business', text = 'Book a demo with our team. We will walk through HRMS and ERP using your processes as the starting point.' }: { title?: string; text?: string }) {
  return (
    <section aria-labelledby="final-cta" className="on-dark bg-background-dark">
      <div className="container-content py-section">
        <div className="relative overflow-hidden rounded-2xl border border-border-dark bg-background-secondary px-6 py-12 md:px-14 md:py-16">
          <div aria-hidden="true" className="bg-grid-dark absolute inset-0 opacity-60 [mask-image:linear-gradient(to_left,black,transparent_70%)]" />
          <div className="relative flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-xl">
              <h2 id="final-cta" className="text-display-md font-semibold text-white">{title}</h2>
              <p className="mt-4 text-lg text-text-on-dark-muted">{text}</p>
            </div>
            <div className="flex flex-wrap gap-3">
              <ButtonLink href="/book-demo" size="lg">Book a demo</ButtonLink>
              <ButtonLink href="/contact" variant="secondary-dark" size="lg">Talk to sales <ArrowIcon /></ButtonLink>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
