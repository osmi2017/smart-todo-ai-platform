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
      50: '#e6f7ff',
      100: '#b3e0ff',
      200: '#80c9ff',
      300: '#4db2ff',
      400: '#1a9bff',
      500: '#0082e6',
      600: '#0065b3',
      700: '#004880',
      800: '#002b4d',
      900: '#000f1a',
    },
  },
  fonts: {
    heading: 'Inter, sans-serif',
    body: 'Inter, sans-serif',
  },
  config: {
    initialColorMode: 'light',
    useSystemColorMode: false,
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
                  <Route path="analytics" element={<Analytics />} />
                  <Route path="admin/companies" element={<CompanyManagement />} />
                  <Route path="admin/groups" element={<GroupManagement />} />
                  <Route path="admin/users" element={<UserManagement />} />
                  <Route path="profile" element={<Profile />} />
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
