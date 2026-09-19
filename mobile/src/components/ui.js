import React, { useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { THEME } from '../theme';

const tw = THEME.text;

export function SafeScreen({ children, style }) {
  return (
    <SafeAreaView style={[styles.screen, style]} edges={['top', 'left', 'right']}>
      {children}
    </SafeAreaView>
  );
}

export function Screen({ children, scroll, refreshControl, contentStyle }) {
  if (scroll) {
    return (
      <SafeScreen>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[styles.content, contentStyle]}
          refreshControl={refreshControl}
          keyboardShouldPersistTaps="handled"
        >
          {children}
        </ScrollView>
      </SafeScreen>
    );
  }
  return (
    <SafeScreen>
      <View style={[styles.content, { flex: 1 }, contentStyle]}>{children}</View>
    </SafeScreen>
  );
}

export function ScreenTitle({ title, subtitle, right }) {
  return (
    <View style={styles.titleRow}>
      <View style={styles.titleWrap}>
        <Text style={styles.title}>{title}</Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>
      {right}
    </View>
  );
}

export function Button({
  title,
  onPress,
  variant = 'primary',
  loading,
  disabled,
  size = 'md',
  style,
  textStyle,
  icon,
}) {
  const bg = {
    primary: THEME.colors.brand[500],
    secondary: THEME.colors.brand[50],
    outline: 'transparent',
    danger: THEME.colors.danger,
    ghost: 'transparent',
  }[variant];
  const border =
    variant === 'outline' ? { borderWidth: 1, borderColor: THEME.colors.border } : {};
  const fg =
    variant === 'primary'
      ? '#fff'
      : variant === 'danger'
        ? '#fff'
        : variant === 'secondary'
          ? THEME.colors.brand[700]
          : THEME.colors.text.primary;
  const dim = { opacity: disabled || loading ? 0.6 : 1 };
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: bg, ...border },
        size === 'sm' && styles.buttonSm,
        size === 'lg' && styles.buttonLg,
        pressed && styles.pressed,
        dim,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={fg} />
      ) : (
        <View style={styles.buttonInner}>
          {icon}
          <Text style={[styles.buttonText, { color: fg }, size === 'sm' && styles.buttonTextSm, textStyle]}>
            {title}
          </Text>
        </View>
      )}
    </Pressable>
  );
}

export function Input({
  label,
  error,
  secureTextEntry,
  multiline,
  style,
  ...props
}) {
  return (
    <View style={styles.field}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <TextInput
        style={[
          styles.input,
          multiline && styles.inputMultiline,
          error ? styles.inputError : null,
          style,
        ]}
        placeholderTextColor={THEME.colors.text.muted}
        secureTextEntry={secureTextEntry}
        multiline={multiline}
        {...props}
      />
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </View>
  );
}

export function Card({ children, style, onPress }) {
  const inner = <View style={[styles.card, style]}>{children}</View>;
  if (onPress) {
    return (
      <Pressable onPress={onPress} style={({ pressed }) => pressed && styles.pressed}>
        {inner}
      </Pressable>
    );
  }
  return inner;
}

const badgeBg = {
  blue: '#eff6ff',
  green: '#ecfdf5',
  amber: '#fffbeb',
  red: '#fef2f2',
  purple: '#f5f3ff',
  orange: '#fff7ed',
  gray: '#f1f5f9',
};

const badgeFg = {
  blue: '#2563eb',
  green: '#059669',
  amber: '#b45309',
  red: '#dc2626',
  purple: '#7c3aed',
  orange: '#c2410c',
  gray: '#475569',
};

export function Badge({ text, color = 'gray', style }) {
  const bg = badgeBg[color] || badgeBg.gray;
  const fg = badgeFg[color] || badgeFg.gray;
  return (
    <View style={[styles.badge, { backgroundColor: bg }, style]}>
      <Text style={[styles.badgeText, { color: fg }]}>{text}</Text>
    </View>
  );
}

export function Avatar({ name, size = 36, style }) {
  const initials = String(name || '?')
    .split(' ')
    .slice(0, 2)
    .map((p) => p[0])
    .join('')
    .toUpperCase();
  return (
    <View
      style={[
        styles.avatar,
        { width: size, height: size, borderRadius: size / 2 },
        style,
      ]}
    >
      <Text style={[styles.avatarText, { fontSize: size * 0.4 }]}>{initials}</Text>
    </View>
  );
}

