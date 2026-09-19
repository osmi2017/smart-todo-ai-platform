import React, { useCallback, useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, Text, View, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { taskService } from '../../api/services';
import { useFetch } from '../../hooks/useFetch';
import { Badge, Card, EmptyState, ErrorBanner, Loading, Pill } from '../../components/ui';
import { THEME, PRIORITY_LABELS, PRIORITY_COLORS, STATUS_LABELS, STATUS_COLORS } from '../../theme';

const STATUS_FILTERS = [
  { key: 'all', label: 'Toutes' },
  { key: 'todo', label: 'À faire' },
  { key: 'in_progress', label: 'En cours' },
  { key: 'completed', label: 'Terminées' },
];

const PRIORITY_FILTERS = [
  { key: 'all', label: 'Tout' },
  { key: 4, label: 'Critique' },
  { key: 3, label: 'Haute' },
  { key: 2, label: 'Moyenne' },
];

function priorityLabel(p) {
  return { 1: 'low', 2: 'medium', 3: 'high', 4: 'critical' }[p] || 'low';
}

export default function Tasks({ navigation }) {
  const [status, setStatus] = useState('all');
  const [priority, setPriority] = useState('all');

  const fetcher = useCallback(() => {
    const params = {};
    if (status !== 'all') params.status = status;
    if (priority !== 'all') params.priority = priority;
    return taskService.list(params);
  }, [status, priority]);

  const { data, loading, refreshing, error, refresh, reload } = useFetch(fetcher, [status, priority]);

  const openTask = (id) => navigation.navigate('TaskDetail', { id });

  return (
    <View style={styles.screen}>
      <View style={styles.filters}>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={STATUS_FILTERS}
          keyExtractor={(i) => i.key}
          renderItem={({ item }) => (
            <Pill selected={status === item.key} onPress={() => setStatus(item.key)}>
              {item.label}
            </Pill>
          )}
          contentContainerStyle={styles.pillList}
        />
        <View style={{ height: 4 }} />
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={PRIORITY_FILTERS}
          keyExtractor={(i) => String(i.key)}
          renderItem={({ item }) => (
            <Pill selected={priority === item.key} onPress={() => setPriority(item.key)}>
              {item.label}
            </Pill>
          )}
          contentContainerStyle={styles.pillList}
        />
      </View>

      {error ? <ErrorBanner message="Impossible de charger les tâches." onRetry={reload} /> : null}
      {loading && !data ? (
        <Loading />
      ) : (
        <FlatList
          data={data || []}
          keyExtractor={(i) => String(i.id)}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={THEME.colors.brand[500]} />
          }
          ListEmptyComponent={
            <EmptyState
              icon="✅"
              title="Aucune tâche"
              hint="Créez une tâche pour commencer à organiser votre travail."
              action={
                <Pressable style={styles.createBtn} onPress={() => navigation.navigate('TaskForm')}>
                  <Text style={styles.createBtnText}>+ Nouvelle tâche</Text>
                </Pressable>
              }
            />
          }
          renderItem={({ item }) => {
            const pl = priorityLabel(item.priority);
            const risk = item.delay_probability !== null && item.delay_probability !== undefined;
            return (
              <Card style={styles.task} onPress={() => openTask(item.id)}>
                <View style={styles.taskHeader}>
                  <Text numberOfLines={1} style={styles.taskTitle}>{item.title}</Text>
                  <Badge text={STATUS_LABELS[item.status] || item.status} color={STATUS_COLORS[item.status] && 'blue'} />
                </View>
                <Text numberOfLines={2} style={styles.taskDesc}>{item.description}</Text>
                <View style={styles.taskMeta}>
                  <Text style={styles.project}>{item.project_name}</Text>
                  <View style={styles.sideMeta}>
                    <Badge
                      text={PRIORITY_LABELS[pl] || item.priority}
                      color={pl === 'critical' ? 'red' : pl === 'high' ? 'amber' : pl === 'medium' ? 'blue' : 'green'}
                    />
                    {risk ? (
                      <View style={styles.riskTag}>
                        <Ionicons name="sparkles" size={12} color={THEME.colors.accent} />
                        <Text style={styles.riskText}>{Math.round(item.delay_probability)}%</Text>
                      </View>
                    ) : null}
                  </View>
                </View>
              </Card>
            );
          }}
        />
      )}

      <Pressable style={styles.fab} onPress={() => navigation.navigate('TaskForm')}>
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
  task: { padding: 14 },
  taskHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  taskTitle: { fontSize: THEME.text.md, fontWeight: '700', flex: 1, marginRight: 8 },
  taskDesc: { color: THEME.colors.text.secondary, fontSize: THEME.text.sm, marginTop: 6 },
  taskMeta: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 },
  project: { color: THEME.colors.text.muted, fontSize: THEME.text.xs, flex: 1 },
  sideMeta: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  riskTag: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fdf4ff', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999 },
  riskText: { color: THEME.colors.accent, fontSize: THEME.text.xs, fontWeight: '700', marginLeft: 3 },
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
  createBtn: { marginTop: 16, backgroundColor: THEME.colors.brand[500], paddingHorizontal: 18, paddingVertical: 10, borderRadius: THEME.radii.md },
  createBtnText: { color: '#fff', fontWeight: '600' },
});