import React, { useState } from 'react';
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
import { fr } from 'date-fns/locale';

const ProjectDetail = () => {
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
          title: 'Erreur',
          description: 'Impossible de charger le projet',
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
          title: 'Succès',
          description: 'Projet mis à jour avec succès',
          status: 'success',
          duration: 3000,
        });
        onEditClose();
      },
      onError: (error) => {
        toast({
          title: 'Erreur',
          description: error.response?.data?.message || 'Erreur lors de la mise à jour',
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
          title: 'Succès',
          description: 'Projet supprimé avec succès',
          status: 'success',
          duration: 3000,
        });
        navigate('/projects');
      },
      onError: (error) => {
        toast({
          title: 'Erreur',
          description: error.response?.data?.message || 'Erreur lors de la suppression',
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
    if (window.confirm('Êtes-vous sûr de vouloir supprimer ce projet ? Cette action est irréversible.')) {
      deleteProjectMutation.mutate();
    }
  };

  if (projectLoading || statsLoading || tasksLoading) {
    return (
      <Box textAlign="center" py={10}>
        <Spinner size="xl" color="blue.500" />
        <Text mt={4}>Chargement du projet...</Text>
      </Box>
    );
  }

  if (!project) {
    return (
      <Box textAlign="center" py={10}>
        <Text color="red.500">Projet non trouvé</Text>
        <Button mt={4} as={RouterLink} to="/projects">
          Retour aux projets
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
      'not_started': 'Non démarré',
      'in_progress': 'En cours',
      'paused': 'En pause',
      'completed': 'Terminé',
      'archived': 'Archivé',
    };
    return labels[status] || status;
  };

  const getPriorityColor = (priority) => {
    const colors = { 1: 'gray', 2: 'blue', 3: 'orange', 4: 'red' };
    return colors[priority] || 'gray';
  };

  const getPriorityLabel = (priority) => {
    const labels = { 1: 'Basse', 2: 'Moyenne', 3: 'Haute', 4: 'Critique' };
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
              Nouvelle tâche
            </Button>
            <Menu>
              <MenuButton as={Button} variant="ghost" size="sm">
                <FiMoreVertical />
              </MenuButton>
              <MenuList>
                <MenuItem icon={<FiEdit2 />} onClick={onEditOpen}>
                  Modifier le projet
                </MenuItem>
                <MenuItem icon={<FiBarChart2 />} as={RouterLink} to={`/analytics?project=${id}`}>
                  Voir les analytics
                </MenuItem>
                <MenuItem icon={<FiUserPlus />} onClick={() => {
                  // Changer l'onglet actif vers "Membres"
                  const membersTab = document.querySelector('[aria-selected="false"]:has-text("Membres")');
                  if (membersTab) membersTab.click();
                }}>
                  Gérer les membres
                </MenuItem>
                <MenuItem icon={<FiTrash2 />} color="red.500" onClick={handleDeleteProject}>
                  Supprimer
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
                <StatLabel>Progression</StatLabel>
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
                <StatLabel>Tâches totales</StatLabel>
                <StatNumber>{stats?.total_tasks || 0}</StatNumber>
                <StatHelpText>
                  {stats?.completed_tasks || 0} complétées
                </StatHelpText>
              </Stat>
            </CardBody>
          </Card>

          <Card>
            <CardBody>
              <Stat>
                <StatLabel>Membres</StatLabel>
                <StatNumber>{stats?.members_count || 1}</StatNumber>
                <StatHelpText>
                  {stats?.members_count || 1} participants
                </StatHelpText>
              </Stat>
            </CardBody>
          </Card>

          <Card>
            <CardBody>
              <Stat>
                <StatLabel>Jalons</StatLabel>
                <StatNumber>{stats?.milestones_count || 0}</StatNumber>
                <StatHelpText>
                  {stats?.milestones_count || 0} jalons
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
              <AlertTitle>Risque détecté !</AlertTitle>
              <AlertDescription>
                Le score de risque de ce projet est de {Math.round(project.risk_score)}%. 
                {project.risk_score > 75 
                  ? ' Risque critique, intervention nécessaire.' 
                  : ' Une attention particulière est recommandée.'}
              </AlertDescription>
            </Box>
          </Alert>
        )}

        {/* Dates */}
        <HStack spacing={6} color="gray.600" fontSize="sm">
          <HStack>
            <FiCalendar />
            <Text>Début: {project.start_date 
              ? format(new Date(project.start_date), 'dd MMMM yyyy', { locale: fr })
              : 'Non définie'}</Text>
          </HStack>
          <HStack>
            <FiClock />
            <Text>Deadline: {project.deadline 
              ? format(new Date(project.deadline), 'dd MMMM yyyy', { locale: fr })
              : 'Non définie'}</Text>
          </HStack>
        </HStack>

        {/* Groupes et Chefs de projet */}
        <HStack spacing={6} flexWrap="wrap">
          {project.groups_detail && project.groups_detail.length > 0 && (
            <HStack>
              <Text fontSize="sm" fontWeight="600" color="gray.600">Groupes:</Text>
              {project.groups_detail.map((g) => (
                <Badge key={g.id} colorScheme="purple">{g.name}</Badge>
              ))}
            </HStack>
          )}
          {project.managers_detail && project.managers_detail.length > 0 && (
            <HStack>
              <Text fontSize="sm" fontWeight="600" color="gray.600">Chefs de projet:</Text>
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
            <Tab>Tâches</Tab>
            <Tab>Jalons</Tab>
            <Tab>Membres</Tab>
            <Tab>Statistiques</Tab>
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
                                  {task.status === 'todo' ? 'À faire' :
                                   task.status === 'in_progress' ? 'En cours' :
                                   task.status === 'review' ? 'En révision' :
                                   task.status === 'blocked' ? 'Bloquée' :
                                   task.status === 'completed' ? 'Terminée' : task.status}
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
                              <Icon as={FiAlertCircle} color="red.500" title="Risque de retard élevé" />
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
                    <Text color="gray.500">Aucune tâche dans ce projet</Text>
                    <Button
                      mt={4}
                      leftIcon={<FiPlus />}
                      size="sm"
                      colorScheme="blue"
                      as={RouterLink}
                      to={`/tasks/create?project=${id}`}
                    >
                      Créer une tâche
                    </Button>
                  </Box>
                )}
              </VStack>
            </TabPanel>

            <TabPanel>
              <Box textAlign="center" py={8}>
                <Text color="gray.500">Fonctionnalité à venir</Text>
                <Button
                  mt={4}
                  leftIcon={<FiPlus />}
                  size="sm"
                  colorScheme="purple"
                  as={RouterLink}
                  to={`/milestones/create?project=${id}`}
                >
                  Créer un jalon
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
                    <Heading size="md">Progression</Heading>
                  </CardHeader>
                  <CardBody>
                    <VStack align="stretch" spacing={4}>
                      <Box>
                        <Text fontSize="sm" color="gray.500">Taux de complétion</Text>
                        <Text fontSize="2xl" fontWeight="bold">
                          {stats?.completion_rate ? Math.round(stats.completion_rate) : 0}%
                        </Text>
                      </Box>
                      <Box>
                        <Text fontSize="sm" color="gray.500">Temps total passé</Text>
                        <Text fontSize="2xl" fontWeight="bold">
                          {Math.round(stats?.total_time_spent || 0)}h
                        </Text>
                      </Box>
                      <Box>
                        <Text fontSize="sm" color="gray.500">Temps moyen par tâche</Text>
                        <Text fontSize="2xl" fontWeight="bold">
                          {stats?.avg_task_time ? Math.round(stats.avg_task_time) : 0}h
                        </Text>
                      </Box>
                    </VStack>
                  </CardBody>
                </Card>

                <Card>
                  <CardHeader>
                    <Heading size="md">Tâches en retard</Heading>
                  </CardHeader>
                  <CardBody>
                    <Text fontSize="4xl" fontWeight="bold" color="red.500">
                      {stats?.delayed_tasks || 0}
                    </Text>
                    <Text color="gray.500">tâches en retard</Text>
                  </CardBody>
                </Card>

                <Card gridColumn="span 2">
                  <CardHeader>
                    <Heading size="md">Distribution des tâches</Heading>
                  </CardHeader>
                  <CardBody>
                    <SimpleGrid columns={2} spacing={4}>
                      <Box>
                        <Text fontSize="sm" color="gray.500">Par priorité</Text>
                        <VStack align="stretch" mt={2}>
                          <HStack justify="space-between">
                            <Text>Basse</Text>
                            <Badge>0</Badge>
                          </HStack>
                          <HStack justify="space-between">
                            <Text>Moyenne</Text>
                            <Badge colorScheme="blue">0</Badge>
                          </HStack>
                          <HStack justify="space-between">
                            <Text>Haute</Text>
                            <Badge colorScheme="orange">0</Badge>
                          </HStack>
                          <HStack justify="space-between">
                            <Text>Critique</Text>
                            <Badge colorScheme="red">0</Badge>
                          </HStack>
                        </VStack>
                      </Box>
                      <Box>
                        <Text fontSize="sm" color="gray.500">Par statut</Text>
                        <VStack align="stretch" mt={2}>
                          <HStack justify="space-between">
                            <Text>À faire</Text>
                            <Badge>0</Badge>
                          </HStack>
                          <HStack justify="space-between">
                            <Text>En cours</Text>
                            <Badge colorScheme="blue">0</Badge>
                          </HStack>
                          <HStack justify="space-between">
                            <Text>Bloquées</Text>
                            <Badge colorScheme="red">0</Badge>
                          </HStack>
                          <HStack justify="space-between">
                            <Text>Terminées</Text>
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
            <ModalHeader>Modifier le projet</ModalHeader>
            <ModalCloseButton />
            <ModalBody>
              <VStack spacing={4}>
                <FormControl isRequired>
                  <FormLabel>Nom du projet</FormLabel>
                  <Input
                    value={editFormData.name}
                    onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                  />
                </FormControl>

                <FormControl>
                  <FormLabel>Description</FormLabel>
                  <Textarea
                    value={editFormData.description}
                    onChange={(e) => setEditFormData({ ...editFormData, description: e.target.value })}
                    rows={3}
                  />
                </FormControl>

                <FormControl>
                  <FormLabel>Statut</FormLabel>
                  <Select
                    value={editFormData.status}
                    onChange={(e) => setEditFormData({ ...editFormData, status: e.target.value })}
                  >
                    <option value="not_started">Non démarré</option>
                    <option value="in_progress">En cours</option>
                    <option value="paused">En pause</option>
                    <option value="completed">Terminé</option>
                  </Select>
                </FormControl>

                <FormControl>
                  <FormLabel>Date de début</FormLabel>
                  <Input
                    type="date"
                    value={editFormData.start_date}
                    onChange={(e) => setEditFormData({ ...editFormData, start_date: e.target.value })}
                  />
                </FormControl>

                <FormControl>
                  <FormLabel>Date de fin prévue</FormLabel>
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
                Annuler
              </Button>
              <Button
                type="submit"
                colorScheme="blue"
                isLoading={updateProjectMutation.isLoading}
              >
                Mettre à jour
              </Button>
            </ModalFooter>
          </form>
        </ModalContent>
      </Modal>
    </Box>
  );
};

export default ProjectDetail;
