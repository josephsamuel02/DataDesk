import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase, RechargeRequest, PointsTransaction } from '../../lib/supabase';
import { THEME } from '../../constants/theme';
import { NETWORKS, Network } from '../../constants/networks';
import { Logo } from '../../components/Logo';
import { NetworkLogo } from '../../components/NetworkLogo';

type TabType = 'recharges' | 'points';

function StatusBadge({ status }: { status: RechargeRequest['status'] }) {
  const config = {
    pending: { color: '#F59E0B', bg: '#FFFBEB', label: 'Pending' },
    processing: { color: THEME.colors.primary, bg: THEME.colors.primarySurface, label: 'Processing' },
    completed: { color: THEME.colors.success, bg: '#F0FDF4', label: 'Completed' },
    failed: { color: THEME.colors.error, bg: '#FEF2F2', label: 'Failed' },
  }[status] ?? { color: '#6B7280', bg: '#F9FAFB', label: status };

  return (
    <View style={[styles.statusBadge, { backgroundColor: config.bg }]}>
      <Text style={[styles.statusText, { color: config.color }]}>{config.label}</Text>
    </View>
  );
}

function NetworkIcon({ network }: { network: string }) {
  const n = NETWORKS.find((net) => net.id === network);
  if (n) {
    return <NetworkLogo id={n.id as Network['id']} size={44} />;
  }
  return (
    <View style={[styles.networkIcon, { backgroundColor: '#6B7280' }]}>
      <Text style={styles.networkIconText}>?</Text>
    </View>
  );
}

