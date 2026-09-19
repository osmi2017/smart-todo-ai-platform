import React, { useCallback } from 'react';
import { ScrollView, StyleSheet, Text, View, Alert, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { taskService } from '../../api/services';
import { useFetch } from '../../hooks/useFetch';
import { Card, EmptyState, ErrorBanner, Loading } from '../../components/ui';
import { THEME, STATUS_LABELS, STATUS_COLORS } from '../../theme';

const ORDER = ['todo', 'in_progress', 'review', 'blocked', 'completed'];

export default function Kanban({ navigation }) {
  const fetcher = useCallback(() => taskService.list(), []);
  const { data, loading, error, reload, setData } = useFetch(fetcher);

  const move = async (task, nextStatus) => {
    if (task.status === nextStatus) return;
    setData((list) => list.map((t) => (t.id === task.id ? { ...t, status: nextStatus } : t)));
    try {
      await taskService.patch(task.id, { status: nextStatus });
    } catch {
      Alert.alert('Erreur', 'Mise à jour impossible.');
      reload();
    }
  };

  if (loading && !data) return <Loading />;
  if (error) return <ErrorBanner message="Impossible de charger le kanban." onRetry={reload} />;

  const tasks = data || [];

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.screen}>
      <View style={styles.board}>
        {ORDER.map((status) => {
          const column = tasks.filter((t) => t.status === status);
          return (
            <View key={status} style={styles.column}>
              <View style={styles.columnHeader}>
                <View style={[styles.dot, { backgroundColor: STATUS_COLORS[status] }]} />
                <Text style={styles.columnTitle}>{STATUS_LABELS[status]}</Text>
                <Text style={styles.count}>{column.length}</Text>
              </View>
              {column.length === 0 ? (
                <Text style={styles.emptyCol}>Aucune tâche</Text>
              ) : (
                column.map((t) => (
                  <Card key={t.id} style={styles.taskCard}>
                    <View style={styles.actionsRow}>
                      <Pressable
                        style={styles.arrowBtn}
                        onPress={() => {
                          const idx = ORDER.indexOf(status);
                          if (idx > 0) move(t, ORDER[idx - 1]);
                        }}
                      >
                        <Ionicons name="arrow-back" size={16} color={THEME.colors.text.secondary} />
                      </Pressable>
                      <Pressable style={styles.arrowBtn} onPress={() => navigation.navigate('TaskDetail', { id: t.id })}>
                        <Ionicons name="eye-outline" size={16} color={THEME.colors.brand[500]} />
                      </Pressable>
                      <Pressable
                        style={styles.arrowBtn}
                        onPress={() => {
                          const idx = ORDER.indexOf(status);
                          if (idx < ORDER.length - 1) move(t, ORDER[idx + 1]);
                        }}
                      >
                        <Ionicons name="arrow-forward" size={16} color={THEME.colors.text.secondary} />
                      </Pressable>
                    </View>
                    <Text numberOfLines={2} style={styles.taskTitle}>{t.title}</Text>
                    <Text style={styles.projectLabel}>{t.project_name}</Text>
                  </Card>
                ))
              )}
            </View>
          );
        })}
      </View>
      {(tasks || []).length === 0 ? (
        <View style={styles.fixedEmpty}>
          <EmptyState icon="🗂️" title="Aucune tâche sur le kanban" hint="Créez des tâches pour remplir le tableau." />
        </View>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: THEME.colors.background },
  board: { flexDirection: 'row', padding: 16, gap: 12 },
  column: { width: 260, backgroundColor: '#eef2f7', borderRadius: THEME.radii.lg, padding: 10 },
  columnHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  dot: { width: 10, height: 10, borderRadius: 5, marginRight: 8 },
  columnTitle: { fontWeight: '700', flex: 1 },
  count: { color: THEME.colors.text.muted, fontSize: THEME.text.sm, fontWeight: '700' },
  emptyCol: { color: THEME.colors.text.muted, fontSize: THEME.text.sm, textAlign: 'center', paddingVertical: 20 },
  taskCard: { padding: 12 },
  actionsRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  arrowBtn: { padding: 4 },
  taskTitle: { fontWeight: '600', fontSize: THEME.text.sm },
  projectLabel: { color: THEME.colors.text.muted, fontSize: THEME.text.xs, marginTop: 6 },
  fixedEmpty: { position: 'absolute', top: 0, left: 16, right: 16, bottom: 0 },
});