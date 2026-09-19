import React, { useCallback, useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { currencyService, missionService, projectService, userService } from '../../api/services';
import { useFetch, useMutation } from '../../hooks/useFetch';
import { Button, Card, ErrorBanner, Input, Loading, MultiSelect, Select } from '../../components/ui';
import { THEME } from '../../theme';
import { MISSION_STATUS_LABELS } from './Missions';

const STATUS_OPTIONS = Object.entries(MISSION_STATUS_LABELS).map(([value, label]) => ({ value, label }));

export default function MissionForm({ route, navigation }) {
  const id = route?.params?.id;
  const isEditing = Boolean(id);

  const [form, setForm] = useState({
    title: '',
    description: '',
    status: 'planned',
    destination_name: '',
    start_date: '',
    end_date: '',
    cost_per_diem: '',
    cost_accommodation: '',
    cost_transport: '',
    cost_other: '',
    currency: 'xof',
  });
  const [project, setProject] = useState(null);
  const [leader, setLeader] = useState(null);
  const [members, setMembers] = useState([]);
  const [fieldErrors, setFieldErrors] = useState({});

  const projectsFetch = useFetch(useCallback(() => projectService.list(), []));
  const currenciesFetch = useFetch(useCallback(() => currencyService.list(), []));
  const usersFetch = useFetch(useCallback(() => {
    return userService
      .list()
      .catch(() => []);
  }, []));

  const editFetch = useFetch(
    useCallback(() => (isEditing ? missionService.get(id) : Promise.resolve(null)), [id, isEditing]),
    [id, isEditing]
  );

  const mission = editFetch.data;
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    if (isEditing && mission && !initialized) {
      setForm({
        title: mission.title || '',
        description: mission.description || '',
        status: mission.status || 'planned',
        destination_name: mission.destination_name || '',
        start_date: mission.start_date || '',
        end_date: mission.end_date || '',
        cost_per_diem: mission.cost_per_diem != null ? String(mission.cost_per_diem) : '',
        cost_accommodation: mission.cost_accommodation != null ? String(mission.cost_accommodation) : '',
        cost_transport: mission.cost_transport != null ? String(mission.cost_transport) : '',
        cost_other: mission.cost_other != null ? String(mission.cost_other) : '',
        currency: mission.currency || 'xof',
      });
      if (mission.project) setProject(mission.project);
      const lead = mission.members?.find((m) => m.is_leader);
      if (lead) setLeader(lead.user);
      if (mission.members?.length) setMembers(mission.members.map((m) => m.user));
      setInitialized(true);
    }
  }, [isEditing, mission, initialized]);

  const set = (key) => (value) => setForm((f) => ({ ...f, [key]: value }));

  const submit = useMutation(
    () => {
      const costs = ['cost_per_diem', 'cost_accommodation', 'cost_transport', 'cost_other'].map((k) =>
        Math.max(0, Number(form[k]) || 0)
      );
      const payload = {
        title: form.title,
        description: form.description,
        status: form.status,
        destination_name: form.destination_name,
        destination_lat: null,
        destination_lng: null,
        distance_km: null,
        start_date: form.start_date || null,
        end_date: form.end_date || null,
        cost_per_diem: costs[0],
        cost_accommodation: costs[1],
        cost_transport: costs[2],
        cost_other: costs[3],
        currency: form.currency,
        project: project || null,
        member_ids: members,
        leader_id: leader || null,
      };
      return isEditing ? missionService.update(id, payload) : missionService.create(payload);
    },
    () => navigation.goBack()
  );

  const loading = isEditing && editFetch.loading && !editFetch.data;
  if (loading) return <Loading />;
  if (editFetch.error) return <ErrorBanner message="Impossible de charger la mission." onRetry={editFetch.reload} />;

  const userOptions = (usersFetch.data || []).map((u) => ({
    value: u.id,
    label: [u.first_name, u.last_name].filter(Boolean).join(' ') || u.username,
  }));
  const currencyOptions = Object.entries(currenciesFetch.data || {}).map(([code, name]) => ({ value: code, label: `${code.toUpperCase()} — ${name}` }));

  return (
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Card>
          <Text style={styles.formTitle}>{isEditing ? 'Modifier la mission' : 'Nouvelle mission'}</Text>
          <Input label="Titre *" value={form.title} onChangeText={set('title')} error={(fieldErrors.title || []).join(' ')} />
          <Input label="Description" value={form.description} onChangeText={set('description')} multiline error={(fieldErrors.description || []).join(' ')} />
          <Input label="Destination *" value={form.destination_name} onChangeText={set('destination_name')} error={(fieldErrors.destination_name || []).join(' ')} />
          {isEditing ? (
            <Select label="Statut" value={form.status} options={STATUS_OPTIONS} onChange={set('status')} />
          ) : null}
          <Input label="Départ (AAAA-MM-JJ) *" value={form.start_date} onChangeText={set('start_date')} error={(fieldErrors.start_date || []).join(' ')} />
          <Input label="Retour (AAAA-MM-JJ)" value={form.end_date} onChangeText={set('end_date')} />
          <Select
            label="Devise"
            value={form.currency}
            options={currencyOptions.length ? currencyOptions : [{ value: form.currency, label: form.currency.toUpperCase() }]}
            onChange={set('currency')}
          />
        </Card>

        <Card>
          <Text style={styles.formTitle}>Coûts</Text>
          <Input label="Frais de mission / jour" value={form.cost_per_diem} onChangeText={set('cost_per_diem')} keyboardType="numeric" />
          <Input label="Hébergement / nuit" value={form.cost_accommodation} onChangeText={set('cost_accommodation')} keyboardType="numeric" />
          <Input label="Transport" value={form.cost_transport} onChangeText={set('cost_transport')} keyboardType="numeric" />
          <Input label="Autres frais" value={form.cost_other} onChangeText={set('cost_other')} keyboardType="numeric" />
        </Card>

        <Card>
          <Text style={styles.formTitle}>Projet & équipe</Text>
          <Select
            label="Projet lié"
            placeholder="Aucun projet"
            value={project}
            options={(projectsFetch.data || []).map((p) => ({ value: p.id, label: p.name }))}
            onChange={setProject}
          />
          <Select
            label="Chef de mission"
            placeholder="Aucun"
            value={leader}
            options={userOptions}
            onChange={(v) => {
              setLeader(v);
              setMembers((m) => (v && !m.includes(v) ? [...m, v] : m));
            }}
          />
          <MultiSelect
            label="Membres"
            placeholder="Sélectionner les membres"
            values={members}
            options={userOptions}
            onChange={setMembers}
          />
        </Card>

        {Object.keys(fieldErrors).length ? (
          <ErrorBanner message="Vérifiez les champs en rouge." onRetry={() => setFieldErrors({})} />
        ) : null}

        <Button
          title={isEditing ? 'Enregistrer' : 'Créer la mission'}
          loading={submit.submitting}
          onPress={() =>
            submit
              .run()
              .catch((e) => setFieldErrors(e?.response?.data || { non_field_errors: ['Création impossible.'] }))
          }
          style={styles.submit}
        />
        <Button title="Annuler" variant="outline" onPress={() => navigation.goBack()} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: THEME.colors.background },
  content: { padding: 16, paddingBottom: 40 },
  formTitle: { fontSize: THEME.text.lg, fontWeight: '700', marginBottom: 12 },
  submit: { marginTop: 4, marginBottom: 10 },
});