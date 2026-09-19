import React, { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, Text, View, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { meetingService } from '../../api/services';
import { useAuth } from '../../context/AuthContext';
import { useFetch, useMutation } from '../../hooks/useFetch';
import { Badge, Button, Card, ErrorBanner, Loading } from '../../components/ui';
import { THEME } from '../../theme';

const statusLabel = { scheduled: 'Planifiée', in_progress: 'En cours', completed: 'Terminée', cancelled: 'Annulée' };
const statusColor = { scheduled: 'blue', in_progress: 'amber', completed: 'green', cancelled: 'gray' };

export default function MeetingDetail({ route, navigation }) {
  const { id } = route.params;
  const { user } = useAuth();
  const fetcher = useCallback(() => meetingService.get(id), [id]);
  const { data: meeting, loading, error, reload, setData } = useFetch(fetcher, [id]);
  const [processing, setProcessing] = useState(false);

  const runAI = useMutation(() => meetingService.process(id), (res) => {
    setData((m) => ({
      ...m,
      ai_processed: true,
      summary: res.summary || m.summary,
      action_items: res.action_items || m.action_items,
    }));
  });

  if (loading && !meeting) return <Loading />;
  if (error) return <ErrorBanner message="Impossible de charger la réunion." onRetry={reload} />;
  if (!meeting) return null;

  const isOrganizer = user?.id === meeting.organizer;

  const handleJoinVideo = () => navigation.navigate('VideoMeeting', { id: meeting.id });

  const handleAI = async () => {
    setProcessing(true);
    try {
      await runAI.run();
    } catch {
      Alert.alert('Erreur', 'Le traitement IA est indisponible.');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>{meeting.title}</Text>
        <Badge text={statusLabel[meeting.status] || meeting.status} color={statusColor[meeting.status]} />
      </View>
      {meeting.description ? <Text style={styles.desc}>{meeting.description}</Text> : null}

      <Card style={styles.infoCard}>
        <View style={styles.infoRow}>
          <Ionicons name="calendar-outline" size={18} color={THEME.colors.brand[500]} />
          <Text style={styles.infoText}>
            {meeting.scheduled_at ? new Date(meeting.scheduled_at).toLocaleString('fr-FR', { dateStyle: 'long', timeStyle: 'short' }) : 'Non planifiée'}
          </Text>
        </View>
        <View style={styles.infoRow}>
          <Ionicons name="person-outline" size={18} color={THEME.colors.brand[500]} />
          <Text style={styles.infoText}>Organisateur : {meeting.organizer_name}</Text>
        </View>
        <View style={styles.infoRow}>
          <Ionicons name="people-outline" size={18} color={THEME.colors.brand[500]} />
          <Text style={styles.infoText}>{meeting.participants_count ?? 0} participant(s)</Text>
        </View>
        {meeting.project_name ? (
          <View style={styles.infoRow}>
            <Ionicons name="folder-outline" size={18} color={THEME.colors.brand[500]} />
            <Text style={styles.infoText}>Projet : {meeting.project_name}</Text>
          </View>
        ) : null}
      </Card>

      {meeting.duration_minutes ? (
        <Text style={styles.meta}>Durée : {meeting.duration_minutes} min</Text>
      ) : null}

      <Card style={styles.videoCard}>
        <View style={styles.videoRow}>
          <Ionicons name="videocam" size={22} color={THEME.colors.brand[500]} />
          <Text style={styles.videoText}>
            {meeting.status === 'in_progress'
              ? 'La réunion est en cours.'
              : "La réunion vidéo permet l'audio et la vidéo en direct."}
          </Text>
        </View>
        <Button variant="secondary" title="Rejoindre la réunion vidéo" size="sm" onPress={handleJoinVideo} style={styles.videoBtn} />
      </Card>

      <Card style={styles.aiCard}>
        <Text style={styles.aiTitle}>🤖 Traitement IA</Text>
        {meeting.ai_processed && meeting.summary ? (
          <>
            <Text style={styles.sectionTiny}>Résumé</Text>
            <Text style={styles.summaryText}>{meeting.summary.summary_text}</Text>
            {meeting.summary.key_points && meeting.summary.key_points.length ? (
              <>
                <Text style={styles.sectionTiny}>Points clés</Text>
                {(meeting.summary.key_points || []).map((k, i) => (
                  <Text key={i} style={styles.bullet}>• {k}</Text>
                ))}
              </>
            ) : null}
          </>
        ) : meeting.ai_processed ? (
          <Text style={styles.hint}>Réunion traitée, aucun résumé disponible.</Text>
        ) : (
          <Text style={styles.hint}>La transcription et le résumé IA n'ont pas encore été générés.</Text>
        )}
        {isOrganizer && !meeting.ai_processed ? (
          <Button variant="secondary" title="Lancer le traitement IA" size="sm" loading={processing} onPress={handleAI} style={styles.aiBtn} />
        ) : null}
      </Card>

      <Text style={styles.section}>Points d'action</Text>
      {(meeting.action_items || []).length === 0 ? (
        <Text style={styles.muted}>Aucun point d'action.</Text>
      ) : (
        meeting.action_items.map((a) => (
          <Card key={a.id} style={styles.aiCard}>
            <Text style={styles.aiTitle}>{a.title}</Text>
            {a.description ? <Text style={styles.desc}>{a.description}</Text> : null}
            <View style={styles.metaRowTight}>
              <Badge text={`Priorité ${a.priority}`} color="amber" />
              {a.assigned_to_name ? <Badge text={a.assigned_to_name} color="purple" /> : null}
              {a.deadline ? <Badge text={new Date(a.deadline).toLocaleDateString('fr-FR')} color="gray" /> : null}
            </View>
          </Card>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: THEME.colors.background },
  content: { padding: 16, paddingBottom: 40 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { fontSize: THEME.text.xxl, fontWeight: '800', flex: 1, marginRight: 10 },
  desc: { marginTop: 10, color: THEME.colors.text.primary, fontSize: THEME.text.md, lineHeight: 22 },
  infoCard: { marginTop: 16, padding: 14 },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  infoText: { color: THEME.colors.text.primary, fontSize: THEME.text.sm, flex: 1 },
  meta: { color: THEME.colors.text.secondary, fontSize: THEME.text.sm, marginTop: 10 },
  aiCard: { marginTop: 16, backgroundColor: '#faf5ff', borderColor: '#f3e8ff' },
  aiTitle: { fontWeight: '700', color: '#7c3aed', marginBottom: 6, fontSize: THEME.text.md },
  sectionTiny: { fontWeight: '700', color: THEME.colors.text.secondary, marginTop: 10, marginBottom: 4 },
  summaryText: { color: THEME.colors.text.primary, fontSize: THEME.text.sm, lineHeight: 20 },
  bullet: { color: THEME.colors.text.primary, fontSize: THEME.text.sm, marginTop: 2 },
  hint: { color: THEME.colors.text.secondary, fontSize: THEME.text.sm },
  aiBtn: { marginTop: 12, alignSelf: 'flex-start' },
  videoCard: { marginTop: 16, backgroundColor: '#eff6ff', borderColor: '#dbeafe' },
  videoRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  videoText: { flex: 1, color: THEME.colors.text.primary, fontSize: THEME.text.sm },
  videoBtn: { marginTop: 12, alignSelf: 'flex-start' },
  section: { fontSize: THEME.text.lg, fontWeight: '700', marginTop: 22, marginBottom: 10 },
  muted: { color: THEME.colors.text.muted, fontSize: THEME.text.sm },
  metaRowTight: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
});