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
  FiPlus,
  FiFolder,
  FiCheckSquare,
  FiMic,
  FiMap,
} from 'react-icons/fi';
import { useNavigate, Link as RouterLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { setUserLanguage } from '../i18n';
import { useAuth } from '../context/AuthContext';
import NotificationBell from './NotificationBell';
import Sidebar from './Sidebar';
import GlobalSearch from './GlobalSearch';
import HelpDrawer from './HelpDrawer';

const Header = ({ onMobileMenuToggle, isMobile }) => {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const { user, logout } = useAuth();
  const bgColor = useColorModeValue('white', 'gray.900');
  const borderColor = useColorModeValue('gray.100', 'gray.800');
  const { isOpen, onOpen, onClose } = useDisclosure();
  const {
    isOpen: isHelpOpen,
    onOpen: onHelpOpen,
    onClose: onHelpClose,
  } = useDisclosure();

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

            <Box data-onboard="quickcreate">
              <Menu>
                <MenuButton
                  as={IconButton}
                  icon={<FiPlus />}
                  variant="solid"
                  colorScheme="blue"
                  size="sm"
                  borderRadius="xl"
                  aria-label={t('quickCreate.title')}
                />
                <MenuList minW="220px" p={2}>
                  <Box px={3} py={1} fontSize="xs" fontWeight="600" color="gray.400" textTransform="uppercase" letterSpacing="wide">
                    {t('quickCreate.title')}
                  </Box>
                  <MenuItem as={RouterLink} to="/projects?new=1" icon={<FiFolder />} borderRadius="lg">
                    {t('quickCreate.project')}
                  </MenuItem>
                  <MenuItem as={RouterLink} to="/tasks/create" icon={<FiCheckSquare />} borderRadius="lg">
                    {t('quickCreate.task')}
                  </MenuItem>
                  <MenuItem as={RouterLink} to="/meetings/create" icon={<FiMic />} borderRadius="lg">
                    {t('quickCreate.meeting')}
                  </MenuItem>
                  <MenuItem as={RouterLink} to="/missions/create" icon={<FiMap />} borderRadius="lg">
                    {t('quickCreate.mission')}
                  </MenuItem>
                </MenuList>
              </Menu>
            </Box>

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
                  onClick={() => setUserLanguage('fr')}
                  bg={currentLang === 'fr' ? 'blue.50' : undefined}
                  fontWeight={currentLang === 'fr' ? '600' : '400'}
                >
                  FR - Français
                </MenuItem>
                <MenuItem
                  borderRadius="lg"
                  onClick={() => setUserLanguage('en')}
                  bg={currentLang === 'en' ? 'blue.50' : undefined}
                  fontWeight={currentLang === 'en' ? '600' : '400'}
                >
                  EN - English
                </MenuItem>
              </MenuList>
            </Menu>

            <NotificationBell />

            <Box data-onboard="help">
              <IconButton
                icon={<FiHelpCircle />}
                variant="ghost"
                size="sm"
                aria-label={t('header.help')}
                onClick={onHelpOpen}
              />
            </Box>

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

      <HelpDrawer isOpen={isHelpOpen} onClose={onHelpClose} />
    </>
  );
};

export default Header;
