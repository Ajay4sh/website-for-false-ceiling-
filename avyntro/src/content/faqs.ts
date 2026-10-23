import type { FaqItem } from './types';

/**
 * FAQs. Answers state only what the business brief establishes. Questions
 * whose real answer is not yet known say so and point to the demo, and are
 * marked unverified.
 */
export const faqs: FaqItem[] = [
  {
    topic: 'Availability',
    question: 'Which Avyntro products are available today?',
    answer: 'Avyntro HRMS and Avyntro ERP are live. CRM and project management are planned, and further capabilities will be announced later.',
    verified: true,
  },
  {
    topic: 'Availability',
    question: 'When will CRM and project management be available?',
    answer: 'Release dates have not been announced. Register your interest and we will contact you when there is news.',
    verified: true,
  },
  {
    topic: 'HRMS',
    question: 'What does Avyntro HRMS cover?',
    answer: 'Avyntro HRMS brings employee information and HR processes into one system. See the HRMS page for the capability areas, and book a demo to see them in the product.',
    verified: false,
    reviewNote: 'Replace with a confirmed module list.',
  },
  {
    topic: 'ERP',
    question: 'What does Avyntro ERP cover?',
    answer: 'Avyntro ERP connects operational and financial processes such as purchasing, inventory, sales orders and invoicing. A demo is the best way to check fit for your processes.',
    verified: false,
    reviewNote: 'Replace with a confirmed module list.',
  },
  {
    topic: 'Pricing',
    question: 'How is Avyntro priced?',
    answer: 'Avyntro uses subscription-based, modular pricing, with enterprise pricing for larger organisations. Pricing for your organisation is shared during a demo or sales conversation.',
    verified: true,
  },
  {
    topic: 'Pricing',
    question: 'Can I subscribe to only HRMS or only ERP?',
    answer: 'Pricing is modular. Our team will confirm the module combinations available for your organisation.',
    verified: false,
    reviewNote: 'Confirm whether single-module subscriptions are offered.',
  },
  {
    topic: 'Integrations',
    question: 'Does Avyntro integrate with other software?',
    answer: 'We only list integrations that have been verified. If you rely on a specific system, mention it when you book a demo and we will confirm what is possible.',
    verified: true,
  },
  {
    topic: 'Implementation',
    question: 'How does implementation work?',
    answer: 'Implementation approach and timelines depend on your requirements and are discussed during your demo.',
    verified: false,
    reviewNote: 'Add the confirmed implementation process when available.',
  },
  {
    topic: 'Support',
    question: 'What support is available?',
    answer: 'Support options are discussed as part of your subscription. Ask about support during your demo.',
    verified: false,
    reviewNote: 'Add confirmed support channels, hours and SLAs.',
  },
];
