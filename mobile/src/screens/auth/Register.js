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

const EMPTY = { first_name: '', last_name: '', username: '', email: '', password: '', password2: '' };

export default function Register({ navigation }) {
  const { register } = useAuth();
  const [form, setForm] = useState(EMPTY);
  const [fieldErrors, setFieldErrors] = useState({});
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const set = (key) => (value) => setForm((f) => ({ ...f, [key]: value }));

  const handleSubmit = async () => {
    setError(null);
    setFieldErrors({});
    if (form.password !== form.password2) {
      setError('Les mots de passe ne correspondent pas.');
      return;
    }
    setLoading(true);
    try {
      await register({
        first_name: form.first_name,
        last_name: form.last_name,
        username: form.username,
        email: form.email,
        password: form.password,
        password2: form.password2,
      });
      navigation.navigate('Login');
    } catch (e) {
      const data = e?.response?.data;
      if (data && typeof data === 'object' && !data.non_field_errors) {
        setFieldErrors(data);
      } else {
        setError(data?.non_field_errors?.[0] || e?.message || 'Échec de l\'inscription.');
      }
    } finally {
      setLoading(false);
    }
  };

  const fe = (key) => (fieldErrors[key] || []).join(' ');

  return (
    <KeyboardAvoidingView
      style={styles.wrap}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.brandBox}>
          <Text style={styles.logo}>🧠</Text>
          <Text style={styles.brand}>Smart Todo AI</Text>
          <Text style={styles.formTitle}>Créer un compte</Text>
        </View>

        <View style={styles.formCard}>
          {error ? <ErrorBanner message={error} /> : null}
          <Input label="Prénom" value={form.first_name} onChangeText={set('first_name')} error={fe('first_name')} />
          <Input label="Nom" value={form.last_name} onChangeText={set('last_name')} error={fe('last_name')} />
          <Input
            label="Nom d'utilisateur"
            autoCapitalize="none"
            autoCorrect={false}
            value={form.username}
            onChangeText={set('username')}
            error={fe('username')}
          />
          <Input
            label="Email"
            autoCapitalize="none"
            keyboardType="email-address"
            value={form.email}
            onChangeText={set('email')}
            error={fe('email')}
          />
          <Input
            label="Mot de passe"
            secureTextEntry
            value={form.password}
            onChangeText={set('password')}
            error={fe('password')}
          />
          <Input
            label="Confirmer le mot de passe"
            secureTextEntry
            value={form.password2}
            onChangeText={set('password2')}
            error={fe('password2')}
          />
          <Button title="S'inscrire" onPress={handleSubmit} loading={loading} size="lg" />
        </View>

        <View style={styles.footerRow}>
          <Text style={styles.footerText}>Déjà un compte ? </Text>
          <Text style={styles.link} onPress={() => navigation.goBack()}>
            Se connecter
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: THEME.colors.background },
  content: { padding: 24, flexGrow: 1 },
  brandBox: { alignItems: 'center', marginTop: 24, marginBottom: 20 },
  logo: { fontSize: 48 },
  brand: { fontSize: THEME.text.xxl, fontWeight: '800', color: THEME.colors.brand[700] },
  formTitle: { fontSize: THEME.text.lg, fontWeight: '600', marginTop: 8, color: THEME.colors.text.secondary },
  formCard: {
    backgroundColor: THEME.colors.surface,
    borderRadius: THEME.radii.xl,
    padding: 20,
    borderWidth: 1,
    borderColor: THEME.colors.border,
  },
  footerRow: { flexDirection: 'row', justifyContent: 'center', marginTop: 20 },
  footerText: { color: THEME.colors.text.secondary },
  link: { color: THEME.colors.brand[600], fontWeight: '600' },
});