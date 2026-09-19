import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Box, Heading, SimpleGrid, Stat, StatLabel, StatNumber, StatHelpText,
  Text, Badge, VStack, HStack, Icon, Flex, useColorModeValue, Spinner,
} from '@chakra-ui/react';
import {
  FiTruck, FiCheckCircle, FiMapPin, FiTool, FiDollarSign,
  FiTrendingUp, FiAlertTriangle, FiDroplet, FiUsers, FiGitCommit,
} from 'react-icons/fi';
import { useFleetDashboard } from '../../services/parcService';
import EmptyState from '../../components/EmptyState';

const AlertItem = ({ alert }) => {
  const color = alert.severity === 'danger' ? 'red' : 'orange';
  return (
    <HStack
      spacing={3}
      align="start"
      bg={`${color}.50`}
      borderLeft="4px solid"
      borderColor={`${color}.400`}
      borderRadius="md"
      p={3}
      w="100%"
    >
      <Icon as={FiAlertTriangle} color={`${color}.500`} mt={0.5} />
      <Box>
        <Text fontSize="sm" fontWeight="600" color={`${color}.700`}>{alert.title}</Text>
        <Text fontSize="xs" color="gray.500">{alert.message}</Text>
      </Box>
    </HStack>
  );
};

const FleetDashboard = () => {
  const { t } = useTranslation();
  const { getDashboard } = useFleetDashboard();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const bgColor = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.600');

  React.useEffect(() => {
    load();
  }, []);

  const load = async () => {
    setLoading(true);
    try {
      const d = await getDashboard();
      setData(d);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Box textAlign="center" py={20}>
        <Spinner size="xl" />
      </Box>
    );
  }

  if (!data) {
    return (
      <EmptyState
        icon={FiTruck}
        message={t('parc.dashboard.empty')}
      />
    );
  }

  const k = data.kpis;

  const stats = [
    {
      label: t('parc.dashboard.totalVehicles'),
      value: k.total_vehicles,
      icon: FiTruck,
      color: 'blue',
    },
    {
      label: t('parc.dashboard.available'),
      value: k.available_vehicles,
      icon: FiCheckCircle,
      color: 'green',
    },
    {
      label: t('parc.dashboard.inMission'),
      value: k.in_mission,
      icon: FiMapPin,
      color: 'teal',
    },
    {
      label: t('parc.dashboard.inMaintenance'),
      value: k.in_maintenance,
      icon: FiTool,
      color: 'orange',
    },
    {
      label: t('parc.dashboard.costPerKm'),
      value: k.cost_per_km,
      icon: FiDollarSign,
      color: 'purple',
      suffix: '',
    },
    {
      label: t('parc.dashboard.consumption'),
      value: k.consumption,
      icon: FiDroplet,
      color: 'cyan',
      suffix: ' L/100',
    },
    {
      label: t('parc.dashboard.totalKm'),
      value: k.total_km,
      icon: FiGitCommit,
      color: 'gray',
      suffix: ' km',
    },
    {
      label: t('parc.dashboard.drivers'),
      value: k.total_drivers,
      icon: FiUsers,
      color: 'pink',
    },
  ];

  return (
    <Box>
      <Flex justify="space-between" align="center" mb={6}>
        <Heading size="lg">{t('parc.dashboard.title')}</Heading>
        <Badge colorScheme="brand" fontSize="sm" px={3} py={1}>
          {t('parc.moduleName')}
        </Badge>
      </Flex>

      <SimpleGrid columns={{ base: 2, md: 4 }} spacing={4} mb={8}>
        {stats.map((s) => (
          <Box key={s.label} bg={bgColor} borderRadius="xl" borderWidth="1px" borderColor={borderColor} p={4}>
            <Stat>
              <HStack spacing={2} mb={1}>
                <Icon as={s.icon} color={`${s.color}.500`} boxSize={5} />
                <StatLabel fontSize="xs" color="gray.500">{s.label}</StatLabel>
              </HStack>
              <StatNumber fontSize="2xl">
                {typeof s.value === 'number' ? s.value.toLocaleString() : s.value}
                {s.suffix && <Text as="span" fontSize="sm" color="gray.500">{s.suffix}</Text>}
              </StatNumber>
            </Stat>
          </Box>
        ))}
      </SimpleGrid>

      <Heading size="sm" mb={4}>{t('parc.dashboard.alertsTitle')}</Heading>
      {data.alerts.length === 0 ? (
        <Box bg={bgColor} borderWidth="1px" borderColor={borderColor} borderRadius="xl" p={6}>
          <Text color="gray.500">{t('parc.dashboard.noAlerts')}</Text>
        </Box>
      ) : (
        <VStack spacing={3} align="stretch">
          {data.alerts.map((a, i) => <AlertItem key={i} alert={a} />)}
        </VStack>
      )}
    </Box>
  );
};

export default FleetDashboard;
