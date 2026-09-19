import React, { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, Text, View, Alert, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { projectService, milestoneService, taskService, userService } from '../../api/services';
import { useFetch } from '../../hooks/useFetch';
import { Badge, Button, Card, ErrorBanner, Loading, Select } from '../../components/ui';
import { THEME } from '../../theme';

export default function ProjectDetail({ route, navigation }) {
  const { id } = route.params;
  const fetcher = useCallback(() => projectService.get(id), [id]);
  const { data: project, loading, error, reload, setData } = useFetch(fetcher, [id]);

  const tasksFetch = useFetch(useCallback(() => taskService.list({ project: id }), [id]));
  const milestonesFetch = useFetch(useCallback(() => milestoneService.list().then((l) => l.filter((m) => m.project === id)), [id]));
  const usersFetch = useFetch(useCallback(() => userService.list().catch(() => []), []));
  const [memberToAdd, setMemberToAdd] = useState(null);

  const memberName = (uid) => {
    const u = (usersFetch.data || []).find((x) => x.id === uid);
    return u ? [u.first_name, u.last_name].filter(Boolean).join(' ') || u.username : `Utilisateur #${uid}`;
  };

  const addMember = async () => {
    if (!memberToAdd) return;
    try {
      await projectService.addMember(id, memberToAdd);
      setData((p) => ({ ...p, members: [...(p.members || []), memberToAdd], members_count: (p.members_count || 0) + 1 }));
      setMemberToAdd(null);
    } catch (e) {
      Alert.alert('Erreur', e?.response?.data?.error || 'Ajout impossible.');
    }
  };

  const removeMember = (uid) => {
    Alert.alert('Retirer le membre', `Retirer ${memberName(uid)} du projet ?`, [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Retirer',
        style: 'destructive',
        onPress: async () => {
          try {
            await projectService.removeMember(id, uid);
            setData((p) => ({ ...p, members: (p.members || []).filter((x) => x !== uid), members_count: Math.max(0, (p.members_count || 1) - 1) }));
          } catch (e) {
            Alert.alert('Erreur', e?.response?.data?.error || 'Retrait impossible.');
          }
        },
      },
    ]);
  };

  const changeStatus = async (status) => {
    try {
      const updated = await projectService.patchStatus(id, status);
      setData((p) => ({ ...p, ...updated }));
    } catch {
      Alert.alert('Erreur', 'Mise à jour impossible.');
    }
  };

  const deleteProject = () => {
    Alert.alert('Supprimer le projet', 'Cette action est irréversible.', [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Supprimer',
        style: 'destructive',
        onPress: async () => {
          try {
            await projectService.remove(id);
            navigation.goBack();
          } catch {
            Alert.alert('Erreur', 'Suppression impossible.');
          }
        },
      },
    ]);
  };

  if (loading && !project) return <Loading />;
  if (error) return <ErrorBanner message="Impossible de charger le projet." onRetry={reload} />;
  if (!project) return null;

  const tasks = tasksFetch.data || [];

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.headerRow}>
        <View style={[styles.colorDot, { backgroundColor: project.color || THEME.colors.brand[500] }]} />
        <Text style={styles.title}>{project.name}</Text>
      </View>
      {project.description ? <Text style={styles.desc}>{project.description}</Text> : <Text style={styles.descMuted}>Aucune description.</Text>}

      {project.risk_score != null && project.risk_score > 0 ? (
        <Card style={[styles.riskCard, { backgroundColor: project.risk_score > 70 ? '#fef2f2' : '#fffbeb', borderColor: project.risk_score > 70 ? '#fecaca' : '#fde68a' }]}>
          <Text style={[styles.riskLabel, { color: project.risk_score > 70 ? THEME.colors.danger : THEME.colors.warning }]}>
            ⚠️ Risque estimé : {project.risk_score}%
          </Text>
        </Card>
      ) : null}

      <View style={styles.statsRow}>
        <View style={styles.stat}>
          <Text style={styles.statVal}>{project.progress || 0}%</Text>
          <Text style={styles.statLabel}>Progression</Text>
        </View>
        <View style={styles.stat}>
          <Text style={styles.statVal}>{project.task_count ?? 0}</Text>
          <Text style={styles.statLabel}>Tâches</Text>
        </View>
        <View style={styles.stat}>
          <Text style={styles.statVal}>{project.milestones_count ?? 0}</Text>
          <Text style={styles.statLabel}>Jalons</Text>
        </View>
        <View style={styles.stat}>
          <Text style={styles.statVal}>{project.members_count ?? 0}</Text>
          <Text style={styles.statLabel}>Membres</Text>
        </View>
      </View>

      <Text style={styles.section}>Statut</Text>
      <Select
        label=""
        value={project.status}
        options={[
          { value: 'not_started', label: 'Non démarré' },
          { value: 'in_progress', label: 'En cours' },
          { value: 'on_hold', label: 'En pause' },
          { value: 'completed', label: 'Terminé' },
          { value: 'archived', label: 'Archivé' },
        ]}
        onChange={changeStatus}
      />

      <Text style={styles.section}>Membres</Text>
      <Card style={styles.memberCard}>
        {(project.members || []).length === 0 ? (
          <Text style={styles.muted}>Aucun membre.</Text>
        ) : (
          (project.members || []).map((uid) => (
            <View key={uid} style={styles.memberRow}>
              <Text style={styles.memberName} numberOfLines={1}>
                {memberName(uid)}
              </Text>
              {project.owner_id === uid ? <Badge text="Propriétaire" color="purple" /> : null}
              {project.owner_id !== uid ? (
                <Pressable onPress={() => removeMember(uid)} style={styles.memberRemove}>
                  <Ionicons name="trash-outline" size={17} color={THEME.colors.danger} />
                </Pressable>
              ) : null}
            </View>
          ))
        )}
      </Card>
      {(usersFetch.data || []).length ? (
        <View style={styles.addMemberRow}>
          <View style={styles.addMemberSelect}>
            <Select
              placeholder="Ajouter un membre…"
              value={memberToAdd}
              options={(usersFetch.data || [])
                .filter((u) => !(project.members || []).includes(u.id))
                .map((u) => ({
                  value: u.id,
                  label: [u.first_name, u.last_name].filter(Boolean).join(' ') || u.username,
                }))}
              onChange={setMemberToAdd}
            />
          </View>
          <Button variant="secondary" title="Ajouter" size="sm" onPress={addMember} />
        </View>
      ) : null}

      <Text style={styles.section}>Tâches du projet</Text>
      {tasks.length === 0 ? (
        <Text style={styles.muted}>Aucune tâche dans ce projet.</Text>
      ) : (
        tasks.map((t) => (
          <Card
            key={t.id}
            style={styles.taskCard}
            onPress={() => navigation.navigate('TaskDetail', { id: t.id })}
          >
            <View style={styles.taskRow}>
              <View style={styles.taskInfo}>
                <Text numberOfLines={1} style={styles.taskName}>{t.title}</Text>
                <Text style={styles.taskMeta}>Priorité {t.priority} · {t.status}</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={THEME.colors.text.muted} />
            </View>
          </Card>
        ))
      )}

      <Text style={styles.section}>Jalons</Text>
      {(milestonesFetch.data || []).length === 0 ? (
        <Text style={styles.muted}>Aucun jalon.</Text>
      ) : (
        milestonesFetch.data.map((m) => (
          <Card key={m.id} style={styles.milestoneCard}>
            <Text numberOfLines={1} style={styles.taskName}>{m.name}</Text>
            <Text style={styles.taskMeta}>
              {m.progress}% · {m.due_date ? new Date(m.due_date).toLocaleDateString('fr-FR') : 'sans échéance'}
            </Text>
          </Card>
        ))
      )}

      <View style={styles.actions}>
        <Button title="Modifier" variant="secondary" onPress={() => navigation.navigate('ProjectForm', { id })} style={styles.flex} />
        <Button title="Supprimer" variant="danger" onPress={deleteProject} style={styles.flex} />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: THEME.colors.background },
  content: { padding: 16, paddingBottom: 40 },
  headerRow: { flexDirection: 'row', alignItems: 'center' },
  colorDot: { width: 12, height: 12, borderRadius: 6, marginRight: 8 },
  title: { fontSize: THEME.text.xxl, fontWeight: '800', flex: 1 },
  desc: { marginTop: 10, color: THEME.colors.text.primary, fontSize: THEME.text.md },
  descMuted: { marginTop: 10, color: THEME.colors.text.muted, fontSize: THEME.text.sm },
  riskCard: { marginTop: 14, padding: 12 },
  riskLabel: { fontWeight: '700', fontSize: THEME.text.sm },
  statsRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 18 },
  stat: { alignItems: 'center', flex: 1 },
  statVal: { fontSize: THEME.text.xl, fontWeight: '800', color: THEME.colors.text.primary },
  statLabel: { color: THEME.colors.text.secondary, fontSize: THEME.text.xs, marginTop: 2 },
  section: { fontSize: THEME.text.lg, fontWeight: '700', marginTop: 22, marginBottom: 10 },
  muted: { color: THEME.colors.text.muted, fontSize: THEME.text.sm },
  taskCard: { padding: 12 },
  taskRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  taskInfo: { flex: 1 },
  taskName: { fontSize: THEME.text.md, fontWeight: '600' },
  taskMeta: { color: THEME.colors.text.secondary, fontSize: THEME.text.xs, marginTop: 3 },
  milestoneCard: { padding: 12 },
  memberCard: { padding: 12 },
  memberRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6 },
  memberName: { flex: 1, fontSize: THEME.text.md, fontWeight: '600', marginRight: 8 },
  memberRemove: { padding: 6 },
  addMemberRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, marginBottom: 6 },
  addMemberSelect: { flex: 1 },
  actions: { flexDirection: 'row', gap: 10, marginTop: 28 },
  flex: { flex: 1 },
});