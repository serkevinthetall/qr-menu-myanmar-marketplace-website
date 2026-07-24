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
    name: 'purchase-orders',
    label: 'Purchase Order',
    icon: 'clipboard-list-outline',
    title: 'Purchase Order',
    description: 'Browse purchase orders from Odoo.',
  },
  {
    name: 'sale-orders',
    label: 'Sale Order',
    icon: 'cart-outline',
    title: 'Sale Order',
    description: 'View confirmed sales orders from Odoo.',
  },
  {
    name: 'memberships',
    label: 'Membership',
    icon: 'card-account-details-outline',
    title: 'Membership',
    description: 'Customer memberships from Odoo (x_membership).',
  },
  {
    name: 'membership-coupons',
    label: 'Membership Coupons',
    icon: 'ticket-confirmation-outline',
    title: 'Membership Coupons',
    description: 'Membership coupon tickets (x_membership_coupon_ti).',
  },
  {
    name: 'settings',
    label: 'Settings',
    icon: 'cog-outline',
    title: 'Settings',
    description: 'Odoo connection, users, and app preferences.',
  },
];
