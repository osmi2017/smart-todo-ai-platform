import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { searchService } from '../../api/services';
import { EmptyState } from '../../components/ui';
import { THEME } from '../../theme';

const TYPE_META = {
  task: { label: 'Tâches', icon: 'checkbox-outline', color: '#2563eb', dest: 'TaskDetail' },
  project: { label: 'Projets', icon: 'folder-open-outline', color: '#059669', dest: 'ProjectDetail' },
  meeting: { label: 'Réunions', icon: 'videocam-outline', color: '#7c3aed', dest: 'MeetingDetail' },
  file: { label: 'Fichiers', icon: 'document-outline', color: '#d97706', dest: 'Files' },
};

export default function Search({ navigation }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const timer = useRef(null);

  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    if (query.trim().length < 3) {
      setResults([]);
      setDone(false);
      setLoading(false);
      return;
    }
    setLoading(true);
    timer.current = setTimeout(async () => {
      try {
        const res = await searchService.search(query.trim());
        setResults(res || []);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
        setDone(true);
      }
    }, 300);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [query]);

  const grouped = results.reduce((acc, item) => {
    const key = item.type || 'other';
    if (!acc[key]) acc[key] = [];
    acc[key].push(item);
    return acc;
  }, {});

  const open = (item) => {
    const meta = TYPE_META[item.type];
    if (!meta) return;
    if (meta.dest === 'Files') {
      navigation.navigate('Files');
      return;
    }
    const idMatch = String(item.url || '').match(/\/(\d+)\/?$/);
    const id = idMatch ? Number(idMatch[1]) : item.id;
    if (id) navigation.navigate(meta.dest, { id });
  };

  return (
    <View style={styles.screen}>
      <View style={styles.searchBar}>
        <Ionicons name="search" size={20} color={THEME.colors.text.muted} />
        <TextInput
          style={styles.input}
          value={query}
          onChangeText={setQuery}
          placeholder="Rechercher tâches, projets, réunions, fichiers…"
          placeholderTextColor={THEME.colors.text.muted}
          autoFocus
          returnKeyType="search"
        />
        {loading ? <ActivityIndicator size="small" color={THEME.colors.brand[500]} /> : null}
      </View>

      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}>
        {!loading && query.trim().length >= 3 && Object.keys(grouped).length === 0 ? (
          <EmptyState icon="🔍" title={done ? 'Aucun résultat' : 'Recherche…'} hint={done ? 'Essayez un autre terme.' : null} />
        ) : null}
        {query.trim().length < 3 ? (
          <EmptyState icon="🔍" title="Recherche globale" hint="Saisissez au moins 3 caractères." />
        ) : null}

        {Object.entries(grouped).map(([type, items]) => {
          const meta = TYPE_META[type] || { label: type, icon: 'ellipsis-horizontal', color: THEME.colors.text.secondary, dest: null };
          return (
            <View key={type} style={styles.group}>
              <Text style={styles.groupTitle}>{meta.label}</Text>
              {items.map((item, idx) => (
                <Pressable key={`${type}-${item.id}-${idx}`} style={styles.result} onPress={() => open(item)}>
                  <View style={[styles.resultIcon, { backgroundColor: meta.color + '1a' }]}>
                    <Ionicons name={meta.icon} size={18} color={meta.color} />
                  </View>
                  <View style={styles.resultTextWrap}>
                    <Text numberOfLines={1} style={styles.resultTitle}>{item.title || '—'}</Text>
                    {item.subtitle ? <Text numberOfLines={1} style={styles.resultSub}>{item.subtitle}</Text> : null}
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={THEME.colors.text.muted} />
                </Pressable>
              ))}
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: THEME.colors.background },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    margin: 16,
    paddingHorizontal: 14,
    backgroundColor: THEME.colors.surface,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    borderRadius: THEME.radii.lg,
  },
  input: { flex: 1, paddingVertical: 12, fontSize: THEME.text.md, color: THEME.colors.text.primary },
  content: { paddingHorizontal: 16, paddingBottom: 40 },
  group: { marginBottom: 16 },
  groupTitle: {
    fontSize: THEME.text.xs,
    fontWeight: '700',
    color: THEME.colors.text.muted,
    textTransform: 'uppercase',
    marginBottom: 6,
    paddingHorizontal: 4,
  },
  result: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.colors.surface,
    borderRadius: THEME.radii.lg,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    padding: 12,
    marginBottom: 8,
  },
  resultIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  resultTextWrap: { flex: 1, marginRight: 8 },
  resultTitle: { fontSize: THEME.text.md, fontWeight: '600', color: THEME.colors.text.primary },
  resultSub: { fontSize: THEME.text.xs, color: THEME.colors.text.secondary, marginTop: 2 },
});