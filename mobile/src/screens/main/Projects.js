import React, { useCallback } from 'react';
import { RefreshControl, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { projectService } from '../../api/services';
import { useFetch } from '../../hooks/useFetch';
import { Badge, Card, EmptyState, ErrorBanner, Loading } from '../../components/ui';
import { THEME } from '../../theme';

const statusLabel = { not_started: 'Non démarré', in_progress: 'En cours', on_hold: 'En pause', completed: 'Terminé', archived: 'Archivé' };
const statusColor = { not_started: 'gray', in_progress: 'blue', on_hold: 'amber', completed: 'green', archived: 'gray' };

export default function Projects({ navigation }) {
  const fetcher = useCallback(() => projectService.list(), []);
  const { data, loading, refreshing, error, refresh, reload } = useFetch(fetcher);

  return (
    <View style={styles.screen}>
      {error ? <ErrorBanner message="Impossible de charger les projets." onRetry={reload} /> : null}
      {loading && !data ? (
        <Loading />
      ) : (
        <FlatList
          data={data || []}
          keyExtractor={(i) => String(i.id)}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={THEME.colors.brand[500]} />
          }
          ListEmptyComponent={
            <EmptyState
              icon="📁"
              title="Aucun projet"
              hint="Créez un projet pour organiser vos tâches et jalons."
            />
          }
          renderItem={({ item }) => (
            <Card style={styles.card} onPress={() => navigation.navigate('ProjectDetail', { id: item.id })}>
              <View style={styles.headerRow}>
                <View style={[styles.colorDot, { backgroundColor: item.color || THEME.colors.brand[500] }]} />
                <Text numberOfLines={1} style={styles.name}>{item.name}</Text>
                <Badge text={statusLabel[item.status] || item.status} color={statusColor[item.status]} />
              </View>
              {item.description ? (
                <Text numberOfLines={2} style={styles.desc}>{item.description}</Text>
              ) : null}
              <View style={styles.track}>
                <View style={[styles.fill, { width: `${item.progress || 0}%`, backgroundColor: item.color || THEME.colors.brand[500] }]} />
              </View>
              <View style={styles.metaRow}>
                <Text style={styles.metaLabel}>{item.progress || 0}% réalisé · {item.task_count ?? 0} tâches · {item.members_count ?? 0} membres</Text>
                <Ionicons name="chevron-forward" size={18} color={THEME.colors.text.muted} />
              </View>
            </Card>
          )}
        />
      )}
      <Pressable style={styles.fab} onPress={() => navigation.navigate('ProjectForm')}>
        <Ionicons name="add" size={28} color="#fff" />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: THEME.colors.background },
  list: { padding: 16, paddingBottom: 96 },
  card: { padding: 14 },
  headerRow: { flexDirection: 'row', alignItems: 'center' },
  colorDot: { width: 10, height: 10, borderRadius: 5, marginRight: 8 },
  name: { fontSize: THEME.text.lg, fontWeight: '700', flex: 1, marginRight: 8 },
  desc: { color: THEME.colors.text.secondary, fontSize: THEME.text.sm, marginTop: 8 },
  track: { height: 8, backgroundColor: THEME.colors.border, borderRadius: 4, marginTop: 12, overflow: 'hidden' },
  fill: { height: 8, borderRadius: 4 },
  metaRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 },
  metaLabel: { color: THEME.colors.text.muted, fontSize: THEME.text.xs },
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