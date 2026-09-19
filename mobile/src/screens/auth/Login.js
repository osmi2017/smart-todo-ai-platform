import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  View,
  ScrollView,
} from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { Button, Input, ErrorBanner } from '../../components/ui';
import { THEME } from '../../theme';

export default function Login({ navigation }) {
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!username || !password) {
      setError('Veuillez remplir tous les champs.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await login(username.trim(), password);
    } catch (e) {
      setError(e?.response?.data?.non_field_errors?.[0] || e?.message || 'Échec de la connexion.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.wrap}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.brandBox}>
          <Text style={styles.logo}>🧠</Text>
          <Text style={styles.brand}>Smart Todo AI</Text>
          <Text style={styles.tagline}>
            Gérez vos projets, tâches et réunions avec l'intelligence artificielle.
          </Text>
        </View>

        <View style={styles.formCard}>
          <Text style={styles.formTitle}>Connexion</Text>
          {error ? <ErrorBanner message={error} /> : null}
          <Input
            label="Nom d'utilisateur"
            autoCapitalize="none"
            autoCorrect={false}
            value={username}
            onChangeText={setUsername}
            placeholder="ex : user1"
          />
          <Input
            label="Mot de passe"
            secureTextEntry={!showPassword}
            value={password}
            onChangeText={setPassword}
            placeholder="••••••••"
            onSubmitEditing={handleSubmit}
          />
          <Button title="Se connecter" onPress={handleSubmit} loading={loading} size="lg" />
          <Text style={styles.muted}>Mot de passe oublié ? Contactez votre administrateur.</Text>
        </View>

        <View style={styles.footerRow}>
          <Text style={styles.footerText}>Pas encore de compte ? </Text>
          <Text style={styles.link} onPress={() => navigation.navigate('Register')}>
            Créer un compte
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: THEME.colors.background },
  content: { padding: 24, justifyContent: 'center', flexGrow: 1 },
  brandBox: { alignItems: 'center', marginBottom: 32 },
  logo: { fontSize: 52 },
  brand: {
    fontSize: THEME.text.xxl,
    fontWeight: '800',
    color: THEME.colors.brand[700],
    marginTop: 8,
  },
  tagline: {
    color: THEME.colors.text.secondary,
    textAlign: 'center',
    marginTop: 6,
    fontSize: THEME.text.md,
  },
  formCard: {
    backgroundColor: THEME.colors.surface,
    borderRadius: THEME.radii.xl,
    padding: 20,
    borderWidth: 1,
    borderColor: THEME.colors.border,
  },
  formTitle: { fontSize: THEME.text.xl, fontWeight: '700', marginBottom: 16 },
  muted: {
    marginTop: 14,
    color: THEME.colors.text.muted,
    fontSize: THEME.text.xs,
    textAlign: 'center',
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 20,
  },
  footerText: { color: THEME.colors.text.secondary },
  link: { color: THEME.colors.brand[600], fontWeight: '600' },
});