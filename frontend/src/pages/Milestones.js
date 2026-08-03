import React, { useState, useMemo, useEffect } from 'react';
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
  InputGroup,
  InputLeftElement,
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
  Spacer,
  Alert,
  AlertIcon,
  AlertDialog,
  AlertDialogBody,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogContent,
  AlertDialogOverlay,
  Slider,
  SliderTrack,
  SliderFilledTrack,
  SliderThumb,
  SliderMark,
  Popover,
  PopoverTrigger,
  PopoverContent,
  PopoverHeader,
  PopoverBody,
  PopoverArrow,
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
  FiSearch,
  FiFilter,
  FiChevronUp,
  FiChevronDown,
} from 'react-icons/fi';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { useMilestoneService } from '../services/milestoneService';
import { useProjectService } from '../services/projectService';
import { Link as RouterLink, useNavigate, useSearchParams } from 'react-router-dom';
import { format } from 'date-fns';
import { MILESTONE_STATUS_COLORS, getMilestoneStatusLabel } from '../utils/constants';
import LoadingState from '../components/LoadingState';
import EmptyState from '../components/EmptyState';
import PageGuide from '../components/PageGuide';
import { FiFlag } from 'react-icons/fi';

const MILESTONES_STEPS = [
  { key: 'overview', icon: FiFlag },
  { key: 'create', icon: FiPlus },
  { key: 'track', icon: FiTrendingUp },
];

const isOverdue = (milestone) => {
  if (!milestone.due_date) return false;
  if (milestone.status === 'completed' || milestone.status === 'cancelled') return false;
  return new Date(milestone.due_date) < new Date();
};

const MilestoneProgress = ({ milestone, onSave }) => {
  const [value, setValue] = useState(milestone.progress || 0);

  useEffect(() => {
    setValue(milestone.progress || 0);
  }, [milestone.progress]);

  return (
    <Popover placement="top-start">
      <PopoverTrigger>
        <Box cursor="pointer" onClick={(e) => e.stopPropagation()}>
          <Flex justify="space-between" mb={1}>
            <Text fontSize="sm">Progression</Text>
            <Text fontSize="sm" fontWeight="bold">{value}%</Text>
          </Flex>
          <Progress
            value={value}
            colorScheme={
              value === 100 ? 'green' :
              milestone.status === 'delayed' ? 'red' : 'blue'
            }
            size="sm"
            borderRadius="full"
          />
        </Box>
      </PopoverTrigger>
      <PopoverContent>
        <PopoverArrow />
        <PopoverHeader fontSize="sm">Ajuster la progression</PopoverHeader>
        <PopoverBody>
          <Slider
            aria-label="progress-slider"
            min={0}
            max={100}
            step={1}
            value={value}
            onChange={setValue}
            onChangeEnd={(v) => onSave(v)}
          >
            <SliderTrack bg="gray.200">
              <SliderFilledTrack bg="blue.500" />
            </SliderTrack>
            <SliderThumb boxSize={5}>
              <Box color="blue.500" />
            </SliderThumb>
          </Slider>
          <Text fontSize="xs" textAlign="center" mt={2} color="gray.500">
            {value}%
          </Text>
        </PopoverBody>
      </PopoverContent>
    </Popover>
  );
};

