import React, { useState, useCallback } from 'react';
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
  IconButton,
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
  FiMic,
  FiPlay,
  FiPlus,
  FiRefreshCw,
  FiChevronRight,
} from 'react-icons/fi';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import { useQuery } from 'react-query';
import { useStatsService } from '../services/statsService';
import { useMeetingService } from '../services/meetingService';
import { useMissionService } from '../services/missionService';
import GetStartedChecklist from '../components/GetStartedChecklist';
import PageGuide from '../components/PageGuide';
import { FiHome, FiCheckSquare, FiZap } from 'react-icons/fi';

const DASHBOARD_STEPS = [
  { key: 'overview', icon: FiHome },
  { key: 'checklist', icon: FiCheckSquare },
  { key: 'quickAccess', icon: FiZap },
];
import { format, formatDistance } from 'date-fns';
import { fr as frLocale, enUS } from 'date-fns/locale';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { useDashboardSocket } from '../hooks/useDashboardSocket';

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
  const { t, i18n } = useTranslation();
  const [timeRange, setTimeRange] = useState('week');
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const navigate = useNavigate();
  const statsService = useStatsService();
  const { getMeetings } = useMeetingService();
  const { user, token, axiosInstance } = useAuth();
  const { getMissions } = useMissionService();
  const cardBg = useColorModeValue('white', 'gray.700');
  const borderColor = useColorModeValue('gray.200', 'gray.600');

  const { data: stats, isLoading, error, refetch } = useQuery(
    ['dashboard', timeRange],
    () => statsService.getDashboardStats(timeRange),
    {
      refetchInterval: 60000,
      retry: 1,
    }
  );

  const { data: meetingsData, refetch: refetchMeetings } = useQuery(
    'dashboard-meetings',
    async () => {
      try {
        const data = await getMeetings();
        const list = Array.isArray(data) ? data : data.results || [];
        return { recent: list.slice(0, 5), total: list.length };
      } catch {
        return { recent: [], total: 0 };
      }
    },
    { refetchInterval: 60000 }
  );
  const recentMeetings = meetingsData?.recent || [];
  const meetingsTotal = meetingsData?.total || 0;

  const { data: missionsTotal = 0 } = useQuery(
    'dashboard-missions-count',
    async () => {
      try {
        const data = await getMissions();
        return Array.isArray(data) ? data.length : (data?.results?.length || 0);
      } catch {
        return 0;
      }
    },
    { staleTime: 5 * 60 * 1000 }
  );

  const { data: filesTotal = 0 } = useQuery(
    'dashboard-files-count',
    async () => {
      try {
        const res = await axiosInstance.get('/files/');
        const data = res.data;
        return Array.isArray(data) ? data.length : (data?.results?.length || 0);
      } catch {
        return 0;
      }
    },
    { staleTime: 5 * 60 * 1000 }
  );

  const handleRefresh = useCallback((reason) => {
    refetch();
    refetchMeetings();
    setLastUpdated(new Date());
  }, [refetch, refetchMeetings]);

  useDashboardSocket(token, handleRefresh);

  const COLORS = ['#3b5bdb', '#10b981', '#f59e0b', '#d946ef', '#ef4444', '#14b8a6'];

  const dateLocale = i18n.language === 'fr' ? frLocale : enUS;

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

  const GETSTARTED_DISMISS_KEY = 'smarttodo_getstarted_dismissed_v1';
  const [getStartedDismissed, setGetStartedDismissed] = useState(() => {
    try {
      return localStorage.getItem(GETSTARTED_DISMISS_KEY) === '1';
    } catch (e) {
      return false;
    }
  });
  const dismissGetStarted = () => {
    try {
      localStorage.setItem(GETSTARTED_DISMISS_KEY, '1');
    } catch (e) {
      // ignore
    }
    setGetStartedDismissed(true);
  };

  const priorityData = [
    { name: t('common.low'), value: Number(safeStats.tasks_by_priority.low) || 0, color: '#718096', priority: 1 },
    { name: t('common.medium'), value: Number(safeStats.tasks_by_priority.medium) || 0, color: '#4299E1', priority: 2 },
    { name: t('common.high'), value: Number(safeStats.tasks_by_priority.high) || 0, color: '#ED8936', priority: 3 },
    { name: t('common.critical'), value: Number(safeStats.tasks_by_priority.critical) || 0, color: '#F56565', priority: 4 },
  ].filter(item => item.value > 0);

  const statusData = [
    { name: t('common.todo'), value: Number(safeStats.tasks_by_status.todo) || 0, color: '#A0AEC0', status: 'todo' },
    { name: t('common.inProgress'), value: Number(safeStats.tasks_by_status.in_progress) || 0, color: '#4299E1', status: 'in_progress' },
    { name: t('common.review'), value: Number(safeStats.tasks_by_status.review) || 0, color: '#9F7AEA', status: 'review' },
    { name: t('common.blocked'), value: Number(safeStats.tasks_by_status.blocked) || 0, color: '#F56565', status: 'blocked' },
    { name: t('common.completed'), value: Number(safeStats.tasks_by_status.completed) || 0, color: '#48BB78', status: 'completed' },
  ].filter(item => item.value > 0);

  if (isLoading) {
    return (
      <Box textAlign="center" py={10}>
        <Spinner size="xl" color="blue.500" thickness="4px" />
        <Text mt={4}>{t('common.loading')}</Text>
      </Box>
    );
  }

  if (error) {
    return (
      <Box textAlign="center" py={10}>
        <Alert status="error" borderRadius="lg" maxW="lg" mx="auto">
          <AlertIcon />
          <Box flex="1">
            <AlertTitle>{t('common.loadError')}</AlertTitle>
            <AlertDescription>
              {t('common.loadErrorDesc')}
            </AlertDescription>
          </Box>
          <Button size="sm" onClick={() => refetch()}>
            {t('common.retry')}
          </Button>
        </Alert>
      </Box>
    );
  }

  return (
    <Box>
      <Flex justify="space-between" align="center" mb={6} wrap="wrap" gap={3}>
        <Heading size="lg">{t('dashboard.title')}</Heading>
        <HStack spacing={2}>
          <Tooltip
            label={`${t('common.lastUpdate')} ${format(lastUpdated, 'HH:mm:ss')}`}
            hasArrow
          >
            <IconButton
              size="sm"
              variant="ghost"
              aria-label={t('common.refresh')}
              icon={<FiRefreshCw />}
              onClick={() => handleRefresh('manual')}
              _active={{ transform: 'rotate(180deg)' }}
              transition="all 0.3s"
            />
          </Tooltip>
          <Button
            size="sm"
            variant={timeRange === 'week' ? 'solid' : 'ghost'}
            colorScheme={timeRange === 'week' ? 'blue' : 'gray'}
            onClick={() => setTimeRange('week')}
          >
            {t('dashboard.week')}
          </Button>
          <Button
            size="sm"
            variant={timeRange === 'month' ? 'solid' : 'ghost'}
            colorScheme={timeRange === 'month' ? 'blue' : 'gray'}
            onClick={() => setTimeRange('month')}
          >
            {t('dashboard.month')}
          </Button>
          <Button
            size="sm"
            variant={timeRange === 'year' ? 'solid' : 'ghost'}
            colorScheme={timeRange === 'year' ? 'blue' : 'gray'}
            onClick={() => setTimeRange('year')}
          >
            {t('dashboard.year')}
          </Button>
        </HStack>
      </Flex>

      {!getStartedDismissed && (
        <GetStartedChecklist
          counts={{
            projects: safeStats.total_projects,
            tasks: safeStats.total_tasks,
            meetings: meetingsTotal,
            missions: missionsTotal,
            files: filesTotal,
          }}
          onDismiss={dismissGetStarted}
        />
      )}

      <SimpleGrid columns={{ base: 1, sm: 2, lg: 4 }} spacing={4} mb={6}>
        {[
          { label: t('dashboard.activeProjects'), value: safeStats.active_projects, sub: `${safeStats.total_projects} ${t('dashboard.total')}`, icon: FiFolder, color: 'brand.500', bg: 'brand.50', to: '/projects' },
          { label: t('dashboard.completedTasks'), value: safeStats.completed_tasks, sub: `${safeStats.total_tasks} ${t('dashboard.total')}`, icon: FiCheckCircle, color: 'success.500', bg: 'success.50', to: '/tasks' },
          { label: t('dashboard.tasksInProgress'), value: safeStats.in_progress_tasks, sub: `${safeStats.delayed_tasks} ${t('dashboard.overdueTasks')}`, icon: FiClock, color: 'warning.500', bg: 'warning.50', to: '/tasks?status=in_progress' },
          { label: t('dashboard.productivityScore'), value: `${safeStats.productivity_score}%`, sub: `+5% ${t('dashboard.vsYesterday')}`, icon: FiTarget, color: 'accent.500', bg: 'accent.50', to: '/analytics' },
        ].map((kpi, i) => (
          <Card
            key={i}
            as={RouterLink}
            to={kpi.to}
            bg={cardBg}
            borderWidth="1px"
            borderColor={borderColor}
            className="card-hover"
            cursor="pointer"
            _hover={{ transform: 'translateY(-2px)', shadow: 'md', borderColor: 'blue.200' }}
            transition="all 0.2s"
          >
            <CardBody p={5}>
              <Flex justify="space-between" align="flex-start">
                <VStack align="flex-start" spacing={1}>
                  <Text fontSize="sm" color="gray.500" fontWeight="500">{kpi.label}</Text>
                  <Text fontSize="3xl" fontWeight="700" color="gray.800">{String(kpi.value)}</Text>
                  <HStack spacing={1}>
                    <Icon as={FiTrendingUp} boxSize={3} color="success.500" />
                    <Text fontSize="xs" color="gray.400">{kpi.sub}</Text>
                  </HStack>
                </VStack>
                <Box
                  w={12}
                  h={12}
                  borderRadius="xl"
                  bg={kpi.bg}
                  display="flex"
                  alignItems="center"
                  justifyContent="center"
                >
                  <Icon as={kpi.icon} boxSize={5} color={kpi.color} />
                </Box>
              </Flex>
            </CardBody>
          </Card>
        ))}
      </SimpleGrid>

      <SimpleGrid columns={{ base: 1, lg: 2 }} spacing={6} mb={6}>
        <Card bg={cardBg} borderWidth="1px" borderColor={borderColor}>
          <CardHeader pb={0}>
            <Flex justify="space-between" align="center">
              <Heading size="md" fontWeight="600">{t('dashboard.weeklyActivity')}</Heading>
              <Box
                w={8}
                h={8}
                borderRadius="lg"
                bg="brand.50"
                display="flex"
                alignItems="center"
                justifyContent="center"
              >
                <Icon as={FiActivity} boxSize={4} color="brand.500" />
              </Box>
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
                    name={t('sidebar.tasks')}
                    style={{ cursor: 'pointer' }}
                    onClick={() => navigate('/tasks')}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </Box>
          </CardBody>
        </Card>

        <Card bg={cardBg} borderWidth="1px" borderColor={borderColor}>
          <CardHeader pb={0}>
            <Flex justify="space-between" align="center">
              <Heading size="md" fontWeight="600">{t('dashboard.tasksByPriority')}</Heading>
              <Box
                w={8}
                h={8}
                borderRadius="lg"
                bg="accent.50"
                display="flex"
                alignItems="center"
                justifyContent="center"
              >
                <Icon as={FiBarChart2} boxSize={4} color="accent.500" />
              </Box>
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
                    style={{ cursor: 'pointer' }}
                    onClick={(entry) => {
                      if (entry?.priority) navigate(`/tasks?priority=${entry.priority}`);
                    }}
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

        <Card bg={cardBg} borderWidth="1px" borderColor={borderColor}>
          <CardHeader>
            <Flex justify="space-between" align="center">
              <Heading size="md" fontWeight="600">{t('dashboard.projectProgress')}</Heading>
              <Button
                size="xs"
                variant="ghost"
                as={RouterLink}
                to="/projects"
                rightIcon={<FiChevronRight />}
              >
                {t('dashboard.viewAll')}
              </Button>
            </Flex>
          </CardHeader>
          <CardBody>
            <VStack spacing={3} align="stretch">
              {safeStats.project_progress.length > 0 ? (
                safeStats.project_progress.map((project, index) => (
                  <Box
                    key={project.id ?? index}
                    as={project.id ? RouterLink : undefined}
                    to={project.id ? `/projects/${project.id}` : undefined}
                    p={2}
                    borderRadius="md"
                    _hover={{ bg: 'gray.50' }}
                    transition="all 0.15s"
                  >
                    <Flex justify="space-between" mb={1}>
                      <Text fontWeight="medium">{String(project.name || t('dashboard.project'))}</Text>
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
                <Text color="gray.500" textAlign="center">{t('dashboard.noProjects')}</Text>
              )}
            </VStack>
          </CardBody>
        </Card>

        <Card bg={cardBg} borderWidth="1px" borderColor={borderColor}>
          <CardHeader>
            <Heading size="md" fontWeight="600">{t('dashboard.taskStatus')}</Heading>
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
                  <Bar
                    dataKey="value"
                    radius={[0, 4, 4, 0]}
                    style={{ cursor: 'pointer' }}
                    onClick={(entry) => {
                      if (entry?.status) navigate(`/tasks?status=${entry.status}`);
                    }}
                  >
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

      <SimpleGrid columns={{ base: 1, lg: 2 }} spacing={6}>
        <Card bg={cardBg} borderWidth="1px" borderColor={borderColor}>
          <CardHeader>
            <Flex justify="space-between" align="center">
              <Heading size="md" fontWeight="600">{t('dashboard.upcomingDeadlines')}</Heading>
              <Tag colorScheme="orange" variant="subtle">
                <TagLeftIcon as={FiCalendar} />
                <TagLabel>{t('dashboard.nextDays')}</TagLabel>
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
                          <Text fontWeight="500">{String(task.title || t('common.untitled'))}</Text>
                          <HStack spacing={2} mt={1}>
                            <Badge
                              colorScheme={
                                task.priority === 4 ? 'red' :
                                task.priority === 3 ? 'orange' :
                                task.priority === 2 ? 'blue' : 'gray'
                              }
                            >
                              {t('dashboard.priority')} {String(task.priority || 2)}
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
                              locale: dateLocale
                            }) : t('dashboard.noDeadline')}
                          </Text>
                        </VStack>
                      </Flex>
                    </CardBody>
                  </Card>
                ))
              ) : (
                <Text color="gray.500" textAlign="center">{t('dashboard.noDeadline')}</Text>
              )}
            </VStack>
          </CardBody>
        </Card>

        <Card bg={cardBg} borderWidth="1px" borderColor={borderColor}>
          <CardHeader>
            <Heading size="md" fontWeight="600">{t('dashboard.recentActivity')}</Heading>
          </CardHeader>
          <CardBody>
            <VStack
              spacing={4}
              align="stretch"
              maxH="320px"
              overflowY="auto"
              pr={2}
              css={{
                '&::-webkit-scrollbar': { width: '4px' },
                '&::-webkit-scrollbar-thumb': { background: 'gray.200', borderRadius: '24px' },
              }}
            >
              {safeStats.recent_activities.length > 0 ? (
                safeStats.recent_activities.map((activity) => (
                  <Flex key={activity.id} align="center">
                    <Avatar
                      size="sm"
                      name={activity.user_name || t('dashboard.user')}
                      mr={3}
                    />
                    <Box flex={1}>
                      <Text fontSize="sm">
                        <Text as="span" fontWeight="bold">{String(activity.user_name || t('dashboard.user'))}</Text>
                        {' '}
                        {activity.action === 'create' && t('dashboard.created')}
                        {activity.action === 'update' && t('dashboard.modified')}
                        {activity.action === 'complete' && t('dashboard.completedAction')}
                        {activity.action === 'delete' && t('dashboard.deleted')}
                        {' '}
                        <Text as="span" fontWeight="500">{String(activity.entity_type || '')}</Text>
                      </Text>
                      <Text fontSize="xs" color="gray.500">
                        {activity.created_at ? formatDistance(new Date(activity.created_at), new Date(), {
                          addSuffix: true,
                          locale: dateLocale
                        }) : ''}
                      </Text>
                    </Box>
                  </Flex>
                ))
              ) : (
                <Text color="gray.500" textAlign="center">{t('dashboard.noActivity')}</Text>
              )}
            </VStack>
          </CardBody>
        </Card>
      </SimpleGrid>

      <Card mt={6} bg={cardBg} borderWidth="1px" borderColor={borderColor}>
        <CardHeader>
          <Flex justify="space-between" align="center">
            <HStack spacing={3}>
              <Box
                w={8}
                h={8}
                borderRadius="lg"
                bg="accent.50"
                display="flex"
                alignItems="center"
                justifyContent="center"
              >
                <Icon as={FiMic} boxSize={4} color="accent.500" />
              </Box>
              <Heading size="md" fontWeight="600">{t('dashboard.recentMeetings')}</Heading>
            </HStack>
            <HStack spacing={2}>
              <Button
                size="sm"
                variant="outline"
                colorScheme="purple"
                leftIcon={<FiPlus />}
                as={RouterLink}
                to="/meetings/create"
              >
                {t('dashboard.newMeeting')}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                as={RouterLink}
                to="/meetings"
              >
                {t('dashboard.viewAll')}
              </Button>
            </HStack>
          </Flex>
        </CardHeader>
        <CardBody pt={0}>
          {recentMeetings.length > 0 ? (
            <VStack spacing={3} align="stretch">
              {recentMeetings.map((meeting) => (
                <Card
                  key={meeting.id}
                  as={RouterLink}
                  to={`/meetings/${meeting.id}`}
                  variant="outline"
                  _hover={{ shadow: 'md', borderColor: 'purple.200' }}
                  transition="all 0.2s"
                >
                  <CardBody py={3}>
                    <Flex justify="space-between" align="center">
                      <HStack spacing={3} flex={1}>
                        <Icon
                          as={
                            meeting.status === 'in_progress' ? FiPlay :
                            meeting.status === 'completed' ? FiCheckCircle :
                            FiClock
                          }
                          color={
                            meeting.status === 'in_progress' ? 'orange.500' :
                            meeting.status === 'completed' ? 'green.500' :
                            'blue.500'
                          }
                        />
                        <Box>
                          <Text fontWeight="500">{String(meeting.title || t('common.untitled'))}</Text>
                          <HStack spacing={2} mt={1}>
                            <Badge
                              colorScheme={
                                meeting.status === 'completed' ? 'green' :
                                meeting.status === 'in_progress' ? 'orange' :
                                meeting.status === 'cancelled' ? 'red' : 'blue'
                              }
                              size="sm"
                            >
                              {meeting.status === 'in_progress' ? t('dashboard.meetingInProgress') :
                               meeting.status?.charAt(0).toUpperCase() + meeting.status?.slice(1)}
                            </Badge>
                            {meeting.ai_processed && (
                              <Badge colorScheme="purple" size="sm" variant="subtle">AI</Badge>
                            )}
                            {meeting.project_name && (
                              <Text fontSize="xs" color="gray.500">{String(meeting.project_name)}</Text>
                            )}
                          </HStack>
                        </Box>
                      </HStack>
                      <VStack align="flex-end" spacing={0}>
                        <Text fontSize="sm" color="gray.500">
                          {meeting.scheduled_at ? format(new Date(meeting.scheduled_at), 'dd/MM') : ''}
                        </Text>
                        <Text fontSize="xs" color="gray.400">
                          {meeting.participants_count || 0} {t('dashboard.participants')}
                        </Text>
                      </VStack>
                    </Flex>
                  </CardBody>
                </Card>
              ))}
            </VStack>
          ) : (
            <Box textAlign="center" py={6}>
              <Icon as={FiMic} boxSize={8} color="gray.300" mb={2} />
              <Text color="gray.500">{t('dashboard.noMeetings')}</Text>
              <Button
                mt={3}
                size="sm"
                colorScheme="purple"
                leftIcon={<FiPlus />}
                as={RouterLink}
                to="/meetings/create"
              >
                {t('dashboard.createFirstMeeting')}
              </Button>
            </Box>
          )}
        </CardBody>
      </Card>

      <Card
        mt={6}
        bgGradient="linear(135deg, brand.50, accent.50)"
        borderWidth="1px"
        borderColor="brand.200"
      >
        <CardBody>
          <Flex align="center" justify="space-between" wrap="wrap" gap={4}>
            <HStack spacing={4}>
              <Box
                w={12}
                h={12}
                borderRadius="xl"
                bgGradient="linear(135deg, brand.500, accent.500)"
                display="flex"
                alignItems="center"
                justifyContent="center"
              >
                <Icon as={FiCpu} boxSize={6} color="white" />
              </Box>
              <Box>
                <Heading size="sm" color="gray.800" fontWeight="600">{t('dashboard.aiAssistant')}</Heading>
                <Text color="gray.600" maxW="lg" fontSize="sm">
                  {t('dashboard.aiRecommendation')}
                </Text>
              </Box>
            </HStack>
            <HStack spacing={3}>
              <Tag size="lg" colorScheme="purple" variant="subtle" borderRadius="full">
                <TagLabel>{String(safeStats.delayed_tasks)} {t('dashboard.atRiskTasks')}</TagLabel>
              </Tag>
              <Button
                size="sm"
                colorScheme="purple"
                rightIcon={<FiTrendingUp />}
                as={RouterLink}
                to="/analytics"
              >
                {t('dashboard.viewInsights')}
              </Button>
            </HStack>
          </Flex>
        </CardBody>
      </Card>
      <PageGuide
        guideId="dashboard"
        i18nPrefix="pageGuides.dashboard"
        steps={DASHBOARD_STEPS}
      />
    </Box>
  );
};

export default Dashboard;
