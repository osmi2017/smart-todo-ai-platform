import React, { useCallback, useState } from 'react';
import { KeyboardAvoidingView, Platform, RefreshControl, ScrollView, StyleSheet, Text, View, Alert } from 'react-native';
import { companyService } from '../../api/services';
import { useFetch, useMutation } from '../../hooks/useFetch';
import { Badge, Button, Card, EmptyState, ErrorBanner, Input, Loading } from '../../components/ui';
import { THEME } from '../../theme';

export default function Companies() {
  const fetcher = useCallback(() => companyService.list(), []);
  const { data, loading, refreshing, error, refresh, reload, setData } = useFetch(fetcher);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [storageTier, setStorageTier] = useState('1GB');
  const [fieldErrors, setFieldErrors] = useState({});

  const create = useMutation(
    () => companyService.create({ name, slug: slug || undefined, description, storage_tier: storageTier }),
    (c) => {
      setData((l) => [...(l || []), c]);
      setShowForm(false);
      setName('');
      setSlug('');
      setDescription('');
    }
  );

  const remove = (c) => {
    Alert.alert('Supprimer', `Supprimer ${c.name} ?`, [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Supprimer',
        style: 'destructive',
        onPress: async () => {
          try {
            await companyService.remove(c.id);
            setData((l) => l.filter((x) => x.id !== c.id));
          } catch {
            Alert.alert('Erreur', 'Suppression impossible.');
          }
        },
      },
    ]);
  };

  return (
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={THEME.colors.brand[500]} />
        }
        keyboardShouldPersistTaps="handled"
      >
        {error ? <ErrorBanner message="Impossible de charger les entreprises." onRetry={reload} /> : null}

        {showForm ? (
          <Card>
            <Text style={styles.formTitle}>Nouvelle entreprise</Text>
            <Input label="Nom *" value={name} onChangeText={setName} error={(fieldErrors.name || []).join(' ')} />
            <Input label="Slug" value={slug} onChangeText={setSlug} placeholder="auto-généré" />
            <Input label="Description" multiline value={description} onChangeText={setDescription} />
            <Button
              title="Créer"
              loading={create.submitting}
              onPress={async () => {
                try {
                  await create.run();
                } catch (e) {
                  setFieldErrors(e?.response?.data || {});
                }
              }}
            />
          </Card>
        ) : null}

        {loading && !data ? (
          <Loading />
        ) : (data || []).length === 0 ? (
          <EmptyState
            icon="🏢"
            title="Aucune entreprise"
            hint="Créez la première entreprise."
            action={<Button variant="secondary" title="+ Ajouter" size="sm" onPress={() => setShowForm(true)} />}
          />
        ) : (
          <>
            <View style={styles.toolbar}>
              <Text style={styles.count}>{(data || []).length} entreprise(s)</Text>
              <Button variant="secondary" title="+ Ajouter" size="sm" onPress={() => setShowForm((s) => !s)} />
            </View>
            {(data || []).map((c) => (
              <Card key={c.id} style={styles.card}>
                <View style={styles.headerRow}>
                  <Text style={styles.name}>{c.name}</Text>
                  <Badge text={c.is_active === false ? 'Inactive' : 'Active'} color={c.is_active === false ? 'gray' : 'green'} />
                </View>
                <Text style={styles.slug}>{c.slug}</Text>
                {c.description ? <Text numberOfLines={2} style={styles.desc}>{c.description}</Text> : null}
                <View style={styles.metaRow}>
                  <Badge text={`${c.user_count ?? 0} utilisateurs`} color="blue" />
                  <Badge text={c.storage_tier || '—'} color="purple" />
                </View>
                <View style={styles.actions}>
                  <Button title="Supprimer" variant="danger" size="sm" onPress={() => remove(c)} />
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
  toolbar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  count: { color: THEME.colors.text.secondary },
  card: { padding: 14 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  name: { fontSize: THEME.text.lg, fontWeight: '700', flex: 1 },
  slug: { color: THEME.colors.text.muted, fontSize: THEME.text.xs, marginTop: 2 },
  desc: { color: THEME.colors.text.secondary, fontSize: THEME.text.sm, marginTop: 8 },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },
  actions: { marginTop: 12, alignSelf: 'flex-start' },
});