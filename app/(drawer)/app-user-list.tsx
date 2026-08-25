import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
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
import { HorizontalBarChart } from '@/components/overview/HorizontalBarChart';
import { PieChart } from '@/components/overview/PieChart';
import { useAuth } from '@/contexts/auth-context';
import { useSearch } from '@/contexts/search-context';
import { useDetailTheme } from '@/hooks/use-detail-theme';
import { useResponsive } from '@/hooks/use-responsive';
import {
  fetchAppUserListBreakdown,
  fetchAppUserListSummary,
  fetchAppUserListTimeline,
  APP_INSTALL_STATUS_OPTIONS,
  MongoSaveErrorDialog,
  mongoSaveErrorMessage,
  type AppInstallStatus,
  type AppUserListBreakdownItem,
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

const STATUS_PIE_COLORS: Record<string, string> = {
  installed: '#2FB344',
  waiting: '#467FCF',
  not_pick_up: '#D63939',
  please_come_and_install: '#AE3EC9',
  new: '#0CA678',
  not_installed: '#F59F00',
};

function parseRange(raw: unknown): AppUserListRange {
  const value = String(raw ?? 'week').trim().toLowerCase();
  if (value === 'today') return 'today';
  if (value === 'yesterday') return 'yesterday';
  if (value === 'month') return 'month';
  return 'week';
}

function ChartCard({
  title,
  subtitle,
  children,
  borderColor,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  borderColor: string;
}) {
  const detail = useDetailTheme();
  return (
    <View style={[styles.card, { borderColor }]}>
      <Text style={[styles.cardTitle, { color: detail.onSurface }]}>{title}</Text>
      {subtitle ? (
        <Text style={[styles.cardSubtitle, { color: detail.label }]}>
          {subtitle}
        </Text>
      ) : null}
      <View style={styles.cardBody}>{children}</View>
    </View>
  );
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
  const [byStatus, setByStatus] = useState<AppUserListBreakdownItem[]>([]);
  const [byTownship, setByTownship] = useState<AppUserListBreakdownItem[]>([]);
  const [byTag, setByTag] = useState<AppUserListBreakdownItem[]>([]);
  const [townshipStatus, setTownshipStatus] = useState<
    AppInstallStatus | 'all'
  >('installed');
  const [tagStatus, setTagStatus] = useState<AppInstallStatus | 'all'>(
    'installed',
  );

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
        const [summary, timeline, breakdown] = await Promise.all([
          fetchAppUserListSummary(token, range, status),
          fetchAppUserListTimeline(token, range, status),
          fetchAppUserListBreakdown(token, range, status),
        ]);

        if (cancelled) {
          return;
        }

        setCount(summary);
        setBuckets(timeline.buckets);
        setSeries(timeline.series);
        setByStatus(breakdown.byStatus);
        setByTownship(breakdown.byTownship);
        setByTag(breakdown.byTag);
        setTownshipStatus(breakdown.townshipStatus);
        setTagStatus(breakdown.tagStatus);
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

  const townshipStatusLabel = useMemo(() => {
    if (townshipStatus === 'all') return 'all statuses';
    return (
      STATUS_OPTIONS.find(o => o.id === townshipStatus)?.label ?? 'Installed'
    );
  }, [townshipStatus]);

  const tagStatusLabel = useMemo(() => {
    if (tagStatus === 'all') return 'all statuses';
    return STATUS_OPTIONS.find(o => o.id === tagStatus)?.label ?? 'Installed';
  }, [tagStatus]);

  const pieItems = useMemo(
    () =>
      byStatus.map(row => ({
        id: row.id,
        label: row.label,
        value: row.count,
        color: STATUS_PIE_COLORS[row.id],
      })),
    [byStatus],
  );

  const tagPieItems = useMemo(
    () =>
      byTag.map(row => ({
        id: row.id,
        label: row.label,
        value: row.count,
      })),
    [byTag],
  );

  const townshipBars = useMemo(
    () =>
      byTownship.map(row => ({
        id: row.id,
        label: row.label,
        value: row.count,
      })),
    [byTownship],
  );

  const chartGridStyle = isMobile ? styles.chartsStack : styles.chartsRow;

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
            <View style={styles.charts}>
              <ChartCard
                title="Trend"
                subtitle={`${statusLabel} over ${rangeLabel.toLowerCase()}`}
                borderColor={detail.border}>
                <AreaLineChart
                  buckets={buckets}
                  series={series}
                  emptyLabel="No App User List data in this period."
                />
              </ChartCard>

              <View style={chartGridStyle}>
                <View style={styles.chartHalf}>
                  <ChartCard
                    title="By status"
                    subtitle={`All call statuses · ${rangeLabel.toLowerCase()}`}
                    borderColor={detail.border}>
                    <PieChart
                      items={pieItems}
                      emptyLabel="No status data in this period."
                      size={isMobile ? 180 : 200}
                    />
                  </ChartCard>
                </View>
                <View style={styles.chartHalf}>
                  <ChartCard
                    title="By tag"
                    subtitle={`${tagStatusLabel} by Odoo tag · ${rangeLabel.toLowerCase()}`}
                    borderColor={detail.border}>
                    <PieChart
                      items={tagPieItems}
                      emptyLabel="No tag data in this period."
                      size={isMobile ? 180 : 200}
                    />
                  </ChartCard>
                </View>
              </View>

              <ChartCard
                title="By township"
                subtitle={`${townshipStatusLabel} installs by area · ${rangeLabel.toLowerCase()}`}
                borderColor={detail.border}>
                <HorizontalBarChart
                  items={townshipBars}
                  emptyLabel="No township installs in this period."
                  formatValue={value => value.toLocaleString()}
                  maxItems={12}
                />
              </ChartCard>
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
  charts: {
    gap: 16,
  },
  chartsRow: {
    flexDirection: 'row',
    gap: 16,
    alignItems: 'stretch',
  },
  chartsStack: {
    flexDirection: 'column',
    gap: 16,
  },
  chartHalf: {
    flex: 1,
    minWidth: 0,
  },
  card: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    gap: 4,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  cardSubtitle: {
    fontSize: 12,
    marginBottom: 4,
  },
  cardBody: {
    marginTop: 4,
  },
  rangeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {},
});
