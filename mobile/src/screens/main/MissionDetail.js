import React, { useCallback } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { missionService } from '../../api/services';
import { useFetch } from '../../hooks/useFetch';
import { Badge, Button, Card, EmptyState, ErrorBanner, Loading, ScreenTitle } from '../../components/ui';
import { THEME } from '../../theme';
import { formatMoney, MISSION_STATUS_COLOR, MISSION_STATUS_LABELS } from './Missions';

function InfoRow({ icon, label, value }) {
  return (
    <View style={styles.infoRow}>
      <Ionicons name={icon} size={17} color={THEME.colors.text.secondary} />
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

export default function MissionDetail({ route, navigation }) {
  const { id } = route.params;
  const { user } = useAuth();
  const fetcher = useCallback(() => missionService.get(id), [id]);
  const { data: mission, loading, error, reload, setData } = useFetch(fetcher, [id]);

  if (loading && !mission) return <Loading />;
  if (error) return <ErrorBanner message="Impossible de charger la mission." onRetry={reload} />;
  if (!mission) return null;

  const leaderMember = (mission.members || []).find((m) => m.is_leader);
  const leaderId = leaderMember?.user ?? null;
  const canLead = leaderId === user?.id || user?.role === 'superadmin' || user?.role === 'admin';

  const changeStatus = async (status, label) => {
    try {
      const fn =
        status === 'in_progress' ? missionService.start : status === 'completed' ? missionService.end : missionService.cancel;
      const res = await fn(id);
      setData((m) => ({ ...m, status: res.status || status }));
    } catch (e) {
      Alert.alert('Erreur', e?.response?.data?.error || `Impossible de ${label.toLowerCase()} la mission.`);
    }
  };

  const confirmStatus = (status) => {
    const label = MISSION_STATUS_LABELS[status];
    Alert.alert(`Mettre à jour`, `Passer la mission au statut « ${label} » ?`, [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Oui', onPress: () => changeStatus(status, label) },
    ]);
  };

  const remove = () => {
    Alert.alert('Supprimer la mission', 'Cette action est irréversible.', [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Supprimer',
        style: 'destructive',
        onPress: async () => {
          try {
            await missionService.remove(id);
            navigation.goBack();
          } catch {
            Alert.alert('Erreur', 'Suppression impossible.');
          }
        },
      },
    ]);
  };

  return (
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.headerRow}>
          <Text style={styles.title}>{mission.title}</Text>
          <Badge text={MISSION_STATUS_LABELS[mission.status]} color={MISSION_STATUS_COLOR[mission.status]} />
        </View>
        <Text style={styles.sub}>Créée par {mission.created_by_name}</Text>
        {mission.description ? <Text style={styles.desc}>{mission.description}</Text> : null}

        <Card>
          <InfoRow icon="location-outline" label="Destination" value={mission.destination_name} />
          <InfoRow
            icon="calendar-outline"
            label="Départ / Retour"
            value={`${mission.start_date ? new Date(mission.start_date).toLocaleDateString('fr-FR') : '—'} → ${mission.end_date ? new Date(mission.end_date).toLocaleDateString('fr-FR') : '—'}`}
          />
          <InfoRow icon="time-outline" label="Durée" value={mission.duration_days ? `${mission.duration_days} jour(s)` : '—'} />
          {mission.project_detail ? (
            <Card style={styles.pressableWrap} onPress={() => navigation.navigate('ProjectDetail', { id: mission.project_detail.id })}>
              <InfoRow icon="folder-open-outline" label="Projet lié" value={mission.project_detail.name} />
            </Card>
          ) : null}
          <InfoRow icon="globe-outline" label="Devise" value={String(mission.currency || 'xof').toUpperCase()} />
        </Card>

        <Card>
          <Text style={styles.cardTitle}>Équipe</Text>
          {(mission.members || []).length === 0 ? (
            <Text style={styles.muted}>Aucun membre.</Text>
          ) : (
            (mission.members || []).map((m) => (
              <View key={m.id} style={styles.memberRow}>
                <Text style={styles.memberName}>{m.user_name}</Text>
                {m.is_leader ? <Badge text="Chef de mission" color="purple" /> : null}
              </View>
            ))
          )}
        </Card>

        <Card>
          <Text style={styles.cardTitle}>Coûts ({String(mission.currency || 'xof').toUpperCase()})</Text>
          <InfoRow icon="wallet-outline" label="Frais de mission" value={formatMoney(mission.frais_de_mission, mission.currency)} />
          <InfoRow icon="pricetag-outline" label="Coût total" value={formatMoney(mission.total_cost, mission.currency)} />
        </Card>

        {mission.tasks_detail?.length ? (
          <>
            <ScreenTitle title="Tâches liées" />
            {mission.tasks_detail.map((t) => (
              <Card
                key={t.id}
                style={styles.linkCard}
                onPress={() => navigation.navigate('TaskDetail', { id: t.id })}
              >
                <Text numberOfLines={1} style={styles.linkTitle}>{t.title}</Text>
                <View style={styles.linkMeta}>
                  <Badge text={t.status} color="gray" />
                  <Text style={styles.linkDest}>{t.assigned_to_name || 'Non assigné'}</Text>
                </View>
              </Card>
            ))}
          </>
        ) : null}

        {mission.milestones_detail?.length ? (
          <>
            <ScreenTitle title="Jalons liés" />
            {mission.milestones_detail.map((m) => (
              <Card key={m.id} style={styles.linkCard}>
                <Text numberOfLines={1} style={styles.linkTitle}>{m.name}</Text>
                <Badge text={m.status} color="gray" />
              </Card>
            ))}
          </>
        ) : null}

        {mission.expense_report || mission.mission_report ? (
          <Card>
            <Text style={styles.cardTitle}>Rapports</Text>
            {mission.expense_report ? (
              <View>
                <Text style={styles.reportTitle}>Rapport de frais</Text>
                <Text style={styles.reportBody}>{mission.expense_report}</Text>
              </View>
            ) : null}
            {mission.mission_report ? (
              <View style={styles.reportBlock}>
                <Text style={styles.reportTitle}>Rapport de mission</Text>
                <Text style={styles.reportBody}>{mission.mission_report}</Text>
              </View>
            ) : null}
          </Card>
        ) : null}

        {canLead && mission.status === 'planned' ? (
          <Button title="Démarrer la mission" onPress={() => confirmStatus('in_progress')} style={styles.actionBtn} />
        ) : null}
        {canLead && mission.status === 'in_progress' ? (
          <Button title="Terminer la mission" onPress={() => confirmStatus('completed')} style={styles.actionBtn} />
        ) : null}
        {canLead && ['planned', 'in_progress'].includes(mission.status) ? (
          <Button title="Annuler la mission" variant="outline" onPress={() => confirmStatus('cancelled')} style={styles.actionBtn} />
        ) : null}

        <View style={styles.footerRow}>
          <Button title="Modifier" variant="secondary" onPress={() => navigation.navigate('MissionForm', { id })} style={styles.flex} />
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
  sub: { color: THEME.colors.text.secondary, marginTop: 6, fontSize: THEME.text.sm },
  desc: { marginTop: 14, fontSize: THEME.text.md, color: THEME.colors.text.primary, lineHeight: 22 },
  infoRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 7 },
  infoLabel: { color: THEME.colors.text.secondary, fontSize: THEME.text.sm, marginLeft: 8, width: 120 },
  infoValue: { flex: 1, fontSize: THEME.text.md, fontWeight: '600', color: THEME.colors.text.primary, textAlign: 'right' },
  cardTitle: { fontSize: THEME.text.lg, fontWeight: '700', marginBottom: 8 },
  muted: { color: THEME.colors.text.muted, fontSize: THEME.text.sm },
  memberRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 6 },
  memberName: { fontSize: THEME.text.md, fontWeight: '600' },
  linkCard: { padding: 14 },
  linkTitle: { fontSize: THEME.text.md, fontWeight: '600', marginBottom: 6 },
  linkMeta: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  linkDest: { color: THEME.colors.text.secondary, fontSize: THEME.text.xs },
  reportBlock: { marginTop: 12 },
  reportTitle: { fontSize: THEME.text.sm, fontWeight: '700', color: THEME.colors.text.secondary },
  reportBody: { marginTop: 4, color: THEME.colors.text.primary },
  actionBtn: { marginTop: 14 },
  footerRow: { flexDirection: 'row', gap: 10, marginTop: 20 },
  flex: { flex: 1 },
  pressableWrap: { marginBottom: 0 },
});