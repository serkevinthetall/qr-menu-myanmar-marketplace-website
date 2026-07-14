import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FlatList, Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import {
  ActivityIndicator,
  Card,
  Checkbox,
  Snackbar,
  Text,
  useTheme,
} from 'react-native-paper';
import { useLocalSearchParams, useRouter } from 'expo-router';

import {
  QuotationBuilder,
  QuotationDraft,
} from '@/components/quotation/QuotationBuilder';
import { QuotationDetailView } from '@/components/quotation/QuotationDetailView';
import {
  EMPTY_QUOTATION_FILTERS,
  hasActiveQuotationFilters,
  matchesQuotationFilters,
  QuotationFilterBar,
  QuotationFilters,
} from '@/components/quotation/QuotationFilterBar';
import { QuotationPrintPreview } from '@/components/quotation/QuotationPrintPreview';
import { Pagination } from '@/components/ui/Pagination';
import { useAuth } from '@/contexts/auth-context';
import { useAppTheme } from '@/contexts/theme-context';
import { getQuotationStatusColors } from '@/constants/status-colors';
import {
  HeaderAction,
  useHeaderActions,
  useModuleFilters,
  useModuleSearch,
  useSearch,
} from '@/contexts/search-context';
import { useResponsive } from '@/hooks/use-responsive';
import { fetchCustomersPage } from '@/services/customers';
import { fetchProductsPage } from '@/services/products';
import { fetchQuotationDetail, fetchQuotations, createQuotation, fetchPaymentMethods } from '@/services/quotations';
import {
  getQuotationBuilderCache,
  isQuotationBuilderCacheFresh,
  mergeById,
  patchQuotationBuilderCache,
  setQuotationBuilderCache,
} from '@/utils/quotation-builder-cache';
import { Customer } from '@/types/customer';
import { Product } from '@/types/product';
import { Quotation, QuotationDetail, PaymentMethod, QuotationReorderSeed } from '@/types/quotation';
import { exportSelectedQuotations } from '@/utils/export-quotation-excel';
import { exportSelectedQuotationsPdf } from '@/utils/export-quotation-pdf';
import {
  clearQuotationDraft,
  shouldResumeQuotationDraft,
} from '@/utils/quotation-draft-storage';
import { PrintFormat } from '@/utils/print-quotation';

const PAGE_SIZE = 50;
/** First page size for New Quotation progressive load. */
const BUILDER_PAGE_SIZE = 100;
const BUILDER_MAX_PAGES = 10;

type ViewMode = 'list' | 'card';

type Column = {
  key: string;
  label: string;
  flex: number;
  align?: 'left' | 'right';
};

const COLUMNS: Column[] = [
  { key: 'number', label: 'Number', flex: 1.4 },
  { key: 'createDate', label: 'Creation Date', flex: 1.5 },
  { key: 'customer', label: 'Customer', flex: 2.2 },
  { key: 'total', label: 'Total', flex: 1.5, align: 'right' },
  { key: 'status', label: 'Status', flex: 1.4 },
  { key: 'paymentMethod', label: 'Payment Method', flex: 1.6 },
];

const MONTHS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

function formatMoney(value: unknown) {
  const num = Number(value ?? 0);
  const safe = Number.isFinite(num) ? num : 0;
  return `${safe.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} MMK`;
}