function formatDate(dateString: string) {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-NG', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function HistoryScreen() {
  const [activeTab, setActiveTab] = useState<TabType>('recharges');
  const [recharges, setRecharges] = useState<RechargeRequest[]>([]);
  const [pointsTx, setPointsTx] = useState<PointsTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [totalPointsEarned, setTotalPointsEarned] = useState(0);

  async function loadData() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const [rechargesRes, pointsRes] = await Promise.all([
      supabase
        .from('recharge_requests')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false }),
      supabase
        .from('points_transactions')
        .select('*, ad_types(name, points_reward)')
        .eq('user_id', user.id)
        .order('watched_at', { ascending: false }),
    ]);

    if (rechargesRes.data) setRecharges(rechargesRes.data);
    if (pointsRes.data) {
      setPointsTx(pointsRes.data);
      const total = pointsRes.data.reduce((sum: number, t: any) => sum + t.points_earned, 0);
      setTotalPointsEarned(total);
    }
  }

  async function initialize() {
    setLoading(true);
    await loadData();
    setLoading(false);
  }

  async function onRefresh() {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }

  useEffect(() => { initialize(); }, []);

  const renderRechargeItem = ({ item }: { item: RechargeRequest }) => (
    <View style={styles.listItem}>
      <NetworkIcon network={item.network} />
      <View style={styles.listItemContent}>
        <Text style={styles.listItemTitle}>{item.data_plan} — {item.network}</Text>
        <Text style={styles.listItemSub}>{item.phone_number}</Text>
        <Text style={styles.listItemDate}>{formatDate(item.created_at)}</Text>
      </View>
      <View style={styles.listItemRight}>
        <StatusBadge status={item.status} />
        <Text style={styles.listItemPoints}>-{item.points_spent} pts</Text>
      </View>
    </View>
  );

  const renderPointsItem = ({ item }: { item: PointsTransaction }) => {
    const adName = (item as any).ad_types?.name ?? 'Ad';
    return (
      <View style={styles.listItem}>
        <View style={styles.adIconCircle}>
          <Text style={styles.adIconText}>📺</Text>
        </View>
        <View style={styles.listItemContent}>
          <Text style={styles.listItemTitle}>{adName}</Text>
          <Text style={styles.listItemDate}>{formatDate(item.watched_at)}</Text>
        </View>
        <View style={styles.listItemRight}>
          <View style={styles.earnedBadge}>
            <Text style={styles.earnedText}>+{item.points_earned} pts</Text>
          </View>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.brandRow}>
          <Logo size={15} variant="color" />
          <Text style={styles.screenBrand}>Data Desk</Text>
        </View>
        <Text style={styles.pageTitle}>My Activity</Text>
      </View>

      {/* Tab switcher */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'recharges' && styles.tabActive]}
          onPress={() => setActiveTab('recharges')}
        >
          <Text style={[styles.tabText, activeTab === 'recharges' && styles.tabTextActive]}>
            📋 Recharges
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'points' && styles.tabActive]}
          onPress={() => setActiveTab('points')}
        >
          <Text style={[styles.tabText, activeTab === 'points' && styles.tabTextActive]}>
            ⭐ Points Earned
          </Text>
        </TouchableOpacity>
      </View>

      {/* Summary strip for points tab */}
      {activeTab === 'points' && !loading && (
        <View style={styles.summaryStrip}>
          <Text style={styles.summaryText}>
            Total earned: <Text style={styles.summaryBold}>{totalPointsEarned} pts</Text>
            {' '}across <Text style={styles.summaryBold}>{pointsTx.length} ads</Text>
          </Text>
        </View>
      )}

      {/* Lists */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={THEME.colors.primary} />
          <Text style={styles.loadingText}>Loading your Data Desk activity...</Text>
        </View>
      ) : activeTab === 'recharges' ? (
        <FlatList
          data={recharges}
          keyExtractor={(item) => item.id}
          renderItem={renderRechargeItem}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[THEME.colors.primary]}
              tintColor={THEME.colors.primary}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text style={styles.emptyEmoji}>📡</Text>
              <Text style={styles.emptyTitle}>No recharges yet</Text>
              <Text style={styles.emptySubtitle}>
                Start watching ads on Data Desk to earn free data!
              </Text>
            </View>
          }
        />
      ) : (
        <FlatList
          data={pointsTx}
          keyExtractor={(item) => item.id}
          renderItem={renderPointsItem}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[THEME.colors.primary]}
              tintColor={THEME.colors.primary}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text style={styles.emptyEmoji}>⭐</Text>
              <Text style={styles.emptyTitle}>No points yet</Text>
              <Text style={styles.emptySubtitle}>
                Watch your first ad to get started on Data Desk!
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: THEME.colors.background },
  header: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
    gap: 2,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  screenBrand: {
    fontSize: THEME.fontSize.sm,
    fontWeight: THEME.fontWeight.semiBold,
    color: THEME.colors.primary,
  },
  pageTitle: {
    fontSize: THEME.fontSize.xxl,
    fontWeight: THEME.fontWeight.extraBold,
    color: THEME.colors.text,
  },

  // Tabs
  tabBar: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginVertical: 12,
    backgroundColor: THEME.colors.card,
    borderRadius: 12,
    padding: 4,
    gap: 4,
    ...THEME.shadow.small,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 10,
  },
  tabActive: {
    backgroundColor: THEME.colors.primary,
  },
  tabText: {
    fontSize: THEME.fontSize.sm,
    fontWeight: THEME.fontWeight.semiBold,
    color: THEME.colors.textSecondary,
  },
  tabTextActive: { color: '#FFFFFF' },

  summaryStrip: {
    marginHorizontal: 16,
    marginBottom: 8,
    backgroundColor: THEME.colors.primarySurface,
    borderRadius: 10,
    padding: 12,
  },
  summaryText: {
    fontSize: THEME.fontSize.sm,
    color: THEME.colors.text,
  },
  summaryBold: {
    fontWeight: THEME.fontWeight.bold,
    color: THEME.colors.primary,
  },

  // List
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 24,
    gap: 10,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.colors.card,
    borderRadius: THEME.borderRadius.card,
    padding: 14,
    gap: 12,
    ...THEME.shadow.small,
  },
  networkIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  networkIconText: {
    color: '#FFFFFF',
    fontWeight: THEME.fontWeight.extraBold,
    fontSize: THEME.fontSize.md,
  },
  adIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: THEME.colors.primarySurface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  adIconText: { fontSize: 20 },
  listItemContent: {
    flex: 1,
    gap: 2,
  },
  listItemTitle: {
    fontSize: THEME.fontSize.base,
    fontWeight: THEME.fontWeight.semiBold,
    color: THEME.colors.text,
  },
  listItemSub: {
    fontSize: THEME.fontSize.sm,
    color: THEME.colors.textSecondary,
  },
  listItemDate: {
    fontSize: THEME.fontSize.xs,
    color: THEME.colors.textSecondary,
    marginTop: 2,
  },
  listItemRight: {
    alignItems: 'flex-end',
    gap: 4,
  },
  listItemPoints: {
    fontSize: THEME.fontSize.sm,
    color: THEME.colors.textSecondary,
    fontWeight: THEME.fontWeight.medium,
  },

  // Badges
  statusBadge: {
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  statusText: {
    fontSize: THEME.fontSize.xs,
    fontWeight: THEME.fontWeight.bold,
  },
  earnedBadge: {
    backgroundColor: '#F0FDF4',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  earnedText: {
    fontSize: THEME.fontSize.sm,
    fontWeight: THEME.fontWeight.bold,
    color: THEME.colors.success,
  },

  // Empty / loading states
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: THEME.fontSize.base,
    color: THEME.colors.textSecondary,
  },
  emptyState: {
    alignItems: 'center',
    paddingTop: 80,
    gap: 8,
  },
  emptyEmoji: { fontSize: 56 },
  emptyTitle: {
    fontSize: THEME.fontSize.lg,
    fontWeight: THEME.fontWeight.bold,
    color: THEME.colors.text,
  },
  emptySubtitle: {
    fontSize: THEME.fontSize.base,
    color: THEME.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
    maxWidth: 280,
  },
});
