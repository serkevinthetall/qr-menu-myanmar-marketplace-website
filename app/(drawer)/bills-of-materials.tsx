import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import {
  Text,
  useTheme,
} from 'react-native-paper';

import { BomBuilder } from '@/components/bom/BomBuilder';
import { ListSkeleton } from '@/components/ui/ListSkeleton';
import { Pagination } from '@/components/ui/Pagination';
import { useAuth } from '@/contexts/auth-context';
import {
  HeaderAction,
  useHeaderActions,
  useModuleSearch,
  useSearch,
} from '@/contexts/search-context';
import { useResponsive } from '@/hooks/use-responsive';
import {
  fetchBillOfMaterialsDetail,
  fetchBillsOfMaterials,
} from '@/services/bills-of-materials';
import {
  BillOfMaterials,
  BillOfMaterialsDetail,
} from '@/types/bill-of-materials';
import { useListUiCache } from '@/utils/list-ui-cache';

const PAGE_SIZE = 50;

type ViewMode = 'list' | 'card';

type BomListUi = {
  viewMode: ViewMode;
};

type Column = {
  key: string;
  label: string;
  flex: number;
};

const COLUMNS: Column[] = [
  { key: 'product', label: 'Product', flex: 2.4 },
  { key: 'reference', label: 'Reference', flex: 1.4 },
  { key: 'typeLabel', label: 'BoM Type', flex: 1.8 },
  { key: 'quantity', label: 'Quantity', flex: 1.2 },
  { key: 'company', label: 'Company', flex: 1.6 },
];

function cellValue(item: BillOfMaterials, key: string): string {
  switch (key) {
    case 'product':
      return item.product || '—';
    case 'reference':
      return item.reference || '—';
    case 'typeLabel':
      return item.typeLabel || item.type || '—';
    case 'quantity':
      return `${item.quantity} ${item.unit || ''}`.trim();
    case 'company':
      return item.company || '—';
    default:
      return '—';
  }
}