export function Loading({ size = 'large', label }) {
  return (
    <View style={styles.center}>
      <ActivityIndicator size={size} color={THEME.colors.brand[500]} />
      {label ? <Text style={styles.loadingLabel}>{label}</Text> : null}
    </View>
  );
}

export function EmptyState({ icon = '📭', title, hint, action }) {
  return (
    <View style={styles.center}>
      <Text style={styles.emptyIcon}>{icon}</Text>
      <Text style={styles.emptyTitle}>{title || 'Rien ici pour le moment'}</Text>
      {hint ? <Text style={styles.emptyHint}>{hint}</Text> : null}
      {action}
    </View>
  );
}

export function ErrorBanner({ message, onRetry }) {
  return (
    <View style={styles.errorBanner}>
      <Text style={styles.errorBannerText}>{message}</Text>
      {onRetry ? (
        <Pressable onPress={onRetry} style={styles.retryBtn}>
          <Text style={styles.retryText}>Réessayer</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

export function Pill({ children, selected, onPress, style }) {
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.pill,
        selected ? styles.pillActive : null,
        style,
      ]}
    >
      <Text style={selected ? styles.pillTextActive : styles.pillText}>{children}</Text>
    </Pressable>
  );
}

export function Select({ label, placeholder, value, options, onChange, error }) {
  const [open, setOpen] = useState(false);
  const selected = options.find((o) => o.value === value);
  return (
    <View style={styles.field}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <Pressable
        style={[styles.select, error ? styles.inputError : null]}
        onPress={() => setOpen(true)}
      >
        <Text style={selected ? styles.selectValue : styles.selectPlaceholder}>
          {selected ? selected.label : placeholder || 'Sélectionner…'}
        </Text>
        <Ionicons name="chevron-down" size={18} color={THEME.colors.text.muted} />
      </Pressable>
      <Modal visible={open} transparent animationType="slide">
        <Pressable style={styles.modalBackdrop} onPress={() => setOpen(false)}>
          <View style={styles.modalSheet}>
            <Text style={styles.modalTitle}>{label || 'Sélectionner'}</Text>
            <ScrollView>
              {options.map((o) => (
                <Pressable
                  key={String(o.value)}
                  style={[styles.modalOption, o.value === value ? styles.modalOptionActive : null]}
                  onPress={() => {
                    onChange(o.value);
                    setOpen(false);
                  }}
                >
                  <Text
                    style={[styles.modalOptionText, o.value === value ? styles.modalOptionTextActive : null]}
                  >
                    {o.label}
                  </Text>
                  {o.value === value ? <Ionicons name="checkmark" size={18} color={THEME.colors.brand[500]} /> : null}
                </Pressable>
              ))}
            </ScrollView>
          </View>
        </Pressable>
      </Modal>
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </View>
  );
}

export function MultiSelect({ label, placeholder, values = [], options, onChange }) {
  const [open, setOpen] = useState(false);
  const labelFor = (v) => options.find((o) => o.value === v)?.label ?? String(v);
  const toggle = (v) => {
    const next = values.includes(v) ? values.filter((x) => x !== v) : [...values, v];
    onChange(next);
  };
  return (
    <View style={styles.field}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <Pressable style={styles.select} onPress={() => setOpen(true)}>
        <Text style={values.length ? styles.selectValue : styles.selectPlaceholder} numberOfLines={1}>
          {values.length ? values.map(labelFor).join(', ') : placeholder || 'Sélectionner…'}
        </Text>
        <Ionicons name="chevron-down" size={18} color={THEME.colors.text.muted} />
      </Pressable>
      <Modal visible={open} transparent animationType="slide">
        <Pressable style={styles.modalBackdrop} onPress={() => setOpen(false)}>
          <View style={styles.modalSheet}>
            <Text style={styles.modalTitle}>{label || 'Sélectionner'}</Text>
            <ScrollView>
              {options.map((o) => {
                const active = values.includes(o.value);
                return (
                  <Pressable key={String(o.value)} style={[styles.modalOption, active ? styles.modalOptionActive : null]} onPress={() => toggle(o.value)}>
                    <Text style={[styles.modalOptionText, active ? styles.modalOptionTextActive : null]}>
                      {o.label}
                    </Text>
                    {active ? <Ionicons name="checkmark" size={18} color={THEME.colors.brand[500]} /> : null}
                  </Pressable>
                );
              })}
            </ScrollView>
            <Button title="OK" onPress={() => setOpen(false)} style={styles.multiOk} />
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: THEME.colors.background },
  scroll: { flex: 1 },
  content: { padding: 16 },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  titleWrap: { flex: 1 },
  title: { fontSize: tw.h1, fontWeight: '700', color: THEME.colors.text.primary },
  subtitle: { fontSize: tw.sm, color: THEME.colors.text.secondary, marginTop: 2 },
  button: {
    height: 48,
    borderRadius: THEME.radii.lg,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
  },
  buttonSm: { height: 34, borderRadius: THEME.radii.md, paddingHorizontal: 12 },
  buttonLg: { height: 54, borderRadius: THEME.radii.xl },
  buttonInner: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  buttonText: { fontSize: tw.md, fontWeight: '600' },
  buttonTextSm: { fontSize: tw.sm },
  pressed: { opacity: 0.85 },
  field: { marginBottom: 14 },
  label: { fontSize: tw.sm, fontWeight: '600', color: THEME.colors.text.secondary, marginBottom: 6 },
  input: {
    borderWidth: 1,
    borderColor: THEME.colors.border,
    borderRadius: THEME.radii.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: tw.md,
    color: THEME.colors.text.primary,
    backgroundColor: THEME.colors.surface,
  },
  inputMultiline: { minHeight: 90, textAlignVertical: 'top' },
  inputError: { borderColor: THEME.colors.danger },
  errorText: { color: THEME.colors.danger, fontSize: tw.xs, marginTop: 4 },
  card: {
    backgroundColor: THEME.colors.surface,
    borderRadius: THEME.radii.lg,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    padding: 16,
    marginBottom: 12,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    alignSelf: 'flex-start',
  },
  badgeText: { fontSize: tw.xs, fontWeight: '600' },
  avatar: {
    backgroundColor: THEME.colors.brand[100],
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: THEME.colors.brand[700], fontWeight: '700' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  loadingLabel: { marginTop: 10, color: THEME.colors.text.secondary },
  emptyIcon: { fontSize: 40, marginBottom: 10 },
  emptyTitle: { fontSize: tw.lg, fontWeight: '600', color: THEME.colors.text.primary },
  emptyHint: { fontSize: tw.sm, color: THEME.colors.text.secondary, marginTop: 6, textAlign: 'center' },
  errorBanner: {
    backgroundColor: THEME.colors.danger,
    borderRadius: THEME.radii.md,
    padding: 12,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  errorBannerText: { color: '#fff', flex: 1, fontSize: tw.sm },
  retryBtn: { paddingHorizontal: 10, paddingVertical: 6 },
  retryText: { color: '#fff', fontWeight: '700' },
  pill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: THEME.colors.surface,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    marginRight: 8,
  },
  pillActive: { backgroundColor: THEME.colors.brand[500], borderColor: THEME.colors.brand[500] },
  pillText: { color: THEME.colors.text.secondary, fontSize: tw.sm, fontWeight: '600' },
  pillTextActive: { color: '#fff', fontSize: tw.sm, fontWeight: '600' },
  select: {
    borderWidth: 1,
    borderColor: THEME.colors.border,
    borderRadius: THEME.radii.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: THEME.colors.surface,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  selectValue: { fontSize: tw.md, color: THEME.colors.text.primary },
  selectPlaceholder: { fontSize: tw.md, color: THEME.colors.text.muted },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: THEME.colors.background,
    borderTopLeftRadius: THEME.radii.xl,
    borderTopRightRadius: THEME.radii.xl,
    padding: 16,
    paddingBottom: 32,
    maxHeight: '70%',
  },
  modalTitle: { fontSize: tw.lg, fontWeight: '700', marginBottom: 12 },
  modalOption: {
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: THEME.radii.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  modalOptionActive: { backgroundColor: THEME.colors.brand[50] },
  modalOptionText: { fontSize: tw.md, color: THEME.colors.text.primary },
  modalOptionTextActive: { fontWeight: '700', color: THEME.colors.brand[700] },
  multiOk: { marginTop: 12 },
});