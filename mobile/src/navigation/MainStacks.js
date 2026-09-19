import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { THEME } from '../theme';

import Dashboard from '../screens/main/Dashboard';
import Notifications from '../screens/main/Notifications';

import Tasks from '../screens/main/Tasks';
import TaskDetail from '../screens/main/TaskDetail';
import TaskForm from '../screens/main/TaskForm';

import Projects from '../screens/main/Projects';
import ProjectDetail from '../screens/main/ProjectDetail';
import ProjectForm from '../screens/main/ProjectForm';

import Meetings from '../screens/main/Meetings';
import MeetingDetail from '../screens/main/MeetingDetail';
import MeetingForm from '../screens/main/MeetingForm';
import VideoMeeting from '../screens/main/VideoMeeting';

import Kanban from '../screens/main/Kanban';

import More from '../screens/main/More';
import Search from '../screens/main/Search';
import Milestones from '../screens/main/Milestones';
import MilestoneDetail from '../screens/main/MilestoneDetail';
import Analytics from '../screens/main/Analytics';
import Files from '../screens/main/Files';
import Missions from '../screens/main/Missions';
import MissionDetail from '../screens/main/MissionDetail';
import MissionForm from '../screens/main/MissionForm';
import Settings from '../screens/main/Settings';

import Companies from '../screens/admin/Companies';
import Groups from '../screens/admin/Groups';
import Users from '../screens/admin/Users';

const Stack = createNativeStackNavigator();

const headerOptions = {
  headerStyle: { backgroundColor: THEME.colors.surface },
  headerTintColor: THEME.colors.text.primary,
  headerTitleStyle: { fontWeight: '700' },
  headerShadowVisible: false,
};

export function HomeStack() {
  return (
    <Stack.Navigator screenOptions={headerOptions}>
      <Stack.Screen name="Dashboard" component={Dashboard} options={{ headerShown: false }} />
      <Stack.Screen name="Notifications" component={Notifications} options={{ title: 'Notifications' }} />
      <Stack.Screen name="Search" component={Search} options={{ title: 'Recherche' }} />
      <Stack.Screen name="TaskDetail" component={TaskDetail} options={{ title: 'Détail de la tâche' }} />
      <Stack.Screen name="TaskForm" component={TaskForm} options={{ title: 'Nouvelle tâche' }} />
      <Stack.Screen name="ProjectDetail" component={ProjectDetail} options={{ title: 'Projet' }} />
    </Stack.Navigator>
  );
}

export function TasksStack() {
  return (
    <Stack.Navigator screenOptions={headerOptions}>
      <Stack.Screen name="Tasks" component={Tasks} options={{ title: 'Tâches' }} />
      <Stack.Screen name="TaskDetail" component={TaskDetail} options={{ title: 'Détail de la tâche' }} />
      <Stack.Screen name="TaskForm" component={TaskForm} options={{ title: 'Nouvelle tâche' }} />
    </Stack.Navigator>
  );
}

export function ProjectsStack() {
  return (
    <Stack.Navigator screenOptions={headerOptions}>
      <Stack.Screen name="Projects" component={Projects} options={{ title: 'Projets' }} />
      <Stack.Screen name="ProjectDetail" component={ProjectDetail} options={{ title: 'Projet' }} />
      <Stack.Screen name="ProjectForm" component={ProjectForm} options={{ title: 'Nouveau projet' }} />
      <Stack.Screen name="TaskDetail" component={TaskDetail} options={{ title: 'Détail de la tâche' }} />
      <Stack.Screen name="TaskForm" component={TaskForm} options={{ title: 'Nouvelle tâche' }} />
    </Stack.Navigator>
  );
}

export function KanbanStack() {
  return (
    <Stack.Navigator screenOptions={headerOptions}>
      <Stack.Screen name="Kanban" component={Kanban} options={{ title: 'Tableau Kanban' }} />
      <Stack.Screen name="TaskDetail" component={TaskDetail} options={{ title: 'Détail de la tâche' }} />
      <Stack.Screen name="TaskForm" component={TaskForm} options={{ title: 'Nouvelle tâche' }} />
    </Stack.Navigator>
  );
}

export function MoreStack() {
  return (
    <Stack.Navigator screenOptions={headerOptions}>
      <Stack.Screen name="More" component={More} options={{ headerShown: false }} />
      <Stack.Screen name="Notifications" component={Notifications} options={{ title: 'Notifications' }} />
      <Stack.Screen name="Search" component={Search} options={{ title: 'Recherche' }} />
      <Stack.Screen name="Milestones" component={Milestones} options={{ title: 'Jalons' }} />
      <Stack.Screen name="MilestoneDetail" component={MilestoneDetail} options={{ title: 'Jalon' }} />
      <Stack.Screen name="Meetings" component={Meetings} options={{ title: 'Réunions' }} />
      <Stack.Screen name="MeetingDetail" component={MeetingDetail} options={{ title: 'Réunion' }} />
      <Stack.Screen name="MeetingForm" component={MeetingForm} options={{ title: 'Nouvelle réunion' }} />
      <Stack.Screen name="VideoMeeting" component={VideoMeeting} options={{ headerShown: false, gestureEnabled: false }} />
      <Stack.Screen name="Missions" component={Missions} options={{ title: 'Missions' }} />
      <Stack.Screen name="MissionDetail" component={MissionDetail} options={{ title: 'Mission' }} />
      <Stack.Screen name="MissionForm" component={MissionForm} options={{ title: 'Nouvelle mission' }} />
      <Stack.Screen name="Analytics" component={Analytics} options={{ title: 'Analyses' }} />
      <Stack.Screen name="Files" component={Files} options={{ title: 'Fichiers' }} />
      <Stack.Screen name="Settings" component={Settings} options={{ title: 'Paramètres' }} />
      <Stack.Screen name="Companies" component={Companies} options={{ title: 'Entreprises' }} />
      <Stack.Screen name="Groups" component={Groups} options={{ title: 'Groupes' }} />
      <Stack.Screen name="Users" component={Users} options={{ title: 'Utilisateurs' }} />
    </Stack.Navigator>
  );
}