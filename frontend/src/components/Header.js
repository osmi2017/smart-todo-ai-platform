import React from 'react';
import {
  Box,
  Flex,
  HStack,
  IconButton,
  Input,
  InputGroup,
  InputLeftElement,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  MenuDivider,
  Avatar,
  Text,
  Badge,
  useColorModeValue,
} from '@chakra-ui/react';
import {
  FiSearch,
  FiBell,
  FiLogOut,
  FiUser,
  FiSettings,
  FiHelpCircle,
} from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Header = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const bgColor = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.700');

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <Box
      as="header"
      bg={bgColor}
      borderBottom="1px"
      borderColor={borderColor}
      px={6}
      py={3}
      position="sticky"
      top={0}
      zIndex={10}
    >
      <Flex justify="space-between" align="center">
        {/* Search */}
        <InputGroup maxW="400px">
          <InputLeftElement pointerEvents="none">
            <FiSearch color="gray.300" />
          </InputLeftElement>
          <Input
            type="search"
            placeholder="Rechercher une tâche, un projet..."
            borderRadius="full"
            bg="gray.50"
            _focus={{ bg: 'white', boxShadow: 'outline' }}
          />
        </InputGroup>

        {/* Right section */}
        <HStack spacing={3}>
          {/* Notifications */}
          <Menu>
            <MenuButton
              as={IconButton}
              icon={<FiBell />}
              variant="ghost"
              borderRadius="full"
              position="relative"
              aria-label="Notifications"
            />
            <MenuList>
              <Box p={3}>
                <Text fontWeight="600">Notifications</Text>
                <Text fontSize="sm" color="gray.500" mt={1}>
                  Vous n'avez pas de nouvelles notifications
                </Text>
              </Box>
            </MenuList>
          </Menu>

          {/* User menu */}
          <Menu>
            <MenuButton>
              <HStack spacing={2}>
                <Avatar size="sm" name={user?.username} />
                <Box display={{ base: 'none', md: 'block' }} textAlign="left">
                  <Text fontSize="sm" fontWeight="600">
                    {user?.username}
                  </Text>
                  <Text fontSize="xs" color="gray.500">
                    {user?.email}
                  </Text>
                </Box>
              </HStack>
            </MenuButton>
            <MenuList>
              <MenuItem icon={<FiUser />} onClick={() => navigate('/profile')}>
                Mon profil
              </MenuItem>
              <MenuItem icon={<FiSettings />} onClick={() => navigate('/settings')}>
                Paramètres
              </MenuItem>
              <MenuItem icon={<FiHelpCircle />} onClick={() => window.open('/docs', '_blank')}>
                Aide
              </MenuItem>
              <MenuDivider />
              <MenuItem icon={<FiLogOut />} onClick={handleLogout} color="red.500">
                Déconnexion
              </MenuItem>
            </MenuList>
          </Menu>

          {/* ML Badge */}
          <Badge colorScheme="purple" variant="subtle" px={3} py={1} borderRadius="full">
            <HStack spacing={1}>
              <Text fontSize="xs">🤖 IA Active</Text>
            </HStack>
          </Badge>
        </HStack>
      </Flex>
    </Box>
  );
};

export default Header;
