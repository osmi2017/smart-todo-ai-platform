import React from 'react';
import { ScrollView, StyleSheet, Text, View, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../context/AuthContext';
import { Avatar, Badge } from '../../components/ui';
import { THEME, ROLE_COLORS } from '../../theme';

const ROLE_LABEL = { superadmin: 'Super Admin', admin: 'Admin', user: 'Utilisateur' };

function MenuItem({ icon, label, tint, onPress, right }) {
  return (
    <Pressable style={styles.itemRow} onPress={onPress}>
      <View style={[styles.itemIcon, { backgroundColor: (tint || THEME.colors.brand[500]) + '1a' }]}>
        <Ionicons name={icon} size={20} color={tint || THEME.colors.brand[500]} />
      </View>
      <Text style={styles.itemLabel}>{label}</Text>
      <View style={styles.itemRight}>{right || <Ionicons name="chevron-forward" size={18} color={THEME.colors.text.muted} />}</View>
    </Pressable>
  );
}

export default function More({ navigation }) {
  const { user, company, isAdmin, isSuperAdmin } = useAuth();
  const fullName = [user?.first_name, user?.last_name].filter(Boolean).join(' ');

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.profileCard}>
          <View style={styles.profileRow}>
            <Avatar name={fullName || user?.username} size={58} />
            <View style={styles.profileInfo}>
              <Text style={styles.profileName}>{fullName || user?.username}</Text>
              <Text style={styles.profileEmail}>{user?.email}</Text>
              <View style={styles.roleRow}>
                <Badge
                  text={ROLE_LABEL[user?.role] || user?.role}
                  color={user?.role === 'superadmin' ? 'purple' : user?.role === 'admin' ? 'orange' : 'green'}
                />
                {company ? <Badge text={company.name} color="blue" /> : null}
              </View>
            </View>
          </View>
        </View>

        <Text style={styles.section}>Travail</Text>
        <View style={styles.group}>
          <MenuItem icon="notifications-outline" label="Notifications" onPress={() => navigation.navigate('Notifications')} />
          <MenuItem icon="flag-outline" label="Jalons" onPress={() => navigation.navigate('Milestones')} />
          <MenuItem icon="videocam-outline" label="Réunions" onPress={() => navigation.navigate('Meetings')} />
          <MenuItem icon="folder-open-outline" label="Fichiers" onPress={() => navigation.navigate('Files')} />
          <MenuItem icon="airplane-outline" label="Missions" onPress={() => navigation.navigate('Missions')} />
          <MenuItem icon="bar-chart-outline" label="Analyses" onPress={() => navigation.navigate('Analytics')} />
        </View>

        {isAdmin ? (
          <>
            <Text style={styles.section}>Administration</Text>
            <View style={styles.group}>
              <MenuItem icon="person-add-outline" label="Utilisateurs" tint={THEME.colors.accent} onPress={() => navigation.navigate('Users')} />
              <MenuItem icon="people-outline" label="Groupes" tint={THEME.colors.accent} onPress={() => navigation.navigate('Groups')} />
              {isSuperAdmin ? (
                <MenuItem icon="business-outline" label="Entreprises" tint={THEME.colors.accent} onPress={() => navigation.navigate('Companies')} />
              ) : null}
            </View>
          </>
        ) : null}

        <Text style={styles.section}>Compte</Text>
        <View style={styles.group}>
          <MenuItem icon="settings-outline" label="Paramètres" onPress={() => navigation.navigate('Settings')} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: THEME.colors.background },
  content: { padding: 16, paddingBottom: 40 },
  profileCard: {
    backgroundColor: THEME.colors.surface,
    borderRadius: THEME.radii.xl,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    padding: 20,
    marginBottom: 16,
  },
  profileRow: { flexDirection: 'row', alignItems: 'center' },
  profileInfo: { marginLeft: 16, flex: 1 },
  profileName: { fontSize: THEME.text.lg, fontWeight: '800' },
  profileEmail: { color: THEME.colors.text.secondary, fontSize: THEME.text.sm, marginTop: 2 },
  roleRow: { flexDirection: 'row', gap: 6, marginTop: 8 },
  section: { fontSize: THEME.text.xs, fontWeight: '700', color: THEME.colors.text.muted, textTransform: 'uppercase', marginTop: 16, marginBottom: 8, paddingHorizontal: 4 },
  group: {
    backgroundColor: THEME.colors.surface,
    borderRadius: THEME.radii.lg,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    marginBottom: 8,
  },
  itemRow: { flexDirection: 'row', alignItems: 'center', padding: 14, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: THEME.colors.border },
  itemIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  itemLabel: { flex: 1, fontSize: THEME.text.md, fontWeight: '600', color: THEME.colors.text.primary },
  itemRight: {},
});