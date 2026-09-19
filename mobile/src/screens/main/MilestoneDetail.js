import React, { useCallback, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { milestoneService, taskService } from '../../api/services';
import { useFetch, useMutation } from '../../hooks/useFetch';
import { Badge, Button, Card, EmptyState, ErrorBanner, Input, Loading, Select } from '../../components/ui';
import { THEME, STATUS_LABELS } from '../../theme';

const MILESTONE_STATUS = {
  not_started: 'Pas commencé',
  in_progress: 'En cours',
  completed: 'Terminé',
  delayed: 'En retard',
};

const STATUS_OPTIONS = Object.entries(MILESTONE_STATUS).map(([value, label]) => ({ value, label }));

const colorFor = {
  not_started: 'gray',
  in_progress: 'amber',
  completed: 'green',
  delayed: 'red',
};

export default function MilestoneDetail({ route, navigation }) {
  const { id } = route.params;
  const fetcher = useCallback(() => milestoneService.get(id), [id]);
  const { data: m, loading, error, reload, setData } = useFetch(fetcher, [id]);

  const tasksFetch = useFetch(useCallback(() => taskService.list({ milestone: id }), [id]));

  const [editing, setEditing] = useState(false);
  const [name, setName] = useState('');
  const [status, setStatus] = useState('not_started');
  const [progress, setProgress] = useState('0');

  const save = useMutation(
    async () => {
      await milestoneService.update(id, {
        name,
        status,
        progress: Math.min(100, Math.max(0, Number(progress) || 0)),
      });
      const fresh = await milestoneService.get(id);
      setData(fresh);
      setEditing(false);
    },
    async () => {}
  );

  const predict = useMutation(milestoneService.predictRisk, (res) => {
    const fresh = { ...m, risk_score: res.risk_score ?? res.risk_prediction ?? m.risk_score };
    setData(fresh);
  });

  const remove = () => {
    Alert.alert('Supprimer le jalon', 'Cette action est irréversible.', [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Supprimer',
        style: 'destructive',
        onPress: async () => {
          try {
            await milestoneService.remove(id);
            navigation.goBack();
          } catch {
            Alert.alert('Erreur', 'Suppression impossible.');
          }
        },
      },
    ]);
  };

  if (loading && !m) return <Loading />;
  if (error) return <ErrorBanner message="Impossible de charger le jalon." onRetry={reload} />;
  if (!m) return null;

  const riskColor = (r) => (r >= 70 ? 'red' : r >= 40 ? 'amber' : 'green');

  return (
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.headerRow}>
          <Text style={styles.title}>{m.name}</Text>
          <Badge text={MILESTONE_STATUS[m.status]} color={colorFor[m.status]} />
        </View>
        <Text style={styles.project}>{m.project_name}</Text>
        {m.description ? <Text style={styles.desc}>{m.description}</Text> : null}

        <View style={styles.metaRow}>
          {m.due_date ? (
            <Badge text={`Échéance : ${new Date(m.due_date).toLocaleDateString('fr-FR')}`} color={m.status === 'delayed' ? 'red' : 'amber'} />
          ) : null}
          <Badge text={`${m.completed_task_count ?? 0}/${m.task_count ?? 0} tâches`} color="gray" />
        </View>

        <Card>
          <View style={styles.progressHeader}>
            <Text style={styles.cardTitle}>Progression</Text>
            <Text style={styles.progressPct}>{m.progress || 0}%</Text>
          </View>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${Math.min(100, m.progress || 0)}%` }]} />
          </View>
        </Card>

        {m.risk_score != null ? (
          <Card style={styles.riskCard}>
            <Text style={styles.riskTitle}>⚠️ Risque estimé</Text>
            <Text style={styles.riskValue}>{Math.round(m.risk_score)}%</Text>
            <Button
              variant="secondary"
              title="Recalculer le risque IA"
              size="sm"
              loading={predict.submitting}
              onPress={() => predict.run(id).catch(() => Alert.alert('Erreur', 'Prédiction indisponible.'))}
              style={styles.riskBtn}
            />
          </Card>
        ) : (
          <Button
            variant="secondary"
            title="Estimer le risque IA"
            loading={predict.submitting}
            onPress={() => predict.run(id).catch(() => Alert.alert('Erreur', 'Prédiction indisponible.'))}
          />
        )}

        {editing ? (
          <Card>
            <Text style={styles.cardTitle}>Modifier le jalon</Text>
            <Input label="Nom" value={name} onChangeText={setName} />
            <Select label="Statut" value={status} options={STATUS_OPTIONS} onChange={setStatus} />
            <Input label="Progression (%)" value={progress} onChangeText={setProgress} keyboardType="numeric" />
            <Button title="Enregistrer" loading={save.submitting} onPress={() => save.run().catch(() => Alert.alert('Erreur', 'Enregistrement impossible.'))} style={styles.editBtn} />
            <Button title="Annuler" variant="outline" onPress={() => setEditing(false)} />
          </Card>
        ) : null}

        <Text style={styles.sectionTitle}>Tâches du jalon</Text>
        {tasksFetch.loading && !tasksFetch.data ? (
          <Loading />
        ) : (tasksFetch.data || []).length === 0 ? (
          <EmptyState icon="🧩" title="Aucune tâche" hint="Ce jalon n'a pas encore de tâches." />
        ) : (
          (tasksFetch.data || []).map((t) => (
            <Card key={t.id} style={styles.taskCard} onPress={() => navigation.navigate('TaskDetail', { id: t.id })}>
              <Text numberOfLines={1} style={styles.taskTitle}>{t.title}</Text>
              <View style={styles.taskMeta}>
                <Badge text={STATUS_LABELS[t.status] || t.status} color="gray" />
                {t.assigned_to_name ? <Text style={styles.taskAssigned}>{t.assigned_to_name}</Text> : null}
              </View>
            </Card>
          ))
        )}

        <View style={styles.footerRow}>
          <Button
            title="Modifier"
            variant="secondary"
            onPress={() => {
              setName(m.name);
              setStatus(m.status);
              setProgress(String(m.progress || 0));
              setEditing((s) => !s);
            }}
            style={styles.flex}
          />
          <Button title="Supprimer" variant="danger" onPress={remove} style={styles.flex} />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: THEME.colors.background },
  content: { padding: 16, paddingBottom: 40 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { fontSize: THEME.text.xxl, fontWeight: '800', color: THEME.colors.text.primary, flex: 1, marginRight: 10 },
  project: { color: THEME.colors.text.secondary, marginTop: 6, fontSize: THEME.text.sm },
  desc: { marginTop: 14, fontSize: THEME.text.md, color: THEME.colors.text.primary, lineHeight: 22 },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 14 },
  progressHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  cardTitle: { fontSize: THEME.text.lg, fontWeight: '700' },
  progressPct: { fontSize: THEME.text.lg, fontWeight: '800', color: THEME.colors.brand[600] },
  progressTrack: { height: 8, backgroundColor: THEME.colors.border, borderRadius: 4, overflow: 'hidden' },
  progressFill: { height: 8, borderRadius: 4, backgroundColor: THEME.colors.brand[500] },
  riskCard: { backgroundColor: '#faf5ff', borderColor: '#f3e8ff' },
  riskTitle: { fontWeight: '700', color: '#7c3aed' },
  riskValue: { fontSize: THEME.text.xxl, fontWeight: '800', color: THEME.colors.accent, marginTop: 2 },
  riskBtn: { marginTop: 10 },
  editBtn: { marginBottom: 10, marginTop: 4 },
  sectionTitle: { fontSize: THEME.text.lg, fontWeight: '700', marginTop: 20, marginBottom: 10 },
  taskCard: { padding: 14 },
  taskTitle: { fontSize: THEME.text.md, fontWeight: '600' },
  taskMeta: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 },
  taskAssigned: { color: THEME.colors.text.secondary, fontSize: THEME.text.xs },
  footerRow: { flexDirection: 'row', gap: 10, marginTop: 24 },
  flex: { flex: 1 },
});