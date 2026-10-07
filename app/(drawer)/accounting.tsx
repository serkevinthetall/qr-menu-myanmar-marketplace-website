/**
 * Accounting module — UI shell only (no Odoo API yet).
 * Sections mirror a thin Odoo Accounting desk: invoices, bills, payments.
 */
import { useCallback, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Chip, Icon, Text, useTheme } from 'react-native-paper';

import { Pagination } from '@/components/ui/Pagination';
import {
  HeaderAction,
  useHeaderActions,
  useModuleSearch,
} from '@/contexts/search-context';
import { useResponsive } from '@/hooks/use-responsive';

type AccountingTab = 'invoices' | 'bills' | 'payments';

type StatusFilter = 'all' | 'draft' | 'posted' | 'not_paid' | 'paid';

const TABS: { key: AccountingTab; label: string; icon: string }[] = [
  { key: 'invoices', label: 'Customer Invoices', icon: 'file-document-outline' },
  { key: 'bills', label: 'Vendor Bills', icon: 'receipt-text-outline' },
  { key: 'payments', label: 'Payments', icon: 'cash-multiple' },
];

const STATUS_FILTERS: { key: StatusFilter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'draft', label: 'Draft' },
  { key: 'posted', label: 'Posted' },
  { key: 'not_paid', label: 'Not Paid' },
  { key: 'paid', label: 'Paid' },
];

const INVOICE_COLUMNS = [
  { key: 'number', label: 'Number', flex: 1.2 },
  { key: 'partner', label: 'Customer', flex: 1.6 },
  { key: 'date', label: 'Invoice Date', flex: 1.2 },
  { key: 'due', label: 'Due Date', flex: 1.2 },
  { key: 'total', label: 'Total', flex: 1.1, align: 'right' as const },
  { key: 'residual', label: 'Amount Due', flex: 1.1, align: 'right' as const },
  { key: 'status', label: 'Status', flex: 1 },
  { key: 'payment', label: 'Payment', flex: 1 },
];

const BILL_COLUMNS = [
  { key: 'number', label: 'Number', flex: 1.2 },
  { key: 'partner', label: 'Vendor', flex: 1.6 },
  { key: 'date', label: 'Bill Date', flex: 1.2 },
  { key: 'due', label: 'Due Date', flex: 1.2 },
  { key: 'total', label: 'Total', flex: 1.1, align: 'right' as const },
  { key: 'residual', label: 'Amount Due', flex: 1.1, align: 'right' as const },
  { key: 'status', label: 'Status', flex: 1 },
  { key: 'payment', label: 'Payment', flex: 1 },
];

const PAYMENT_COLUMNS = [
  { key: 'number', label: 'Number', flex: 1.2 },
  { key: 'partner', label: 'Partner', flex: 1.6 },
  { key: 'date', label: 'Date', flex: 1.2 },
  { key: 'journal', label: 'Journal', flex: 1.3 },
  { key: 'amount', label: 'Amount', flex: 1.1, align: 'right' as const },
  { key: 'type', label: 'Type', flex: 1 },
  { key: 'status', label: 'Status', flex: 1 },
];

const EMPTY_HEADER_ACTIONS: HeaderAction[] = [];

function formatMoney(value: number): string {
  return `${value.toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })} MMK`;
}

