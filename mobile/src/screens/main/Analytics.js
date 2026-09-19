import React, { useCallback, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { dashboardService } from '../../api/services';
import { useFetch } from '../../hooks/useFetch';
import { ErrorBanner, Loading, Pill } from '../../components/ui';
import { THEME } from '../../theme';

function StatBlock({ title, data, colors }) {
  const total = Object.values(data || {}).reduce((a, b) => a + (Number(b) || 0), 0);
  return (
    <View style={styles.block}>
      <Text style={styles.blockTitle}>{title}</Text>
      {total === 0 ? (
        <Text style={styles.empty}>Aucune donnée.</Text>
      ) : (
        Object.entries(data || {}).map(([k, v]) => (
          <View key={k} style={styles.barRow}>
            <Text style={styles.barLabel}>{k}</Text>
            <View style={styles.track}>
              <View style={[styles.fill, { width: `${(Number(v) / total) * 100}%`, backgroundColor: colors[k] }]} />
            </View>
            <Text style={styles.barValue}>{v}</Text>
          </View>
        ))
      )}
    </View>
  );
}

export default function Analytics() {
  const [range, setRange] = useState('week');
  const fetcher = useCallback(() => dashboardService.stats(range), [range]);
  const { data, loading, refreshing, error, refresh, reload } = useFetch(fetcher, [range]);

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={THEME.colors.brand[500]} />
      }
    >
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

      {error ? <ErrorBanner message="Impossible de charger les analyses." onRetry={reload} /> : null}
      {loading && !data ? (
        <Loading />
      ) : data ? (
        <>
          <View style={styles.kpis}>
            <View style={styles.kpi}><Text style={styles.kpiVal}>{data.total_tasks}</Text><Text style={styles.kpiLbl}>Tâches</Text></View>
            <View style={styles.kpi}><Text style={styles.kpiVal}>{data.completed_tasks}</Text><Text style={styles.kpiLbl}>Terminées</Text></View>
            <View style={styles.kpi}><Text style={styles.kpiVal}>{data.delayed_tasks}</Text><Text style={styles.kpiLbl}>En retard</Text></View>
            <View style={styles.kpi}><Text style={styles.kpiVal}>{data.productivity_score}%</Text><Text style={styles.kpiLbl}>Productivité</Text></View>
          </View>
          <StatBlock
            title="Tâches par statut"
            data={data.tasks_by_status}
            colors={{ todo: '#3b82f6', in_progress: '#f59e0b', review: '#8b5cf6', blocked: '#ef4444', completed: '#10b981' }}
          />
          <StatBlock
            title="Tâches par priorité"
            data={data.tasks_by_priority}
            colors={{ low: '#10b981', medium: '#f59e0b', high: '#ef4444', critical: '#7f1d1d' }}
          />
        </>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: THEME.colors.background },
  content: { padding: 16, paddingBottom: 40 },
  pillRow: { flexDirection: 'row', marginBottom: 16 },
  kpis: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  kpi: { flex: 1, alignItems: 'center', backgroundColor: THEME.colors.surface, borderRadius: THEME.radii.lg, padding: 14, marginHorizontal: 4 },
  kpiVal: { fontSize: THEME.text.xl, fontWeight: '800' },
  kpiLbl: { color: THEME.colors.text.secondary, fontSize: THEME.text.xs, marginTop: 4 },
  block: { backgroundColor: THEME.colors.surface, borderRadius: THEME.radii.lg, borderWidth: 1, borderColor: THEME.colors.border, padding: 16, marginTop: 12 },
  blockTitle: { fontSize: THEME.text.md, fontWeight: '700', marginBottom: 12 },
  empty: { color: THEME.colors.text.muted, fontSize: THEME.text.sm },
  barRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  barLabel: { width: 90, fontSize: THEME.text.sm, color: THEME.colors.text.secondary },
  track: { flex: 1, height: 8, backgroundColor: THEME.colors.border, borderRadius: 4, overflow: 'hidden', marginHorizontal: 8 },
  fill: { height: 8, borderRadius: 4 },
  barValue: { width: 30, textAlign: 'right', fontSize: THEME.text.sm, fontWeight: '700' },
});