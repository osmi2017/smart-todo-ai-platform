import React, { useCallback, useState } from 'react';
import { KeyboardAvoidingView, Platform, RefreshControl, ScrollView, StyleSheet, Text, View, Alert } from 'react-native';
import { userService, companyService } from '../../api/services';
import { useAuth } from '../../context/AuthContext';
import { useFetch, useMutation } from '../../hooks/useFetch';
import { Avatar, Badge, Button, Card, EmptyState, ErrorBanner, Input, Loading, Select } from '../../components/ui';
import { THEME, ROLE_COLORS } from '../../theme';

const ROLE_OPTIONS = [
  { value: 'user', label: 'Utilisateur' },
  { value: 'admin', label: 'Admin' },
  { value: 'superadmin', label: 'Super Admin' },
];

export default function Users() {
  const { isSuperAdmin } = useAuth();
  const fetcher = useCallback(() => userService.list(), []);
  const { data, loading, refreshing, error, refresh, reload, setData } = useFetch(fetcher);
  const companiesFetch = useFetch(isSuperAdmin ? useCallback(() => companyService.list(), []) : () => Promise.resolve([]));

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ username: '', email: '', first_name: '', last_name: '', role: 'user', password: '' });
  const [company, setCompany] = useState(isSuperAdmin ? null : undefined);
  const [fieldErrors, setFieldErrors] = useState({});

  const create = useMutation(
    () => {
      const payload = { ...form };
      if (isSuperAdmin && company) payload.company = company;
      return userService.create(payload);
    },
    (u) => {
      setData((l) => [...(l || []), u]);
      setShowForm(false);
      setForm({ username: '', email: '', first_name: '', last_name: '', role: 'user', password: '' });
    }
  );

  const remove = (u) => {
    Alert.alert('Supprimer', `Supprimer ${u.username} ?`, [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Supprimer',
        style: 'destructive',
        onPress: async () => {
          try {
            await userService.remove(u.id);
            setData((l) => l.filter((x) => x.id !== u.id));
          } catch {
            Alert.alert('Erreur', 'Suppression impossible.');
          }
        },
      },
    ]);
  };

  const set = (key) => (value) => setForm((f) => ({ ...f, [key]: value }));

  return (
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={THEME.colors.brand[500]} />
        }
        keyboardShouldPersistTaps="handled"
      >
        {error ? <ErrorBanner message="Impossible de charger les utilisateurs." onRetry={reload} /> : null}

        {showForm ? (
          <Card>
            <Text style={styles.formTitle}>Nouvel utilisateur</Text>
            <Input label="Nom d'utilisateur *" value={form.username} onChangeText={set('username')} error={(fieldErrors.username || []).join(' ')} />
            <Input label="Email" value={form.email} onChangeText={set('email')} keyboardType="email-address" error={(fieldErrors.email || []).join(' ')} />
            <Input label="Prénom" value={form.first_name} onChangeText={set('first_name')} />
            <Input label="Nom" value={form.last_name} onChangeText={set('last_name')} />
            <Input label="Mot de passe *" value={form.password} onChangeText={set('password')} secureTextEntry error={(fieldErrors.password || []).join(' ')} />
            <Select
              label="Rôle"
              value={form.role}
              options={ROLE_OPTIONS}
              onChange={set('role')}
            />
            {isSuperAdmin ? (
              <Select
                label="Entreprise"
                placeholder="Choisir une entreprise"
                value={company}
                options={(companiesFetch.data || []).map((c) => ({ value: c.id, label: c.name }))}
                onChange={setCompany}
                error={(fieldErrors.company || []).join(' ')}
              />
            ) : null}
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
            icon="👤"
            title="Aucun utilisateur"
            action={<Button variant="secondary" title="+ Ajouter" size="sm" onPress={() => setShowForm(true)} />}
          />
        ) : (
          <>
            <View style={styles.toolbar}>
              <Text style={styles.count}>{(data || []).length} utilisateur(s)</Text>
              <Button variant="secondary" title="+ Ajouter" size="sm" onPress={() => setShowForm((s) => !s)} />
            </View>
            {(data || []).map((u) => (
              <Card key={u.id} style={styles.card}>
                <View style={styles.row}>
                  <Avatar name={[u.first_name, u.last_name].filter(Boolean).join(' ') || u.username} size={44} />
                  <View style={styles.info}>
                    <Text style={styles.name}>{u.username}</Text>
                    <Text style={styles.email}>{u.email || '—'}</Text>
                    <View style={styles.roleRow}>
                      <Badge text={u.role} color={u.role === 'superadmin' ? 'purple' : u.role === 'admin' ? 'orange' : 'green'} />
                      {u.company_detail ? <Badge text={u.company_detail.name} color="blue" /> : null}
                    </View>
                  </View>
                  <Button title="Supprimer" variant="danger" size="sm" onPress={() => remove(u)} />
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
  row: { flexDirection: 'row', alignItems: 'center' },
  info: { flex: 1, marginLeft: 12 },
  name: { fontWeight: '700', fontSize: THEME.text.md },
  email: { color: THEME.colors.text.muted, fontSize: THEME.text.xs, marginTop: 2 },
  roleRow: { flexDirection: 'row', gap: 6, marginTop: 6 },
});