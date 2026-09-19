import React, { useCallback, useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet } from 'react-native';
import { meetingService, projectService } from '../../api/services';
import { useFetch, useMutation } from '../../hooks/useFetch';
import { Button, ErrorBanner, Input, Loading, Select } from '../../components/ui';
import { THEME } from '../../theme';

const statusOptions = [
  { value: 'scheduled', label: 'Planifiée' },
  { value: 'in_progress', label: 'En cours' },
  { value: 'completed', label: 'Terminée' },
  { value: 'cancelled', label: 'Annulée' },
];

export default function MeetingForm({ route, navigation }) {
  const isEdit = !!route?.params?.id;
  const editId = route?.params?.id;

  const [form, setForm] = useState({
    title: '',
    description: '',
    scheduled_at: '',
    duration_minutes: '',
    status: 'scheduled',
  });
  const [project, setProject] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});

  const projectsFetch = useFetch(useCallback(() => projectService.list(), []));

  const existing = useFetch(
    useCallback(() => (isEdit ? meetingService.get(editId) : Promise.resolve(null)), [isEdit, editId]),
    [isEdit, editId]
  );

  useEffect(() => {
    if (existing.data) {
      const m = existing.data;
      setForm({
        title: m.title || '',
        description: m.description || '',
        scheduled_at: m.scheduled_at ? new Date(m.scheduled_at).toISOString().slice(0, 16) : '',
        duration_minutes: m.duration_minutes ? String(m.duration_minutes) : '',
        status: m.status || 'scheduled',
      });
      if (m.project) setProject(m.project);
    }
  }, [existing.data]);

  const save = useMutation(
    isEdit
      ? (payload) => meetingService.update(editId, payload)
      : (payload) => meetingService.create(payload),
    () => navigation.goBack()
  );

  const set = (key) => (value) => {
    if (key === 'project') {
      setProject(value);
      return;
    }
    setForm((f) => ({ ...f, [key]: value }));
  };

  const handleSubmit = async () => {
    const payload = {
      title: form.title,
      description: form.description,
      status: form.status,
      ...(form.scheduled_at ? { scheduled_at: new Date(form.scheduled_at).toISOString() } : {}),
      ...(form.duration_minutes ? { duration_minutes: Number(form.duration_minutes) } : {}),
      ...(project ? { project } : {}),
    };
    try {
      await save.run(payload);
    } catch (e) {
      setFieldErrors(e?.response?.data || {});
    }
  };

  const fe = (key) => (fieldErrors[key] || []).join(' ');

  if (isEdit && existing.loading && !existing.data) return <Loading />;

  return (
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {save.error ? <ErrorBanner message={isEdit ? 'Impossible de modifier la réunion.' : 'Impossible de créer la réunion.'} /> : null}
        <Input label="Titre *" value={form.title} onChangeText={set('title')} error={fe('title')} placeholder="Titre de la réunion" />
        <Input label="Description" multiline value={form.description} onChangeText={set('description')} error={fe('description')} />
        <Input label="Date et heure (AAAA-MM-JJTHH:MM)" value={form.scheduled_at} onChangeText={set('scheduled_at')} placeholder="2026-09-05T14:30" error={fe('scheduled_at')} />
        <Input label="Durée (minutes)" keyboardType="numeric" value={form.duration_minutes} onChangeText={set('duration_minutes')} />
        <Select
          label="Projet"
          placeholder="Aucun"
          value={project}
          options={(projectsFetch.data || []).map((p) => ({ value: p.id, label: p.name }))}
          onChange={set('project')}
        />
        <Select label="Statut" value={form.status} options={statusOptions} onChange={set('status')} />
        <Button title={isEdit ? 'Enregistrer les modifications' : 'Créer la réunion'} onPress={handleSubmit} loading={save.submitting} size="lg" style={styles.submit} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: THEME.colors.background },
  content: { padding: 16, paddingBottom: 40 },
  submit: { marginTop: 8 },
});