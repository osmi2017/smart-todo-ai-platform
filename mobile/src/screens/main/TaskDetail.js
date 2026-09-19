import React, { useCallback, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View, Alert } from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { projectService, taskService } from '../../api/services';
import { useFetch, useMutation } from '../../hooks/useFetch';
import { Badge, Button, Card, ErrorBanner, Input, Loading } from '../../components/ui';
import TaskComments from '../../components/TaskComments';
import { THEME, STATUS_LABELS, STATUS_COLORS, PRIORITY_LABELS, PRIORITY_COLORS } from '../../theme';

function prioColor(p) {
  return { 1: 'green', 2: 'blue', 3: 'amber', 4: 'red' }[p] || 'gray';
}

export default function TaskDetail({ route, navigation }) {
  const { id } = route.params;
  const { user } = useAuth();

  const fetcher = useCallback(() => taskService.get(id), [id]);
  const { data: task, loading, error, reload, setData } = useFetch(fetcher, [id]);
  const [predicting, setPredicting] = useState(false);
  const predict = useMutation(taskService.predict, (res) => {
    setData((t) => ({
      ...t,
      predicted_time: res.predicted_time ?? t.predicted_time,
      delay_probability: res.delay_probability ?? t.delay_probability,
      predicted_priority: res.predicted_priority ?? t.predicted_priority,
    }));
  });

  const changeStatus = async (status) => {
    try {
      const updated = await taskService.patch(id, { status });
      setData((t) => ({ ...t, ...updated }));
    } catch {
      Alert.alert('Erreur', 'Impossible de mettre à jour le statut.');
    }
  };

  const deleteTask = () => {
    Alert.alert('Supprimer la tâche', 'Cette action est irréversible.', [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Supprimer',
        style: 'destructive',
        onPress: async () => {
          try {
            await taskService.remove(id);
            navigation.goBack();
          } catch {
            Alert.alert('Erreur', 'Suppression impossible.');
          }
        },
      },
    ]);
  };

  const canDelete = user?.role === 'superadmin' || task?.created_by === user?.id || task?.assigned_to === user?.id;

  if (loading && !task) return <Loading />;
  if (error) return <ErrorBanner message="Impossible de charger la tâche." onRetry={reload} />;
  if (!task) return null;

  const pl = { 1: 'low', 2: 'medium', 3: 'high', 4: 'critical' }[task.priority];

  return (
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.headerRow}>
          <Text style={styles.title}>{task.title}</Text>
          <Badge text={STATUS_LABELS[task.status]} color="blue" />
        </View>
        <Text style={styles.project}>{task.project_name} · {task.milestone_name ? `Jalon: ${task.milestone_name}` : ''}</Text>

        {task.description ? <Text style={styles.desc}>{task.description}</Text> : null}

        <View style={styles.badges}>
          <Badge text={PRIORITY_LABELS[pl]} color={prioColor(task.priority)} />
          <Badge text={`Assigné à : ${task.assigned_to_name || '—'}`} color="purple" />
          {task.deadline ? (
            <Badge text={`Échéance : ${new Date(task.deadline).toLocaleDateString('fr-FR')}`} color={task.is_delayed ? 'red' : 'amber'} />
          ) : null}
        </View>

        {task.estimated_time ? <Text style={styles.metaText}>Temps estimé : {task.estimated_time} h</Text> : null}
        {task.tags && task.tags.length ? <Text style={styles.metaText}>Tags : {task.tags.join(', ')}</Text> : null}

        <Card style={styles.aiCard}>
          <Text style={styles.aiTitle}>🤖 Prédiction IA</Text>
          {task.delay_probability !== null && task.delay_probability !== undefined ? (
            <View style={styles.aiRow}>
              <Text style={styles.aiVal}>{Math.round(task.delay_probability)}%</Text>
              <Text style={styles.aiLabel}>probabilité de retard</Text>
              <Text style={styles.aiTime}>
                {task.predicted_time != null ? `· estimé ${task.predicted_time} h` : ''}
              </Text>
            </View>
          ) : (
            <Text style={styles.aiHint}>Aucune prédiction pour le moment.</Text>
          )}
          <Button
            variant="secondary"
            title="Prédire le délai / le risque"
            size="sm"
            loading={predicting}
            onPress={async () => {
              setPredicting(true);
              try {
                await predict.run(id);
              } catch {
                Alert.alert('Erreur', 'Prédiction indisponible.');
              } finally {
                setPredicting(false);
              }
            }}
            style={styles.fixBtn}
          />
        </Card>

        <Text style={styles.section}>Changer le statut</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.statusRow}>
            {Object.keys(STATUS_LABELS).map((s) => (
              <Badge
                key={s}
                text={STATUS_LABELS[s]}
                color={task.status === s ? 'blue' : 'gray'}
                style={styles.statusPill}
              />
            ))}
          </View>
        </ScrollView>
        <View style={styles.statusBtnRow}>
          {Object.keys(STATUS_LABELS).map((s) => (
            <Button
              key={s}
              title={STATUS_LABELS[s]}
              size="sm"
              variant={task.status === s ? 'primary' : 'outline'}
              onPress={() => changeStatus(s)}
              style={styles.statusBtn}
            />
          ))}
        </View>

        <View style={styles.footerBtnRow}>
          <Button title="Modifier" variant="secondary" onPress={() => navigation.navigate('TaskForm', { id })} style={styles.flex} />
          {canDelete ? <Button title="Supprimer" variant="danger" onPress={deleteTask} style={styles.flex} /> : null}
        </View>

        <TaskComments taskId={id} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: THEME.colors.background },
  content: { padding: 16, paddingBottom: 40 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { fontSize: THEME.text.xxl, fontWeight: '800', color: THEME.colors.text.primary, flex: 1, marginRight: 10 },
  project: { color: THEME.colors.text.secondary, marginTop: 8, fontSize: THEME.text.sm },
  desc: { marginTop: 14, fontSize: THEME.text.md, color: THEME.colors.text.primary, lineHeight: 22 },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 14 },
  metaText: { marginTop: 8, color: THEME.colors.text.secondary, fontSize: THEME.text.sm },
  aiCard: { marginTop: 16, backgroundColor: '#faf5ff', borderColor: '#f3e8ff' },
  aiTitle: { fontWeight: '700', marginBottom: 4, color: '#7c3aed' },
  aiRow: { flexDirection: 'row', alignItems: 'baseline', flexWrap: 'wrap' },
  aiVal: { fontSize: THEME.text.xxl, fontWeight: '800', color: THEME.colors.accent },
  aiLabel: { color: THEME.colors.text.secondary, fontSize: THEME.text.sm, marginLeft: 6 },
  aiTime: { color: THEME.colors.text.secondary, fontSize: THEME.text.sm, marginLeft: 6 },
  aiHint: { color: THEME.colors.text.secondary, fontSize: THEME.text.sm },
  fixBtn: { marginTop: 12, alignSelf: 'flex-start' },
  section: { fontSize: THEME.text.lg, fontWeight: '700', marginTop: 20, marginBottom: 10 },
  statusRow: { marginBottom: 10 },
  statusPill: { marginRight: 8 },
  statusBtnRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  statusBtn: { flexGrow: 1 },
  footerBtnRow: { flexDirection: 'row', gap: 10, marginTop: 28 },
  flex: { flex: 1 },
});