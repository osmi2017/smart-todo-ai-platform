import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ChakraProvider, CSSReset, extendTheme } from '@chakra-ui/react';
import { QueryClient, QueryClientProvider } from 'react-query';
import { AuthProvider } from './context/AuthContext';
import './App.css';

// Pages
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Projects from './pages/Projects';
import ProjectDetail from './pages/ProjectDetail';
import Tasks from './pages/Tasks';
import TaskDetail from './pages/TaskDetail';
import TaskForm from './pages/TaskForm';  // ← IMPORT AJOUTÉ
import Kanban from './pages/Kanban';
import Milestones from './pages/Milestones';  // ← IMPORT AJOUTÉ
import Profile from './pages/Profile';
import Analytics from './pages/Analytics';
import Meetings from './pages/Meetings';
import MeetingDetail from './pages/MeetingDetail';
import MeetingForm from './pages/MeetingForm';
import VideoMeeting from './pages/VideoMeeting';
import Files from './pages/Files';
import Missions from './pages/Missions';
import MissionForm from './pages/MissionForm';
import MissionDetail from './pages/MissionDetail';
import CompanyManagement from './pages/admin/CompanyManagement';
import GroupManagement from './pages/admin/GroupManagement';
import UserManagement from './pages/admin/UserManagement';

// Components
import Layout from './components/Layout';
import PrivateRoute from './components/PrivateRoute';

// Thème personnalisé Chakra UI
const theme = extendTheme({
  colors: {
    brand: {
      50: '#eef2ff',
      100: '#dce4ff',
      200: '#b9c9ff',
      300: '#8ba8ff',
      400: '#5b7cff',
      500: '#3b5bdb',
      600: '#2b43b0',
      700: '#1e3288',
      800: '#142263',
      900: '#0c1542',
    },
    accent: {
      50: '#fdf4ff',
      100: '#fae8ff',
      200: '#f5d0fe',
      300: '#f0abfc',
      400: '#e879f9',
      500: '#d946ef',
      600: '#c026d3',
      700: '#a21caf',
      800: '#86198f',
      900: '#701a75',
    },
    success: { 50: '#ecfdf5', 500: '#10b981', 600: '#059669' },
    warning: { 50: '#fffbeb', 500: '#f59e0b', 600: '#d97706' },
    danger: { 50: '#fef2f2', 500: '#ef4444', 600: '#dc2626' },
  },
  fonts: {
    heading: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    body: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  },
  fontSizes: {
    xs: '0.75rem',
    sm: '0.875rem',
    md: '1rem',
    lg: '1.125rem',
    xl: '1.25rem',
    '2xl': '1.5rem',
    '3xl': '1.875rem',
    '4xl': '2.25rem',
  },
  config: {
    initialColorMode: 'light',
    useSystemColorMode: false,
  },
  styles: {
    global: {
      body: {
        bg: '#f8fafc',
        color: 'gray.800',
      },
    },
  },
  components: {
    Button: {
      baseStyle: {
        fontWeight: '500',
        borderRadius: 'xl',
        _hover: { transform: 'translateY(-1px)', boxShadow: 'lg' },
        _active: { transform: 'translateY(0)' },
      },
    },
    Card: {
      baseStyle: {
        bg: 'white',
        borderRadius: 'xl',
        border: '1px solid',
        borderColor: 'gray.100',
        boxShadow: 'sm',
        _hover: { boxShadow: 'md' },
        transition: 'all 0.2s',
      },
    },
    Input: {
      defaultProps: { focusBorderColor: 'brand.500' },
      variants: {
        outline: {
          field: {
            borderRadius: 'lg',
            _hover: { borderColor: 'gray.300' },
          },
        },
      },
    },
    Select: {
      defaultProps: { focusBorderColor: 'brand.500' },
      variants: {
        outline: {
          field: {
            borderRadius: 'lg',
            _hover: { borderColor: 'gray.300' },
          },
        },
      },
    },
    Badge: {
      baseStyle: { borderRadius: 'full', fontWeight: '500' },
    },
  },
});

// Client React Query
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ChakraProvider theme={theme}>
        <CSSReset />
        <AuthProvider>
          <Router>
            <div className="App">
              <Routes>
                {/* Routes publiques */}
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
                
                {/* Routes protégées avec Layout */}
                <Route path="/" element={<PrivateRoute><Layout /></PrivateRoute>}>
                  <Route index element={<Navigate to="/dashboard" replace />} />
                  <Route path="dashboard" element={<Dashboard />} />
                  <Route path="projects" element={<Projects />} />
                  <Route path="projects/:id" element={<ProjectDetail />} />
                  <Route path="tasks" element={<Tasks />} />
                  <Route path="tasks/create" element={<TaskForm />} />  {/* ← Route pour création */}
                  <Route path="tasks/:id" element={<TaskDetail />} />
                  <Route path="tasks/:id/edit" element={<TaskForm />} />  {/* ← Route pour édition */}
                  <Route path="kanban" element={<Kanban />} />
                  <Route path="milestones" element={<Milestones />} />
                  <Route path="meetings" element={<Meetings />} />
                  <Route path="meetings/create" element={<MeetingForm />} />
                  <Route path="meetings/:id" element={<MeetingDetail />} />
                  <Route path="meetings/:id/edit" element={<MeetingForm />} />
                  <Route path="meetings/:id/video" element={<VideoMeeting />} />
                  <Route path="files" element={<Files />} />
                  <Route path="missions" element={<Missions />} />
                  <Route path="missions/create" element={<MissionForm />} />
                  <Route path="missions/:id" element={<MissionDetail />} />
                  <Route path="missions/:id/edit" element={<MissionForm />} />
                  <Route path="analytics" element={<Analytics />} />
                  <Route path="admin/companies" element={<CompanyManagement />} />
                  <Route path="admin/groups" element={<GroupManagement />} />
                  <Route path="admin/users" element={<UserManagement />} />
                  /*<Route path="profile" element={<Profile />} />*/
                </Route>
              </Routes>
            </div>
          </Router>
        </AuthProvider>
      </ChakraProvider>
    </QueryClientProvider>
  );
}

export default App;
