import React, { useState } from 'react';
import {
  Box,
  Heading,
  Text,
  SimpleGrid,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  StatArrow,
  Card,
  CardHeader,
  CardBody,
  Progress,
  Badge,
  Flex,
  Icon,
  VStack,
  HStack,
  Avatar,
  Button,
  useColorModeValue,
  Spinner,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
  Tag,
  TagLabel,
  TagLeftIcon,
  Tooltip,
} from '@chakra-ui/react';
import {
  FiClock,
  FiCheckCircle,
  FiAlertCircle,
  FiTrendingUp,
  FiFolder,
  FiCalendar,
  FiCpu,
  FiBarChart2,
  FiActivity,
  FiTarget,
} from 'react-icons/fi';
import { Link as RouterLink } from 'react-router-dom';
import { useQuery } from 'react-query';
import { useStatsService } from '../services/statsService';
import { format, formatDistance } from 'date-fns';
import { fr } from 'date-fns/locale';

// Import Recharts
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

const Dashboard = () => {
  const [timeRange, setTimeRange] = useState('week');
  const statsService = useStatsService();
  const cardBg = useColorModeValue('white', 'gray.700');
  const borderColor = useColorModeValue('gray.200', 'gray.600');

  const { data: stats, isLoading, error, refetch } = useQuery(
    ['dashboard', timeRange],
    () => statsService.getDashboardStats(),
    {
      refetchInterval: 30000,
    }
  );

  const COLORS = ['#4299E1', '#48BB78', '#ED8936', '#9F7AEA', '#F56565', '#38B2AC'];

  // Données par défaut sécurisées
  const safeStats = {
    total_projects: stats?.total_projects || 0,
    active_projects: stats?.active_projects || 0,
    total_tasks: stats?.total_tasks || 0,
    completed_tasks: stats?.completed_tasks || 0,
    in_progress_tasks: stats?.in_progress_tasks || 0,
    delayed_tasks: stats?.delayed_tasks || 0,
    productivity_score: stats?.productivity_score || 0,
    tasks_by_priority: stats?.tasks_by_priority || { low: 0, medium: 0, high: 0, critical: 0 },
    tasks_by_status: stats?.tasks_by_status || { todo: 0, in_progress: 0, review: 0, blocked: 0, completed: 0 },
    upcoming_deadlines: Array.isArray(stats?.upcoming_deadlines) ? stats.upcoming_deadlines : [],
    recent_activities: Array.isArray(stats?.recent_activities) ? stats.recent_activities : [],
    weekly_activity: Array.isArray(stats?.weekly_activity) ? stats.weekly_activity : [],
    project_progress: Array.isArray(stats?.project_progress) ? stats.project_progress : [],
  };

  // Préparation des données pour les graphiques avec vérifications
  const priorityData = [
    { name: 'Basse', value: Number(safeStats.tasks_by_priority.low) || 0, color: '#718096' },
    { name: 'Moyenne', value: Number(safeStats.tasks_by_priority.medium) || 0, color: '#4299E1' },
    { name: 'Haute', value: Number(safeStats.tasks_by_priority.high) || 0, color: '#ED8936' },
    { name: 'Critique', value: Number(safeStats.tasks_by_priority.critical) || 0, color: '#F56565' },
  ].filter(item => item.value > 0); // Ne garder que les catégories avec des valeurs

  const statusData = [
    { name: 'À faire', value: Number(safeStats.tasks_by_status.todo) || 0, color: '#A0AEC0' },
    { name: 'En cours', value: Number(safeStats.tasks_by_status.in_progress) || 0, color: '#4299E1' },
    { name: 'Révision', value: Number(safeStats.tasks_by_status.review) || 0, color: '#9F7AEA' },
    { name: 'Bloquée', value: Number(safeStats.tasks_by_status.blocked) || 0, color: '#F56565' },
    { name: 'Terminée', value: Number(safeStats.tasks_by_status.completed) || 0, color: '#48BB78' },
  ].filter(item => item.value > 0);

  if (isLoading) {
    return (
      <Box textAlign="center" py={10}>
        <Spinner size="xl" color="blue.500" thickness="4px" />
        <Text mt={4}>Chargement du tableau de bord...</Text>
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
              Impossible de charger les données du tableau de bord
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
      {/* En-tête avec période */}
      <Flex justify="space-between" align="center" mb={6}>
        <Heading size="lg">Tableau de bord</Heading>
        <HStack spacing={2}>
          <Button
            size="sm"
            variant={timeRange === 'week' ? 'solid' : 'ghost'}
            colorScheme={timeRange === 'week' ? 'blue' : 'gray'}
            onClick={() => setTimeRange('week')}
          >
            Semaine
          </Button>
          <Button
            size="sm"
            variant={timeRange === 'month' ? 'solid' : 'ghost'}
            colorScheme={timeRange === 'month' ? 'blue' : 'gray'}
            onClick={() => setTimeRange('month')}
          >
            Mois
          </Button>
          <Button
            size="sm"
            variant={timeRange === 'year' ? 'solid' : 'ghost'}
            colorScheme={timeRange === 'year' ? 'blue' : 'gray'}
            onClick={() => setTimeRange('year')}
          >
            Année
          </Button>
        </HStack>
      </Flex>

      {/* KPIs */}
      <SimpleGrid columns={{ base: 1, md: 2, lg: 4 }} spacing={4} mb={6}>
        <Card bg={cardBg} borderWidth="1px" borderColor={borderColor}>
          <CardBody>
            <Stat>
              <Flex justify="space-between" align="center">
                <Box>
                  <StatLabel color="gray.500">Projets actifs</StatLabel>
                  <StatNumber fontSize="3xl">{String(safeStats.active_projects)}</StatNumber>
                  <StatHelpText>
                    <StatArrow type="increase" />
                    {String(safeStats.total_projects)} total
                  </StatHelpText>
                </Box>
                <Icon as={FiFolder} boxSize={10} color="blue.500" opacity={0.3} />
              </Flex>
            </Stat>
          </CardBody>
        </Card>

        <Card bg={cardBg} borderWidth="1px" borderColor={borderColor}>
          <CardBody>
            <Stat>
              <Flex justify="space-between" align="center">
                <Box>
                  <StatLabel color="gray.500">Tâches complétées</StatLabel>
                  <StatNumber fontSize="3xl">{String(safeStats.completed_tasks)}</StatNumber>
                  <StatHelpText>
                    <StatArrow type="increase" />
                    {String(safeStats.total_tasks)} total
                  </StatHelpText>
                </Box>
                <Icon as={FiCheckCircle} boxSize={10} color="green.500" opacity={0.3} />
              </Flex>
            </Stat>
          </CardBody>
        </Card>

        <Card bg={cardBg} borderWidth="1px" borderColor={borderColor}>
          <CardBody>
            <Stat>
              <Flex justify="space-between" align="center">
                <Box>
                  <StatLabel color="gray.500">En cours</StatLabel>
                  <StatNumber fontSize="3xl">{String(safeStats.in_progress_tasks)}</StatNumber>
                  <StatHelpText>
                    <StatArrow type="decrease" />
                    {String(safeStats.delayed_tasks)} en retard
                  </StatHelpText>
                </Box>
                <Icon as={FiClock} boxSize={10} color="orange.500" opacity={0.3} />
              </Flex>
            </Stat>
          </CardBody>
        </Card>

        <Card bg={cardBg} borderWidth="1px" borderColor={borderColor}>
          <CardBody>
            <Stat>
              <Flex justify="space-between" align="center">
                <Box>
                  <StatLabel color="gray.500">Score productivité</StatLabel>
                  <StatNumber fontSize="3xl">{String(safeStats.productivity_score)}%</StatNumber>
                  <StatHelpText>
                    <StatArrow type="increase" />
                    +5% vs hier
                  </StatHelpText>
                </Box>
                <Icon as={FiTarget} boxSize={10} color="purple.500" opacity={0.3} />
              </Flex>
            </Stat>
          </CardBody>
        </Card>
      </SimpleGrid>

      {/* Graphiques principaux */}
      <SimpleGrid columns={{ base: 1, lg: 2 }} spacing={6} mb={6}>
        {/* Activité hebdomadaire */}
        <Card bg={cardBg} borderWidth="1px" borderColor={borderColor}>
          <CardHeader pb={0}>
            <Flex justify="space-between" align="center">
              <Heading size="md">Activité hebdomadaire</Heading>
              <Icon as={FiActivity} color="blue.500" />
            </Flex>
          </CardHeader>
          <CardBody>
            <Box height="250px">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={safeStats.weekly_activity}
                  margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="colorTasks" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#4299E1" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#4299E1" stopOpacity={0.1}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="day" />
                  <YAxis />
                  <RechartsTooltip />
                  <Area
                    type="monotone"
                    dataKey="tasks"
                    stroke="#4299E1"
                    fillOpacity={1}
                    fill="url(#colorTasks)"
                    name="Tâches"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </Box>
          </CardBody>
        </Card>

        {/* Distribution par priorité */}
        <Card bg={cardBg} borderWidth="1px" borderColor={borderColor}>
          <CardHeader pb={0}>
            <Flex justify="space-between" align="center">
              <Heading size="md">Tâches par priorité</Heading>
              <Icon as={FiBarChart2} color="blue.500" />
            </Flex>
          </CardHeader>
          <CardBody>
            <Box height="250px">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={priorityData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => percent > 0 ? `${name} ${(percent * 100).toFixed(0)}%` : ''}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {priorityData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <RechartsTooltip />
                </PieChart>
              </ResponsiveContainer>
            </Box>
          </CardBody>
        </Card>

        {/* Progression des projets */}
        <Card bg={cardBg} borderWidth="1px" borderColor={borderColor}>
          <CardHeader>
            <Heading size="md">Progression des projets</Heading>
          </CardHeader>
          <CardBody>
            <VStack spacing={4} align="stretch">
              {safeStats.project_progress.length > 0 ? (
                safeStats.project_progress.map((project, index) => (
                  <Box key={index}>
                    <Flex justify="space-between" mb={1}>
                      <Text fontWeight="medium">{String(project.name || 'Projet')}</Text>
                      <Text fontWeight="bold" color={project.color || 'blue.500'}>
                        {String(project.progress || 0)}%
                      </Text>
                    </Flex>
                    <Progress
                      value={Number(project.progress) || 0}
                      colorScheme="blue"
                      height="8px"
                      borderRadius="full"
                    />
                  </Box>
                ))
              ) : (
                <Text color="gray.500" textAlign="center">Aucun projet</Text>
              )}
            </VStack>
          </CardBody>
        </Card>

        {/* Statut des tâches */}
        <Card bg={cardBg} borderWidth="1px" borderColor={borderColor}>
          <CardHeader>
            <Heading size="md">Statut des tâches</Heading>
          </CardHeader>
          <CardBody>
            <Box height="200px">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={statusData}
                  layout="vertical"
                  margin={{ top: 5, right: 30, left: 60, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" />
                  <YAxis type="category" dataKey="name" />
                  <RechartsTooltip />
                  <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                    {statusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </Box>
          </CardBody>
        </Card>
      </SimpleGrid>

      {/* Section basse : Échéances et activités récentes */}
      <SimpleGrid columns={{ base: 1, lg: 2 }} spacing={6}>
        {/* Échéances à venir */}
        <Card bg={cardBg} borderWidth="1px" borderColor={borderColor}>
          <CardHeader>
            <Flex justify="space-between" align="center">
              <Heading size="md">Échéances à venir</Heading>
              <Tag colorScheme="orange" variant="subtle">
                <TagLeftIcon as={FiCalendar} />
                <TagLabel>Prochains jours</TagLabel>
              </Tag>
            </Flex>
          </CardHeader>
          <CardBody>
            <VStack spacing={3} align="stretch">
              {safeStats.upcoming_deadlines.length > 0 ? (
                safeStats.upcoming_deadlines.map((task) => (
                  <Card
                    key={task.id}
                    as={RouterLink}
                    to={`/tasks/${task.id}`}
                    variant="outline"
                    _hover={{ shadow: 'md', borderColor: 'blue.200' }}
                    transition="all 0.2s"
                  >
                    <CardBody py={3}>
                      <Flex justify="space-between" align="center">
                        <Box>
                          <Text fontWeight="500">{String(task.title || 'Sans titre')}</Text>
                          <HStack spacing={2} mt={1}>
                            <Badge
                              colorScheme={
                                task.priority === 4 ? 'red' :
                                task.priority === 3 ? 'orange' :
                                task.priority === 2 ? 'blue' : 'gray'
                              }
                            >
                              Priorité {String(task.priority || 2)}
                            </Badge>
                            <Text fontSize="xs" color="gray.500">
                              {String(task.project_name || '')}
                            </Text>
                          </HStack>
                        </Box>
                        <VStack align="flex-end" spacing={0}>
                          <Text fontSize="sm" fontWeight="bold" color="orange.500">
                            {task.deadline ? format(new Date(task.deadline), 'dd/MM') : ''}
                          </Text>
                          <Text fontSize="xs" color="gray.500">
                            {task.deadline ? formatDistance(new Date(task.deadline), new Date(), { 
                              addSuffix: true,
                              locale: fr 
                            }) : ''}
                          </Text>
                        </VStack>
                      </Flex>
                    </CardBody>
                  </Card>
                ))
              ) : (
                <Text color="gray.500" textAlign="center">Aucune échéance</Text>
              )}
            </VStack>
          </CardBody>
        </Card>

        {/* Activités récentes */}
        <Card bg={cardBg} borderWidth="1px" borderColor={borderColor}>
          <CardHeader>
            <Heading size="md">Activités récentes</Heading>
          </CardHeader>
          <CardBody>
            <VStack spacing={4} align="stretch">
              {safeStats.recent_activities.length > 0 ? (
                safeStats.recent_activities.map((activity) => (
                  <Flex key={activity.id} align="center">
                    <Avatar
                      size="sm"
                      name={activity.user_name || 'Utilisateur'}
                      mr={3}
                    />
                    <Box flex={1}>
                      <Text fontSize="sm">
                        <Text as="span" fontWeight="bold">{String(activity.user_name || 'Utilisateur')}</Text>
                        {' '}
                        {activity.action === 'create' && 'a créé'}
                        {activity.action === 'update' && 'a modifié'}
                        {activity.action === 'complete' && 'a complété'}
                        {activity.action === 'delete' && 'a supprimé'}
                        {' '}
                        <Text as="span" fontWeight="500">{String(activity.entity_type || '')}</Text>
                      </Text>
                      <Text fontSize="xs" color="gray.500">
                        {activity.created_at ? formatDistance(new Date(activity.created_at), new Date(), {
                          addSuffix: true,
                          locale: fr
                        }) : ''}
                      </Text>
                    </Box>
                  </Flex>
                ))
              ) : (
                <Text color="gray.500" textAlign="center">Aucune activité récente</Text>
              )}
            </VStack>
          </CardBody>
        </Card>
      </SimpleGrid>

      {/* Widget IA */}
      <Card
        mt={6}
        bgGradient="linear(to-r, purple.50, blue.50)"
        borderWidth="1px"
        borderColor="purple.200"
      >
        <CardBody>
          <Flex align="center" justify="space-between" wrap="wrap" gap={4}>
            <HStack spacing={4}>
              <Icon as={FiCpu} boxSize={8} color="purple.500" />
              <Box>
                <Heading size="sm" color="purple.700">Assistant IA</Heading>
                <Text color="gray.600" maxW="lg">
                  Basé sur l'analyse de vos données, voici quelques recommandations pour optimiser votre productivité.
                </Text>
              </Box>
            </HStack>
            <HStack spacing={3}>
              <Tag size="lg" colorScheme="purple" variant="subtle" borderRadius="full">
                <TagLabel>{String(safeStats.delayed_tasks)} tâches à risque</TagLabel>
              </Tag>
              <Button
                size="sm"
                colorScheme="purple"
                rightIcon={<FiTrendingUp />}
                as={RouterLink}
                to="/analytics"
              >
                Voir les insights
              </Button>
            </HStack>
          </Flex>
        </CardBody>
      </Card>
    </Box>
  );
};

export default Dashboard;
