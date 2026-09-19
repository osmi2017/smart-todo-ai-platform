import React, { useCallback, useState } from 'react';
import { RefreshControl, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { meetingService } from '../../api/services';
import { useFetch } from '../../hooks/useFetch';
import { Badge, Card, EmptyState, ErrorBanner, Loading, Pill } from '../../components/ui';
import { THEME } from '../../theme';

const FILTERS = [
  { key: 'all', label: 'Toutes' },
  { key: 'scheduled', label: 'Planifiées' },
  { key: 'in_progress', label: 'En cours' },
  { key: 'completed', label: 'Terminées' },
];

const statusColor = { scheduled: 'blue', in_progress: 'amber', completed: 'green', cancelled: 'gray' };
const statusLabel = { scheduled: 'Planifiée', in_progress: 'En cours', completed: 'Terminée', cancelled: 'Annulée' };

export default function Meetings({ navigation }) {
  const [filter, setFilter] = useState('all');
  const fetcher = useCallback(() => meetingService.list(), []);
  const { data, loading, refreshing, error, refresh, reload } = useFetch(fetcher);

  const list = (data || []).filter((m) => filter === 'all' || m.status === filter);

  return (
    <View style={styles.screen}>
      <View style={styles.filters}>
        <FlatList
          horizontal
          data={FILTERS}
          keyExtractor={(i) => i.key}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.pillList}
          renderItem={({ item }) => (
            <Pill selected={filter === item.key} onPress={() => setFilter(item.key)}>
              {item.label}
            </Pill>
          )}
        />
      </View>

      {error ? <ErrorBanner message="Impossible de charger les réunions." onRetry={reload} /> : null}
      {loading && !data ? (
        <Loading />
      ) : (
        <FlatList
          data={list}
          keyExtractor={(i) => String(i.id)}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={THEME.colors.brand[500]} />
          }
          ListEmptyComponent={<EmptyState icon="📅" title="Aucune réunion" hint="Planifiez une réunion avec votre équipe." />}
          renderItem={({ item }) => (
            <Card style={styles.card} onPress={() => navigation.navigate('MeetingDetail', { id: item.id })}>
              <View style={styles.headerRow}>
                <Text numberOfLines={1} style={styles.title}>{item.title}</Text>
                <Badge text={statusLabel[item.status] || item.status} color={statusColor[item.status]} />
              </View>
              {item.description ? <Text numberOfLines={2} style={styles.desc}>{item.description}</Text> : null}
              <View style={styles.metaRow}>
                <View style={styles.metaItem}>
                  <Ionicons name="calendar-outline" size={14} color={THEME.colors.text.muted} />
                  <Text style={styles.metaText}>
                    {item.scheduled_at ? new Date(item.scheduled_at).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' }) : 'À définir'}
                  </Text>
                </View>
                {item.ai_processed ? (
                  <Badge text="🤖 Traitée par IA" color="purple" />
                ) : null}
              </View>
            </Card>
          )}
        />
      )}

      <Pressable style={styles.fab} onPress={() => navigation.navigate('MeetingForm')}>
        <Ionicons name="add" size={28} color="#fff" />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: THEME.colors.background },
  filters: { paddingTop: 12 },
  pillList: { paddingHorizontal: 16 },
  list: { padding: 16, paddingBottom: 96 },
  card: { padding: 14 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontSize: THEME.text.lg, fontWeight: '700', flex: 1, marginRight: 8 },
  desc: { color: THEME.colors.text.secondary, fontSize: THEME.text.sm, marginTop: 8 },
  metaRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { color: THEME.colors.text.muted, fontSize: THEME.text.xs },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: THEME.colors.brand[500],
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 6,
    shadowColor: THEME.colors.brand[900],
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
});