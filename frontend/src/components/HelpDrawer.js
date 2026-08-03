import React from 'react';
import {
  Drawer,
  DrawerOverlay,
  DrawerContent,
  DrawerCloseButton,
  DrawerHeader,
  DrawerBody,
  Box,
  Text,
  VStack,
  HStack,
  Icon,
  Button,
  Divider,
  Heading,
  Badge,
} from '@chakra-ui/react';
import {
  FiHome,
  FiFolder,
  FiCheckSquare,
  FiColumns,
  FiCalendar,
  FiMic,
  FiHardDrive,
  FiMap,
  FiBarChart2,
  FiCpu,
  FiRefreshCw,
  FiMessageCircle,
} from 'react-icons/fi';
import { useTranslation } from 'react-i18next';
import { Link as RouterLink } from 'react-router-dom';
import { launchOnboarding } from '../utils/onboardingBus';

const HelpDrawer = ({ isOpen, onClose }) => {
  const { t } = useTranslation();

  const modules = [
    { key: 'dashboard', icon: FiHome, to: '/dashboard' },
    { key: 'projects', icon: FiFolder, to: '/projects' },
    { key: 'tasks', icon: FiCheckSquare, to: '/tasks' },
    { key: 'kanban', icon: FiColumns, to: '/kanban' },
    { key: 'milestones', icon: FiCalendar, to: '/milestones' },
    { key: 'meetings', icon: FiMic, to: '/meetings' },
    { key: 'files', icon: FiHardDrive, to: '/files' },
    { key: 'missions', icon: FiMap, to: '/missions' },
    { key: 'analytics', icon: FiBarChart2, to: '/analytics' },
  ];

  return (
    <Drawer isOpen={isOpen} onClose={onClose} placement="right" size="md">
      <DrawerOverlay />
      <DrawerContent>
        <DrawerCloseButton />
        <DrawerHeader>
          <HStack spacing={3}>
            <Box
              w={10}
              h={10}
              borderRadius="xl"
              bgGradient="linear(135deg, brand.500, accent.500)"
              display="flex"
              alignItems="center"
              justifyContent="center"
            >
              <Icon as={FiCpu} color="white" boxSize={5} />
            </Box>
            <Box>
              <Heading size="sm">{t('help.title')}</Heading>
              <Text fontSize="xs" color="gray.500">
                SmartTodoAI
              </Text>
            </Box>
          </HStack>
        </DrawerHeader>

        <DrawerBody pb={8}>
          <Text fontSize="sm" color="gray.600" mb={5}>
            {t('help.intro')}
          </Text>

          <VStack spacing={3} align="stretch" mb={6}>
            {modules.map((mod) => (
              <Box
                key={mod.key}
                p={4}
                borderRadius="xl"
                borderWidth="1px"
                borderColor="gray.100"
                bg="white"
                _hover={{ shadow: 'md', borderColor: 'brand.200' }}
                transition="all 0.2s"
              >
                <HStack align="flex-start" spacing={3}>
                  <Box
                    w={9}
                    h={9}
                    borderRadius="lg"
                    bg="brand.50"
                    display="flex"
                    alignItems="center"
                    justifyContent="center"
                    flexShrink={0}
                  >
                    <Icon as={mod.icon} boxSize={4} color="brand.600" />
                  </Box>
                  <Box flex={1}>
                    <Text fontWeight="600" fontSize="sm" mb={0.5}>
                      {t(`help.modules.${mod.key}.title`)}
                    </Text>
                    <Text fontSize="xs" color="gray.500">
                      {t(`help.modules.${mod.key}.description`)}
                    </Text>
                    <Button
                      as={RouterLink}
                      to={mod.to}
                      size="xs"
                      colorScheme="blue"
                      variant="outline"
                      mt={2}
                      onClick={onClose}
                    >
                      {t('help.open')}
                    </Button>
                  </Box>
                </HStack>
              </Box>
            ))}
          </VStack>

          <Divider mb={5} />

          <VStack align="stretch" spacing={3}>
            <Button
              leftIcon={<FiRefreshCw />}
              colorScheme="purple"
              variant="outline"
              onClick={() => {
                launchOnboarding();
                onClose();
              }}
            >
              {t('help.relaunchTour')}
            </Button>

            <Box
              p={4}
              borderRadius="xl"
              bg="gray.50"
              borderWidth="1px"
              borderColor="gray.100"
            >
              <HStack align="flex-start" spacing={3}>
                <Icon as={FiMessageCircle} boxSize={5} color="gray.400" mt={0.5} />
                <Box>
                  <Text fontWeight="600" fontSize="sm">
                    {t('help.contactSupport')}
                  </Text>
                  <Text fontSize="xs" color="gray.500">
                    {t('help.contactSupportDesc')}
                  </Text>
                </Box>
              </HStack>
            </Box>

            <Badge colorScheme="blue" variant="subtle" alignSelf="flex-start" fontSize="xs">
              v1.0
            </Badge>
          </VStack>
        </DrawerBody>
      </DrawerContent>
    </Drawer>
  );
};

export default HelpDrawer;
