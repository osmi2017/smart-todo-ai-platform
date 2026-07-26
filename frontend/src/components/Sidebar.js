import React, { useState, useEffect } from 'react';
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
  Tooltip,
  IconButton,
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
  FiHardDrive,
  FiMap,
  FiChevronLeft,
  FiChevronRight,
} from 'react-icons/fi';
import { useAuth } from '../context/AuthContext';
import { useQuery } from 'react-query';
import { useTaskService } from '../services/taskService';

const Sidebar = ({ collapsed, onToggle, isMobile, isOpen, onClose }) => {
  const location = useLocation();
  const { user, isAdmin, isSuperAdmin, company } = useAuth();
  const taskService = useTaskService();
  const bgColor = useColorModeValue('white', 'gray.900');
  const borderColor = useColorModeValue('gray.100', 'gray.800');
  const hoverBg = useColorModeValue('gray.50', 'gray.800');
  const activeBg = useColorModeValue('brand.50', 'brand.900');
  const activeColor = useColorModeValue('brand.600', 'brand.200');
  const textColor = useColorModeValue('gray.600', 'gray.300');
  const mutedColor = useColorModeValue('gray.400', 'gray.500');

  // Fetch real task count
  const { data: tasks } = useQuery(
    'sidebar-task-count',
    () => taskService.getTasks(),
    { staleTime: 2 * 60 * 1000 }
  );
  const taskCount = Array.isArray(tasks) ? tasks.length : (tasks?.results?.length || 0);

  const menuItems = [
    { path: '/dashboard', name: 'Tableau de bord', icon: FiHome },
    { path: '/projects', name: 'Projets', icon: FiFolder },
    { path: '/tasks', name: 'Tâches', icon: FiCheckSquare },
    { path: '/kanban', name: 'Kanban', icon: FiColumns },
    { path: '/milestones', name: 'Jalons', icon: FiCalendar },
    { path: '/meetings', name: 'Meetings', icon: FiMic },
    { path: '/files', name: 'Fichiers', icon: FiHardDrive },
    { path: '/missions', name: 'Missions', icon: FiMap },
    { path: '/analytics', name: 'Analytics', icon: FiBarChart2 },
    ...(isAdmin ? [
      { path: '/admin/users', name: 'Utilisateurs', icon: FiUsers },
      { path: '/admin/groups', name: 'Groupes', icon: FiGrid },
    ] : []),
    ...(isSuperAdmin ? [
      { path: '/admin/companies', name: 'Entreprises', icon: FiBriefcase },
    ] : []),
  ];

  const sidebarWidth = collapsed ? '72px' : '260px';

  const SidebarContent = () => (
    <VStack spacing={0} align="stretch" h="100%">
      {/* Logo */}
      <HStack
        spacing={3}
        px={collapsed ? 3 : 5}
        py={5}
        justify={collapsed ? 'center' : 'flex-start'}
      >
        <Box
          w={10}
          h={10}
          borderRadius="xl"
          bgGradient="linear(135deg, brand.500, accent.500)"
          display="flex"
          alignItems="center"
          justifyContent="center"
          flexShrink={0}
        >
          <Icon as={FiCpu} color="white" boxSize={5} />
        </Box>
        {!collapsed && (
          <Box>
            <Heading size="sm" fontWeight="700" color="gray.800">
              SmartTodoAI
            </Heading>
            <Text fontSize="xs" color={mutedColor}>
              Gestion de projets
            </Text>
          </Box>
        )}
      </HStack>

      <Divider mx={4} borderColor={borderColor} />

      {/* Menu items */}
      <VStack
        spacing={1}
        align="stretch"
        flex={1}
        px={3}
        py={4}
        overflowY="auto"
        css={{
          '&::-webkit-scrollbar': { width: '4px' },
          '&::-webkit-scrollbar-thumb': { background: 'gray.200', borderRadius: '24px' },
        }}
      >
        {menuItems.map((item) => {
          const isActive = location.pathname === item.path ||
            (item.path !== '/dashboard' && location.pathname.startsWith(item.path));
          const MenuItemContent = (
            <HStack
              as={RouterLink}
              to={item.path}
              spacing={3}
              px={collapsed ? 0 : 3}
              py={2.5}
              mx={collapsed ? 0 : 1}
              borderRadius="lg"
              bg={isActive ? activeBg : 'transparent'}
              color={isActive ? activeColor : textColor}
              justify={collapsed ? 'center' : 'flex-start'}
              _hover={{
                bg: isActive ? activeBg : hoverBg,
                color: isActive ? activeColor : 'gray.800',
                textDecoration: 'none',
              }}
              transition="all 0.15s ease"
              position="relative"
            >
              {isActive && (
                <Box
                  position="absolute"
                  left={collapsed ? '50%' : 0}
                  top="50%"
                  transform={collapsed ? 'translate(-50%, -50%)' : 'translateY(-50%)'}
                  w={collapsed ? '20px' : '3px'}
                  h="20px"
                  borderRadius="full"
                  bgGradient="linear(135deg, brand.500, accent.500)"
                />
              )}
              <Icon as={item.icon} boxSize={5} flexShrink={0} />
              {!collapsed && (
                <Text
                  fontSize="sm"
                  fontWeight={isActive ? '600' : '400'}
                  whiteSpace="nowrap"
                >
                  {item.name}
                </Text>
              )}
              {!collapsed && item.name === 'Tâches' && taskCount > 0 && (
                <Badge
                  colorScheme="red"
                  ml="auto"
                  borderRadius="full"
                  fontSize="xs"
                  px={2}
                >
                  {taskCount > 99 ? '99+' : taskCount}
                </Badge>
              )}
            </HStack>
          );

          return collapsed ? (
            <Tooltip key={item.path} label={item.name} placement="right" hasArrow>
              {MenuItemContent}
            </Tooltip>
          ) : (
            <Box key={item.path}>{MenuItemContent}</Box>
          );
        })}
      </VStack>

      <Divider mx={4} borderColor={borderColor} />

      {/* User info */}
      {user && (
        <HStack
          spacing={3}
          px={collapsed ? 3 : 4}
          py={4}
          justify={collapsed ? 'center' : 'flex-start'}
        >
          <Avatar
            size="sm"
            name={user.username}
            bgGradient="linear(135deg, brand.400, accent.400)"
            color="white"
          />
          {!collapsed && (
            <Box flex={1} minW={0}>
              <Text fontWeight="600" fontSize="sm" noOfLines={1}>
                {user.username}
              </Text>
              <HStack spacing={1}>
                <Badge
                  colorScheme={isSuperAdmin ? 'purple' : isAdmin ? 'orange' : 'green'}
                  variant="subtle"
                  fontSize="xs"
                  px={1.5}
                >
                  {user.role === 'superadmin' ? 'SuperAdmin' : user.role === 'admin' ? 'Admin' : 'User'}
                </Badge>
              </HStack>
            </Box>
          )}
        </HStack>
      )}
    </VStack>
  );

  // Mobile: render as Drawer content
  if (isMobile) {
    return <SidebarContent />;
  }

  // Desktop: fixed sidebar
  return (
    <Box
      as="aside"
      position="fixed"
      left={0}
      top={0}
      h="100vh"
      w={sidebarWidth}
      bg={bgColor}
      borderRight="1px solid"
      borderColor={borderColor}
      zIndex={30}
      className="sidebar-transition"
      display={{ base: 'none', lg: 'block' }}
    >
      <SidebarContent />

      {/* Collapse toggle */}
      <IconButton
        icon={collapsed ? <FiChevronRight /> : <FiChevronLeft />}
        onClick={onToggle}
        position="absolute"
        right={-3}
        top="50%"
        transform="translateY(-50%)"
        size="xs"
        colorScheme="gray"
        borderRadius="full"
        boxShadow="md"
        zIndex={10}
        aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      />
    </Box>
  );
};

export default Sidebar;
