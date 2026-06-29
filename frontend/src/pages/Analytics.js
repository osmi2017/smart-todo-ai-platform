import React, { useState } from 'react';
import {
  Box,
  Heading,
  Text,
  SimpleGrid,
  Card,
  CardBody,
  CardHeader,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  StatArrow,
  Select,
  HStack,
  VStack,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Badge,
  Progress,
  Spinner,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
  Button,
} from '@chakra-ui/react';
import {
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { useQuery } from 'react-query';
import { useStatsService } from '../services/statsService';

const Analytics = () => {
  const [timeRange, setTimeRange] = useState('week');
  const statsService = useStatsService();

  const { data, isLoading, error, refetch } = useQuery(
    ['analytics', timeRange],
    () => statsService.getAnalyticsStats(timeRange),
    {
      refetchInterval: 60000,
      retry: 1,
    }
  );

  const stats = data || {};
  const trendData = stats.trend_data || [];
  const priorityData = (stats.priority_data || []).filter((d) => d.value > 0);
  const projectData = stats.project_data || [];
  const userPerformance = stats.user_performance || [];

  if (isLoading) {
    return (
      <Box textAlign="center" py={10}>
        <Spinner size="xl" color="blue.500" thickness="4px" />
        <Text mt={4}>Chargement des analytics...</Text>
      </Box>
    );
  }

  if (error) {
    return (
      <Box textAlign="center" py={10}>
        <Alert status="error" borderRadius="lg" maxW="lg" mx="auto">
          <AlertIcon />
          <Box flex="1">
            <AlertTitle>Erreur de chargement</AlertTitle>
            <AlertDescription>
              Impossible de charger les statistiques
            </AlertDescription>
          </Box>
          <Button size="sm" onClick={() => refetch()}>
            Réessayer
          </Button>
        </Alert>
      </Box>
    );
  }

  return (
    <Box>
      <VStack spacing={6} align="stretch">
        <HStack justify="space-between">
          <Heading size="lg">Analytics</Heading>
          <Select
            width="200px"
            size="sm"
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
          >
            <option value="week">Cette semaine</option>
            <option value="month">Ce mois</option>
            <option value="quarter">Ce trimestre</option>
            <option value="year">Cette année</option>
          </Select>
        </HStack>

        {/* KPIs */}
        <SimpleGrid columns={{ base: 2, md: 4 }} spacing={4}>
          <Card>
            <CardBody>
              <Stat>
                <StatLabel>Taux de complétion</StatLabel>
                <StatNumber>{stats.completion_rate || 0}%</StatNumber>
                <StatHelpText>
                  <StatArrow type={stats.completion_rate >= 50 ? 'increase' : 'decrease'} />
                  Période sélectionnée
                </StatHelpText>
              </Stat>
            </CardBody>
          </Card>

          <Card>
            <CardBody>
              <Stat>
                <StatLabel>Temps moyen par tâche</StatLabel>
                <StatNumber>{stats.avg_task_time || 0}h</StatNumber>
                <StatHelpText>Durée moyenne de réalisation</StatHelpText>
              </Stat>
            </CardBody>
          </Card>

          <Card>
            <CardBody>
              <Stat>
                <StatLabel>Tâches en retard</StatLabel>
                <StatNumber color="red.500">{stats.delayed_count || 0}</StatNumber>
                <StatHelpText>
                  <StatArrow type={stats.delayed_count > 0 ? 'increase' : 'decrease'} />
                  Période sélectionnée
                </StatHelpText>
              </Stat>
            </CardBody>
          </Card>

          <Card>
            <CardBody>
              <Stat>
                <StatLabel>Précision ML</StatLabel>
                <StatNumber>{stats.ml_accuracy || 0}%</StatNumber>
                <StatHelpText>
                  <StatArrow type={stats.ml_accuracy >= 50 ? 'increase' : 'decrease'} />
                  Prédiction de priorité
                </StatHelpText>
              </Stat>
            </CardBody>
          </Card>
        </SimpleGrid>

        {/* Charts */}
        <SimpleGrid columns={{ base: 1, lg: 2 }} spacing={6}>
          {/* Trend chart */}
          <Card>
            <CardHeader>
              <Heading size="md">Activité sur la période</Heading>
            </CardHeader>
            <CardBody>
              <Box height="300px">
                {trendData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={trendData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Line type="monotone" dataKey="taches" stroke="#4299E1" strokeWidth={2} name="Tâches créées" />
                      <Line type="monotone" dataKey="completees" stroke="#48BB78" strokeWidth={2} name="Complétées" />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <Text color="gray.500" textAlign="center" pt={20}>Aucune donnée pour cette période</Text>
                )}
              </Box>
            </CardBody>
          </Card>

          {/* Priority pie */}
          <Card>
            <CardHeader>
              <Heading size="md">Tâches par priorité</Heading>
            </CardHeader>
            <CardBody>
              <Box height="300px">
                {priorityData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={priorityData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {priorityData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <Text color="gray.500" textAlign="center" pt={20}>Aucune tâche pour cette période</Text>
                )}
              </Box>
            </CardBody>
          </Card>

          {/* Project progress */}
          <Card gridColumn={{ lg: 'span 2' }}>
            <CardHeader>
              <Heading size="md">Progression des projets</Heading>
            </CardHeader>
            <CardBody>
              {projectData.length > 0 ? (
                <VStack spacing={4}>
                  {projectData.map((project, index) => (
                    <Box key={index} width="100%">
                      <HStack justify="space-between" mb={1}>
                        <Text fontWeight="medium">{project.name}</Text>
                        <Text fontSize="sm">
                          {project.completees}/{project.total} tâches
                        </Text>
                      </HStack>
                      <Progress
                        value={project.progression}
                        colorScheme={project.progression > 70 ? 'green' : project.progression > 40 ? 'blue' : 'orange'}
                        size="md"
                        borderRadius="full"
                      />
                    </Box>
                  ))}
                </VStack>
              ) : (
                <Text color="gray.500" textAlign="center">Aucun projet</Text>
              )}
            </CardBody>
          </Card>

          {/* User performance */}
          <Card gridColumn={{ lg: 'span 2' }}>
            <CardHeader>
              <Heading size="md">Performance par utilisateur</Heading>
            </CardHeader>
            <CardBody>
              {userPerformance.length > 0 ? (
                <Table variant="simple">
                  <Thead>
                    <Tr>
                      <Th>Utilisateur</Th>
                      <Th isNumeric>Tâches assignées</Th>
                      <Th isNumeric>Tâches complétées</Th>
                      <Th isNumeric>Taux complétion</Th>
                      <Th isNumeric>En retard</Th>
                    </Tr>
                  </Thead>
                  <Tbody>
                    {userPerformance.map((user, index) => (
                      <Tr key={index}>
                        <Td fontWeight="medium">{user.user}</Td>
                        <Td isNumeric>{user.taches}</Td>
                        <Td isNumeric>{user.completees}</Td>
                        <Td isNumeric>
                          <Badge colorScheme={user.taches > 0 && user.completees / user.taches > 0.8 ? 'green' : 'yellow'}>
                            {user.taches > 0 ? Math.round((user.completees / user.taches) * 100) : 0}%
                          </Badge>
                        </Td>
                        <Td isNumeric>
                          <Badge colorScheme={user.retard > 2 ? 'red' : 'orange'}>
                            {user.retard}
                          </Badge>
                        </Td>
                      </Tr>
                    ))}
                  </Tbody>
                </Table>
              ) : (
                <Text color="gray.500" textAlign="center">Aucune donnée utilisateur pour cette période</Text>
              )}
            </CardBody>
          </Card>
        </SimpleGrid>
      </VStack>
    </Box>
  );
};

export default Analytics;