export default function AccountingScreen() {
  const theme = useTheme();
  const { isDesktop } = useResponsive();
  const [tab, setTab] = useState<AccountingTab>('invoices');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');

  const searchPlaceholder = useMemo(() => {
    switch (tab) {
      case 'bills':
        return 'Search vendor bills by number or vendor';
      case 'payments':
        return 'Search payments by number or partner';
      default:
        return 'Search customer invoices by number or customer';
    }
  }, [tab]);

  useModuleSearch(searchPlaceholder);
  useHeaderActions(EMPTY_HEADER_ACTIONS);

  const columns = useMemo(() => {
    if (tab === 'bills') return BILL_COLUMNS;
    if (tab === 'payments') return PAYMENT_COLUMNS;
    return INVOICE_COLUMNS;
  }, [tab]);

  const visibleColumns = useMemo(() => {
    if (isDesktop) return columns;
    return columns.filter(col =>
      ['number', 'partner', 'total', 'amount', 'status', 'payment'].includes(
        col.key,
      ),
    );
  }, [columns, isDesktop]);

  const emptyCopy = useMemo(() => {
    switch (tab) {
      case 'bills':
        return {
          title: 'No vendor bills yet',
          body: 'Vendor bills from Odoo will appear here. UI only for now — data wiring comes next.',
        };
      case 'payments':
        return {
          title: 'No payments yet',
          body: 'Customer and vendor payments from Odoo will appear here. UI only for now.',
        };
      default:
        return {
          title: 'No customer invoices yet',
          body: 'Customer invoices from Odoo will appear here. UI only for now — data wiring comes next.',
        };
    }
  }, [tab]);

  const onChangeTab = useCallback((next: AccountingTab) => {
    setTab(next);
    setStatusFilter('all');
  }, []);

  const kpiCards = useMemo(
    () => [
      {
        key: 'receivable',
        label: 'Receivable',
        value: formatMoney(0),
        hint: 'Open customer invoices',
        icon: 'account-arrow-left-outline',
      },
      {
        key: 'payable',
        label: 'Payable',
        value: formatMoney(0),
        hint: 'Open vendor bills',
        icon: 'account-arrow-right-outline',
      },
      {
        key: 'invoices',
        label: 'Invoices',
        value: '0',
        hint: 'Customer invoices loaded',
        icon: 'file-document-outline',
      },
      {
        key: 'bills',
        label: 'Bills',
        value: '0',
        hint: 'Vendor bills loaded',
        icon: 'receipt-text-outline',
      },
    ],
    [],
  );

  return (
    <View
      style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ScrollView
        style={styles.flex}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>
        <View style={styles.kpiRow}>
          {kpiCards.map(card => (
            <View
              key={card.key}
              style={[
                styles.kpiTile,
                {
                  backgroundColor: theme.colors.surface,
                  borderColor: theme.colors.outlineVariant ?? theme.colors.outline,
                },
              ]}>
              <View style={styles.kpiTop}>
                <Icon
                  source={card.icon}
                  size={20}
                  color={theme.colors.primary}
                />
                <Text
                  variant="labelLarge"
                  style={{ color: theme.colors.onSurfaceVariant }}>
                  {card.label}
                </Text>
              </View>
              <Text variant="headlineSmall" style={styles.kpiValue}>
                {card.value}
              </Text>
              <Text
                variant="bodySmall"
                style={{ color: theme.colors.onSurfaceVariant }}>
                {card.hint}
              </Text>
            </View>
          ))}
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabRow}>
          {TABS.map(item => {
            const selected = tab === item.key;
            return (
              <Chip
                key={item.key}
                compact
                icon={item.icon}
                selected={selected}
                onPress={() => onChangeTab(item.key)}
                style={[
                  styles.tabChip,
                  {
                    backgroundColor: selected
                      ? theme.colors.primaryContainer
                      : theme.colors.surface,
                    borderColor: selected
                      ? theme.colors.primary
                      : theme.colors.outlineVariant ?? theme.colors.outline,
                  },
                ]}
                textStyle={{
                  color: selected
                    ? theme.colors.onPrimaryContainer
                    : theme.colors.onSurface,
                  fontWeight: '600',
                }}>
                {item.label}
              </Chip>
            );
          })}
        </ScrollView>

        {tab !== 'payments' ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.statusRow}>
            {STATUS_FILTERS.map(item => {
              const selected = statusFilter === item.key;
              return (
                <Chip
                  key={item.key}
                  compact
                  selected={selected}
                  onPress={() => setStatusFilter(item.key)}
                  style={[
                    styles.statusChip,
                    {
                      backgroundColor: selected
                        ? theme.colors.secondaryContainer
                        : theme.colors.surfaceVariant,
                    },
                  ]}
                  textStyle={{
                    color: selected
                      ? theme.colors.onSecondaryContainer
                      : theme.colors.onSurfaceVariant,
                    fontWeight: '600',
                    fontSize: 12,
                  }}>
                  {item.label}
                </Chip>
              );
            })}
          </ScrollView>
        ) : null}

        <View
          style={[
            styles.tableWrap,
            {
              borderColor: theme.colors.outlineVariant ?? theme.colors.outline,
              backgroundColor: theme.colors.surface,
            },
          ]}>
          <View
            style={[
              styles.headerRow,
              { backgroundColor: theme.colors.primary },
            ]}>
            {visibleColumns.map(col => (
              <Text
                key={col.key}
                numberOfLines={1}
                style={[
                  styles.th,
                  { flex: col.flex, color: theme.colors.onPrimary },
                  col.align === 'right' ? styles.alignRight : null,
                ]}>
                {col.label}
              </Text>
            ))}
          </View>

          <View style={styles.emptyBlock}>
            <Icon
              source="book-open-page-variant-outline"
              size={40}
              color={theme.colors.onSurfaceVariant}
            />
            <Text
              variant="titleMedium"
              style={[styles.emptyTitle, { color: theme.colors.onSurface }]}>
              {emptyCopy.title}
            </Text>
            <Text
              variant="bodyMedium"
              style={{
                color: theme.colors.onSurfaceVariant,
                textAlign: 'center',
                maxWidth: 420,
              }}>
              {emptyCopy.body}
            </Text>
          </View>
        </View>
      </ScrollView>

      <Pagination
        page={1}
        pageCount={1}
        total={0}
        pageSize={50}
        onChange={() => undefined}
        centerLabel="Accounting · UI only"
        itemLabel={
          tab === 'bills' ? 'bill' : tab === 'payments' ? 'payment' : 'invoice'
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    gap: 14,
    paddingBottom: 24,
  },
  kpiRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  kpiTile: {
    flexGrow: 1,
    flexBasis: 160,
    minWidth: 150,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 4,
  },
  kpiTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  kpiValue: {
    fontWeight: '700',
    marginTop: 2,
  },
  tabRow: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 2,
  },
  tabChip: {
    borderWidth: 1,
    borderRadius: 18,
  },
  statusRow: {
    flexDirection: 'row',
    gap: 8,
    paddingBottom: 2,
  },
  statusChip: {
    borderRadius: 16,
  },
  tableWrap: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 10,
    overflow: 'hidden',
    minHeight: 280,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  th: {
    fontSize: 12,
    fontWeight: '700',
  },
  alignRight: {
    textAlign: 'right',
  },
  emptyBlock: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 48,
    gap: 8,
  },
  emptyTitle: {
    fontWeight: '700',
    marginTop: 4,
    textAlign: 'center',
  },
});
