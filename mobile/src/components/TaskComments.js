import React, { useCallback, useState } from 'react';
import { Alert, StyleSheet, Text, TextInput, View, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { commentService } from '../api/services';
import { useFetch } from '../hooks/useFetch';
import { Avatar, Button, Loading } from './ui';
import { THEME } from '../theme';

function CommentCard({ comment, onReply }) {
  const [showReply, setShowReply] = useState(false);
  return (
    <View style={styles.comment}>
      <View style={styles.commentHead}>
        <Avatar name={comment.author_name} size={28} />
        <Text style={styles.commentAuthor}>{comment.author_name}</Text>
        <Text style={styles.commentDate}>
          {new Date(comment.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
        </Text>
      </View>
      <Text style={styles.commentBody}>{comment.content}</Text>
      {onReply ? (
        <Pressable onPress={() => setShowReply((s) => !s)} style={styles.replyBtn}>
          <Ionicons name="return-down-back" size={14} color={THEME.colors.brand[600]} />
          <Text style={styles.replyText}>Répondre</Text>
        </Pressable>
      ) : null}
      {showReply ? (
        <View style={styles.replyBox}>
          <ReplyInput placeholder="Écrire une réponse…" onSend={(text) => onReply(comment.id, text)} />
        </View>
      ) : null}
    </View>
  );
}

function ReplyInput({ placeholder, onSend }) {
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const submit = async () => {
    if (!text.trim()) return;
    setSending(true);
    try {
      await onSend(text.trim());
      setText('');
    } catch {
      Alert.alert('Erreur', 'Envoi impossible.');
    } finally {
      setSending(false);
    }
  };
  return (
    <View style={styles.replyInputRow}>
      <TextInput
        value={text}
        onChangeText={setText}
        placeholder={placeholder}
        placeholderTextColor={THEME.colors.text.muted}
        style={styles.replyTextInput}
        multiline
      />
      <Pressable onPress={submit} disabled={sending} style={styles.sendBtn}>
        <Ionicons name="send" size={18} color="#fff" />
      </Pressable>
    </View>
  );
}

export default function TaskComments({ taskId }) {
  const fetcher = useCallback(() => commentService.list(taskId), [taskId]);
  const { data, loading, error, reload, setData } = useFetch(fetcher, [taskId]);

  const addComment = async (content) => {
    const created = await commentService.create({ content, task: taskId });
    setData((l) => [created, ...(l || [])]);
  };

  const addReply = async (parentId, content) => {
    const created = await commentService.reply(parentId, content);
    setData((l) => [created, ...(l || [])]);
  };

  const top = (data || []).filter((c) => !c.parent);
  const repliesOf = (id) => (data || []).filter((c) => c.parent === id);

  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>
        <Ionicons name="chatbubble-ellipses-outline" size={18} color={THEME.colors.text.primary} /> Commentaires
      </Text>

      <ReplyInput placeholder="Ajouter un commentaire…" onSend={addComment} />

      {loading && !data ? <Loading /> : null}
      {error ? (
        <Text style={styles.errorText}>Impossible de charger les commentaires.</Text>
      ) : null}

      {(data || []).length === 0 && !loading ? (
        <Text style={styles.empty}>Aucun commentaire pour le moment.</Text>
      ) : (
        top.map((c) => (
          <View key={c.id}>
            <CommentCard comment={c} onReply={addReply} />
            {repliesOf(c.id).map((r) => (
              <View key={r.id} style={styles.replyWrap}>
                <CommentCard comment={r} />
              </View>
            ))}
          </View>
        ))
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginTop: 20 },
  title: { fontSize: THEME.text.lg, fontWeight: '700', marginBottom: 12 },
  comment: { backgroundColor: THEME.colors.surface, borderWidth: 1, borderColor: THEME.colors.border, borderRadius: THEME.radii.md, padding: 12, marginBottom: 8 },
  commentHead: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  commentAuthor: { fontWeight: '700', fontSize: THEME.text.sm, flex: 1 },
  commentDate: { color: THEME.colors.text.muted, fontSize: THEME.text.xs },
  commentBody: { marginTop: 8, color: THEME.colors.text.primary, fontSize: THEME.text.md },
  replyBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 8 },
  replyText: { color: THEME.colors.brand[600], fontSize: THEME.text.xs, fontWeight: '600' },
  replyWrap: { marginLeft: 24 },
  replyBox: { marginTop: 8 },
  replyInputRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  replyTextInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    borderRadius: THEME.radii.md,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: THEME.text.md,
    color: THEME.colors.text.primary,
    backgroundColor: THEME.colors.surface,
    maxHeight: 90,
  },
  sendBtn: { width: 40, height: 40, borderRadius: 999, backgroundColor: THEME.colors.brand[500], alignItems: 'center', justifyContent: 'center' },
  empty: { color: THEME.colors.text.muted, fontSize: THEME.text.sm },
  errorText: { color: THEME.colors.danger, fontSize: THEME.text.sm },
});