import { ErpPreview } from './ErpPreview';
import { HrmsPreview } from './HrmsPreview';

/** Layered HRMS + ERP previews with a "connected" link between them. */
export function HeroPreview() {
  return (
    <figure className="relative m-0">
      <div className="relative">
        <ErpPreview caption={false} className="lg:mr-16" />
        <div className="relative -mt-10 ml-6 sm:ml-16 lg:-mt-24 lg:ml-28">
          <HrmsPreview caption={false} />
        </div>
        <div aria-hidden="true" className="absolute -top-4 right-6 hidden items-center gap-2 rounded-pill border border-border-dark bg-background-secondary px-3 py-1.5 text-xs font-medium text-text-on-dark shadow-lg sm:flex">
          <span className="size-2 rounded-full bg-secondary-soft" />
          HRMS + ERP on one platform
        </div>
      </div>
      <figcaption className="mt-4 text-xs text-text-on-dark-muted">
        Illustrative previews with fictional sample data. Not screenshots of the live product.
      </figcaption>
    </figure>
  );
}
