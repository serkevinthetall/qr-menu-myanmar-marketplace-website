import { useCallback, useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import {
  ActivityIndicator,
  Button,
  Chip,
  Menu,
  Text,
  useTheme,
} from 'react-native-paper';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';

import { AreaLineChart } from '@/components/overview/AreaLineChart';
import { useAuth } from '@/contexts/auth-context';
import { useSearch } from '@/contexts/search-context';
import { useDetailTheme } from '@/hooks/use-detail-theme';
import { useResponsive } from '@/hooks/use-responsive';
import {
  fetchAppUserListSummary,
  fetchAppUserListTimeline,
  APP_INSTALL_STATUS_OPTIONS,
  MongoSaveErrorDialog,
  mongoSaveErrorMessage,
  type AppInstallStatus,
  type AppUserListRange,
} from '@/features/app-install';
import type { OverviewAreaSeries } from '@/types/overview';

const RANGE_OPTIONS: Array<{ id: AppUserListRange; label: string }> = [
  { id: 'week', label: 'This week' },
  { id: 'today', label: 'Today' },
  { id: 'yesterday', label: 'Yesterday' },
  { id: 'month', label: 'This month' },
];

const STATUS_OPTIONS: Array<{ id: AppInstallStatus | 'all'; label: string }> = [
  { id: 'all', label: 'All statuses' },
  ...APP_INSTALL_STATUS_OPTIONS,
];

function parseRange(raw: unknown): AppUserListRange {
  const value = String(raw ?? 'week').trim().toLowerCase();
  if (value === 'today') return 'today';
  if (value === 'yesterday') return 'yesterday';
  if (value === 'month') return 'month';
  return 'week';
}

export default function AppUserListDetailScreen() {
  const theme = useTheme();
  const detail = useDetailTheme();
  const router = useRouter();
  const { setDetailHeader } = useSearch();
  const { session } = useAuth();
  const { width } = useResponsive();
  const isMobile = width < 900;

  const { initialRange } = useLocalSearchParams<{
    initialRange?: string;
  }>();

  const token = session?.token ?? '';
  const [range, setRange] = useState<AppUserListRange>(() =>
    parseRange(initialRange),
  );

  // `initialRange` comes from the Overview card "View detail" link.
  // When navigating while this screen is already mounted, we must sync
  // the chip selection to the latest URL params.
  useEffect(() => {
    setRange(parseRange(initialRange));
  }, [initialRange]);

  const [status, setStatus] = useState<AppInstallStatus | 'all'>('installed');
  const [statusMenuOpen, setStatusMenuOpen] = useState(false);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [dbError, setDbError] = useState('');
  const [count, setCount] = useState(0);
  const [buckets, setBuckets] = useState<string[]>([]);
  const [series, setSeries] = useState<OverviewAreaSeries[]>([]);

  const goBack = useCallback(() => {
    if (router.canGoBack()) {
      router.back();
      return;
    }
    router.replace('/overview' as any);
  }, [router]);

  useFocusEffect(
    useCallback(() => {
      setDetailHeader({
        title: 'App User List',
        breadcrumbParent: 'Overview',
        onBack: goBack,
      });
      return () => setDetailHeader(null);
    }, [goBack, setDetailHeader]),
  );

  useEffect(() => {
    if (!token) {
      setLoading(false);
      setError('Please log in again.');
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError('');
    void (async () => {
      try {
        const [summary, timeline] = await Promise.all([
          fetchAppUserListSummary(token, range, status),
          fetchAppUserListTimeline(token, range, status),
        ]);

        if (cancelled) {
          return;
        }

        setCount(summary);
        setBuckets(timeline.buckets);
        setSeries(timeline.series);
      } catch (err) {
        if (!cancelled) {
          const message =
            err instanceof Error ? err.message : 'Failed to load App User List.';
          setError(message);
          setDbError(mongoSaveErrorMessage(err, 'Loading App User List'));
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [range, token, status]);

  const rangeLabel = useMemo(
    () => RANGE_OPTIONS.find(o => o.id === range)?.label ?? 'This week',
    [range],
  );

  const statusLabel = useMemo(() => {
    const found = STATUS_OPTIONS.find(o => o.id === status);
    return found?.label ?? 'Installed';
  }, [status]);

  return (
    <View style={[styles.container, { backgroundColor: detail.background }]}>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          isMobile ? styles.padMobile : styles.padDesktop,
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>
        <View style={styles.page}>
          <View>
            <Text style={[styles.pageTitle, { color: detail.onSurface }]}>
              App User List
            </Text>
            <Text style={{ color: detail.label, marginTop: 2 }}>
              {status === 'all' ? 'Total users for' : `${statusLabel} users for`}{' '}
              <Text style={{ color: theme.colors.primary, fontWeight: '800' }}>
                {rangeLabel}
              </Text>
              : {count.toLocaleString()}
            </Text>
          </View>

          <View style={styles.statusRow}>
            <Menu
              visible={statusMenuOpen}
              onDismiss={() => setStatusMenuOpen(false)}
              anchor={
                <Button
                  compact
                  mode="outlined"
                  onPress={() => setStatusMenuOpen(true)}
                  style={styles.statusBtn}
                  labelStyle={styles.statusBtnLabel}>
                  Status: {statusLabel}
                </Button>
              }>
              {STATUS_OPTIONS.map(opt => (
                <Menu.Item
                  key={String(opt.id)}
                  title={opt.label}
                  onPress={() => {
                    setStatus(opt.id);
                    setStatusMenuOpen(false);
                  }}
                />
              ))}
            </Menu>
          </View>

          <View style={styles.rangeRow}>
            {RANGE_OPTIONS.map(opt => (
              <Chip
                key={opt.id}
                compact
                selected={range === opt.id}
                onPress={() => setRange(opt.id)}
                style={styles.chip}>
                {opt.label}
              </Chip>
            ))}
          </View>

          {loading ? (
            <View style={styles.center}>
              <ActivityIndicator size="large" />
            </View>
          ) : error ? (
            <Text style={{ color: theme.colors.error, paddingVertical: 12 }}>
              {error}
            </Text>
          ) : (
            <View style={[styles.card, { borderColor: detail.border }]}>
              <AreaLineChart
                buckets={buckets}
                series={series}
                emptyLabel="No App User List data in this period."
              />
            </View>
          )}
        </View>
      </ScrollView>

      <MongoSaveErrorDialog
        message={dbError}
        onDismiss={() => setDbError('')}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { flexGrow: 1 },
  padMobile: { padding: 12, paddingBottom: 32 },
  padDesktop: { padding: 20, paddingBottom: 40 },
  page: {
    width: '100%',
    maxWidth: 1480,
    alignSelf: 'center',
    gap: 16,
  },
  pageTitle: {
    fontSize: 24,
    fontWeight: '800',
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  statusBtn: {
    alignSelf: 'flex-start',
  },
  statusBtnLabel: {
    fontWeight: '800',
  },
  center: {
    minHeight: 220,
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
  },
  rangeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {},
});

