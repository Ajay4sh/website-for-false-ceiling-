import type { Availability, Product } from './types';

/**
 * Product catalogue. Availability labels are controlled here only.
 * Capability text below is a draft structure based on what HRMS/ERP products
 * commonly cover; every item is `verified: false` until confirmed against the
 * live application.
 */
export const products: Product[] = [
  {
    id: 'hrms',
    name: 'Avyntro HRMS',
    shortName: 'HRMS',
    availability: 'live',
    href: '/products/hrms',
    tagline: 'People and HR processes in one place.',
    purpose: {
      title: 'Bring employee information and HR processes into one system',
      description:
        'Avyntro HRMS is designed to help HR teams and managers keep employee records, everyday HR requests and people processes organised in a single, shared system.',
      verified: false,
      reviewNote: 'Confirm positioning wording with the product team.',
    },
    capabilities: [
      { title: 'Employee records', description: 'A central profile for each employee: personal, job and employment details.', verified: false },
      { title: 'Attendance and time', description: 'Record attendance and working time for teams and locations.', verified: false },
      { title: 'Leave management', description: 'Leave requests, approvals and balances in one flow.', verified: false },
      { title: 'Payroll inputs', description: 'Prepare the employee data that payroll depends on.', verified: false, reviewNote: 'Confirm whether full payroll processing is supported.' },
      { title: 'Onboarding', description: 'Structured steps to bring new employees into the organisation.', verified: false },
      { title: 'Employee self-service', description: 'Employees view their information and raise requests themselves.', verified: false },
    ],
    workflows: [
      {
        title: 'Leave request',
        steps: ['Employee submits request', 'Manager reviews', 'Approval recorded', 'Balance updated'],
        verified: false,
      },
      {
        title: 'Employee onboarding',
        steps: ['Offer accepted', 'Employee record created', 'Documents collected', 'Manager tasks assigned', 'Ready for payroll'],
        verified: false,
        note: 'Example workflow. Confirm it reflects the live HRMS.',
      },
    ],
    audiences: ['HR teams', 'People managers', 'Finance teams that rely on HR data', 'Employees'],
    seo: {
      title: 'HRMS: HR management software',
      description: 'Avyntro HRMS helps organisations manage employee records and HR processes in one connected system. Book a demo to see it in action.',
    },
  },
  {
    id: 'erp',
    name: 'Avyntro ERP',
    shortName: 'ERP',
    availability: 'live',
    href: '/products/erp',
    tagline: 'Operations, inventory and finance, connected.',
    purpose: {
      title: 'Coordinate core business operations in one platform',
      description:
        'Avyntro ERP is designed to connect purchasing, inventory, sales and financial processes so that teams work from the same, up-to-date information.',
      verified: false,
      reviewNote: 'Confirm positioning wording with the product team.',
    },
    capabilities: [
      { title: 'Purchasing', description: 'Raise and track purchase orders with suppliers.', verified: false },
      { title: 'Inventory', description: 'Track stock levels, movements and locations.', verified: false },
      { title: 'Sales orders', description: 'Capture customer orders and follow them through to fulfilment.', verified: false },
      { title: 'Invoicing', description: 'Create invoices from orders and follow up on what is outstanding.', verified: false },
      { title: 'Accounting', description: 'Record financial transactions linked to operational activity.', verified: false, reviewNote: 'Confirm accounting scope (GL, AP/AR, tax).' },
      { title: 'Reporting', description: 'Operational and financial reports drawn from the same data.', verified: false },
    ],
    workflows: [
      {
        title: 'Order to invoice',
        steps: ['Sales order created', 'Stock reserved', 'Order fulfilled', 'Invoice issued', 'Payment recorded'],
        verified: false,
      },
      {
        title: 'Procure to stock',
        steps: ['Purchase order raised', 'Goods received', 'Stock updated', 'Supplier bill recorded'],
        verified: false,
      },
    ],
    audiences: ['Operations teams', 'Finance and accounts', 'Purchasing and warehouse teams', 'Business owners'],
    seo: {
      title: 'ERP: business operations software',
      description: 'Avyntro ERP connects purchasing, inventory, sales and finance processes in one platform. Book a demo to see how it fits your business.',
    },
  },
  {
    id: 'crm',
    name: 'Avyntro CRM',
    shortName: 'CRM',
    availability: 'planned',
    tagline: 'Customer relationships and sales pipeline.',
    purpose: {
      title: 'Planned: customer and sales pipeline management',
      description: 'A CRM module is in the pipeline. Scope and timing have not been announced.',
      verified: true,
    },
    capabilities: [],
    workflows: [],
    audiences: ['Sales teams'],
  },
  {
    id: 'project-management',
    name: 'Avyntro Projects',
    shortName: 'Project Management',
    availability: 'planned',
    tagline: 'Plan and deliver projects.',
    purpose: {
      title: 'Planned: project management',
      description: 'A project management module is in the pipeline. Scope and timing have not been announced.',
      verified: true,
    },
    capabilities: [],
    workflows: [],
    audiences: ['Delivery teams'],
  },
  {
    id: 'more',
    name: 'Additional products',
    shortName: 'More to come',
    availability: 'tba',
    tagline: 'Further business capabilities.',
    purpose: {
      title: 'To be announced',
      description: 'Additional business capabilities will be announced later.',
      verified: true,
    },
    capabilities: [],
    workflows: [],
    audiences: [],
  },
];

export const availabilityLabel: Record<Availability, string> = {
  live: 'Live',
  planned: 'Planned',
  tba: 'To be announced',
};

export const liveProducts = () => products.filter((p) => p.availability === 'live');
export const upcomingProducts = () => products.filter((p) => p.availability !== 'live');
export const getProduct = (id: Product['id']) => {
  const p = products.find((x) => x.id === id);
  if (!p) throw new Error(`Unknown product ${id}`);
  return p;
};
