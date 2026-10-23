import { LegalPage } from '@/components/sections/LegalPage';
import { pageMetadata } from '@/lib/seo';

export const metadata = pageMetadata({ title: 'Terms of service', description: 'Avyntro terms of service.', path: '/terms', noindex: true });

export default function TermsPage() {
  return (
    <LegalPage title="Terms of service" path="/terms">
      <section><h2>1. Scope</h2><p>[Define whether these terms cover the marketing website only, or also the Avyntro subscription services.]</p></section>
      <section><h2>2. Use of this website</h2><p>[Acceptable use, intellectual property and content accuracy statements to be drafted.]</p></section>
      <section><h2>3. Subscriptions</h2><p>[Subscription terms are normally set out in a separate customer agreement. Reference it here once available.]</p></section>
      <section><h2>4. Liability</h2><p>[To be drafted by legal counsel.]</p></section>
      <section><h2>5. Governing law</h2><p>[Jurisdiction to be confirmed.]</p></section>
    </LegalPage>
  );
}
