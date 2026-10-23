import { LegalPage } from '@/components/sections/LegalPage';
import { pageMetadata } from '@/lib/seo';

export const metadata = pageMetadata({ title: 'Privacy policy', description: 'Avyntro privacy policy.', path: '/privacy', noindex: true });

export default function PrivacyPage() {
  return (
    <LegalPage title="Privacy policy" path="/privacy">
      <section>
        <h2>1. Who we are</h2>
        <p>[Legal entity name, registered address and contact details to be supplied.]</p>
      </section>
      <section>
        <h2>2. Information collected through this website</h2>
        <p>The demo, contact and interest forms on this website ask for:</p>
        <ul>
          <li>Full name, business email address and company name (required)</li>
          <li>Company size and the product you are interested in (required)</li>
          <li>Job role, a description of your requirements and a phone number (optional)</li>
        </ul>
        <p>[Purpose, lawful basis, recipients (e.g. the CRM or email provider configured for form delivery), retention period and international transfers to be confirmed by legal counsel.]</p>
      </section>
      <section>
        <h2>3. Cookies and analytics</h2>
        <p>This website does not currently set analytics or advertising cookies. [Update this section, and add a consent mechanism, before enabling any analytics.]</p>
      </section>
      <section>
        <h2>4. Your rights</h2>
        <p>[Data subject rights and how to exercise them, according to the jurisdictions Avyntro operates in.]</p>
      </section>
      <section>
        <h2>5. Contact</h2>
        <p>[Privacy contact details to be supplied.]</p>
      </section>
    </LegalPage>
  );
}
