import React, { useState } from 'react';
import {
  Box,
  Heading,
  Button,
  VStack,
  HStack,
  SimpleGrid,
  Card,
  CardBody,
  Text,
  Badge,
  Progress,
  IconButton,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
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
  useToast,
  Spinner,
  Flex,
  Stat,
  StatLabel,
  StatNumber,
  Tooltip,
  Tag,
  TagLabel,
  TagLeftIcon,
  Alert,
  AlertIcon,
  AlertDialog,
  AlertDialogBody,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogContent,
  AlertDialogOverlay,
} from '@chakra-ui/react';
import {
  FiPlus,
  FiMoreVertical,
  FiCalendar,
  FiClock,
  FiAlertCircle,
  FiCheckCircle,
  FiTrendingUp,
  FiTrendingDown,
  FiEye,
  FiEdit2,
  FiTrash2,
  FiCpu,
  FiBarChart2,
} from 'react-icons/fi';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { useMilestoneService } from '../services/milestoneService';
import { useProjectService } from '../services/projectService';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import { format, formatDistance, isAfter, isBefore, addDays } from 'date-fns';
import { fr } from 'date-fns/locale';

const Milestones = () => {
  const [selectedMilestone, setSelectedMilestone] = useState(null);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    due_date: '',
    project_id: '',
  });
  const [filterProject, setFilterProject] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [viewMode, setViewMode] = useState('grid'); // 'grid' ou 'calendar'

  const { isOpen, onOpen, onClose } = useDisclosure();
  const { 
    isOpen: isDeleteOpen, 
    onOpen: onDeleteOpen, 
    onClose: onDeleteClose 
  } = useDisclosure();
  
  const toast = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const milestoneService = useMilestoneService();
  const projectService = useProjectService();

  // Charger les milestones
  const { data: milestones, isLoading } = useQuery(
    ['milestones', filterProject, filterStatus],
    () => milestoneService.getMilestones({
      project: filterProject || undefined,
      status: filterStatus || undefined,
    }),
    {
      onError: (error) => {
        toast({
          title: 'Erreur',
          description: 'Impossible de charger les jalons',
          status: 'error',
          duration: 3000,
        });
      },
    }
  );

  // Charger les projets pour le filtre
  const { data: projects } = useQuery(
    'projects',
    () => projectService.getProjects(),
    {
      onError: () => {},
    }
  );

  // Mutation pour créer un milestone
  const createMutation = useMutation(
    (data) => milestoneService.createMilestone(data),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('milestones');
        toast({
          title: 'Succès',
          description: 'Jalon créé avec succès',
          status: 'success',
          duration: 3000,
        });
        handleCloseModal();
      },
    }
  );

  // Mutation pour mettre à jour
  const updateMutation = useMutation(
    ({ id, data }) => milestoneService.updateMilestone(id, data),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('milestones');
        toast({
          title: 'Succès',
          description: 'Jalon mis à jour',
          status: 'success',
          duration: 3000,
        });
        handleCloseModal();
      },
    }
  );

  // Mutation pour supprimer
  const deleteMutation = useMutation(
    (id) => milestoneService.deleteMilestone(id),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('milestones');
        toast({
          title: 'Succès',
          description: 'Jalon supprimé',
          status: 'success',
          duration: 3000,
        });
        onDeleteClose();
      },
    }
  );

  // Mutation pour prédire le risque
  const predictMutation = useMutation(
    (id) => milestoneService.predictRisk(id),
    {
      onSuccess: (data, id) => {
        queryClient.invalidateQueries('milestones');
        toast({
          title: 'Analyse IA',
          description: `Risque calculé: ${data.risk_score}%`,
          status: 'info',
          duration: 3000,
        });
      },
    }
  );

  const handleOpenModal = (milestone = null) => {
    if (milestone) {
      setSelectedMilestone(milestone);
      setFormData({
        name: milestone.name,
        description: milestone.description || '',
        due_date: milestone.due_date,
        project_id: milestone.project_id,
      });
    } else {
      setSelectedMilestone(null);
      setFormData({
        name: '',
        description: '',
        due_date: '',
        project_id: '',
      });
    }
    onOpen();
  };

  const handleCloseModal = () => {
    setSelectedMilestone(null);
    setFormData({
      name: '',
      description: '',
      due_date: '',
      project_id: '',
    });
    onClose();
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (selectedMilestone) {
      updateMutation.mutate({ id: selectedMilestone.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleDelete = (milestone) => {
    setSelectedMilestone(milestone);
    onDeleteOpen();
  };

  const getStatusColor = (status) => {
    const colors = {
      'not_started': 'gray',
      'in_progress': 'blue',
      'completed': 'green',
      'delayed': 'red',
      'cancelled': 'purple',
    };
    return colors[status] || 'gray';
  };

  const getStatusLabel = (status) => {
    const labels = {
      'not_started': 'Non démarré',
      'in_progress': 'En cours',
      'completed': 'Terminé',
      'delayed': 'En retard',
      'cancelled': 'Annulé',
    };
    return labels[status] || status;
  };

  const getRiskColor = (risk) => {
    if (risk >= 75) return 'red';
    if (risk >= 50) return 'orange';
    if (risk >= 25) return 'yellow';
    return 'green';
  };

  const getRiskIcon = (risk) => {
    if (risk >= 75) return FiAlertCircle;
    if (risk >= 50) return FiTrendingUp;
    if (risk >= 25) return FiTrendingDown;
    return FiCheckCircle;
  };

  const handleDateClick = (date) => {
    const milestonesOnDate = milestones?.filter(m => 
      format(new Date(m.due_date), 'yyyy-MM-dd') === format(date, 'yyyy-MM-dd')
    );
    
    if (milestonesOnDate?.length === 1) {
      navigate(`/milestones/${milestonesOnDate[0].id}`);
    } else if (milestonesOnDate?.length > 1) {
      toast({
        title: `${milestonesOnDate.length} jalons`,
        description: (
          <VStack align="start" spacing={1}>
            {milestonesOnDate.map(m => (
              <Text key={m.id} fontSize="sm">{m.name}</Text>
            ))}
          </VStack>
        ),
        status: 'info',
        duration: 5000,
        isClosable: true,
      });
    }
  };

  if (isLoading) {
    return (
      <Box textAlign="center" py={10}>
        <Spinner size="xl" color="blue.500" />
        <Text mt={4}>Chargement des jalons...</Text>
      </Box>
    );
  }

  // Statistiques
  const stats = {
    total: milestones?.length || 0,
    completed: milestones?.filter(m => m.status === 'completed').length || 0,
    inProgress: milestones?.filter(m => m.status === 'in_progress').length || 0,
    delayed: milestones?.filter(m => m.status === 'delayed').length || 0,
    highRisk: milestones?.filter(m => m.risk_score >= 75).length || 0,
  };

  return (
    <Box>
      <VStack spacing={6} align="stretch">
        {/* En-tête */}
        <Flex justify="space-between" align="center">
          <Heading size="lg">Jalons</Heading>
          <HStack spacing={3}>
            <Button
              leftIcon={<FiPlus />}
              colorScheme="blue"
              onClick={() => handleOpenModal()}
            >
              Nouveau jalon
            </Button>
          </HStack>
        </Flex>

        {/* Statistiques */}
        <SimpleGrid columns={{ base: 2, md: 5 }} spacing={4}>
          <Card>
            <CardBody>
              <Stat>
                <StatLabel>Total</StatLabel>
                <StatNumber>{stats.total}</StatNumber>
              </Stat>
            </CardBody>
          </Card>
          <Card>
            <CardBody>
              <Stat>
                <StatLabel>Terminés</StatLabel>
                <StatNumber color="green.500">{stats.completed}</StatNumber>
              </Stat>
            </CardBody>
          </Card>
          <Card>
            <CardBody>
              <Stat>
                <StatLabel>En cours</StatLabel>
                <StatNumber color="blue.500">{stats.inProgress}</StatNumber>
              </Stat>
            </CardBody>
          </Card>
          <Card>
            <CardBody>
              <Stat>
                <StatLabel>En retard</StatLabel>
                <StatNumber color="red.500">{stats.delayed}</StatNumber>
              </Stat>
            </CardBody>
          </Card>
          <Card>
            <CardBody>
              <Stat>
                <StatLabel>Risque élevé</StatLabel>
                <StatNumber color="orange.500">{stats.highRisk}</StatNumber>
              </Stat>
            </CardBody>
          </Card>
        </SimpleGrid>

        {/* Filtres et vue */}
        <HStack spacing={4} justify="space-between">
          <HStack spacing={4}>
            <Select
              placeholder="Tous les projets"
              value={filterProject}
              onChange={(e) => setFilterProject(e.target.value)}
              size="sm"
              width="200px"
            >
              {projects?.map(project => (
                <option key={project.id} value={project.id}>{project.name}</option>
              ))}
            </Select>

            <Select
              placeholder="Tous les statuts"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              size="sm"
              width="200px"
            >
              <option value="not_started">Non démarré</option>
              <option value="in_progress">En cours</option>
              <option value="completed">Terminé</option>
              <option value="delayed">En retard</option>
            </Select>
          </HStack>

          <HStack spacing={2}>
            <Button
              size="sm"
              variant={viewMode === 'grid' ? 'solid' : 'ghost'}
              colorScheme={viewMode === 'grid' ? 'blue' : 'gray'}
              onClick={() => setViewMode('grid')}
              leftIcon={<FiBarChart2 />}
            >
              Grille
            </Button>
            <Button
              size="sm"
              variant={viewMode === 'calendar' ? 'solid' : 'ghost'}
              colorScheme={viewMode === 'calendar' ? 'blue' : 'gray'}
              onClick={() => setViewMode('calendar')}
              leftIcon={<FiCalendar />}
            >
              Calendrier
            </Button>
          </HStack>
        </HStack>

        {/* Contenu principal */}
        {viewMode === 'grid' ? (
          <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={4}>
            {milestones?.map((milestone) => (
              <Card
                key={milestone.id}
                borderLeft="4px solid"
                borderLeftColor={
                  milestone.status === 'delayed' ? 'red.400' :
                  milestone.status === 'completed' ? 'green.400' :
                  milestone.status === 'in_progress' ? 'blue.400' :
                  'gray.400'
                }
                _hover={{ shadow: 'md', transform: 'translateY(-2px)' }}
                transition="all 0.2s"
              >
                <CardBody>
                  <VStack align="stretch" spacing={3}>
                    {/* En-tête */}
                    <Flex justify="space-between" align="start">
                      <Box>
                        <HStack mb={2}>
                          <Badge colorScheme={getStatusColor(milestone.status)}>
                            {getStatusLabel(milestone.status)}
                          </Badge>
                          <Badge colorScheme={milestone.project_name ? 'purple' : 'gray'}>
                            {milestone.project_name || 'Sans projet'}
                          </Badge>
                        </HStack>
                        <Heading size="sm" mb={1}>
                          {milestone.name}
                        </Heading>
                        {milestone.description && (
                          <Text fontSize="sm" color="gray.600" noOfLines={2}>
                            {milestone.description}
                          </Text>
                        )}
                      </Box>
                      <Menu>
                        <MenuButton
                          as={IconButton}
                          icon={<FiMoreVertical />}
                          variant="ghost"
                          size="sm"
                        />
                        <MenuList>
                          <MenuItem
                            icon={<FiEye />}
                            onClick={() => navigate(`/milestones/${milestone.id}`)}
                          >
                            Voir détails
                          </MenuItem>
                          <MenuItem
                            icon={<FiEdit2 />}
                            onClick={() => handleOpenModal(milestone)}
                          >
                            Modifier
                          </MenuItem>
                          <MenuItem
                            icon={<FiCpu />}
                            onClick={() => predictMutation.mutate(milestone.id)}
                          >
                            Analyser risque
                          </MenuItem>
                          <MenuItem
                            icon={<FiTrash2 />}
                            color="red.500"
                            onClick={() => handleDelete(milestone)}
                          >
                            Supprimer
                          </MenuItem>
                        </MenuList>
                      </Menu>
                    </Flex>

                    {/* Progression */}
                    <Box>
                      <Flex justify="space-between" mb={1}>
                        <Text fontSize="sm">Progression</Text>
                        <Text fontSize="sm" fontWeight="bold">
                          {milestone.progress}%
                        </Text>
                      </Flex>
                      <Progress
                        value={milestone.progress}
                        colorScheme={
                          milestone.progress === 100 ? 'green' :
                          milestone.status === 'delayed' ? 'red' : 'blue'
                        }
                        size="sm"
                        borderRadius="full"
                      />
                    </Box>

                    {/* Métriques */}
                    <SimpleGrid columns={2} spacing={2}>
                      <Box>
                        <Text fontSize="xs" color="gray.500">Tâches</Text>
                        <Text fontWeight="bold">
                          {milestone.completed_tasks}/{milestone.tasks_count}
                        </Text>
                      </Box>
                      <Box>
                        <Text fontSize="xs" color="gray.500">Échéance</Text>
                        <HStack spacing={1}>
                          <FiCalendar size={12} />
                          <Text fontSize="sm">
                            {format(new Date(milestone.due_date), 'dd/MM/yyyy')}
                          </Text>
                        </HStack>
                      </Box>
                    </SimpleGrid>

                    {/* Score de risque */}
                    {milestone.risk_score > 0 && (
                      <Tooltip label={`Risque: ${milestone.risk_score}%`}>
                        <Tag
                          size="sm"
                          colorScheme={getRiskColor(milestone.risk_score)}
                          borderRadius="full"
                          alignSelf="flex-start"
                        >
                          <TagLeftIcon as={getRiskIcon(milestone.risk_score)} />
                          <TagLabel>Risque {milestone.risk_score}%</TagLabel>
                        </Tag>
                      </Tooltip>
                    )}

                    {/* Alerte si en retard */}
                    {milestone.status === 'delayed' && (
                      <Alert status="error" size="sm" borderRadius="md" py={1}>
                        <AlertIcon />
                        <Text fontSize="sm">Jalon en retard</Text>
                      </Alert>
                    )}
                  </VStack>
                </CardBody>
              </Card>
            ))}

            {milestones?.length === 0 && (
              <Box gridColumn="span 3" textAlign="center" py={10}>
                <Text color="gray.500">Aucun jalon trouvé</Text>
                <Button
                  mt={4}
                  leftIcon={<FiPlus />}
                  onClick={() => handleOpenModal()}
                >
                  Créer un jalon
                </Button>
              </Box>
            )}
          </SimpleGrid>
        ) : (
          // Vue calendrier avec react-calendar
          <Card>
            <CardBody>
              <Calendar
                onChange={setSelectedDate}
                value={selectedDate}
                onClickDay={handleDateClick}
                tileClassName={({ date, view }) => {
                  if (view === 'month') {
                    const hasMilestone = milestones?.some(m => 
                      format(new Date(m.due_date), 'yyyy-MM-dd') === format(date, 'yyyy-MM-dd')
                    );
                    return hasMilestone ? 'milestone-day' : null;
                  }
                  return null;
                }}
                tileContent={({ date, view }) => {
                  if (view === 'month') {
                    const dayMilestones = milestones?.filter(m => 
                      format(new Date(m.due_date), 'yyyy-MM-dd') === format(date, 'yyyy-MM-dd')
                    );
                    
                    if (dayMilestones?.length > 0) {
                      return (
                        <Box mt={1}>
                          <Badge
                            colorScheme={
                              dayMilestones.some(m => m.status === 'delayed') ? 'red' :
                              dayMilestones.every(m => m.status === 'completed') ? 'green' : 'blue'
                            }
                            variant="solid"
                            fontSize="xs"
                            borderRadius="full"
                            px={1}
                          >
                            {dayMilestones.length}
                          </Badge>
                        </Box>
                      );
                    }
                  }
                  return null;
                }}
                locale="fr-FR"
                formatShortWeekday={(locale, date) => 
                  ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'][date.getDay()]
                }
              />
              <style>{`
                .milestone-day {
                  background-color: #EBF8FF !important;
                  font-weight: bold;
                  color: #2C5282 !important;
                }
                .react-calendar {
                  width: 100%;
                  border: none;
                  font-family: inherit;
                }
                .react-calendar__tile {
                  position: relative;
                  height: 80px;
                  display: flex;
                  flex-direction: column;
                  align-items: center;
                  justify-content: flex-start;
                  padding: 8px 4px;
                }
                .react-calendar__tile--active {
                  background-color: #4299E1 !important;
                  color: white !important;
                }
                .react-calendar__tile--now {
                  background-color: #FEFCBF !important;
                }
              `}</style>
            </CardBody>
          </Card>
        )}
      </VStack>

      {/* Modal de création/édition */}
      <Modal isOpen={isOpen} onClose={handleCloseModal} size="xl">
        <ModalOverlay />
        <ModalContent>
          <form onSubmit={handleSubmit}>
            <ModalHeader>
              {selectedMilestone ? 'Modifier le jalon' : 'Nouveau jalon'}
            </ModalHeader>
            <ModalCloseButton />
            <ModalBody>
              <VStack spacing={4}>
                <FormControl isRequired>
                  <FormLabel>Nom du jalon</FormLabel>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Ex: Phase 1 - MVP"
                  />
                </FormControl>

                <FormControl>
                  <FormLabel>Description</FormLabel>
                  <Textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Description du jalon..."
                    rows={3}
                  />
                </FormControl>

                <FormControl isRequired>
                  <FormLabel>Date d'échéance</FormLabel>
                  <Input
                    type="date"
                    value={formData.due_date}
                    onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                  />
                </FormControl>

                <FormControl isRequired>
                  <FormLabel>Projet associé</FormLabel>
                  <Select
                    value={formData.project_id}
                    onChange={(e) => setFormData({ ...formData, project_id: e.target.value })}
                    placeholder="Sélectionner un projet"
                  >
                    {projects?.map(project => (
                      <option key={project.id} value={project.id}>
                        {project.name}
                      </option>
                    ))}
                  </Select>
                </FormControl>
              </VStack>
            </ModalBody>

            <ModalFooter>
              <Button variant="ghost" mr={3} onClick={handleCloseModal}>
                Annuler
              </Button>
              <Button
                type="submit"
                colorScheme="blue"
                isLoading={createMutation.isLoading || updateMutation.isLoading}
              >
                {selectedMilestone ? 'Mettre à jour' : 'Créer'}
              </Button>
            </ModalFooter>
          </form>
        </ModalContent>
      </Modal>

      {/* Dialog de suppression - Version corrigée avec AlertDialog */}
      <AlertDialog
        isOpen={isDeleteOpen}
        leastDestructiveRef={null}
        onClose={onDeleteClose}
      >
        <AlertDialogOverlay>
          <AlertDialogContent>
            <AlertDialogHeader fontSize="lg" fontWeight="bold">
              Supprimer le jalon
            </AlertDialogHeader>

            <AlertDialogBody>
              Êtes-vous sûr de vouloir supprimer "{selectedMilestone?.name}" ?
              Cette action est irréversible.
            </AlertDialogBody>

            <AlertDialogFooter>
              <Button onClick={onDeleteClose}>
                Annuler
              </Button>
              <Button
                colorScheme="red"
                onClick={() => deleteMutation.mutate(selectedMilestone?.id)}
                ml={3}
                isLoading={deleteMutation.isLoading}
              >
                Supprimer
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialogOverlay>
      </AlertDialog>
    </Box>
  );
};

export default Milestones;
