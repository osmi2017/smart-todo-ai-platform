import React, { useCallback } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, Pressable, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { notificationService } from '../../api/services';
import { useFetch } from '../../hooks/useFetch';
import { Card, EmptyState, ErrorBanner, Loading } from '../../components/ui';
import { THEME } from '../../theme';

const typeColor = {
  task_completed: 'green',
  meeting_started: 'blue',
  deadline: 'red',
  reminder: 'amber',
  storage: 'purple',
  project: 'blue',
  comment: 'purple',
};

const typeIcon = {
  task_completed: 'checkmark-circle',
  meeting_started: 'videocam',
  deadline: 'alarm',
  reminder: 'notifications',
  storage: 'folder',
  project: 'folder-open',
  comment: 'chatbubble',
};

export default function Notifications({ navigation }) {
  const fetcher = useCallback(() => notificationService.list(50), []);
  const { data, loading, refreshing, error, refresh, reload, setData } = useFetch(fetcher);

  const markRead = async (n) => {
    if (n.is_read) return;
    try {
      await notificationService.markRead(n.id);
      setData((list) => list.map((x) => (x.id === n.id ? { ...x, is_read: true } : x)));
    } catch {
      // silencieux
    }
  };

  const markAllRead = async () => {
    try {
      await notificationService.markAllRead();
      setData((list) => list.map((x) => ({ ...x, is_read: true })));
    } catch {
      // silencieux
    }
  };

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={THEME.colors.brand[500]} />
      }
    >
      {error ? <ErrorBanner message="Impossible de charger les notifications." onRetry={reload} /> : null}
      {loading && !data ? (
        <Loading />
      ) : (data || []).length === 0 ? (
        <EmptyState icon="🔔" title="Aucune notification" hint="Les notifications apparaîtront ici." />
      ) : (
        <>
          <View style={styles.toolbar}>
            <Text style={styles.count}>{data.length} notification(s)</Text>
            <Pressable onPress={markAllRead}>
              <Text style={styles.markAll}>Tout marquer comme lu</Text>
            </Pressable>
          </View>
          {data.map((n) => (
            <Card key={n.id} style={[styles.item, n.is_read ? styles.itemRead : null]}>
              <Pressable style={styles.itemInner} onPress={() => markRead(n)}>
                <View style={[styles.iconWrap, { backgroundColor: THEME.colors.brand[50] }]}>
                  <Ionicons name={typeIcon[n.type] || 'notifications'} size={20} color={THEME.colors.brand[600]} />
                </View>
                <View style={styles.itemBody}>
                  <Text numberOfLines={2} style={styles.itemMsg}>{n.message || n.title}</Text>
                  <Text style={styles.itemDate}>
                    {new Date(n.created_at).toLocaleString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                  </Text>
                </View>
                {!n.is_read ? <View style={styles.unreadDot} /> : null}
              </Pressable>
            </Card>
          ))}
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: THEME.colors.background },
  content: { padding: 16, paddingBottom: 32 },
  toolbar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  count: { color: THEME.colors.text.secondary, fontSize: THEME.text.sm },
  markAll: { color: THEME.colors.brand[600], fontWeight: '600', fontSize: THEME.text.sm },
  item: { padding: 12 },
  itemRead: { opacity: 0.6 },
  itemInner: { flexDirection: 'row', alignItems: 'center' },
  iconWrap: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  itemBody: { flex: 1 },
  itemMsg: { color: THEME.colors.text.primary, fontSize: THEME.text.sm },
  itemDate: { color: THEME.colors.text.muted, fontSize: THEME.text.xs, marginTop: 4 },
  unreadDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: THEME.colors.brand[500], marginLeft: 8 },
});