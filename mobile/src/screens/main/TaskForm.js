import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, Alert } from 'react-native';
import { projectService, taskService, userService } from '../../api/services';
import { useFetch, useMutation } from '../../hooks/useFetch';
import { Button, ErrorBanner, Input, Loading, Select } from '../../components/ui';
import { THEME, STATUS_LABELS, PRIORITY_LABELS } from '../../theme';

const EMPTY = {
  title: '',
  description: '',
  deadline: '',
  priority: 2,
  status: 'todo',
  estimated_time: '',
};

export default function TaskForm({ route, navigation }) {
  const editingId = route.params?.id;
  const [form, setForm] = useState(EMPTY);
  const [project, setProject] = useState(null);
  const [milestone, setMilestone] = useState(null);
  const [assignedTo, setAssignedTo] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});

  const projectsFetch = useFetch(useCallback(() => projectService.list(), []));
  const usersFetch = useFetch(useCallback(() => userService.list().catch(() => []), []));
  const taskFetch = useFetch(
    useCallback(() => (editingId ? taskService.get(editingId) : Promise.resolve(null)), [editingId]),
    [editingId]
  );

  const task = taskFetch.data;
  const [initialized, setInitialized] = useState(false);
  useEffect(() => {
    if (editingId && task && !initialized) {
      setForm({
        title: task.title || '',
        description: task.description || '',
        deadline: task.deadline ? String(task.deadline).slice(0, 10) : '',
        priority: task.priority ?? 2,
        status: task.status || 'todo',
        estimated_time: task.estimated_time != null ? String(task.estimated_time) : '',
      });
      if (task.project) setProject(task.project);
      if (task.milestone) setMilestone(task.milestone);
      if (task.assigned_to) setAssignedTo(task.assigned_to);
      setInitialized(true);
    }
  }, [editingId, task, initialized]);

  const milestones = useMemo(() => {
    if (!project || !projectsFetch.data) return [];
    const proj = projectsFetch.data.find((p) => p.id === project);
    return proj ? proj.milestones || [] : [];
  }, [project, projectsFetch.data]);

  const save = useMutation(editingId ? taskService.update.bind(null, editingId) : taskService.create, () =>
    navigation.goBack()
  );

  const editing = Boolean(editingId);

  const handleSubmit = async () => {
    setFieldErrors({});
    const payload = {
      title: form.title,
      description: form.description,
      priority: Number(form.priority),
      status: form.status,
      project,
      ...(milestone ? { milestone } : {}),
      ...(assignedTo ? { assigned_to: assignedTo } : { assigned_to: null }),
      ...(form.deadline ? { deadline: new Date(form.deadline).toISOString() } : {}),
      ...(form.estimated_time ? { estimated_time: Number(form.estimated_time) } : {}),
    };
    try {
      await save.run(payload);
    } catch (e) {
      setFieldErrors(e?.response?.data || {});
    }
  };

  if (taskFetch.loading && editingId) return <Loading />;

  const set = (key) => (value) => {
    if (key === 'project') {
      setProject(value);
      setMilestone(null);
      return;
    }
    setForm((f) => ({ ...f, [key]: value }));
  };

  const fe = (key) => (fieldErrors[key] || []).join(' ');
  const userOptions = (usersFetch.data || []).map((u) => ({
    value: u.id,
    label: [u.first_name, u.last_name].filter(Boolean).join(' ') || u.username,
  }));

  return (
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {save.error ? <ErrorBanner message="Impossible d'enregistrer la tâche." /> : null}
        <Input label="Titre *" value={form.title} onChangeText={set('title')} error={fe('title')} placeholder="Titre de la tâche" />
        <Input label="Description" multiline value={form.description} onChangeText={set('description')} error={fe('description')} />

        <Select
          label="Projet *"
          placeholder="Choisir un projet"
          value={project}
          options={(projectsFetch.data || []).map((p) => ({ value: p.id, label: p.name }))}
          onChange={set('project')}
          error={fe('project')}
        />

        {milestones.length > 0 || editing ? (
          <Select
            label="Jalon"
            placeholder="Aucun"
            value={milestone}
            options={milestones.map((m) => ({ value: m.id, label: m.name }))}
            onChange={set('milestone')}
          />
        ) : null}

        {userOptions.length ? (
          <Select
            label="Assigné à"
            placeholder="Non assigné"
            value={assignedTo}
            options={userOptions}
            onChange={setAssignedTo}
          />
        ) : null}

        <Select
          label="Priorité"
          value={form.priority}
          options={Object.entries(PRIORITY_LABELS).map(([k, v]) => ({ value: Number(k), label: v }))}
          onChange={set('priority')}
        />

        <Select
          label="Statut"
          value={form.status}
          options={Object.entries(STATUS_LABELS).map(([k, v]) => ({ value: k, label: v }))}
          onChange={set('status')}
        />

        <Input
          label="Échéance (AAAA-MM-JJ)"
          value={form.deadline}
          onChangeText={set('deadline')}
          placeholder="2026-09-30"
          error={fe('deadline')}
        />
        <Input
          label="Temps estimé (heures)"
          value={form.estimated_time}
          onChangeText={set('estimated_time')}
          keyboardType="numeric"
        />

        <Button title={editing ? 'Enregistrer' : 'Créer la tâche'} onPress={handleSubmit} loading={save.submitting} size="lg" style={styles.submit} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: THEME.colors.background },
  content: { padding: 16, paddingBottom: 40 },
  submit: { marginTop: 8 },
});