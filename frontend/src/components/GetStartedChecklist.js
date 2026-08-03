import React from 'react';
import {
  Box,
  Card,
  CardBody,
  Heading,
  Text,
  HStack,
  VStack,
  Icon,
  Badge,
  Button,
  IconButton,
  SimpleGrid,
} from '@chakra-ui/react';
import {
  FiCheck,
  FiFolder,
  FiCheckSquare,
  FiMic,
  FiMap,
  FiHardDrive,
  FiChevronRight,
  FiX,
} from 'react-icons/fi';
import { Link as RouterLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

const GetStartedChecklist = ({ counts, onDismiss }) => {
  const { t } = useTranslation();

  const steps = [
    {
      key: 'project',
      icon: FiFolder,
      to: '/projects?new=1',
      done: (counts?.projects || 0) > 0,
    },
    {
      key: 'task',
      icon: FiCheckSquare,
      to: '/tasks/create',
      done: (counts?.tasks || 0) > 0,
    },
    {
      key: 'meeting',
      icon: FiMic,
      to: '/meetings/create',
      done: (counts?.meetings || 0) > 0,
    },
    {
      key: 'mission',
      icon: FiMap,
      to: '/missions/create',
      done: (counts?.missions || 0) > 0,
    },
    {
      key: 'files',
      icon: FiHardDrive,
      to: '/files',
      done: (counts?.files || 0) > 0,
    },
  ];

  const doneCount = steps.filter((s) => s.done).length;

  return (
    <Card
      mb={6}
      overflow="hidden"
      borderWidth="1px"
      borderColor="brand.100"
      boxShadow="0 4px 20px rgba(59,91,219,0.08)"
    >
      <Box
        bgGradient="linear(135deg, brand.500, accent.500)"
        px={{ base: 5, md: 6 }}
        py={4}
        color="white"
      >
        <HStack justify="space-between" align="center" wrap="wrap" gap={3}>
          <VStack align="start" spacing={0}>
            <Heading size="md">{t('dashboard.getStarted.title')}</Heading>
            <Text fontSize="sm" opacity={0.92}>
              {t('dashboard.getStarted.description')}
            </Text>
          </VStack>
          <HStack spacing={2}>
            <Badge colorScheme="whiteAlpha" fontSize="sm" px={3} py={1} borderRadius="full">
              {doneCount}/{steps.length}
            </Badge>
            {onDismiss && (
              <IconButton
                aria-label={t('dashboard.getStarted.dismiss')}
                icon={<FiX />}
                size="sm"
                variant="ghost"
                color="whiteAlpha.900"
                _hover={{ bg: 'whiteAlpha.200' }}
                onClick={onDismiss}
              />
            )}
          </HStack>
        </HStack>
      </Box>
      <CardBody>
        <SimpleGrid columns={{ base: 1, sm: 2, lg: 3 }} spacing={4}>
          {steps.map((step) => (
            <Box
              key={step.key}
              p={4}
              borderRadius="lg"
              borderWidth="1px"
              borderColor={step.done ? 'green.200' : 'gray.100'}
              bg={step.done ? 'green.50' : 'white'}
              transition="all 0.2s"
              _hover={{ shadow: step.done ? undefined : 'md' }}
            >
              <HStack align="flex-start" spacing={3}>
                <Box
                  w={10}
                  h={10}
                  borderRadius="xl"
                  bg={step.done ? 'green.500' : 'brand.50'}
                  display="flex"
                  alignItems="center"
                  justifyContent="center"
                  flexShrink={0}
                >
                  <Icon
                    as={step.done ? FiCheck : step.icon}
                    boxSize={5}
                    color={step.done ? 'white' : 'brand.500'}
                  />
                </Box>
                <VStack align="start" spacing={0.5} flex={1}>
                  <Text fontWeight="600" fontSize="sm">
                    {t(`dashboard.getStarted.${step.key}`)}
                  </Text>
                  <Text fontSize="xs" color="gray.500" lineHeight="short">
                    {t(`dashboard.getStarted.${step.key}Desc`)}
                  </Text>
                  <Button
                    as={RouterLink}
                    to={step.to}
                    size="xs"
                    mt={2}
                    colorScheme={step.done ? 'green' : 'blue'}
                    variant={step.done ? 'ghost' : 'solid'}
                    rightIcon={step.done ? undefined : <FiChevronRight />}
                    isDisabled={step.done}
                  >
                    {step.done ? t('dashboard.getStarted.done') : t('dashboard.getStarted.start')}
                  </Button>
                </VStack>
              </HStack>
            </Box>
          ))}
        </SimpleGrid>
      </CardBody>
    </Card>
  );
};

export default GetStartedChecklist;
