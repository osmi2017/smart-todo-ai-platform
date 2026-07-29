import React from 'react';
import {
  Box,
  Flex,
  HStack,
  IconButton,
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
  FiGlobe,
} from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import NotificationBell from './NotificationBell';
import Sidebar from './Sidebar';
import GlobalSearch from './GlobalSearch';

const Header = ({ onMobileMenuToggle, isMobile }) => {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const { user, logout } = useAuth();
  const bgColor = useColorModeValue('white', 'gray.900');
  const borderColor = useColorModeValue('gray.100', 'gray.800');
  const { isOpen, onOpen, onClose } = useDisclosure();

  const currentLang = i18n.language;

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
            <GlobalSearch />
          </HStack>

          <HStack spacing={{ base: 1, md: 3 }}>
            {isMobile && (
              <IconButton
                icon={<FiSearch />}
                variant="ghost"
                size="sm"
                aria-label="Search"
              />
            )}

            <Menu>
              <MenuButton
                as={IconButton}
                icon={<FiGlobe />}
                variant="ghost"
                size="sm"
                aria-label={t('header.language')}
              />
              <MenuList minW="120px" p={1}>
                <MenuItem
                  borderRadius="lg"
                  onClick={() => i18n.changeLanguage('fr')}
                  bg={currentLang === 'fr' ? 'blue.50' : undefined}
                  fontWeight={currentLang === 'fr' ? '600' : '400'}
                >
                  FR - Français
                </MenuItem>
                <MenuItem
                  borderRadius="lg"
                  onClick={() => i18n.changeLanguage('en')}
                  bg={currentLang === 'en' ? 'blue.50' : undefined}
                  fontWeight={currentLang === 'en' ? '600' : '400'}
                >
                  EN - English
                </MenuItem>
              </MenuList>
            </Menu>

            <NotificationBell />

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
                  {t('header.myProfile')}
                </MenuItem>
                <MenuItem
                  icon={<FiSettings />}
                  borderRadius="lg"
                  onClick={() => navigate('/settings')}
                >
                  {t('header.settings')}
                </MenuItem>
                <MenuItem
                  icon={<FiHelpCircle />}
                  borderRadius="lg"
                  onClick={() => window.open('/docs', '_blank')}
                >
                  {t('header.help')}
                </MenuItem>
                <MenuDivider />
                <MenuItem
                  icon={<FiLogOut />}
                  color="red.500"
                  borderRadius="lg"
                  onClick={handleLogout}
                >
                  {t('header.logout')}
                </MenuItem>
              </MenuList>
            </Menu>
          </HStack>
        </Flex>
      </Box>

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
