import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  FlatList,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import {
  ActivityIndicator,
  Button,
  Divider,
  Text,
  useTheme,
} from 'react-native-paper';

import { CustomerNameText } from '@/components/ui/CustomerNameText';
import { useAuth } from '@/contexts/auth-context';
import { useModuleSearch } from '@/contexts/search-context';
import { useResponsive } from '@/hooks/use-responsive';
import { fetchMembershipDetail, fetchMemberships } from '@/services/memberships';
import { Membership } from '@/types/membership';
import { formatMyanmarDate } from '@/utils/myanmar-datetime';

function formatMoney(value: number): string {
  return `${value.toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })} MMK`;
}

function MetaRow({ label, value }: { label: string; value: string }) {
  const theme = useTheme();
  return (
    <View style={styles.metaRow}>
      <Text style={[styles.metaLabel, { color: theme.colors.onSurfaceVariant }]}>
        {label}
      </Text>
      <CustomerNameText size="body" style={{ fontWeight: '600' }}>
        {value.trim() || '—'}
      </CustomerNameText>
    </View>
  );
}

export default function MembershipsScreen() {
  const theme = useTheme();
  const { session } = useAuth();
  const { isMobile } = useResponsive();
  const query = useModuleSearch('Search memberships');
  const [items, setItems] = useState<Membership[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<Membership | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState('');

  const load = useCallback(async () => {
    if (!session?.token) return;
    setError('');
    try {
      const data = await fetchMemberships(session.token, {
        q: query.trim() || undefined,
        limit: 300,
      });
      setItems(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load memberships.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [session?.token, query]);

  useEffect(() => {
    setLoading(true);
    const timer = setTimeout(() => {
      void load();
    }, 250);
    return () => clearTimeout(timer);
  }, [load]);

  const openDetail = useCallback(
    async (id: string) => {
      if (!session?.token) return;
      setSelectedId(id);
      setDetailLoading(true);
      setDetailError('');
      setDetail(null);
      try {
        const data = await fetchMembershipDetail(session.token, id);
        setDetail(data);
      } catch (err) {
        setDetailError(
          err instanceof Error ? err.message : 'Failed to load membership.',
        );
      } finally {
        setDetailLoading(false);
      }
    },
    [session?.token],
  );

  const closeDetail = () => {
    setSelectedId(null);
    setDetail(null);
    setDetailError('');
  };

  const list = useMemo(() => items, [items]);

  if (selectedId) {
    return (
      <View style={[styles.root, { backgroundColor: theme.colors.background }]}>
        <View style={styles.detailHeader}>
          <Button icon="arrow-left" onPress={closeDetail}>
            Back
          </Button>
          <Text variant="titleMedium" style={{ fontWeight: '700', flex: 1 }}>
            {detail?.name || 'Membership'}
          </Text>
        </View>
        {detailLoading ? (
          <View style={styles.center}>
            <ActivityIndicator />
          </View>
        ) : detailError ? (
          <View style={styles.center}>
            <Text style={{ color: theme.colors.error }}>{detailError}</Text>
          </View>
        ) : detail ? (
          <ScrollView contentContainerStyle={styles.detailContent}>
            <MetaRow label="MEMBERSHIP NAME" value={detail.name} />
            <MetaRow label="CUSTOMER" value={detail.customer} />
            <MetaRow label="MEMBERSHIP LEVEL" value={detail.membershipLevel} />
            <MetaRow label="PRICELIST" value={detail.pricelist} />
            <MetaRow
              label="START DATE"
              value={formatMyanmarDate(detail.startDate) || detail.startDate}
            />
            <MetaRow
              label="END DATE"
              value={formatMyanmarDate(detail.endDate) || detail.endDate}
            />
            <MetaRow label="STATUS" value={detail.status} />
            <MetaRow
              label="MONTHLY COUPON AMOUNT"
              value={formatMoney(detail.monthlyCouponAmount)}
            />
            <Divider style={styles.divider} />
            <MetaRow label="TOTAL TICKETS" value={String(detail.totalTickets)} />
            <MetaRow label="USED TICKETS" value={String(detail.usedTickets)} />
            <MetaRow label="MISSED TICKETS" value={String(detail.missedTickets)} />
            <MetaRow
              label="REMAINING TICKETS"
              value={String(detail.remainingTickets)}
            />
            <Divider style={styles.divider} />
            <MetaRow label="BENEFITS SUMMARY" value={detail.benefitsSummary} />
          </ScrollView>
        ) : null}
      </View>
    );
  }

  return (
    <View style={[styles.root, { backgroundColor: theme.colors.background }]}>
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator />
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Text style={{ color: theme.colors.error }}>{error}</Text>
          <Button onPress={() => void load()}>Retry</Button>
        </View>
      ) : (
        <FlatList
          data={list}
          keyExtractor={item => item.id}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                void load();
              }}
            />
          }
          contentContainerStyle={[
            styles.list,
            isMobile ? styles.listMobile : styles.listDesktop,
          ]}
          ListEmptyComponent={
            <Text style={styles.empty}>No memberships found.</Text>
          }
          renderItem={({ item }) => (
            <Pressable
              onPress={() => void openDetail(item.id)}
              style={({ pressed }) => [
                styles.card,
                {
                  backgroundColor: theme.colors.surface,
                  borderColor:
                    theme.colors.outlineVariant ?? theme.colors.outline,
                  opacity: pressed ? 0.92 : 1,
                },
              ]}>
              <View style={styles.cardTop}>
                <CustomerNameText size="title" style={{ flex: 1, fontWeight: '700' }}>
                  {item.name || '—'}
                </CustomerNameText>
                <Text
                  style={[
                    styles.badge,
                    { color: theme.colors.primary, backgroundColor: theme.colors.primaryContainer },
                  ]}>
                  {item.status || '—'}
                </Text>
              </View>
              <Text style={{ color: theme.colors.onSurfaceVariant }}>
                {item.customer || 'No customer'}
              </Text>
              <Text style={{ color: theme.colors.onSurfaceVariant, marginTop: 4 }}>
                {item.membershipLevel || '—'} · Remaining {item.remainingTickets}/
                {item.totalTickets}
              </Text>
            </Pressable>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    padding: 24,
  },
  list: { paddingBottom: 32 },
  listMobile: { padding: 12 },
  listDesktop: { paddingHorizontal: 20, paddingTop: 16 },
  card: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 4,
  },
  badge: {
    fontSize: 11,
    fontWeight: '700',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    overflow: 'hidden',
  },
  empty: { textAlign: 'center', marginTop: 40, opacity: 0.6 },
  detailHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 8,
    paddingVertical: 8,
  },
  detailContent: { padding: 16, paddingBottom: 40, gap: 4 },
  metaRow: { marginBottom: 12, gap: 2 },
  metaLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  divider: { marginVertical: 10 },
});