function formatDateTime(value: unknown) {
  if (!value || typeof value !== 'string') {
    return '';
  }
  const trimmed = value.trim();
  if (/AM|PM/i.test(trimmed)) {
    return trimmed;
  }

  const normalized = trimmed.replace('T', ' ').replace(/\.\d+Z?$/, '').replace(/Z$/, '');
  const [datePart, timePart = ''] = normalized.split(' ');
  const [year, month, day] = datePart.split('-').map(Number);
  if (!year || !month || !day) {
    return trimmed;
  }

  const now = new Date();
  const sameYear = year === now.getFullYear();
  const dateLabel = sameYear
    ? `${MONTHS[month - 1]} ${day}`
    : `${MONTHS[month - 1]} ${day}, ${year}`;

  if (!timePart || timePart.startsWith('00:00:00')) {
    return dateLabel;
  }

  const [hourRaw, minuteRaw] = timePart.split(':').map(Number);
  const hours = Number.isFinite(hourRaw) ? hourRaw : 0;
  const minutes = Number.isFinite(minuteRaw) ? minuteRaw : 0;
  const period = hours >= 12 ? 'PM' : 'AM';
  const hour12 = hours % 12 || 12;
  const minuteStr = String(minutes).padStart(2, '0');

  return `${dateLabel}, ${hour12}:${minuteStr} ${period}`;
}

function StatusBadge({ status }: { status: string }) {
  const { mode } = useAppTheme();
  const { label, bg, fg } = getQuotationStatusColors(mode, status);

  if (!status) {
    return <Text style={{ opacity: 0.5 }}>—</Text>;
  }

  return (
    <View style={[styles.statusBadge, { backgroundColor: bg }]}>
      <Text
        variant="labelSmall"
        numberOfLines={1}
        style={{ color: fg, fontWeight: '600' }}>
        {label}
      </Text>
    </View>
  );
}

function cellText(item: Quotation, key: string): string {
  switch (key) {
    case 'number':
      return item.number;
    case 'createDate':
      return formatDateTime(item.createDate);
    case 'customer':
      return item.customer;
    case 'total':
      return formatMoney(item.total);
    case 'paymentMethod':
      return item.paymentMethod;
    default:
      return '';
  }
}

function QuotationRow({
  item,
  index,
  selected,
  onToggle,
  onOpen,
}: {
  item: Quotation;
  index: number;
  selected: boolean;
  onToggle: (id: string) => void;
  onOpen: (id: string) => void;
}) {
  const theme = useTheme();
  const zebra = index % 2 === 1;

  return (
    <Pressable
      onPress={() => onOpen(item.id)}
      style={({ hovered, pressed }) => [
        styles.row,
        {
          backgroundColor: selected
            ? theme.colors.primaryContainer
            : hovered
              ? theme.colors.primaryContainer
              : zebra
                ? theme.colors.surfaceVariant
                : theme.colors.surface,
          borderBottomColor: theme.colors.outlineVariant ?? theme.colors.outline,
          opacity: pressed ? 0.9 : 1,
        },
      ]}>
      <View style={styles.checkCell}>
        <Checkbox
          status={selected ? 'checked' : 'unchecked'}
          onPress={() => onToggle(item.id)}
        />
      </View>
      {COLUMNS.map(col => {
        if (col.key === 'status') {
          return (
            <View key={col.key} style={[styles.cell, { flex: col.flex }]}>
              <StatusBadge status={item.status} />
            </View>
          );
        }

        const text = cellText(item, col.key);
        const isNumber = col.key === 'number';
        return (
          <View key={col.key} style={[styles.cell, { flex: col.flex }]}>
            <Text
              numberOfLines={1}
              style={{
                textAlign: col.align === 'right' ? 'right' : 'left',
                fontWeight: isNumber ? '600' : '400',
                color: text
                  ? theme.colors.onSurface
                  : theme.colors.onSurfaceVariant,
              }}>
              {text || '—'}
            </Text>
          </View>
        );
      })}
    </Pressable>
  );
}

function TableHeader({
  status,
  onToggleAll,
}: {
  status: 'checked' | 'unchecked' | 'indeterminate';
  onToggleAll: () => void;
}) {
  const theme = useTheme();
  return (
    <View
      style={[
        styles.row,
        styles.headerRow,
        { backgroundColor: theme.colors.primary },
      ]}>
      <View style={styles.checkCell}>
        <Checkbox
          status={status}
          onPress={onToggleAll}
          color={theme.colors.onPrimary}
          uncheckedColor={theme.colors.onPrimary}
        />
      </View>
      {COLUMNS.map(col => (
        <View key={col.key} style={[styles.cell, { flex: col.flex }]}>
          <Text
            variant="labelMedium"
            numberOfLines={1}
            style={{
              color: theme.colors.onPrimary,
              fontWeight: '700',
              textAlign: col.align === 'right' ? 'right' : 'left',
            }}>
            {col.label}
          </Text>
        </View>
      ))}
    </View>
  );
}