export default function BillsOfMaterialsScreen() {
  const theme = useTheme();
  const { session } = useAuth();
  const { isDesktop } = useResponsive();
  const { setDetailHeader } = useSearch();

  const [rows, setRows] = useState<BillOfMaterials[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<BillOfMaterialsDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState('');
  const [creating, setCreating] = useState(false);
  const hasLoadedOnceRef = useRef(false);

  const listUiSnapshot = useMemo<BomListUi>(() => ({ viewMode }), [viewMode]);
  useListUiCache<BomListUi>('bills-of-materials', listUiSnapshot, saved => {
    if (saved.viewMode === 'list' || saved.viewMode === 'card') {
      setViewMode(saved.viewMode);
    }
  });

  const query = useModuleSearch(
    'Search by product or reference',
    !selectedId && !creating,
  );

  const load = useCallback(async () => {
    if (!session?.token) return;
    const quiet = hasLoadedOnceRef.current;
    if (!quiet) setLoading(true);
    try {
      const data = await fetchBillsOfMaterials(session.token, { limit: 500 });
      setRows(data);
      setError('');
      hasLoadedOnceRef.current = true;
    } catch (err) {
      setRows([]);
      setError(
        err instanceof Error
          ? err.message
          : 'Failed to load bills of materials.',
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [session?.token]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    setPage(1);
  }, [query, viewMode]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    void load();
  }, [load]);

  const openCreate = useCallback(() => setCreating(true), []);
  const closeCreate = useCallback(() => setCreating(false), []);

  const onCreated = useCallback(
    (bom: BillOfMaterialsDetail) => {
      setCreating(false);
      setRows(prev => {
        const without = prev.filter(r => r.id !== bom.id);
        return [bom, ...without];
      });
      setSelectedId(bom.id);
      setDetail(bom);
    },
    [],
  );

  const closeDetail = useCallback(() => {
    setSelectedId(null);
    setDetail(null);
    setDetailError('');
  }, []);

  const openDetail = useCallback(
    async (id: string) => {
      if (!session?.token) return;
      setSelectedId(id);
      setDetailLoading(true);
      setDetailError('');
      setDetail(null);
      try {
        const data = await fetchBillOfMaterialsDetail(session.token, id);
        setDetail(data);
      } catch (err) {
        setDetailError(
          err instanceof Error
            ? err.message
            : 'Failed to load bill of materials.',
        );
      } finally {
        setDetailLoading(false);
      }
    },
    [session?.token],
  );

  useEffect(() => {
    if (creating) {
      setDetailHeader({
        title: 'New',
        breadcrumbParent: 'Bills of Materials',
        onBack: closeCreate,
      });
      return () => setDetailHeader(null);
    }
    if (selectedId) {
      setDetailHeader({
        title: detail?.product || detail?.reference || 'BoM',
        breadcrumbParent: 'Bills of Materials',
        onBack: closeDetail,
      });
      return () => setDetailHeader(null);
    }
    setDetailHeader(null);
    return undefined;
  }, [
    creating,
    selectedId,
    detail,
    closeCreate,
    closeDetail,
    setDetailHeader,
  ]);

  const headerActions = useMemo<HeaderAction[]>(() => {
    if (creating || selectedId) return [];
    return [
      {
        key: 'view',
        icon: viewMode === 'list' ? 'view-grid-outline' : 'format-list-bulleted',
        onPress: () =>
          setViewMode(prev => (prev === 'list' ? 'card' : 'list')),
        accessibilityLabel: 'Toggle list or card view',
      },
      {
        key: 'create',
        icon: 'plus',
        onPress: openCreate,
        accessibilityLabel: 'New bill of materials',
      },
    ];
  }, [creating, selectedId, viewMode, openCreate]);

  useHeaderActions(headerActions);

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return rows;
    return rows.filter(row =>
      [row.product, row.reference, row.typeLabel, row.company, row.variant]
        .join(' ')
        .toLowerCase()
        .includes(term),
    );
  }, [rows, query]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount);
  const paged = useMemo(
    () => filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE),
    [filtered, safePage],
  );

  if (creating) {
    return <BomBuilder onCancel={closeCreate} onCreated={onCreated} />;
  }

  if (selectedId) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        {detailLoading ? (
          <View style={styles.center}>
            <Text>Loading…</Text>
          </View>
        ) : detailError ? (
          <View style={styles.center}>
            <Text variant="titleMedium">Could not load BoM</Text>
            <Text style={{ color: theme.colors.onSurfaceVariant }}>{detailError}</Text>
          </View>
        ) : detail ? (
          <ScrollView contentContainerStyle={styles.detailContent}>
            <Text variant="headlineSmall" style={{ fontWeight: '700' }}>
              {detail.product}
            </Text>
            {detail.reference ? (
              <Text style={{ color: theme.colors.onSurfaceVariant }}>
                Ref: {detail.reference}
              </Text>
            ) : null}
            <Text style={{ marginTop: 8 }}>
              {detail.typeLabel} · Qty {detail.quantity} {detail.unit}
            </Text>
            {detail.company ? (
              <Text style={{ color: theme.colors.onSurfaceVariant }}>
                {detail.company}
              </Text>
            ) : null}

            <Text variant="titleMedium" style={styles.sectionTitle}>
              Components
            </Text>
            {detail.lines.length === 0 ? (
              <Text style={{ opacity: 0.7 }}>No components.</Text>
            ) : (
              detail.lines.map(line => (
                <View
                  key={line.id}
                  style={[
                    styles.detailLine,
                    {
                      borderBottomColor:
                        theme.colors.outlineVariant ?? theme.colors.outline,
                    },
                  ]}>
                  <Text style={{ flex: 1, fontWeight: '600' }} numberOfLines={2}>
                    {line.product}
                  </Text>
                  <Text>
                    {line.quantity} {line.unit}
                  </Text>
                </View>
              ))
            )}
          </ScrollView>
        ) : null}
      </View>
    );
  }

  if (loading) {
    return <ListSkeleton variant="billsOfMaterials" />;
  }

  if (error) {
    return (
      <View style={[styles.center, { backgroundColor: theme.colors.background }]}>
        <Text variant="titleMedium">Could not load bills of materials</Text>
        <Text style={{ color: theme.colors.onSurfaceVariant, textAlign: 'center' }}>
          {error}
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {viewMode === 'list' ? (
        <View style={styles.tableScroll}>
          <View
            style={[
              styles.headerRow,
              { backgroundColor: theme.colors.surfaceVariant },
            ]}>
            {COLUMNS.map(col => (
              <View key={col.key} style={[styles.cell, { flex: col.flex }]}>
                <Text variant="labelSmall" style={{ fontWeight: '700' }} numberOfLines={1}>
                  {col.label}
                </Text>
              </View>
            ))}
          </View>
          <ScrollView
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }>
            {paged.length === 0 ? (
              <Text style={styles.empty}>
                {query.trim()
                  ? `No BoMs match "${query.trim()}".`
                  : 'No bills of materials found. Create one with +.'}
              </Text>
            ) : (
              paged.map((item, index) => (
                <Pressable
                  key={item.id}
                  onPress={() => void openDetail(item.id)}
                  style={[
                    styles.row,
                    {
                      backgroundColor:
                        index % 2 === 0
                          ? theme.colors.surface
                          : theme.colors.surfaceVariant,
                      borderBottomColor:
                        theme.colors.outlineVariant ?? theme.colors.outline,
                    },
                  ]}>
                  {COLUMNS.map(col => (
                    <View key={col.key} style={[styles.cell, { flex: col.flex }]}>
                      <Text numberOfLines={1}>{cellValue(item, col.key)}</Text>
                    </View>
                  ))}
                </Pressable>
              ))
            )}
          </ScrollView>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.cardGrid}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }>
          {paged.map(item => (
            <Pressable
              key={item.id}
              onPress={() => void openDetail(item.id)}
              style={[
                styles.card,
                {
                  backgroundColor: theme.colors.surface,
                  borderColor: theme.colors.outlineVariant ?? theme.colors.outline,
                  width: isDesktop ? '31%' : '100%',
                },
              ]}>
              <Text style={{ fontWeight: '700' }} numberOfLines={2}>
                {item.product}
              </Text>
              <Text
                variant="bodySmall"
                style={{ color: theme.colors.onSurfaceVariant }}>
                {item.typeLabel}
              </Text>
              <Text variant="bodySmall">
                Qty {item.quantity} {item.unit}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      )}

      <Pagination
        page={safePage}
        pageCount={pageCount}
        total={filtered.length}
        pageSize={PAGE_SIZE}
        onChange={setPage}
        itemLabel="BoM"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 8,
  },
  tableScroll: { flex: 1 },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  cell: { paddingHorizontal: 6, minWidth: 0 },
  empty: { padding: 24, textAlign: 'center', opacity: 0.7 },
  cardGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    padding: 16,
  },
  card: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    gap: 6,
  },
  detailContent: { padding: 16, paddingBottom: 40, gap: 4 },
  sectionTitle: { marginTop: 20, marginBottom: 8, fontWeight: '700' },
  detailLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
});
