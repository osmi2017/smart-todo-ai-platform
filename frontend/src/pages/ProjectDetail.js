import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import ProjectMembers from '../components/ProjectMembers';
import {
  Box,
  Heading,
  Text,
  Badge,
  VStack,
  HStack,
  Progress,
  Button,
  SimpleGrid,
  Card,
  CardBody,
  CardHeader,
  Divider,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  List,
  ListItem,
  ListIcon,
  useToast,
  Spinner,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  Icon,
  Flex,
  Avatar,
  AvatarGroup,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
  useDisclosure,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  ModalCloseButton,
  FormControl,
  FormLabel,
  Input,
  Textarea,
  Select,
} from '@chakra-ui/react';
import {
  FiCalendar,
  FiClock,
  FiCheckCircle,
  FiAlertCircle,
  FiUsers,
  FiPlus,
  FiMoreVertical,
  FiEdit2,
  FiTrash2,
  FiFlag,
  FiBarChart2,
  FiUserPlus,
} from 'react-icons/fi';
import { useParams, useNavigate, Link as RouterLink } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { useProjectService } from '../services/projectService';
import { useTaskService } from '../services/taskService';
import { format } from 'date-fns';
import { fr as frLocale, enUS } from 'date-fns/locale';

const ProjectDetail = () => {
  const { t, i18n } = useTranslation();
  const dateLocale = i18n.language === 'fr' ? frLocale : enUS;
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const queryClient = useQueryClient();
  const projectService = useProjectService();
  const taskService = useTaskService();
  
  // State pour le modal d'édition
  const { isOpen: isEditOpen, onOpen: onEditOpen, onClose: onEditClose } = useDisclosure();
  const [editFormData, setEditFormData] = useState({
    name: '',
    description: '',
    status: '',
    start_date: '',
    deadline: '',
  });

  // Charger les détails du projet
  const { data: project, isLoading: projectLoading } = useQuery(
    ['project', id],
    () => projectService.getProject(id),
    {
      onSuccess: (data) => {
        // Initialiser le formulaire d'édition avec les données du projet
        setEditFormData({
          name: data.name || '',
          description: data.description || '',
          status: data.status || 'not_started',
          start_date: data.start_date || '',
          deadline: data.deadline || '',
        });
      },
      onError: (error) => {
        toast({
          title: t('common.error'),
          description: t('common.loadErrorDesc'),
          status: 'error',
          duration: 3000,
        });
        navigate('/projects');
      },
    }
  );

  // Charger les statistiques du projet
  const { data: stats, isLoading: statsLoading } = useQuery(
    ['projectStats', id],
    () => projectService.getProjectStats(id),
    {
      enabled: !!project,
    }
  );

  // Charger les tâches du projet
  const { data: tasks, isLoading: tasksLoading } = useQuery(
    ['projectTasks', id],
    () => taskService.getTasks({ project: id }),
    {
      enabled: !!project,
    }
  );

  // Mutation pour mettre à jour le projet
  const updateProjectMutation = useMutation(
    (data) => projectService.updateProject(id, data),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['project', id]);
        queryClient.invalidateQueries('projects');
        toast({
          title: t('common.success'),
          description: t('projects.updatedSuccess'),
          status: 'success',
          duration: 3000,
        });
        onEditClose();
      },
      onError: (error) => {
        toast({
          title: t('common.error'),
          description: error.response?.data?.message || t('projects.updateError'),
          status: 'error',
          duration: 3000,
        });
      },
    }
  );

  // Mutation pour supprimer le projet
  const deleteProjectMutation = useMutation(
    () => projectService.deleteProject(id),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('projects');
        toast({
          title: t('common.success'),
          description: t('projects.deletedSuccess'),
          status: 'success',
          duration: 3000,
        });
        navigate('/projects');
      },
      onError: (error) => {
        toast({
          title: t('common.error'),
          description: error.response?.data?.message || t('projects.deleteError'),
          status: 'error',
          duration: 3000,
        });
      },
    }
  );

  const handleEditSubmit = (e) => {
    e.preventDefault();
    updateProjectMutation.mutate(editFormData);
  };

  const handleDeleteProject = () => {
    if (window.confirm(`${t('common.confirmDelete')} ? ${t('common.irreversible')}`)) {
      deleteProjectMutation.mutate();
    }
  };

  if (projectLoading || statsLoading || tasksLoading) {
    return (
      <Box textAlign="center" py={10}>
        <Spinner size="xl" color="blue.500" />
        <Text mt={4}>{t('common.loading')}</Text>
      </Box>
    );
  }

  if (!project) {
    return (
      <Box textAlign="center" py={10}>
        <Text color="red.500">{t('projects.notFound')}</Text>
        <Button mt={4} as={RouterLink} to="/projects">
          {t('common.back')}
        </Button>
      </Box>
    );
  }

  const getStatusColor = (status) => {
    const colors = {
      'not_started': 'gray',
      'in_progress': 'blue',
      'paused': 'orange',
      'completed': 'green',
      'archived': 'purple',
    };
    return colors[status] || 'gray';
  };

  const getStatusLabel = (status) => {
    const labels = {
      'not_started': t('common.notStarted'),
      'in_progress': t('common.inProgress'),
      'paused': t('common.paused'),
      'completed': t('common.completed'),
      'archived': t('common.archived'),
    };
    return labels[status] || status;
  };

  const getPriorityColor = (priority) => {
    const colors = { 1: 'gray', 2: 'blue', 3: 'orange', 4: 'red' };
    return colors[priority] || 'gray';
  };

  const getPriorityLabel = (priority) => {
    const labels = { 1: t('common.low'), 2: t('common.medium'), 3: t('common.high'), 4: t('common.critical') };
    return labels[priority] || priority;
  };

  return (
    <Box>
      {/* En-tête */}
      <VStack align="stretch" spacing={6}>
        <Flex justify="space-between" align="center">
          <HStack spacing={4}>
            <Heading size="lg">{project.name}</Heading>
            <Badge colorScheme={getStatusColor(project.status)} fontSize="md" px={3} py={1}>
              {getStatusLabel(project.status)}
            </Badge>
          </HStack>
          <HStack spacing={2}>
            <Button
              leftIcon={<FiPlus />}
              colorScheme="blue"
              size="sm"
              as={RouterLink}
              to={`/tasks/create?project=${id}`}
            >
              {t('tasks.newTask')}
            </Button>
            <Menu>
              <MenuButton as={Button} variant="ghost" size="sm">
                <FiMoreVertical />
              </MenuButton>
              <MenuList>
                <MenuItem icon={<FiEdit2 />} onClick={onEditOpen}>
                  {t('projects.editProject')}
                </MenuItem>
                <MenuItem icon={<FiBarChart2 />} as={RouterLink} to={`/analytics?project=${id}`}>
                  {t('sidebar.analytics')}
                </MenuItem>
                <MenuItem icon={<FiUserPlus />} onClick={() => {
                  const membersTab = document.querySelector('[aria-selected="false"]:has-text("Membres")');
                  if (membersTab) membersTab.click();
                }}>
                  {t('projectMembers.title')}
                </MenuItem>
                <MenuItem icon={<FiTrash2 />} color="red.500" onClick={handleDeleteProject}>
                  {t('common.delete')}
                </MenuItem>
              </MenuList>
            </Menu>
          </HStack>
        </Flex>

        {/* Description */}
        {project.description && (
          <Box>
            <Text color="gray.600">{project.description}</Text>
          </Box>
        )}

        {/* Métriques */}
        <SimpleGrid columns={{ base: 2, md: 4 }} spacing={4}>
          <Card>
            <CardBody>
              <Stat>
                <StatLabel>{t('common.progress')}</StatLabel>
                <StatNumber>{Math.round(project.progress)}%</StatNumber>
                <Progress
                  value={project.progress}
                  size="sm"
                  colorScheme={project.progress === 100 ? 'green' : 'blue'}
                  mt={2}
                  borderRadius="full"
                />
              </Stat>
            </CardBody>
          </Card>

          <Card>
            <CardBody>
              <Stat>
                <StatLabel>{t('sidebar.tasks')}</StatLabel>
                <StatNumber>{stats?.total_tasks || 0}</StatNumber>
                <StatHelpText>
                  {stats?.completed_tasks || 0} {t('common.completed')}
                </StatHelpText>
              </Stat>
            </CardBody>
          </Card>

          <Card>
            <CardBody>
              <Stat>
                <StatLabel>{t('projectMembers.title')}</StatLabel>
                <StatNumber>{stats?.members_count || 1}</StatNumber>
                <StatHelpText>
                  {stats?.members_count || 1} {t('projectMembers.title').toLowerCase()}
                </StatHelpText>
              </Stat>
            </CardBody>
          </Card>

          <Card>
            <CardBody>
              <Stat>
                <StatLabel>{t('projects.milestones')}</StatLabel>
                <StatNumber>{stats?.milestones_count || 0}</StatNumber>
                <StatHelpText>
                  {stats?.milestones_count || 0} {t('projects.milestones').toLowerCase()}
                </StatHelpText>
              </Stat>
            </CardBody>
          </Card>
        </SimpleGrid>

        {/* Alertes IA */}
        {project.risk_score > 50 && (
          <Alert status="warning" variant="left-accent" borderRadius="md">
            <AlertIcon />
            <Box flex={1}>
              <AlertTitle>{t('projects.riskHigh')}</AlertTitle>
              <AlertDescription>
                {t('projects.riskHigh')} {Math.round(project.risk_score)}%.
                {project.risk_score > 75 
                  ? ` ${t('common.critical')}`
                  : ''}
              </AlertDescription>
            </Box>
          </Alert>
        )}

        {/* Dates */}
        <HStack spacing={6} color="gray.600" fontSize="sm">
          <HStack>
            <FiCalendar />
            <Text>{t('projects.startDateLabel')} {project.start_date 
              ? format(new Date(project.start_date), 'dd MMMM yyyy', { locale: dateLocale })
              : t('common.notDefined')}</Text>
          </HStack>
          <HStack>
            <FiClock />
            <Text>{t('projects.endDateLabel')} {project.deadline 
              ? format(new Date(project.deadline), 'dd MMMM yyyy', { locale: dateLocale })
              : t('common.notDefined')}</Text>
          </HStack>
        </HStack>

        {/* Groupes et Chefs de projet */}
        <HStack spacing={6} flexWrap="wrap">
          {project.groups_detail && project.groups_detail.length > 0 && (
            <HStack>
              <Text fontSize="sm" fontWeight="600" color="gray.600">{t('projects.groupsLabel')}</Text>
              {project.groups_detail.map((g) => (
                <Badge key={g.id} colorScheme="purple">{g.name}</Badge>
              ))}
            </HStack>
          )}
          {project.managers_detail && project.managers_detail.length > 0 && (
            <HStack>
              <Text fontSize="sm" fontWeight="600" color="gray.600">{t('projects.managersLabel')}</Text>
              {project.managers_detail.map((m) => (
                <Badge key={m.id} colorScheme="orange">{m.username}</Badge>
              ))}
            </HStack>
          )}
        </HStack>

        <Divider />

        {/* Tabs */}
        <Tabs variant="enclosed" colorScheme="blue">
          <TabList>
            <Tab>{t('sidebar.tasks')}</Tab>
            <Tab>{t('projects.milestones')}</Tab>
            <Tab>{t('projectMembers.title')}</Tab>
            <Tab>{t('projects.statistics')}</Tab>
          </TabList>

          <TabPanels>
            <TabPanel>
              <VStack align="stretch" spacing={4}>
                {tasks && tasks.length > 0 ? (
                  tasks.map((task) => (
                    <Card
                      key={task.id}
                      as={RouterLink}
                      to={`/tasks/${task.id}`}
                      _hover={{ shadow: 'md', transform: 'translateY(-2px)' }}
                      transition="all 0.2s"
                      cursor="pointer"
                    >
                      <CardBody>
                        <Flex justify="space-between" align="center">
                          <HStack spacing={4}>
                            <Box>
                              <HStack mb={2}>
                                <Badge colorScheme={getPriorityColor(task.priority)}>
                                  {getPriorityLabel(task.priority)}
                                </Badge>
                                <Badge colorScheme={
                                  task.status === 'completed' ? 'green' :
                                  task.status === 'in_progress' ? 'blue' :
                                  task.status === 'blocked' ? 'red' : 'gray'
                                }>
                                  {task.status === 'todo' ? t('common.todo') :
                                   task.status === 'in_progress' ? t('common.inProgress') :
                                   task.status === 'review' ? t('common.review') :
                                   task.status === 'blocked' ? t('common.blocked') :
                                   task.status === 'completed' ? t('common.completed') : task.status}
                                </Badge>
                              </HStack>
                              <Text fontWeight="500">{task.title}</Text>
                              {task.description && (
                                <Text fontSize="sm" color="gray.500" noOfLines={1}>
                                  {task.description}
                                </Text>
                              )}
                            </Box>
                          </HStack>
                          <HStack spacing={4}>
                            {task.delay_probability > 0.7 && (
                              <Icon as={FiAlertCircle} color="red.500" title={t('projects.riskHigh')} />
                            )}
                            {task.assigned_to_name && (
                              <Avatar size="sm" name={task.assigned_to_name} />
                            )}
                          </HStack>
                        </Flex>
                      </CardBody>
                    </Card>
                  ))
                ) : (
                  <Box textAlign="center" py={8}>
                    <Text color="gray.500">{t('projects.noTasks')}</Text>
                    <Button
                      mt={4}
                      leftIcon={<FiPlus />}
                      size="sm"
                      colorScheme="blue"
                      as={RouterLink}
                      to={`/tasks/create?project=${id}`}
                    >
                      {t('projects.createTask')}
                    </Button>
                  </Box>
                )}
              </VStack>
            </TabPanel>

            <TabPanel>
              <Box textAlign="center" py={8}>
                <Text color="gray.500">{t('projects.comingSoon')}</Text>
                <Button
                  mt={4}
                  leftIcon={<FiPlus />}
                  size="sm"
                  colorScheme="purple"
                  as={RouterLink}
                  to={`/milestones/create?project=${id}`}
                >
                  {t('projects.createMilestone')}
                </Button>
              </Box>
            </TabPanel>

            <TabPanel>
              {/* Intégration du composant ProjectMembers */}
              <ProjectMembers 
                projectId={id} 
                projectOwnerId={project.owner_id} 
              />
            </TabPanel>

            <TabPanel>
              <SimpleGrid columns={2} spacing={4}>
                <Card>
                  <CardHeader>
                    <Heading size="md">{t('common.progress')}</Heading>
                  </CardHeader>
                  <CardBody>
                    <VStack align="stretch" spacing={4}>
                      <Box>
                        <Text fontSize="sm" color="gray.500">{t('projects.completionRate')}</Text>
                        <Text fontSize="2xl" fontWeight="bold">
                          {stats?.completion_rate ? Math.round(stats.completion_rate) : 0}%
                        </Text>
                      </Box>
                      <Box>
                        <Text fontSize="sm" color="gray.500">{t('projects.totalTime')}</Text>
                        <Text fontSize="2xl" fontWeight="bold">
                          {Math.round(stats?.total_time_spent || 0)}h
                        </Text>
                      </Box>
                      <Box>
                        <Text fontSize="sm" color="gray.500">{t('projects.avgTimePerTask')}</Text>
                        <Text fontSize="2xl" fontWeight="bold">
                          {stats?.avg_task_time ? Math.round(stats.avg_task_time) : 0}h
                        </Text>
                      </Box>
                    </VStack>
                  </CardBody>
                </Card>

                <Card>
                  <CardHeader>
                    <Heading size="md">{t('projects.overdueTasks')}</Heading>
                  </CardHeader>
                  <CardBody>
                    <Text fontSize="4xl" fontWeight="bold" color="red.500">
                      {stats?.delayed_tasks || 0}
                    </Text>
                    <Text color="gray.500">{t('projects.overdueTasksCount')}</Text>
                  </CardBody>
                </Card>

                <Card gridColumn="span 2">
                  <CardHeader>
                    <Heading size="md">{t('projects.taskDistribution')}</Heading>
                  </CardHeader>
                  <CardBody>
                    <SimpleGrid columns={2} spacing={4}>
                      <Box>
                        <Text fontSize="sm" color="gray.500">{t('projects.byPriority')}</Text>
                        <VStack align="stretch" mt={2}>
                          <HStack justify="space-between">
                            <Text>{t('common.low')}</Text>
                            <Badge>0</Badge>
                          </HStack>
                          <HStack justify="space-between">
                            <Text>{t('common.medium')}</Text>
                            <Badge colorScheme="blue">0</Badge>
                          </HStack>
                          <HStack justify="space-between">
                            <Text>{t('common.high')}</Text>
                            <Badge colorScheme="orange">0</Badge>
                          </HStack>
                          <HStack justify="space-between">
                            <Text>{t('common.critical')}</Text>
                            <Badge colorScheme="red">0</Badge>
                          </HStack>
                        </VStack>
                      </Box>
                      <Box>
                        <Text fontSize="sm" color="gray.500">{t('projects.byStatus')}</Text>
                        <VStack align="stretch" mt={2}>
                          <HStack justify="space-between">
                            <Text>{t('common.todo')}</Text>
                            <Badge>0</Badge>
                          </HStack>
                          <HStack justify="space-between">
                            <Text>{t('common.inProgress')}</Text>
                            <Badge colorScheme="blue">0</Badge>
                          </HStack>
                          <HStack justify="space-between">
                            <Text>{t('projects.blockedCount')}</Text>
                            <Badge colorScheme="red">0</Badge>
                          </HStack>
                          <HStack justify="space-between">
                            <Text>{t('projects.completedCount')}</Text>
                            <Badge colorScheme="green">0</Badge>
                          </HStack>
                        </VStack>
                      </Box>
                    </SimpleGrid>
                  </CardBody>
                </Card>
              </SimpleGrid>
            </TabPanel>
          </TabPanels>
        </Tabs>
      </VStack>

      {/* Modal d'édition du projet */}
      <Modal isOpen={isEditOpen} onClose={onEditClose} size="xl">
        <ModalOverlay />
        <ModalContent>
          <form onSubmit={handleEditSubmit}>
            <ModalHeader>{t('projects.editProject')}</ModalHeader>
            <ModalCloseButton />
            <ModalBody>
              <VStack spacing={4}>
                <FormControl isRequired>
                  <FormLabel>{t('projects.projectName')}</FormLabel>
                  <Input
                    value={editFormData.name}
                    onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                  />
                </FormControl>

                <FormControl>
                  <FormLabel>{t('common.description')}</FormLabel>
                  <Textarea
                    value={editFormData.description}
                    onChange={(e) => setEditFormData({ ...editFormData, description: e.target.value })}
                    rows={3}
                  />
                </FormControl>

                <FormControl>
                  <FormLabel>{t('common.status')}</FormLabel>
                  <Select
                    value={editFormData.status}
                    onChange={(e) => setEditFormData({ ...editFormData, status: e.target.value })}
                  >
                    <option value="not_started">{t('common.notStarted')}</option>
                    <option value="in_progress">{t('common.inProgress')}</option>
                    <option value="paused">{t('common.paused')}</option>
                    <option value="completed">{t('common.completed')}</option>
                  </Select>
                </FormControl>

                <FormControl>
                  <FormLabel>{t('common.startDate')}</FormLabel>
                  <Input
                    type="date"
                    value={editFormData.start_date}
                    onChange={(e) => setEditFormData({ ...editFormData, start_date: e.target.value })}
                  />
                </FormControl>

                <FormControl>
                  <FormLabel>{t('common.endDate')}</FormLabel>
                  <Input
                    type="date"
                    value={editFormData.deadline}
                    onChange={(e) => setEditFormData({ ...editFormData, deadline: e.target.value })}
                  />
                </FormControl>
              </VStack>
            </ModalBody>

            <ModalFooter>
              <Button variant="ghost" mr={3} onClick={onEditClose}>
                {t('common.cancel')}
              </Button>
              <Button
                type="submit"
                colorScheme="blue"
                isLoading={updateProjectMutation.isLoading}
              >
                {t('common.update')}
              </Button>
            </ModalFooter>
          </form>
        </ModalContent>
      </Modal>
    </Box>
  );
};

export default ProjectDetail;
