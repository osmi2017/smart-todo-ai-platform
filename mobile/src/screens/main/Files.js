import React, { useCallback } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CONFIG } from '../../config';
import { fileService } from '../../api/services';
import { useFetch } from '../../hooks/useFetch';
import { Badge, Card, EmptyState, ErrorBanner, Loading } from '../../components/ui';
import { THEME } from '../../theme';

function formatBytes(bytes) {
  if (!bytes) return '0 o';
  const units = ['o', 'Ko', 'Mo', 'Go'];
  let i = 0;
  let n = bytes;
  while (n >= 1024 && i < units.length - 1) {
    n /= 1024;
    i += 1;
  }
  return `${n.toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

export default function Files() {
  const fetcher = useCallback(() => fileService.list(), []);
  const { data, loading, refreshing, error, refresh, reload, setData } = useFetch(fetcher);
  const storage = useFetch(useCallback(() => fileService.storageInfo(), []));

  const remove = (file) => {
    Alert.alert('Supprimer le fichier', `${file.name || 'Ce fichier'} sera supprimé.`, [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Supprimer',
        style: 'destructive',
        onPress: async () => {
          try {
            await fileService.remove(file.id);
            setData((l) => l.filter((f) => f.id !== file.id));
          } catch {
            Alert.alert('Erreur', 'Suppression impossible.');
          }
        },
      },
    ]);
  };

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={THEME.colors.brand[500]} />
      }
    >
      {error ? <ErrorBanner message="Impossible de charger les fichiers." onRetry={reload} /> : null}

      {storage.data ? (
        <Card>
          <View style={styles.storageRow}>
            <Text style={styles.storageLabel}>Espace utilisé</Text>
            <Text style={styles.storageValue}>
              {storage.data.used_display || formatBytes(storage.data.used_bytes)}
            </Text>
          </View>
          {storage.data.used_display || storage.data.used_bytes ? (
            <View style={styles.track}>
              <View style={[styles.fill, { width: Math.min(100, storage.data.usage_percent || 0) + '%' }]} />
            </View>
          ) : null}
        </Card>
      ) : null}

      {loading && !data ? (
        <Loading />
      ) : (data || []).length === 0 ? (
        <EmptyState icon="🗂️" title="Aucun fichier" hint="Les fichiers partagés avec vous apparaîtront ici." />
      ) : (
        (data || []).map((f) => (
          <Card key={f.id} style={styles.card}>
            <View style={styles.row}>
              <View style={styles.iconWrap}>
                <Ionicons name="document-text" size={20} color={THEME.colors.brand[600]} />
              </View>
              <View style={styles.info}>
                <Text numberOfLines={1} style={styles.name}>{f.name || 'Document'}</Text>
                <Text style={styles.meta}>
                  {formatBytes(f.size_bytes)} · {f.uploaded_by_name || '—'} ·{' '}
                  {new Date(f.created_at).toLocaleDateString('fr-FR')}
                </Text>
              </View>
              {f.user_permissions?.can_edit ? (
                <Ionicons name="trash-outline" size={18} color={THEME.colors.danger} onPress={() => remove(f)} />
              ) : null}
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
  storageRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  storageLabel: { color: THEME.colors.text.secondary },
  storageValue: { fontWeight: '700' },
  track: { height: 8, backgroundColor: THEME.colors.border, borderRadius: 4, overflow: 'hidden' },
  fill: { height: 8, backgroundColor: THEME.colors.brand[500], borderRadius: 4 },
  card: { padding: 14 },
  row: { flexDirection: 'row', alignItems: 'center' },
  iconWrap: { width: 42, height: 42, borderRadius: 12, backgroundColor: THEME.colors.brand[50], alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  info: { flex: 1 },
  name: { fontWeight: '600', fontSize: THEME.text.md },
  meta: { color: THEME.colors.text.muted, fontSize: THEME.text.xs, marginTop: 4 },
});