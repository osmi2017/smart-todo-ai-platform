import React from 'react';
import { Link as RouterLink, useLocation } from 'react-router-dom';
import {
  Box,
  VStack,
  HStack,
  Text,
  Icon,
  Link,
  Avatar,
  Divider,
  useColorModeValue,
  Heading,
  Badge,
} from '@chakra-ui/react';
import {
  FiHome,
  FiFolder,
  FiCheckSquare,
  FiColumns,
  FiUser,
  FiSettings,
  FiBarChart2,
  FiCpu,
  FiCalendar,
  FiClock,
  FiFlag,
  FiMic,
  FiUsers,
  FiBriefcase,
  FiGrid,
  FiShield,
} from 'react-icons/fi';
import { useAuth } from '../context/AuthContext';

const Sidebar = () => {
  const location = useLocation();
  const { user, isAdmin, isSuperAdmin, company } = useAuth();
  const bgColor = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.700');

  const menuItems = [
    { path: '/dashboard', name: 'Tableau de bord', icon: FiHome },
    { path: '/projects', name: 'Projets', icon: FiFolder },
    { path: '/tasks', name: 'Tâches', icon: FiCheckSquare },
    { path: '/kanban', name: 'Kanban', icon: FiColumns },
    { path: '/milestones', name: 'Jalons', icon: FiCalendar },
    { path: '/meetings', name: 'Meetings', icon: FiMic },
    { path: '/analytics', name: 'Analytics', icon: FiBarChart2 },
    ...(isAdmin ? [
      { path: '/admin/users', name: 'Utilisateurs', icon: FiUsers },
      { path: '/admin/groups', name: 'Groupes', icon: FiGrid },
    ] : []),
    ...(isSuperAdmin ? [
      { path: '/admin/companies', name: 'Entreprises', icon: FiBriefcase },
    ] : []),
    { path: '/profile', name: 'Profil', icon: FiUser },
    { path: '/settings', name: 'Paramètres', icon: FiSettings },
  ];

  return (
    <Box
      as="aside"
      position="fixed"
      left={0}
      top={0}
      h="100vh"
      w="250px"
      bg={bgColor}
      borderRight="1px"
      borderColor={borderColor}
      boxShadow="sm"
      overflowY="auto"
      css={{
        '&::-webkit-scrollbar': {
          width: '4px',
        },
        '&::-webkit-scrollbar-track': {
          width: '6px',
        },
        '&::-webkit-scrollbar-thumb': {
          background: 'gray.300',
          borderRadius: '24px',
        },
      }}
    >
      <VStack spacing={6} align="stretch" p={4}>
        {/* Logo */}
        <HStack spacing={3} px={2} py={4}>
          <Icon as={FiCpu} boxSize={8} color="blue.500" />
          <Heading size="md" color="blue.500">SmartTodoAI</Heading>
        </HStack>

        <Divider />

        {/* Menu items */}
        <VStack spacing={1} align="stretch">
          {menuItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                as={RouterLink}
                to={item.path}
                _hover={{ textDecoration: 'none' }}
              >
                <HStack
                  spacing={4}
                  px={4}
                  py={3}
                  borderRadius="lg"
                  bg={isActive ? 'blue.50' : 'transparent'}
                  color={isActive ? 'blue.600' : 'gray.600'}
                  _hover={{
                    bg: isActive ? 'blue.100' : 'gray.100',
                    transform: 'translateX(4px)',
                  }}
                  transition="all 0.2s"
                >
                  <Icon as={item.icon} boxSize={5} />
                  <Text fontWeight={isActive ? '600' : '400'}>{item.name}</Text>
                  {item.name === 'Tâches' && (
                    <Badge colorScheme="red" ml="auto" borderRadius="full">
                      3
                    </Badge>
                  )}
                </HStack>
              </Link>
            );
          })}
        </VStack>

        <Divider />

        {/* User info */}
        {user && (
          <HStack spacing={3} px={2} py={3}>
            <Avatar size="sm" name={user.username} />
            <Box flex={1}>
              <Text fontWeight="600" fontSize="sm">{user.username}</Text>
              <Text fontSize="xs" color="gray.500">{user.email}</Text>
            </Box>
            <Badge
              colorScheme={isSuperAdmin ? 'purple' : isAdmin ? 'orange' : 'green'}
              variant="subtle"
            >
              {user.role === 'superadmin' ? 'SuperAdmin' : user.role === 'admin' ? 'Admin' : 'User'}
            </Badge>
          </HStack>
        )}
      </VStack>
    </Box>
  );
};

export default Sidebar;
