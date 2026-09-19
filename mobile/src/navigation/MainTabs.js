import React from 'react';
import { StyleSheet, View } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { THEME } from '../theme';
import { HomeStack, TasksStack, ProjectsStack, KanbanStack, MoreStack } from './MainStacks';

const Tab = createBottomTabNavigator();

export default function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: THEME.colors.brand[500],
        tabBarInactiveTintColor: THEME.colors.text.muted,
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
        tabBarStyle: styles.tabBar,
        tabBarIcon: ({ color, size, focused }) => {
          const icons = {
            Accueil: focused ? 'home' : 'home-outline',
            Tasks: focused ? 'checkbox' : 'checkbox-outline',
            Projects: focused ? 'folder-open' : 'folder-open-outline',
            Kanban: focused ? 'tablet-portrait' : 'tablet-portrait-outline',
            More: focused ? 'grid' : 'grid-outline',
          };
          return <Ionicons name={icons[route.name]} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Accueil" component={HomeStack} options={{ title: 'Accueil' }} />
      <Tab.Screen name="Projects" component={ProjectsStack} options={{ title: 'Projets' }} />
      <Tab.Screen name="Tasks" component={TasksStack} options={{ title: 'Tâches' }} />
      <Tab.Screen name="Kanban" component={KanbanStack} options={{ title: 'Kanban' }} />
      <Tab.Screen name="More" component={MoreStack} options={{ title: 'Plus' }} />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: THEME.colors.surface,
    borderTopWidth: 1,
    borderTopColor: THEME.colors.border,
    height: 64,
    paddingBottom: 8,
    paddingTop: 6,
  },
});