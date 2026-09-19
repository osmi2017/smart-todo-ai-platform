import React, { useCallback, useEffect, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { dashboardService, notificationService } from '../../api/services';
import { useFetch } from '../../hooks/useFetch';
import { Badge, Card, EmptyState, ErrorBanner, Loading, Pill, ScreenTitle } from '../../components/ui';
import { THEME } from '../../theme';

function HeaderButton({ icon, onPress, badge }) {
  return (
    <Pressable onPress={onPress} style={styles.headerBtn}>
      <Ionicons name={icon} size={22} color={THEME.colors.text.primary} />
      {badge ? (
        <View style={styles.headerBadge}>
          <Text style={styles.headerBadgeText}>{badge > 99 ? '99+' : badge}</Text>
        </View>
      ) : null}
    </Pressable>
  );
}

function KpiCard({ label, value, icon, color }) {
  return (
    <View style={[styles.kpi, { borderColor: color }]}>
      <Ionicons name={icon} size={22} color={color} />
      <Text style={styles.kpiValue}>{value}</Text>
      <Text style={styles.kpiLabel}>{label}</Text>
    </View>
  );
}

export default function Dashboard({ navigation }) {
  const { user } = useAuth();
  const [range, setRange] = useState('week');
  const fetcher = useCallback(() => dashboardService.stats(range), [range]);
  const { data, loading, refreshing, error, refresh, reload } = useFetch(fetcher, [range]);
  const [unread, setUnread] = useState(0);

  const loadUnread = useCallback(async () => {
    try {
      const res = await notificationService.unreadCount();
      setUnread(res.unread_count ?? res.count ?? 0);
    } catch {
      // silencieux : le badge est facultatif
    }
  }, []);

  useEffect(() => {
    loadUnread();
  }, [loadUnread]);

  const firstName = user?.first_name || user?.username || '';
  const greeting = firstName ? `Bonjour ${firstName} 👋` : 'Bonjour 👋';

  const fmt = (d) => {
    if (!d) return '';
    const date = new Date(d);
    return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
  };

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={THEME.colors.brand[500]} />
      }
    >
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>{greeting}</Text>
          <Text style={styles.subGreeting}>Voici un aperçu de votre activité</Text>
        </View>
        <View style={styles.headerRight}>
          <HeaderButton icon="search-outline" onPress={() => navigation.navigate('Search')} />
          <HeaderButton icon="notifications-outline" badge={unread} onPress={() => navigation.navigate('Notifications')} />
        </View>
      </View>

      {error ? <ErrorBanner message="Impossible de charger le tableau de bord." onRetry={reload} /> : null}

      <View style={styles.pillRow}>
        {[
          { key: 'week', label: '7 jours' },
          { key: 'month', label: '30 jours' },
          { key: 'year', label: '1 an' },
        ].map((r) => (
          <Pill key={r.key} selected={range === r.key} onPress={() => setRange(r.key)}>
            {r.label}
          </Pill>
        ))}
      </View>

      {loading && !data ? (
        <Loading label="Chargement des statistiques..." />
      ) : data ? (
        <>
          <View style={styles.kpiGrid}>
            <KpiCard label="Productivité" value={`${data.productivity_score ?? 0}%`} icon="speedometer" color={THEME.colors.accent} />
            <KpiCard label="Tâches" value={data.total_tasks} icon="checkmark-done" color={THEME.colors.brand[500]} />
            <KpiCard label="En cours" value={data.in_progress_tasks} icon="time" color={THEME.colors.warning} />
            <KpiCard label="En retard" value={data.delayed_tasks} icon="alert-circle" color={THEME.colors.danger} />
            <KpiCard label="Terminées" value={data.completed_tasks} icon="trophy" color={THEME.colors.success} />
          </View>

          <ScreenTitle title="Progression des projets" />
          {(data.project_progress || []).length === 0 ? (
            <EmptyState icon="📁" title="Aucun projet" hint="Créez votre premier projet pour démarrer." />
          ) : (
            data.project_progress.map((p) => (
              <Card
                key={p.id}
                onPress={() => navigation.navigate('ProjectDetail', { id: p.id })}
                style={styles.projRow}
              >
                <View style={styles.projHeaderRow}>
                  <Text numberOfLines={1} style={styles.projName}>{p.name}</Text>
                  <Text style={styles.projPct}>{p.progress}%</Text>
                </View>
                <View style={styles.progressTrack}>
                  <View
                    style={[
                      styles.progressFill,
                      { width: `${p.progress}%`, backgroundColor: p.color || THEME.colors.brand[500] },
                    ]}
                  />
                </View>
              </Card>
            ))
          )}

          <ScreenTitle title="Échéances à venir" />
          {(data.upcoming_deadlines || []).length === 0 ? (
            <EmptyState icon="🗓️" title="Aucune échéance proche" />
          ) : (
            data.upcoming_deadlines.map((t) => (
              <Card
                key={t.id}
                style={styles.deadlineRow}
                onPress={() => navigation.navigate('TaskDetail', { id: t.id })}
              >
                <View style={styles.deadlineLeft}>
                  <Text numberOfLines={1} style={styles.deadlineTitle}>{t.title}</Text>
                  <Text style={styles.deadlineProject}>{t.project_name}</Text>
                </View>
                <Badge text={fmt(t.deadline)} color={t.is_delayed ? 'red' : 'amber'} />
              </Card>
            ))
          )}
        </>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: THEME.colors.background },
  content: { padding: 16, paddingBottom: 32 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  greeting: { fontSize: THEME.text.xl, fontWeight: '700', color: THEME.colors.text.primary },
  subGreeting: { color: THEME.colors.text.secondary, marginTop: 2 },
  scoreBox: { alignItems: 'center', backgroundColor: THEME.colors.brand[500], paddingHorizontal: 16, paddingVertical: 10, borderRadius: THEME.radii.lg },
  scoreValue: { color: '#fff', fontSize: THEME.text.lg, fontWeight: '800' },
  scoreLabel: { color: '#c7d2fe', fontSize: THEME.text.xs },
  headerRight: { flexDirection: 'row', gap: 10 },
  headerBtn: {
    width: 42,
    height: 42,
    borderRadius: 999,
    backgroundColor: THEME.colors.surface,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    paddingHorizontal: 4,
    backgroundColor: THEME.colors.danger,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerBadgeText: { color: '#fff', fontSize: 10, fontWeight: '700' },
  pillRow: { flexDirection: 'row', marginBottom: 16 },
  kpiGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginBottom: 8 },
  kpi: {
    width: '48%',
    backgroundColor: THEME.colors.surface,
    borderRadius: THEME.radii.lg,
    borderWidth: 1,
    padding: 14,
    marginBottom: 10,
  },
  kpiValue: { fontSize: THEME.text.xl, fontWeight: '800', color: THEME.colors.text.primary, marginTop: 6 },
  kpiLabel: { color: THEME.colors.text.secondary, fontSize: THEME.text.xs, marginTop: 2 },
  projRow: { padding: 14 },
  projHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  projName: { fontSize: THEME.text.md, fontWeight: '600', flex: 1 },
  projPct: { fontSize: THEME.text.sm, fontWeight: '700', color: THEME.colors.text.secondary },
  progressTrack: { height: 8, backgroundColor: THEME.colors.border, borderRadius: 4, overflow: 'hidden' },
  progressFill: { height: 8, borderRadius: 4 },
  deadlineRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 14 },
  deadlineLeft: { flex: 1, marginRight: 10 },
  deadlineTitle: { fontSize: THEME.text.md, fontWeight: '600' },
  deadlineProject: { fontSize: THEME.text.xs, color: THEME.colors.text.secondary, marginTop: 2 },
});