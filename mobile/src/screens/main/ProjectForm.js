import React, { useCallback, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet } from 'react-native';
import { projectService } from '../../api/services';
import { useFetch, useMutation } from '../../hooks/useFetch';
import { Button, ErrorBanner, Input, Loading } from '../../components/ui';
import { THEME } from '../../theme';

export default function ProjectForm({ route, navigation }) {
  const id = route.params?.id;
  const [form, setForm] = useState({
    name: '',
    description: '',
    color: '#3b5bdb',
    start_date: '',
    deadline: '',
  });
  const [fieldErrors, setFieldErrors] = useState({});

  const fetcher = useCallback(() => (id ? projectService.get(id) : Promise.resolve(null)), [id]);
  const { data: existing, loading } = useFetch(fetcher, [id]);

  const save = useMutation(id ? projectService.update.bind(null, id) : projectService.create, () =>
    navigation.goBack()
  );

  if (loading && id) return <Loading />;
  const initial = existing || {};
  const set = (key) => (value) => setForm((f) => ({ ...f, [key]: value }));

  const handleSubmit = async () => {
    const val = form.name || initial.name;
    if (!val) {
      setFieldErrors({ name: ['Le nom est requis.'] });
      return;
    }
    const payload = {
      name: val,
      description: form.description !== undefined ? form.description || '' : initial.description || '',
      color: form.color || initial.color || '#3b5bdb',
      start_date: form.start_date || initial.start_date || null,
      deadline: form.deadline || initial.deadline || null,
    };
    try {
      await save.run(payload);
    } catch (e) {
      setFieldErrors(e?.response?.data || {});
    }
  };

  const fe = (key) => (fieldErrors[key] || []).join(' ');

  return (
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {save.error ? <ErrorBanner message="Impossible d'enregistrer le projet." /> : null}
        <Input label="Nom du projet *" value={form.name || initial.name || ''} onChangeText={set('name')} error={fe('name')} />
        <Input label="Description" multiline value={form.description ?? initial.description ?? ''} onChangeText={set('description')} error={fe('description')} />
        <Input label="Date de début (AAAA-MM-JJ)" value={form.start_date || initial.start_date || ''} onChangeText={set('start_date')} />
        <Input label="Échéance (AAAA-MM-JJ)" value={form.deadline || initial.deadline || ''} onChangeText={set('deadline')} />
        <Input label="Couleur (hex)" value={form.color || initial.color || '#3b5bdb'} onChangeText={set('color')} />
        <Button title={id ? 'Enregistrer' : 'Créer le projet'} onPress={handleSubmit} loading={save.submitting} size="lg" style={styles.submit} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: THEME.colors.background },
  content: { padding: 16, paddingBottom: 40 },
  submit: { marginTop: 8 },
});