function QuotationCard({
  item,
  onOpen,
}: {
  item: Quotation;
  onOpen: (id: string) => void;
}) {
  const theme = useTheme();

  return (
    <Card
      mode="elevated"
      onPress={() => onOpen(item.id)}
      style={[
        styles.quotationCard,
        {
          backgroundColor: theme.colors.surface,
          borderColor: theme.colors.outline,
        },
      ]}>
      <Card.Content style={styles.cardContent}>
        <View style={styles.cardTop}>
          <Text variant="titleMedium" style={styles.cardNumber} numberOfLines={1}>
            {item.number}
          </Text>
          <StatusBadge status={item.status} />
        </View>

        <Text variant="bodyMedium" numberOfLines={1}>
          {item.customer || '—'}
        </Text>

        {item.paymentMethod ? (
          <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }} numberOfLines={1}>
            {item.paymentMethod}
          </Text>
        ) : null}

        <View style={styles.cardFooter}>
          <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
            {formatDateTime(item.createDate) || '—'}
          </Text>
          <Text variant="titleSmall" style={{ color: theme.colors.primary, fontWeight: '700' }}>
            {formatMoney(item.total)}
          </Text>
        </View>
      </Card.Content>
    </Card>
  );
}

export default function QuotationScreen() {
  const theme = useTheme();
  const { mode } = useAppTheme();
  const { session } = useAuth();
  const { width } = useResponsive();
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [page, setPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [snackbar, setSnackbar] = useState('');
  const [builderOpen, setBuilderOpen] = useState(false);
  const [builderInitialCustomerId, setBuilderInitialCustomerId] = useState<string | null>(
    null,
  );
  const [builderReorderSeed, setBuilderReorderSeed] = useState<QuotationReorderSeed | null>(
    null,
  );
  const [builderLoading, setBuilderLoading] = useState(false);
  const [builderProductsLoading, setBuilderProductsLoading] = useState(false);
  const [builderError, setBuilderError] = useState('');
  const [builderSaving, setBuilderSaving] = useState(false);
  const [builderCustomers, setBuilderCustomers] = useState<Customer[]>([]);
  const [builderProducts, setBuilderProducts] = useState<Product[]>([]);
  const [builderPaymentMethods, setBuilderPaymentMethods] = useState<PaymentMethod[]>([]);
  const builderPrefetchStarted = useRef(false);  const [detailId, setDetailId] = useState<string | null>(null);
  const [detail, setDetail] = useState<QuotationDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState('');
  const [printPreview, setPrintPreview] = useState<{
    format: PrintFormat;
    detail: QuotationDetail;
  } | null>(null);
  const [quotationFilters, setQuotationFilters] = useState<QuotationFilters>(
    EMPTY_QUOTATION_FILTERS,
  );

  const query = useModuleSearch(
    'Search by number or customer',
    !builderOpen && !detailId,
  );
  const { setDetailHeader } = useSearch();

  const filterPanel = useMemo(
    () => (
      <QuotationFilterBar filters={quotationFilters} onChange={setQuotationFilters} />
    ),
    [quotationFilters],
  );

  useModuleFilters(filterPanel, !builderOpen && !detailId);
  const router = useRouter();
  const { createForCustomerId } = useLocalSearchParams<{
    createForCustomerId?: string;
  }>();
  const handledCreateParam = useRef<string | null>(null);
  const resumeDraftCheckedRef = useRef(false);

  const filteredQuotations = useMemo(() => {
    const term = query.trim().toLowerCase();
    return quotations.filter(quotation => {
      if (!matchesQuotationFilters(quotation, quotationFilters)) {
        return false;
      }
      if (!term) {
        return true;
      }
      return (
        quotation.number.toLowerCase().includes(term) ||
        quotation.customer.toLowerCase().includes(term)
      );
    });
  }, [quotations, query, quotationFilters]);

  const toggleOne = useCallback((id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const toggleView = useCallback(() => {
    setViewMode(prev => (prev === 'list' ? 'card' : 'list'));
  }, []);

  const builderProductsRef = useRef(builderProducts);
  builderProductsRef.current = builderProducts;
  const builderLoadGen = useRef(0);

  const loadBuilderData = useCallback(
    async (options?: { showLoading?: boolean; force?: boolean }) => {
      if (!session?.token) {
        return;
      }

      const showLoading = options?.showLoading ?? true;
      const force = options?.force ?? false;
      const cached = getQuotationBuilderCache();

      // Session cache: open instantly, skip network when still fresh.
      if (!force && isQuotationBuilderCacheFresh() && cached) {
        setBuilderCustomers(cached.customers);
        setBuilderProducts(cached.products);
        setBuilderPaymentMethods(cached.paymentMethods);
        setBuilderLoading(false);
        setBuilderProductsLoading(false);
        setBuilderError('');
        return;
      }

      if (!force && cached && cached.customers.length > 0) {
        setBuilderCustomers(cached.customers);
        setBuilderProducts(cached.products);
        setBuilderPaymentMethods(cached.paymentMethods);
        if (showLoading) {
          setBuilderLoading(false);
        }
      }

      const gen = ++builderLoadGen.current;
      if (showLoading && builderCustomers.length === 0 && !(cached && cached.customers.length > 0)) {
        setBuilderLoading(true);
      }
      setBuilderError('');

      try {
        // Phase 1: first page of customers + payment methods → unlock Contact.
        const [customerPage, paymentMethodData] = await Promise.all([
          fetchCustomersPage(session.token, {
            lite: true,
            limit: BUILDER_PAGE_SIZE,
            offset: 0,
          }),
          fetchPaymentMethods(session.token).catch(() => [] as PaymentMethod[]),
        ]);

        if (gen !== builderLoadGen.current) {
          return;
        }

        setBuilderCustomers(customerPage.data);
        setBuilderPaymentMethods(paymentMethodData);
        setQuotationBuilderCache({
          customers: customerPage.data,
          products: cached?.products ?? [],
          paymentMethods: paymentMethodData,
          customersComplete: !customerPage.hasMore,
          productsComplete: Boolean(cached?.productsComplete),
          updatedAt: Date.now(),
        });
        if (showLoading) {
          setBuilderLoading(false);
        }

        // Continue customers in background.
        if (customerPage.hasMore) {
          void (async () => {
            let offset = customerPage.data.length;
            let all = customerPage.data;
            for (let page = 1; page < BUILDER_MAX_PAGES; page += 1) {
              if (gen !== builderLoadGen.current || !session.token) {
                return;
              }
              const next = await fetchCustomersPage(session.token, {
                lite: true,
                limit: BUILDER_PAGE_SIZE,
                offset,
              });
              all = mergeById(all, next.data);
              setBuilderCustomers(all);
              patchQuotationBuilderCache({
                customers: all,
                customersComplete: !next.hasMore,
              });
              if (!next.hasMore) {
                break;
              }
              offset += next.data.length;
            }
          })().catch(() => {
            // Keep the first page if background customer load fails.
          });
        }

        // Phase 2: first page of products (non-blocking for Contact).
        const needProductSpinner =
          (cached?.products.length ?? builderProductsRef.current.length) === 0;
        if (needProductSpinner) {
          setBuilderProductsLoading(true);
        }

        const productPage = await fetchProductsPage(session.token, {
          limit: BUILDER_PAGE_SIZE,
          offset: 0,
        });

        if (gen !== builderLoadGen.current) {
          return;
        }

        setBuilderProducts(productPage.data);
        patchQuotationBuilderCache({
          products: productPage.data,
          productsComplete: !productPage.hasMore,
        });
        setBuilderProductsLoading(false);

        // Continue products in background.
        if (productPage.hasMore) {
          void (async () => {
            let offset = productPage.data.length;
            let all = productPage.data;
            for (let page = 1; page < BUILDER_MAX_PAGES; page += 1) {
              if (gen !== builderLoadGen.current || !session.token) {
                return;
              }
              const next = await fetchProductsPage(session.token, {
                limit: BUILDER_PAGE_SIZE,
                offset,
              });
              all = mergeById(all, next.data);
              setBuilderProducts(all);
              patchQuotationBuilderCache({
                products: all,
                productsComplete: !next.hasMore,
              });
              if (!next.hasMore) {
                break;
              }
              offset += next.data.length;
            }
          })().catch(err => {
            if (gen === builderLoadGen.current) {
              setBuilderError(
                err instanceof Error
                  ? err.message
                  : 'Failed to load remaining products.',
              );
            }
          });
        }
      } catch (err) {
        if (gen !== builderLoadGen.current) {
          return;
        }
        setBuilderError(
          err instanceof Error ? err.message : 'Failed to load data from Odoo.',
        );
        if (showLoading) {
          setBuilderLoading(false);
        }
        setBuilderProductsLoading(false);
      }
    },
    [session?.token, builderCustomers.length],
  );

  const openBuilder = useCallback(
    async (customerId?: string) => {
      setBuilderOpen(true);
      setBuilderInitialCustomerId(customerId ?? null);
      setBuilderReorderSeed(null);

      const hasCachedData =
        isQuotationBuilderCacheFresh() || builderCustomers.length > 0;
      await loadBuilderData({ showLoading: !hasCachedData });
    },
    [builderCustomers.length, loadBuilderData],
  );

  const closeBuilder = useCallback(() => {
    setBuilderOpen(false);
    setBuilderInitialCustomerId(null);
    setBuilderReorderSeed(null);
    if (session?.user?.id) {
      void clearQuotationDraft(session.user.id);
    }
  }, [session?.user?.id]);

  const handleReorderFromDetail = useCallback(
    async (seed: QuotationReorderSeed) => {
      setBuilderReorderSeed(seed);
      setBuilderInitialCustomerId(seed.customerId ?? null);
      setDetailId(null);
      setDetail(null);
      setDetailError('');
      setBuilderOpen(true);
      const hasCachedData =
        isQuotationBuilderCacheFresh() || builderCustomers.length > 0;
      await loadBuilderData({ showLoading: !hasCachedData });
    },
    [builderCustomers.length, loadBuilderData],
  );

  useEffect(() => {
    if (!createForCustomerId || typeof createForCustomerId !== 'string') {
      return;
    }
    if (handledCreateParam.current === createForCustomerId) {
      return;
    }
    handledCreateParam.current = createForCustomerId;
    void openBuilder(createForCustomerId);
    router.setParams({ createForCustomerId: undefined });
  }, [createForCustomerId, openBuilder, router]);

  useEffect(() => {
    if (!session?.user?.id || resumeDraftCheckedRef.current) {
      return;
    }
    if (createForCustomerId) {
      return;
    }

    resumeDraftCheckedRef.current = true;

    void shouldResumeQuotationDraft(session.user.id).then(should => {
      if (should) {
        void openBuilder();
      }
    });
  }, [session?.user?.id, createForCustomerId, openBuilder]);

  const openDetail = useCallback(
    async (id: string) => {
      if (id.startsWith('local-')) {
        setSnackbar('Detail is not available for local quotations yet.');
        return;
      }
      if (!session?.token) {
        return;
      }

      setDetailId(id);
      setDetailLoading(true);
      setDetailError('');
      setDetail(null);

      try {
        const data = await fetchQuotationDetail(session.token, id);
        setDetail(data);
      } catch (err) {
        setDetailError(
          err instanceof Error ? err.message : 'Failed to load quotation detail.',
        );
      } finally {
        setDetailLoading(false);
      }
    },
    [session?.token],
  );

  const closeDetail = useCallback(() => {
    setDetailId(null);
    setDetail(null);
    setDetailError('');
  }, []);

  useEffect(() => {
    if (!detailId) {
      setDetailHeader(null);
      return;
    }

    setDetailHeader({
      title: detail?.number ?? 'Quotation',
      onBack: closeDetail,
      statusLabel: detail
        ? getQuotationStatusColors(mode, detail.status).label
        : undefined,
      breadcrumbParent: 'Orders',
      onPrint: detail
        ? format => setPrintPreview({ format, detail })
        : undefined,
    });

    return () => setDetailHeader(null);
  }, [detailId, detail, closeDetail, setDetailHeader, mode]);

  const exportExcel = useCallback(async () => {
    if (!session?.token) {
      return;
    }

    const selected = filteredQuotations.filter(quotation =>
      selectedIds.has(quotation.id),
    );

    if (selected.length === 0) {
      setSnackbar('Select one or more quotations to export.');
      return;
    }

    const localSelected = selected.filter(quotation => quotation.id.startsWith('local-'));
    if (localSelected.length > 0) {
      setSnackbar('Local quotations cannot be exported. Select an Odoo quotation.');
      return;
    }

    setSnackbar('Preparing export...');

    try {
      const ok = exportSelectedQuotations(selected);
      setSnackbar(
        ok
          ? `Exported ${selected.length} quotation${selected.length === 1 ? '' : 's'} to Excel.`
          : 'Export is only available on web.',
      );
    } catch (err) {
      setSnackbar(
        err instanceof Error ? err.message : 'Failed to export quotation.',
      );
    }
  }, [filteredQuotations, selectedIds, session?.token]);

  const exportPdf = useCallback(() => {
    if (!session?.token) {
      return;
    }

    const selected = filteredQuotations.filter(quotation =>
      selectedIds.has(quotation.id),
    );

    if (selected.length === 0) {
      setSnackbar('Select one or more quotations to export.');
      return;
    }

    const localSelected = selected.filter(quotation => quotation.id.startsWith('local-'));
    if (localSelected.length > 0) {
      setSnackbar('Local quotations cannot be exported. Select an Odoo quotation.');
      return;
    }

    const ok = exportSelectedQuotationsPdf(selected);
    setSnackbar(
      ok
        ? 'Print dialog opened — choose Save as PDF to export.'
        : 'PDF export is only available on web.',
    );
  }, [filteredQuotations, selectedIds, session?.token]);

  const headerActions = useMemo<HeaderAction[]>(() => {
    if (builderOpen || detailId) {
      return [];
    }
    return [
      {
        key: 'view',
        icon: viewMode === 'list' ? 'view-grid-outline' : 'format-list-bulleted',
        onPress: toggleView,
        accessibilityLabel: 'Toggle list or card view',
      },
      {
        key: 'excel',
        icon: 'microsoft-excel',
        onPress: () => {
          void exportExcel();
        },
        accessibilityLabel: 'Export selected quotations to Excel',
      },
      {
        key: 'pdf',
        icon: 'file-pdf-box',
        onPress: exportPdf,
        accessibilityLabel: 'Export selected quotations to PDF',
      },
      {
        key: 'create',
        label: 'New Quotation',
        onPress: openBuilder,
        accessibilityLabel: 'Create new quotation',
      },
    ];
  }, [builderOpen, detailId, viewMode, toggleView, exportExcel, exportPdf, openBuilder]);

  useHeaderActions(headerActions);

  const pageCount = Math.max(1, Math.ceil(filteredQuotations.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount);

  useEffect(() => {
    setPage(1);
  }, [query, viewMode, quotationFilters]);

  const pagedQuotations = useMemo(
    () => filteredQuotations.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE),
    [filteredQuotations, safePage],
  );

  const selectedOnPage = pagedQuotations.reduce(
    (count, quotation) => count + (selectedIds.has(quotation.id) ? 1 : 0),
    0,
  );
  const headerStatus: 'checked' | 'unchecked' | 'indeterminate' =
    selectedOnPage === 0
      ? 'unchecked'
      : selectedOnPage === pagedQuotations.length
        ? 'checked'
        : 'indeterminate';

  const toggleAllOnPage = useCallback(() => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      const ids = pagedQuotations.map(quotation => quotation.id);
      const allSelected = ids.length > 0 && ids.every(id => next.has(id));
      ids.forEach(id => (allSelected ? next.delete(id) : next.add(id)));
      return next;
    });
  }, [pagedQuotations]);

  const numColumns = useMemo(() => {
    if (width >= 1200) {
      return 3;
    }
    if (width >= 768) {
      return 2;
    }
    return 1;
  }, [width]);

  const cardWidth = useMemo(() => {
    const horizontalPadding = 32;
    const gap = 12;
    const available = width - horizontalPadding - gap * (numColumns - 1);
    return available / numColumns;
  }, [width, numColumns]);

  const loadQuotations = useCallback(async () => {
    if (!session?.token) {
      return;
    }

    try {
      setError('');
      const data = await fetchQuotations(session.token);
      setQuotations(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load quotations.');
    }
  }, [session?.token]);

  const handleSaveDraft = useCallback(
    async (draft: QuotationDraft) => {
      if (!session?.token) {
        return;
      }

      setBuilderSaving(true);
      setBuilderError('');

      try {
        const created = await createQuotation(session.token, draft);
        if (session.user?.id) {
          await clearQuotationDraft(session.user.id);
        }
        await loadQuotations();
        setBuilderOpen(false);
        setBuilderInitialCustomerId(null);
        setSnackbar(`Quotation ${created.number} saved to Odoo.`);
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Failed to save quotation to Odoo.';
        setBuilderError(message);
        setSnackbar(message);
      } finally {
        setBuilderSaving(false);
      }
    },
    [session?.token, session?.user?.id, loadQuotations],
  );

  useEffect(() => {
    setLoading(true);
    loadQuotations().finally(() => setLoading(false));
  }, [loadQuotations]);

  // Prefetch builder data while browsing the list so New Quotation opens faster.
  useEffect(() => {
    if (!session?.token || builderPrefetchStarted.current) {
      return;
    }
    builderPrefetchStarted.current = true;

    const cached = getQuotationBuilderCache();
    if (cached) {
      setBuilderCustomers(cached.customers);
      setBuilderProducts(cached.products);
      setBuilderPaymentMethods(cached.paymentMethods);
    }

    if (!isQuotationBuilderCacheFresh()) {
      void loadBuilderData({ showLoading: false });
    }
  }, [session?.token, loadBuilderData]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadQuotations();
    setRefreshing(false);
  };

  if (detailId) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <QuotationDetailView
          detail={detail}
          loading={detailLoading}
          error={detailError}
          onBack={closeDetail}
          onReorder={handleReorderFromDetail}
        />
        {printPreview ? (
          <QuotationPrintPreview
            detail={printPreview.detail}
            format={printPreview.format}
            onClose={() => setPrintPreview(null)}
          />
        ) : null}
        <Snackbar
          visible={!!snackbar}
          onDismiss={() => setSnackbar('')}
          duration={3000}>
          {snackbar}
        </Snackbar>
      </View>
    );
  }

  if (builderOpen) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.surface }]}>
        <QuotationBuilder
          customers={builderCustomers}
          products={builderProducts}
          paymentMethods={builderPaymentMethods}
          loading={builderLoading}
          productsLoading={builderProductsLoading}
          error={builderError}
          onDiscard={closeBuilder}
          onSave={handleSaveDraft}
          saving={builderSaving}
          initialCustomerId={builderInitialCustomerId}
          initialReorder={builderReorderSeed}
          skipDraftRestore={Boolean(builderInitialCustomerId || builderReorderSeed)}
        />
        <Snackbar
          visible={!!snackbar}
          onDismiss={() => setSnackbar('')}
          duration={3000}>
          {snackbar}
        </Snackbar>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator />
        <Text style={{ marginTop: 12 }}>Loading quotations from Odoo...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.center, { backgroundColor: theme.colors.background }]}>
        <Text variant="titleMedium" style={styles.errorTitle}>
          Could not load quotations
        </Text>
        <Text style={{ color: theme.colors.onSurfaceVariant, textAlign: 'center' }}>
          {error}
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {viewMode === 'list' ? (
        filteredQuotations.length === 0 ? (
          <ScrollView
            style={styles.tableScroll}
            contentContainerStyle={styles.tableEmptyContent}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }>
            <Text style={styles.empty}>
              {query.trim() || hasActiveQuotationFilters(quotationFilters)
                ? 'No quotations match your search or filters.'
                : 'No quotations found in Odoo.'}
            </Text>
          </ScrollView>
        ) : (
          <View style={styles.tableScroll}>
            <TableHeader status={headerStatus} onToggleAll={toggleAllOnPage} />
            <ScrollView
              style={styles.listBody}
              showsVerticalScrollIndicator={false}
              refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
              }>
              {pagedQuotations.map((item, index) => (
                <QuotationRow
                  key={item.id}
                  item={item}
                  index={index}
                  selected={selectedIds.has(item.id)}
                  onToggle={toggleOne}
                  onOpen={openDetail}
                />
              ))}
            </ScrollView>
          </View>
        )
      ) : (
        <FlatList
          key={numColumns}
          data={pagedQuotations}
          numColumns={numColumns}
          keyExtractor={item => item.id}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          contentContainerStyle={styles.listContent}
          columnWrapperStyle={numColumns > 1 ? styles.columnWrapper : undefined}
          renderItem={({ item }) => (
            <View
              style={[
                styles.cardWrapper,
                { width: numColumns > 1 ? cardWidth : '100%' },
              ]}>
              <QuotationCard item={item} onOpen={openDetail} />
            </View>
          )}
          ListEmptyComponent={
            <Text style={styles.empty}>
              {query.trim() || hasActiveQuotationFilters(quotationFilters)
                ? 'No quotations match your search or filters.'
                : 'No quotations found in Odoo.'}
            </Text>
          }
        />
      )}

      <Pagination
        page={safePage}
        pageCount={pageCount}
        total={filteredQuotations.length}
        pageSize={PAGE_SIZE}
        onChange={setPage}
        centerLabel={`${quotations.length} from Odoo`}
      />

      <Snackbar
        visible={!!snackbar}
        onDismiss={() => setSnackbar('')}
        duration={3000}>
        {snackbar}
      </Snackbar>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  tableScroll: {
    flex: 1,
  },
  listBody: {
    flex: 1,
  },
  tableEmptyContent: {
    flexGrow: 1,
  },
  table: {
    width: '100%',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    minHeight: 48,
  },
  headerRow: {
    minHeight: 44,
  },
  cell: {
    paddingHorizontal: 8,
    paddingVertical: 8,
    justifyContent: 'center',
    minWidth: 0,
  },
  checkCell: {
    width: 38,
    alignItems: 'center',
    justifyContent: 'center',
    transform: [{ scale: 0.8 }],
  },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    maxWidth: '100%',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 24,
  },
  columnWrapper: {
    gap: 12,
    marginBottom: 12,
  },
  cardWrapper: {
    marginBottom: 12,
  },
  quotationCard: {
    borderRadius: 12,
    borderWidth: 1,
  },
  cardContent: {
    gap: 8,
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  cardNumber: {
    fontWeight: '700',
    flex: 1,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  empty: {
    textAlign: 'center',
    marginTop: 40,
    opacity: 0.7,
  },
  errorTitle: {
    marginBottom: 8,
    fontWeight: '600',
  },
});
