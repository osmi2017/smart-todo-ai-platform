import React, { useCallback, useState } from 'react';
import { KeyboardAvoidingView, Platform, RefreshControl, ScrollView, StyleSheet, Text, View, Alert } from 'react-native';
import { groupService } from '../../api/services';
import { useFetch, useMutation } from '../../hooks/useFetch';
import { Badge, Button, Card, EmptyState, ErrorBanner, Input, Loading } from '../../components/ui';
import { THEME } from '../../theme';

export default function Groups() {
  const fetcher = useCallback(() => groupService.list(), []);
  const { data, loading, refreshing, error, refresh, reload, setData } = useFetch(fetcher);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});

  const create = useMutation(
    () => groupService.create({ name }),
    (g) => {
      setData((l) => [...(l || []), g]);
      setShowForm(false);
      setName('');
    }
  );

  const remove = (g) => {
    Alert.alert('Supprimer', `Supprimer le groupe ${g.name} ?`, [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Supprimer',
        style: 'destructive',
        onPress: async () => {
          try {
            await groupService.remove(g.id);
            setData((l) => l.filter((x) => x.id !== g.id));
          } catch {
            Alert.alert('Erreur', 'Suppression impossible.');
          }
        },
      },
    ]);
  };

  const memberLabel = (g) => (g.members_count != null ? `${g.members_count} membre(s)` : g.members?.length ? `${g.members.length} membre(s)` : null);

  return (
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={THEME.colors.brand[500]} />
        }
        keyboardShouldPersistTaps="handled"
      >
        {error ? <ErrorBanner message="Impossible de charger les groupes." onRetry={reload} /> : null}

        {showForm ? (
          <Card>
            <Text style={styles.formTitle}>Nouveau groupe</Text>
            <Input label="Nom *" value={name} onChangeText={setName} error={(fieldErrors.name || []).join(' ')} />
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
            icon="👥"
            title="Aucun groupe"
            hint="Créez des groupes pour organiser vos équipes."
            action={<Button variant="secondary" title="+ Ajouter" size="sm" onPress={() => setShowForm(true)} />}
          />
        ) : (
          <>
            <View style={styles.toolbar}>
              <Text style={styles.count}>{(data || []).length} groupe(s)</Text>
              <Button variant="secondary" title="+ Ajouter" size="sm" onPress={() => setShowForm((s) => !s)} />
            </View>
            {(data || []).map((g) => (
              <Card key={g.id} style={styles.card}>
                <View style={styles.headerRow}>
                  <Text style={styles.name}>{g.name}</Text>
                  <Badge text={memberLabel(g) || 'Aucun membre'} color="blue" />
                </View>
                {g.company_name ? <Text style={styles.company}>{g.company_name}</Text> : null}
                <View style={styles.actions}>
                  <Button title="Supprimer" variant="danger" size="sm" onPress={() => remove(g)} />
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
  name: { fontSize: THEME.text.lg, fontWeight: '700', flex: 1, marginRight: 8 },
  company: { color: THEME.colors.text.muted, fontSize: THEME.text.xs, marginTop: 2 },
  actions: { marginTop: 12, alignSelf: 'flex-start' },
});