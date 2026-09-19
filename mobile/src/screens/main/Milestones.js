import React, { useCallback, useState } from 'react';
import { KeyboardAvoidingView, Platform, RefreshControl, ScrollView, StyleSheet, Text, View, Alert } from 'react-native';
import { milestoneService, projectService } from '../../api/services';
import { useFetch, useMutation } from '../../hooks/useFetch';
import { Badge, Button, Card, ErrorBanner, EmptyState, Input, Loading, Pill, Select } from '../../components/ui';
import { THEME } from '../../theme';

const MSTATUS = {
  not_started: 'Pas commencé',
  in_progress: 'En cours',
  completed: 'Terminé',
  delayed: 'En retard',
};

const STATUS_OPTIONS = Object.entries(MSTATUS).map(([value, label]) => ({ value, label }));

const FILTERS = [
  { key: 'all', label: 'Tous' },
  { key: 'not_started', label: 'Pas commencés' },
  { key: 'in_progress', label: 'En cours' },
  { key: 'completed', label: 'Terminés' },
  { key: 'delayed', label: 'En retard' },
];

const colorFor = {
  not_started: 'gray',
  in_progress: 'amber',
  completed: 'green',
  delayed: 'red',
};

export default function Milestones({ navigation }) {
  const fetcher = useCallback(() => milestoneService.list(), []);
  const { data, loading, refreshing, error, refresh, reload, setData } = useFetch(fetcher);
  const [showForm, setShowForm] = useState(false);
  const [filter, setFilter] = useState('all');
  const [name, setName] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [project, setProject] = useState(null);
  const [status, setStatus] = useState('not_started');
  const [progress, setProgress] = useState('0');
  const projectsFetch = useFetch(useCallback(() => projectService.list(), []));

  const create = useMutation(
    () =>
      milestoneService.create({
        name,
        project,
        status,
        progress: Math.min(100, Math.max(0, Number(progress) || 0)),
        ...(dueDate ? { due_date: new Date(dueDate).toISOString() } : {}),
      }),
    (m) => {
      setData((l) => [m, ...(l || [])]);
      setShowForm(false);
      setName('');
      setDueDate('');
      setProject(null);
      setStatus('not_started');
      setProgress('0');
    }
  );

  const remove = (m) => {
    Alert.alert('Supprimer le jalon', `Supprimer « ${m.name} » ?`, [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Supprimer',
        style: 'destructive',
        onPress: async () => {
          try {
            await milestoneService.remove(m.id);
            setData((l) => (l || []).filter((x) => x.id !== m.id));
          } catch {
            Alert.alert('Erreur', 'Suppression impossible.');
          }
        },
      },
    ]);
  };

  const riskColor = (r) => (r >= 70 ? 'red' : r >= 40 ? 'amber' : 'green');
  const list = (data || []).filter((m) => filter === 'all' || m.status === filter);

  return (
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        style={styles.screen}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={THEME.colors.brand[500]} />
        }
        keyboardShouldPersistTaps="handled"
      >
        {error ? <ErrorBanner message="Impossible de charger les jalons." onRetry={reload} /> : null}
        {loading && !data ? <Loading /> : null}

        <View style={styles.pillRow}>
          {FILTERS.map((f) => (
            <Pill key={f.key} selected={filter === f.key} onPress={() => setFilter(f.key)}>
              {f.label}
            </Pill>
          ))}
        </View>

        {showForm ? (
          <Card>
            <Text style={styles.formTitle}>Nouveau jalon</Text>
            <Input label="Nom *" value={name} onChangeText={setName} />
            <Input label="Échéance (AAAA-MM-JJ)" value={dueDate} onChangeText={setDueDate} />
            <Select
              label="Projet *"
              placeholder="Choisir un projet"
              value={project}
              options={(projectsFetch.data || []).map((p) => ({ value: p.id, label: p.name }))}
              onChange={setProject}
            />
            <Select label="Statut" value={status} options={STATUS_OPTIONS} onChange={setStatus} />
            <Input label="Progression (%)" value={progress} onChangeText={setProgress} keyboardType="numeric" />
            <Button title="Créer" loading={create.submitting} onPress={() => create.run().catch(() => null)} style={styles.formBtn} />
          </Card>
        ) : null}

        {list.length === 0 && !loading ? (
          <EmptyState
            icon="🎯"
            title={filter === 'all' ? 'Aucun jalon' : 'Aucun jalon dans ce statut'}
            hint="Les jalons découpent vos projets en étapes clés."
            action={
              <Button variant="secondary" title="+ Ajouter un jalon" size="sm" onPress={() => setShowForm(true)} style={styles.formBtn} />
            }
          />
        ) : (
          <>
            <View style={styles.toolbar}>
              <Text style={styles.count}>{list.length} jalon(s)</Text>
              <Button variant="secondary" title="+ Ajouter" size="sm" onPress={() => setShowForm((s) => !s)} />
            </View>
            {list.map((m) => (
              <Card key={m.id} style={styles.card} onPress={() => navigation.navigate('MilestoneDetail', { id: m.id })}>
                <View style={styles.headerRow}>
                  <Text numberOfLines={1} style={styles.title}>{m.name}</Text>
                  <Badge text={MSTATUS[m.status] || m.status} color={colorFor[m.status]} />
                </View>
                <Text style={styles.project}>{m.project_name}</Text>
                <View style={styles.metaRow}>
                  <Badge text={`${m.progress || 0}%`} color="blue" />
                  <Badge text={`${m.completed_task_count ?? 0}/${m.task_count ?? 0} tâches`} color="gray" />
                  {m.due_date ? <Badge text={new Date(m.due_date).toLocaleDateString('fr-FR')} color="amber" /> : null}
                  {m.risk_score != null ? <Badge text={`Risque ${Math.round(m.risk_score)}%`} color={riskColor(m.risk_score)} /> : null}
                </View>
                <View style={styles.cardActions}>
                  <Button
                    title="Supprimer"
                    variant="danger"
                    size="sm"
                    onPress={() => remove(m)}
                    style={styles.cardDelete}
                  />
                </View>
              </Card>
            ))}
          </>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: THEME.colors.background },
  content: { padding: 16, paddingBottom: 40 },
  formTitle: { fontSize: THEME.text.lg, fontWeight: '700', marginBottom: 12 },
  formBtn: { marginTop: 4 },
  toolbar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  count: { color: THEME.colors.text.secondary },
  card: { padding: 14 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontSize: THEME.text.md, fontWeight: '700', flex: 1, marginRight: 8 },
  project: { color: THEME.colors.text.secondary, fontSize: THEME.text.sm, marginTop: 4 },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },
  pillRow: { flexDirection: 'row', marginBottom: 16 },
  cardActions: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 10 },
  cardDelete: { alignSelf: 'flex-start' },
});