const Milestones = () => {
  const [selectedMilestone, setSelectedMilestone] = useState(null);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    due_date: '',
    project_id: '',
    status: 'not_started',
    progress: 0,
  });
  const [filterProject, setFilterProject] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterHighRisk, setFilterHighRisk] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortKey, setSortKey] = useState('due_date');
  const [sortDir, setSortDir] = useState('asc');
  const [viewMode, setViewMode] = useState('grid');

  const [searchParams, setSearchParams] = useSearchParams();

  useEffect(() => {
    if (searchParams.get('new') === '1') {
      handleOpenModal();
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  const { isOpen, onOpen, onClose } = useDisclosure();
  const {
    isOpen: isDeleteOpen,
    onOpen: onDeleteOpen,
    onClose: onDeleteClose,
  } = useDisclosure();

  const toast = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const milestoneService = useMilestoneService();
  const projectService = useProjectService();

  // Charger les milestones (filtres gérés côté client pour un drill-down instantané)
  const { data: milestones, isLoading } = useQuery(
    'milestones',
    () => milestoneService.getMilestones(),
    {
      onError: () => {
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
      onError: (error) => {
        console.error('Erreur création milestone :', error.response?.data);
        toast({
          title: 'Erreur',
          description: error.response?.data?.message || 'Erreur lors de la création',
          status: 'error',
          duration: 3000,
        });
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
      onError: (error) => {
        console.error('Erreur update milestone :', error.response?.data);
        toast({
          title: 'Erreur',
          description: error.response?.data?.message || 'Erreur lors de la mise à jour',
          status: 'error',
          duration: 3000,
        });
      },
    }
  );

  // Mutation pour changer le statut rapidement
  const statusMutation = useMutation(
    ({ id, status }) => milestoneService.patchMilestone(id, { status }),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('milestones');
        toast({
          title: 'Succès',
          description: 'Statut mis à jour',
          status: 'success',
          duration: 2000,
        });
      },
      onError: () => {
        toast({
          title: 'Erreur',
          description: 'Impossible de mettre à jour le statut',
          status: 'error',
          duration: 3000,
        });
      },
    }
  );

  // Mutation pour mettre à jour la progression rapidement
  const progressMutation = useMutation(
    ({ id, progress }) => milestoneService.patchMilestone(id, { progress }),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('milestones');
      },
      onError: () => {
        toast({
          title: 'Erreur',
          description: 'Impossible de mettre à jour la progression',
          status: 'error',
          duration: 3000,
        });
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
      onSuccess: (data) => {
        queryClient.invalidateQueries('milestones');
        toast({
          title: 'Analyse IA',
          description: `Risque calculé: ${data.risk_score}%`,
          status: 'info',
          duration: 3000,
        });
      },
      onError: () => {
        toast({
          title: 'Erreur',
          description: 'Impossible de lancer l\'analyse IA',
          status: 'error',
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
        project_id: milestone.project,
        status: milestone.status || 'not_started',
        progress: milestone.progress || 0,
      });
    } else {
      setSelectedMilestone(null);
      setFormData({
        name: '',
        description: '',
        due_date: '',
        project_id: '',
        status: 'not_started',
        progress: 0,
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
      status: 'not_started',
      progress: 0,
    });
    onClose();
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!formData.project_id) {
      toast({
        title: 'Erreur',
        description: 'Veuillez sélectionner un projet',
        status: 'error',
        duration: 3000,
      });
      return;
    }

    const milestoneData = {
      name: formData.name,
      description: formData.description,
      due_date: formData.due_date,
      project: parseInt(formData.project_id, 10),
      status: formData.status,
      progress: parseFloat(formData.progress) || 0,
    };

    if (selectedMilestone) {
      updateMutation.mutate({ id: selectedMilestone.id, data: milestoneData });
    } else {
      createMutation.mutate(milestoneData);
    }
  };

  const handleDelete = (milestone) => {
    setSelectedMilestone(milestone);
    onDeleteOpen();
  };

  const getStatusColor = (status) => MILESTONE_STATUS_COLORS[status] || 'gray';
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

  // Filtrage et tri côté client
  const filteredMilestones = useMemo(() => {
    let list = milestones || [];
    if (filterProject) list = list.filter(m => String(m.project) === String(filterProject));
    if (filterStatus) list = list.filter(m => m.status === filterStatus);
    if (filterHighRisk) list = list.filter(m => m.risk_score >= 75);
    if (searchTerm.trim()) {
      const q = searchTerm.trim().toLowerCase();
      list = list.filter(m =>
        (m.name || '').toLowerCase().includes(q) ||
        (m.description || '').toLowerCase().includes(q) ||
        (m.project_name || '').toLowerCase().includes(q)
      );
    }
    const sorted = [...list].sort((a, b) => {
      let cmp = 0;
      if (sortKey === 'progress') {
        cmp = (a.progress || 0) - (b.progress || 0);
      } else if (sortKey === 'name') {
        cmp = (a.name || '').localeCompare(b.name || '');
      } else {
        cmp = new Date(a.due_date) - new Date(b.due_date);
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return sorted;
  }, [milestones, filterProject, filterStatus, filterHighRisk, searchTerm, sortKey, sortDir]);

  if (isLoading) {
    return <LoadingState message="Chargement des jalons..." />;
  }

  // Statistiques (sur l'ensemble des jalons)
  const stats = {
    total: milestones?.length || 0,
    completed: milestones?.filter(m => m.status === 'completed').length || 0,
    inProgress: milestones?.filter(m => m.status === 'in_progress').length || 0,
    delayed: milestones?.filter(m => m.status === 'delayed').length || 0,
    highRisk: milestones?.filter(m => m.risk_score >= 75).length || 0,
  };

  const statCards = [
    {
      label: 'Total',
      value: stats.total,
      color: undefined,
      active: !filterStatus && !filterHighRisk,
      onClick: () => { setFilterStatus(''); setFilterHighRisk(false); },
    },
    {
      label: 'Terminés',
      value: stats.completed,
      color: 'green.500',
      active: filterStatus === 'completed',
      onClick: () => { setFilterStatus('completed'); setFilterHighRisk(false); },
    },
    {
      label: 'En cours',
      value: stats.inProgress,
      color: 'blue.500',
      active: filterStatus === 'in_progress',
      onClick: () => { setFilterStatus('in_progress'); setFilterHighRisk(false); },
    },
    {
      label: 'En retard',
      value: stats.delayed,
      color: 'red.500',
      active: filterStatus === 'delayed',
      onClick: () => { setFilterStatus('delayed'); setFilterHighRisk(false); },
    },
    {
      label: 'Risque élevé',
      value: stats.highRisk,
      color: 'orange.500',
      active: filterHighRisk,
      onClick: () => { setFilterHighRisk(true); setFilterStatus(''); },
    },
  ];

  const hasActiveFilters = Boolean(filterProject || filterStatus || filterHighRisk || searchTerm.trim());

  const clearFilters = () => {
    setFilterProject('');
    setFilterStatus('');
    setFilterHighRisk(false);
    setSearchTerm('');
  };

  const handleCardClick = (milestoneId) => {
    navigate(`/milestones/${milestoneId}`);
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

        {/* Statistiques cliquables */}
        <SimpleGrid columns={{ base: 2, md: 5 }} spacing={4}>
          {statCards.map(card => (
            <Card
              key={card.label}
              onClick={card.onClick}
              cursor="pointer"
              borderWidth={card.active ? '2px' : '1px'}
              borderColor={card.active ? 'blue.400' : 'transparent'}
              bg={card.active ? 'blue.50' : undefined}
              _hover={{ shadow: 'md', transform: 'translateY(-2px)' }}
              transition="all 0.2s"
            >
              <CardBody>
                <Stat>
                  <StatLabel>{card.label}</StatLabel>
                  <StatNumber color={card.color}>{card.value}</StatNumber>
                </Stat>
              </CardBody>
            </Card>
          ))}
        </SimpleGrid>

        {/* Filtres et vue */}
        <Card>
          <CardBody>
            <HStack spacing={4} flexWrap="wrap" align="center">
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
                <option value="cancelled">Annulé</option>
              </Select>

              <InputGroup size="sm" width="220px">
                <InputLeftElement pointerEvents="none">
                  <FiSearch />
                </InputLeftElement>
                <Input
                  placeholder="Rechercher un jalon..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </InputGroup>

              <Select
                size="sm"
                width="150px"
                value={sortKey}
                onChange={(e) => setSortKey(e.target.value)}
              >
                <option value="due_date">Trier: Échéance</option>
                <option value="progress">Trier: Progression</option>
                <option value="name">Trier: Nom</option>
              </Select>

              <IconButton
                size="sm"
                variant="outline"
                icon={sortDir === 'asc' ? <FiChevronUp /> : <FiChevronDown />}
                onClick={() => setSortDir(sortDir === 'asc' ? 'desc' : 'asc')}
                aria-label="Direction du tri"
              />

              {hasActiveFilters && (
                <Button
                  size="sm"
                  variant="ghost"
                  leftIcon={<FiFilter />}
                  onClick={clearFilters}
                >
                  Réinitialiser ({filteredMilestones.length}/{milestones?.length})
                </Button>
              )}

              <Spacer />

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
          </CardBody>
        </Card>

        {/* Contenu principal */}
        {viewMode === 'grid' ? (
          filteredMilestones.length > 0 ? (
            <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={4}>
              {filteredMilestones.map((milestone) => (
                <Card
                  key={milestone.id}
                  onClick={() => handleCardClick(milestone.id)}
                  cursor="pointer"
                  borderLeft="4px solid"
                  borderLeftColor={
                    milestone.status === 'delayed' ? 'red.400' :
                    milestone.status === 'completed' ? 'green.400' :
                    milestone.status === 'in_progress' ? 'blue.400' :
                    milestone.status === 'cancelled' ? 'purple.400' :
                    'gray.400'
                  }
                  _hover={{ shadow: 'md', transform: 'translateY(-2px)' }}
                  transition="all 0.2s"
                >
                  <CardBody>
                    <VStack align="stretch" spacing={3}>
                      <Flex justify="space-between" align="start">
                        <Box>
                          <HStack mb={2}>
                            <Select
                              size="xs"
                              variant="filled"
                              width="auto"
                              value={milestone.status}
                              colorScheme={getStatusColor(milestone.status)}
                              onClick={(e) => e.stopPropagation()}
                              onChange={(e) =>
                                statusMutation.mutate({ id: milestone.id, status: e.target.value })
                              }
                            >
                              <option value="not_started">Non démarré</option>
                              <option value="in_progress">En cours</option>
                              <option value="completed">Terminé</option>
                              <option value="delayed">En retard</option>
                              <option value="cancelled">Annulé</option>
                            </Select>
                            <Tooltip label={milestone.project_name ? 'Voir le projet' : ''}>
                              <Badge
                                colorScheme={milestone.project_name ? 'purple' : 'gray'}
                                as={milestone.project ? RouterLink : undefined}
                                to={milestone.project ? `/projects/${milestone.project}` : undefined}
                                onClick={(e) => e.stopPropagation()}
                                cursor={milestone.project ? 'pointer' : 'default'}
                                _hover={milestone.project ? { textDecoration: 'underline' } : undefined}
                              >
                                {milestone.project_name || 'Sans projet'}
                              </Badge>
                            </Tooltip>
                          </HStack>
                          <RouterLink
                            to={`/milestones/${milestone.id}`}
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Heading size="sm" mb={1} _hover={{ color: 'blue.500' }}>
                              {milestone.name}
                            </Heading>
                          </RouterLink>
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
                            onClick={(e) => e.stopPropagation()}
                          />
                          <MenuList onClick={(e) => e.stopPropagation()}>
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

                      <MilestoneProgress
                        milestone={milestone}
                        onSave={(progress) =>
                          progressMutation.mutate({ id: milestone.id, progress })
                        }
                      />

                      <SimpleGrid columns={2} spacing={2}>
                        <Box>
                          <Text fontSize="xs" color="gray.500">Tâches</Text>
                          <Button
                            as={RouterLink}
                            to={`/tasks?milestone=${milestone.id}`}
                            variant="link"
                            size="sm"
                            colorScheme="blue"
                            fontSize="sm"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {milestone.completed_task_count}/{milestone.task_count}
                          </Button>
                        </Box>
                        <Box>
                          <Text fontSize="xs" color="gray.500">Échéance</Text>
                          <HStack spacing={1} color={isOverdue(milestone) ? 'red.500' : 'inherit'}>
                            <FiClock size={12} />
                            <Text fontSize="sm">
                              {format(new Date(milestone.due_date), 'dd/MM/yyyy')}
                            </Text>
                            {isOverdue(milestone) && (
                              <Tooltip label="Jalon en retard">
                                <FiAlertCircle size={12} />
                              </Tooltip>
                            )}
                          </HStack>
                        </Box>
                      </SimpleGrid>

                      {milestone.risk_score > 0 && (
                        <Tooltip label="Relancer l'analyse IA">
                          <Box
                            as="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              predictMutation.mutate(milestone.id);
                            }}
                            cursor="pointer"
                            alignSelf="flex-start"
                          >
                            <Tag
                              size="sm"
                              colorScheme={getRiskColor(milestone.risk_score)}
                              borderRadius="full"
                            >
                              <TagLeftIcon as={getRiskIcon(milestone.risk_score)} />
                              <TagLabel>Risque {milestone.risk_score}%</TagLabel>
                            </Tag>
                          </Box>
                        </Tooltip>
                      )}

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
            </SimpleGrid>
          ) : (
            <EmptyState
              icon={FiCalendar}
              message={t('milestones.notFound')}
              description={t('milestones.emptyDescription')}
              actionLabel={hasActiveFilters ? t('kanban.clearFilters') : t('milestones.createFirst')}
              onAction={hasActiveFilters ? clearFilters : () => handleOpenModal()}
              secondaryLabel={hasActiveFilters ? t('milestones.createFirst') : undefined}
              secondaryTo={hasActiveFilters ? '/milestones?new=1' : undefined}
            />
          )
        ) : (
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

      {/* Modal de création/édition avec slider et statut modifiable */}
      <Modal isOpen={isOpen} onClose={handleCloseModal} size="xl">
        <ModalOverlay />
        <ModalContent>
          <form onSubmit={handleSubmit}>
            <ModalHeader>
              {selectedMilestone ? 'Modifier le jalon' : 'Nouveau jalon'}
            </ModalHeader>
            <ModalCloseButton />
            <ModalBody maxH="70vh" overflowY="auto">
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

                <FormControl>
                  <FormLabel>
                    Statut
                    <Tooltip
                      label="Vous pouvez modifier manuellement le statut. Il sera mis à jour automatiquement par les tâches si vous ne le gérez pas."
                      placement="top"
                    >
                      <span style={{ marginLeft: '8px', cursor: 'help', fontSize: '14px', color: '#718096' }}>ⓘ</span>
                    </Tooltip>
                  </FormLabel>
                  <Select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  >
                    <option value="not_started">Non démarré</option>
                    <option value="in_progress">En cours</option>
                    <option value="completed">Terminé</option>
                    <option value="delayed">En retard</option>
                    <option value="cancelled">Annulé</option>
                  </Select>
                </FormControl>

                <FormControl>
                  <FormLabel>Progression (%)</FormLabel>
                  <Slider
                    aria-label="progression-slider"
                    defaultValue={formData.progress}
                    min={0}
                    max={100}
                    step={1}
                    value={formData.progress}
                    onChange={(val) => setFormData({ ...formData, progress: val })}
                    mb={6}
                  >
                    <SliderMark
                      value={formData.progress}
                      textAlign="center"
                      bg="blue.500"
                      color="white"
                      mt="3"
                      ml="-5"
                      w="10"
                      borderRadius="full"
                      fontSize="sm"
                    >
                      {Math.round(formData.progress)}%
                    </SliderMark>
                    <SliderTrack bg="gray.200">
                      <SliderFilledTrack bg="blue.500" />
                    </SliderTrack>
                    <SliderThumb boxSize={5}>
                      <Box color="blue.500" />
                    </SliderThumb>
                  </Slider>
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

      {/* Dialog de suppression */}
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
      <PageGuide
        guideId="milestones"
        i18nPrefix="pageGuides.milestones"
        steps={MILESTONES_STEPS}
      />
    </Box>
  );
};

export default Milestones;
