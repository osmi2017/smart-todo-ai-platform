import React, { useCallback, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { missionService } from '../../api/services';
import { useFetch } from '../../hooks/useFetch';
import { Badge, Button, Card, EmptyState, ErrorBanner, Loading, Pill } from '../../components/ui';
import { THEME } from '../../theme';

export const MISSION_STATUS_LABELS = {
  planned: 'Planifiée',
  in_progress: 'En cours',
  completed: 'Terminée',
  cancelled: 'Annulée',
};

export const MISSION_STATUS_COLOR = {
  planned: 'blue',
  in_progress: 'amber',
  completed: 'green',
  cancelled: 'gray',
};

export function formatMoney(value, currency) {
  const n = Number(value || 0);
  return `${n.toLocaleString('fr-FR', { maximumFractionDigits: 0 })} ${String(currency || 'xof').toUpperCase()}`;
}

const FILTERS = [
  { key: 'all', label: 'Toutes' },
  { key: 'planned', label: 'Planifiées' },
  { key: 'in_progress', label: 'En cours' },
  { key: 'completed', label: 'Terminées' },
];

export default function Missions({ navigation }) {
  const fetcher = useCallback(() => missionService.list(), []);
  const { data, loading, refreshing, error, refresh, reload } = useFetch(fetcher);
  const [filter, setFilter] = useState('all');

  const list = (data || []).filter((m) => filter === 'all' || m.status === filter);

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={THEME.colors.brand[500]} />
      }
    >
      {error ? <ErrorBanner message="Impossible de charger les missions." onRetry={reload} /> : null}
      {loading && !data ? <Loading /> : null}

      <View style={styles.pillRow}>
        {FILTERS.map((f) => (
          <Pill key={f.key} selected={filter === f.key} onPress={() => setFilter(f.key)}>
            {f.label}
          </Pill>
        ))}
      </View>

      {list.length === 0 && !loading ? (
        <EmptyState
          icon="✈️"
          title={filter === 'all' ? 'Aucune mission' : 'Aucune mission dans ce statut'}
          hint="Planifiez vos déplacements et suivez leurs coûts."
          action={
            <Button
              variant="secondary"
              title="+ Créer une mission"
              size="sm"
              onPress={() => navigation.navigate('MissionForm')}
            />
          }
        />
      ) : (
        <>
          <View style={styles.toolbar}>
            <Text style={styles.count}>{list.length} mission(s)</Text>
            <Button variant="secondary" title="+ Créer" size="sm" onPress={() => navigation.navigate('MissionForm')} />
          </View>
          {list.map((m) => (
            <Card key={m.id} style={styles.card} onPress={() => navigation.navigate('MissionDetail', { id: m.id })}>
              <View style={styles.headerRow}>
                <Text numberOfLines={1} style={styles.title}>{m.title}</Text>
                <Badge text={MISSION_STATUS_LABELS[m.status]} color={MISSION_STATUS_COLOR[m.status]} />
              </View>
              <View style={styles.destRow}>
                <Ionicons name="location-outline" size={15} color={THEME.colors.text.muted} />
                <Text style={styles.dest}>{m.destination_name}</Text>
              </View>
              <View style={styles.metaRow}>
                {m.start_date ? <Badge text={new Date(m.start_date).toLocaleDateString('fr-FR')} color="gray" /> : null}
                {m.duration_days ? <Badge text={`${m.duration_days} j`} color="amber" /> : null}
                <Badge text={`${m.members?.length || 0} membre(s)`} color="blue" />
              </View>
              {m.frais_de_mission > 0 ? (
                <Text style={styles.cost}>{formatMoney(m.frais_de_mission, m.currency)}</Text>
              ) : null}
            </Card>
          ))}
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: THEME.colors.background },
  content: { padding: 16, paddingBottom: 40 },
  pillRow: { flexDirection: 'row', marginBottom: 16 },
  toolbar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  count: { color: THEME.colors.text.secondary },
  card: { padding: 14 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontSize: THEME.text.md, fontWeight: '700', flex: 1, marginRight: 8 },
  destRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6 },
  dest: { color: THEME.colors.text.secondary, fontSize: THEME.text.sm },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },
  cost: { marginTop: 10, fontSize: THEME.text.md, fontWeight: '700', color: THEME.colors.brand[600] },
});