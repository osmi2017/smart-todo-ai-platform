import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { Button, Card } from '../../components/ui';
import { THEME } from '../../theme';

export default function Settings({ navigation }) {
  const { user, logout } = useAuth();

  const handleLogout = () => {
    logout();
  };

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Card>
        <Text style={styles.cardTitle}>Compte</Text>
        <View style={styles.row}>
          <Text style={styles.label}>Nom d'utilisateur</Text>
          <Text style={styles.value}>{user?.username}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Rôle</Text>
          <Text style={styles.value}>{user?.role}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Email</Text>
          <Text style={styles.value}>{user?.email || '—'}</Text>
        </View>
      </Card>

      <Card>
        <Text style={styles.cardTitle}>Application</Text>
        <Text style={styles.hint}>
          Smart Todo AI — version mobile. Toutes les données sont synchronisées avec la plateforme.
        </Text>
      </Card>

      <Button
        title="Se déconnecter"
        variant="danger"
        size="lg"
        onPress={handleLogout}
        style={styles.logout}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: THEME.colors.background },
  content: { padding: 16, paddingBottom: 40 },
  cardTitle: { fontWeight: '700', fontSize: THEME.text.lg, marginBottom: 12 },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: THEME.colors.border },
  label: { color: THEME.colors.text.secondary },
  value: { fontWeight: '600', maxWidth: '60%', textAlign: 'right' },
  hint: { color: THEME.colors.text.secondary, fontSize: THEME.text.sm, lineHeight: 20 },
  logout: { marginTop: 16 },
});