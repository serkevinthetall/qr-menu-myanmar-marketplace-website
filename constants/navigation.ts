export type NavItem = {
  name: string;
  label: string;
  icon: string;
  title: string;
  description: string;
};

export const NAV_ITEMS: NavItem[] = [
  {
    name: 'index',
    label: 'Quotation',
    icon: 'file-document-outline',
    title: 'Quotation',
    description: 'Create and manage sales quotations.',
  },
  {
    name: 'customers',
    label: 'Customer',
    icon: 'account-group-outline',
    title: 'Customer',
    description: 'Contacts, partners, and customer records.',
  },
  {
    name: 'products',
    label: 'Product',
    icon: 'package-variant-closed',
    title: 'Product',
    description: 'Products synced from Odoo.',
  },
  {
    name: 'settings',
    label: 'Settings',
    icon: 'cog-outline',
    title: 'Settings',
    description: 'Odoo connection, users, and app preferences.',
  },
];
