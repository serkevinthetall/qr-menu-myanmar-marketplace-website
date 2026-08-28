import { ENABLE_APP_INSTALL_CALL_LIST } from '@/features/app-install';

export type NavItem = {
  name: string;
  label: string;
  icon: string;
  title: string;
  description: string;
};

export type NavGroup = {
  type: 'group';
  id: string;
  label: string;
  icon: string;
  children: NavItem[];
};

export type NavLeaf = {
  type: 'item';
  item: NavItem;
};

export type NavEntry = NavLeaf | NavGroup;

const OVERVIEW: NavItem = {
  name: 'overview',
  label: 'Overview',
  icon: 'view-dashboard-outline',
  title: 'Overview',
  description: 'Sales and customer business snapshot.',
};

const QUOTATION: NavItem = {
  name: 'index',
  label: 'Quotation',
  icon: 'file-document-outline',
  title: 'Quotation',
  description: 'Create and manage sales quotations.',
};

const SALE_ORDERS: NavItem = {
  name: 'sale-orders',
  label: 'Sale Order',
  icon: 'cart-outline',
  title: 'Sale Order',
  description: 'View confirmed sales orders from Odoo.',
};

const ONLINE_ORDERS: NavItem = {
  name: 'online-orders',
  label: 'App Order',
  icon: 'shopping-outline',
  title: 'App Order',
  description: 'Quotation Sent, or Salesperson Administrator.',
};

const CUSTOMERS: NavItem = {
  name: 'customers',
  label: 'Customer',
  icon: 'account-group-outline',
  title: 'Customer',
  description: 'Contacts, partners, and customer records.',
};

const CALL_LIST: NavItem = {
  // @temp-feature app-install-call-list — independent module (NOT App Order / online-orders)
  name: 'call-list',
  label: 'App User List',
  icon: 'phone-in-talk-outline',
  title: 'App User List',
  description:
    'App install follow-ups for contacts. Separate from App Order notifications.',
};

const APP_PROMOTERS: NavItem = {
  name: 'app-promoters',
  label: 'App Promoter',
  icon: 'account-star-outline',
  title: 'App Promoter',
  description: 'View App Promoter names from Odoo (manage rates in Odoo).',
};

const APP_PROMOTER_COMMISSIONS: NavItem = {
  name: 'app-promoter-commissions',
  label: 'App Commission',
  icon: 'cash-multiple',
  title: 'App Promoter Commission',
  description: 'Commission lines from Odoo when app orders are confirmed.',
};

const PRODUCTS: NavItem = {
  name: 'products',
  label: 'Product',
  icon: 'package-variant-closed',
  title: 'Product',
  description: 'Products synced from Odoo.',
};

const PURCHASE_ORDERS: NavItem = {
  name: 'purchase-orders',
  label: 'Purchase Order',
  icon: 'clipboard-list-outline',
  title: 'Purchase Order',
  description: 'Browse purchase orders from Odoo.',
};

const MEMBERSHIPS: NavItem = {
  name: 'memberships',
  label: 'Membership',
  icon: 'card-account-details-outline',
  title: 'Membership',
  description: 'Customer memberships from Odoo (x_membership).',
};

const MEMBERSHIP_COUPONS: NavItem = {
  name: 'membership-coupons',
  label: 'Membership Coupons',
  icon: 'ticket-confirmation-outline',
  title: 'Membership Coupons',
  description: 'Membership coupon tickets (x_membership_coupon_ti).',
};

const MEMBER_REQUESTS: NavItem = {
  name: 'member-requests',
  label: 'Member Request',
  icon: 'card-account-details-outline',
  title: 'Member Request',
  description: 'Membership applications (x_membership_applicati).',
};

const SETTINGS: NavItem = {
  name: 'settings',
  label: 'Settings',
  icon: 'cog-outline',
  title: 'Settings',
  description: 'Odoo connection, users, and app preferences.',
};

/** Drawer menu structure (supports nested Orders / App List / Membership groups). */
export const NAV_ENTRIES: NavEntry[] = [
  { type: 'item', item: OVERVIEW },
  {
    type: 'group',
    id: 'orders',
    label: 'Orders',
    icon: 'clipboard-text-outline',
    children: [QUOTATION, SALE_ORDERS, ONLINE_ORDERS],
  },
  { type: 'item', item: CUSTOMERS },
  { type: 'item', item: PRODUCTS },
  { type: 'item', item: PURCHASE_ORDERS },
  // @temp-feature app-install-call-list — App User List + App Promoter under App List
  ...(ENABLE_APP_INSTALL_CALL_LIST
    ? [
        {
          type: 'group' as const,
          id: 'app-list',
          label: 'App List',
          icon: 'cellphone-arrow-down',
          children: [CALL_LIST, APP_PROMOTERS, APP_PROMOTER_COMMISSIONS],
        },
      ]
    : []),
  {
    type: 'group',
    id: 'membership',
    label: 'Membership',
    icon: 'account-badge-outline',
    children: [MEMBER_REQUESTS, MEMBERSHIPS, MEMBERSHIP_COUPONS],
  },
  { type: 'item', item: SETTINGS },
];

/** Flat list of all screens (for drawer route registration). */
export const NAV_ITEMS: NavItem[] = NAV_ENTRIES.flatMap(entry =>
  entry.type === 'item' ? [entry.item] : entry.children,
);
