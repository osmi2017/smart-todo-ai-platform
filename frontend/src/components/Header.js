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
  useDisclosure,
  Drawer,
  DrawerOverlay,
  DrawerContent,
  DrawerCloseButton,
  DrawerBody,
  VStack,
  Divider,
} from '@chakra-ui/react';
import {
  FiSearch,
  FiBell,
  FiLogOut,
  FiUser,
  FiSettings,
  FiHelpCircle,
  FiMenu,
  FiX,
} from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import NotificationBell from './NotificationBell';
import Sidebar from './Sidebar';

const Header = ({ onMobileMenuToggle, isMobile }) => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const bgColor = useColorModeValue('white', 'gray.900');
  const borderColor = useColorModeValue('gray.100', 'gray.800');
  const { isOpen, onOpen, onClose } = useDisclosure();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <>
      <Box
        as="header"
        bg={bgColor}
        borderBottom="1px solid"
        borderColor={borderColor}
        px={{ base: 4, md: 6 }}
        py={3}
        position="sticky"
        top={0}
        zIndex={20}
        backdropFilter="blur(8px)"
        backgroundColor="rgba(255,255,255,0.9)"
      >
        <Flex justify="space-between" align="center">
          {/* Left: Mobile menu + Search */}
          <HStack spacing={3} flex={1}>
            {isMobile && (
              <IconButton
                icon={<FiMenu />}
                onClick={onOpen}
                variant="ghost"
                size="sm"
                aria-label="Open menu"
              />
            )}
            <InputGroup maxW={{ base: '200px', md: '400px' }} display={{ base: 'none', sm: 'block' }}>
              <InputLeftElement pointerEvents="none">
                <FiSearch color="gray.300" />
              </InputLeftElement>
              <Input
                type="search"
                placeholder="Rechercher..."
                borderRadius="full"
                bg="gray.50"
                fontSize="sm"
                _focus={{ bg: 'white', boxShadow: '0 0 0 2px', boxShadowColor: 'brand.200' }}
              />
            </InputGroup>
          </HStack>

          {/* Right section */}
          <HStack spacing={{ base: 1, md: 3 }}>
            {/* Mobile search */}
            {isMobile && (
              <IconButton
                icon={<FiSearch />}
                variant="ghost"
                size="sm"
                aria-label="Search"
              />
            )}

            {/* Notifications */}
            <NotificationBell />

            {/* User menu */}
            <Menu>
              <MenuButton>
                <HStack spacing={2}>
                  <Avatar
                    size="sm"
                    name={user?.username}
                    bgGradient="linear(135deg, brand.400, accent.400)"
                    color="white"
                  />
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
              <MenuList minW="200px" p={2}>
                <MenuItem
                  icon={<FiUser />}
                  borderRadius="lg"
                  onClick={() => navigate('/profile')}
                >
                  Mon profil
                </MenuItem>
                <MenuItem
                  icon={<FiSettings />}
                  borderRadius="lg"
                  onClick={() => navigate('/settings')}
                >
                  Paramètres
                </MenuItem>
                <MenuItem
                  icon={<FiHelpCircle />}
                  borderRadius="lg"
                  onClick={() => window.open('/docs', '_blank')}
                >
                  Aide
                </MenuItem>
                <MenuDivider />
                <MenuItem
                  icon={<FiLogOut />}
                  color="red.500"
                  borderRadius="lg"
                  onClick={handleLogout}
                >
                  Déconnexion
                </MenuItem>
              </MenuList>
            </Menu>
          </HStack>
        </Flex>
      </Box>

      {/* Mobile Drawer */}
      {isMobile && (
        <Drawer isOpen={isOpen} placement="left" onClose={onClose} size="xs">
          <DrawerOverlay />
          <DrawerContent>
            <DrawerCloseButton />
            <DrawerBody p={0}>
              <Sidebar isMobile={true} isOpen={isOpen} onClose={onClose} />
            </DrawerBody>
          </DrawerContent>
        </Drawer>
      )}
    </>
  );
};

export default Header;
