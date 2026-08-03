import React, { useState, useMemo, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Box,
  Heading,
  Button,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Badge,
  IconButton,
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
  VStack,
  HStack,
  Progress,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  AlertDialog,
  AlertDialogBody,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogContent,
  AlertDialogOverlay,
  useToast,
  Spinner,
  Text,
  Card,
  CardBody,
  SimpleGrid,
  Stat,
  StatLabel,
  StatNumber,
  Tag,
  TagLabel,
  TagCloseButton,
  Wrap,
  WrapItem,
  InputGroup,
  InputLeftElement,
  Tooltip,
} from '@chakra-ui/react';
import {
  FiPlus,
  FiEdit2,
  FiTrash2,
  FiEye,
  FiSearch,
  FiArrowUp,
  FiArrowDown,
  FiChevronsDown,
  FiList,
  FiUsers,
  FiAlertCircle,
} from 'react-icons/fi';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { useProjectService } from '../services/projectService';
import { useCrudService } from '../utils/createCrudService';
import { useAuth } from '../context/AuthContext';
import { Link as RouterLink, useNavigate, useSearchParams } from 'react-router-dom';
import { format } from 'date-fns';
import { PROJECT_STATUS_COLORS, getProjectStatusLabel } from '../utils/constants';
import LoadingState from '../components/LoadingState';
import EmptyState from '../components/EmptyState';
import PageGuide from '../components/PageGuide';
import { FiFolder } from 'react-icons/fi';

const PROJECTS_STEPS = [
  { key: 'overview', icon: FiFolder },
  { key: 'create', icon: FiPlus },
  { key: 'detail', icon: FiEye },
];

const STATUS_KEYS = ['not_started', 'in_progress', 'paused', 'completed', 'archived'];

const Projects = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedProject, setSelectedProject] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    status: 'not_started',
    start_date: '',
    deadline: '',
    groups: [],
    managers: [],
    members: [],
  });
  const [selectedGroupId, setSelectedGroupId] = useState('');
  const [selectedManagerId, setSelectedManagerId] = useState('');
  const [selectedMemberId, setSelectedMemberId] = useState('');

  // Filtres & tri
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [overdueOnly, setOverdueOnly] = useState(false);
  const [sortKey, setSortKey] = useState('deadline');
  const [sortDir, setSortDir] = useState('asc');
  const [statusUpdatingId, setStatusUpdatingId] = useState(null);

  const { isOpen, onOpen, onClose } = useDisclosure();
  const {
    isOpen: isDeleteOpen,
    onOpen: onDeleteOpen,
    onClose: onDeleteClose,
  } = useDisclosure();
  const cancelRef = React.useRef();

  useEffect(() => {
    if (searchParams.get('new') === '1') {
      handleOpenModal();
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  const toast = useToast();
  const queryClient = useQueryClient();
  const projectService = useProjectService();
  const { user: currentUser, axiosInstance } = useAuth();
  const groupService = useCrudService('/groups', { resourceName: t('sidebar.groups') });
  const userService = useCrudService('/users', { resourceName: t('sidebar.users') });

  const { data: allGroups = [] } = useQuery('groups', () => groupService.getAll());
  const availableGroups = Array.isArray(allGroups)
    ? allGroups
    : (allGroups?.results || []);

  const { data: allUsers = [] } = useQuery('managed-users', () => userService.getAll());
  const availableUsers = Array.isArray(allUsers) ? allUsers : allUsers.results || [];

  // Charger les projets
  const { data: projects, isLoading, error } = useQuery(
    'projects',
    () => projectService.getProjects(),
    {
      onError: (error) => {
        toast({
          title: t('common.error'),
          description: t('common.loadErrorDesc'),
          status: 'error',
          duration: 3000,
        });
      },
    }
  );

  const projectList = Array.isArray(projects) ? projects : (projects?.results || []);

  // Mutation pour créer un projet
  const createMutation = useMutation(
    (newProject) => projectService.createProject(newProject),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('projects');
        toast({
          title: t('common.success'),
          description: t('projects.createdSuccess'),
          status: 'success',
          duration: 3000,
        });
        handleCloseModal();
      },
      onError: (error) => {
        toast({
          title: t('common.error'),
          description: error.response?.data?.message || t('projects.createError'),
          status: 'error',
          duration: 3000,
        });
      },
    }
  );

  // Mutation pour mettre à jour un projet
  const updateMutation = useMutation(
    ({ id, data }) => projectService.updateProject(id, data),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('projects');
        toast({
          title: t('common.success'),
          description: t('projects.updatedSuccess'),
          status: 'success',
          duration: 3000,
        });
        handleCloseModal();
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

  // Mutation pour changer le statut rapidement (inline)
  const updateStatusMutation = useMutation(
    ({ id, status }) => projectService.updateProjectStatus(id, { status }),
    {
      onSuccess: () => {
        setStatusUpdatingId(null);
        queryClient.invalidateQueries('projects');
        toast({
          title: t('common.success'),
          description: t('projects.updatedSuccess'),
          status: 'success',
          duration: 2000,
        });
      },
      onError: () => {
        setStatusUpdatingId(null);
        toast({
          title: t('common.error'),
          description: t('projects.updateError'),
          status: 'error',
          duration: 3000,
        });
      },
    }
  );

  // Mutation pour supprimer un projet
  const deleteMutation = useMutation(
    (id) => projectService.deleteProject(id),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('projects');
        toast({
          title: t('common.success'),
          description: t('projects.deletedSuccess'),
          status: 'success',
          duration: 3000,
        });
        onDeleteClose();
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

  const handleOpenModal = (project = null) => {
    if (project) {
      setSelectedProject(project);
      setFormData({
        name: project.name,
        description: project.description || '',
        status: project.status,
        start_date: project.start_date || '',
        deadline: project.deadline || '',
        groups: project.groups || [],
        managers: project.managers || [],
        members: project.members ? (Array.isArray(project.members) ? project.members : []) : [],
      });
    } else {
      setSelectedProject(null);
      setFormData({
        name: '',
        description: '',
        status: 'not_started',
        start_date: '',
        deadline: '',
        groups: [],
        managers: [],
        members: [],
      });
    }
    onOpen();
  };

  const handleCloseModal = () => {
    setSelectedProject(null);
    setFormData({
      name: '',
      description: '',
      status: 'not_started',
      start_date: '',
      deadline: '',
      groups: [],
      managers: [],
      members: [],
    });
    setSelectedGroupId('');
    setSelectedManagerId('');
    setSelectedMemberId('');
    onClose();
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (selectedProject) {
      updateMutation.mutate({ id: selectedProject.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const addToList = (field, selectedId, setSelectedId) => {
    if (!selectedId) return;
    const id = parseInt(selectedId);
    if (!formData[field].includes(id)) {
      setFormData({ ...formData, [field]: [...formData[field], id] });
    }
    setSelectedId('');
  };

  const removeFromList = (field, id) => {
    setFormData({ ...formData, [field]: formData[field].filter((v) => v !== id) });
  };

  const handleDelete = (project) => {
    setSelectedProject(project);
    onDeleteOpen();
  };

  const confirmDelete = () => {
    if (selectedProject) {
      deleteMutation.mutate(selectedProject.id);
    }
  };

  const getStatusColor = (status) => PROJECT_STATUS_COLORS[status] || 'gray';

  const toggleSort = (key) => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  const isProjectOverdue = (project) =>
    project.deadline && new Date(project.deadline) < new Date() && project.status !== 'completed';

  const filteredProjects = useMemo(() => {
    let list = projectList;
    if (statusFilter) list = list.filter((p) => p.status === statusFilter);
    if (overdueOnly) list = list.filter(isProjectOverdue);
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      list = list.filter(
        (p) =>
          (p.name || '').toLowerCase().includes(q) ||
          (p.description || '').toLowerCase().includes(q)
      );
    }
    const sorted = [...list].sort((a, b) => {
      let av;
      let bv;
      if (sortKey === 'deadline') {
        av = a.deadline ? new Date(a.deadline).getTime() : Infinity;
        bv = b.deadline ? new Date(b.deadline).getTime() : Infinity;
      } else if (sortKey === 'progress') {
        av = Number(a.progress) || 0;
        bv = Number(b.progress) || 0;
      } else {
        av = String(a[sortKey] || '').toLowerCase();
        bv = String(b[sortKey] || '').toLowerCase();
      }
      const cmp = av > bv ? 1 : av < bv ? -1 : 0;
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return sorted;
  }, [projectList, statusFilter, overdueOnly, searchTerm, sortKey, sortDir]);

  const overdueCount = projectList.filter(isProjectOverdue).length;

  const statCards = [
    {
      key: 'all',
      label: t('projects.title'),
      value: projectList.length,
      active: !statusFilter && !overdueOnly,
      onClick: () => {
        setStatusFilter('');
        setOverdueOnly(false);
      },
    },
    {
      key: 'in_progress',
      label: t('common.inProgress'),
      value: projectList.filter((p) => p.status === 'in_progress').length,
      active: statusFilter === 'in_progress',
      onClick: () => {
        setStatusFilter('in_progress');
        setOverdueOnly(false);
      },
    },
    {
      key: 'completed',
      label: t('common.completed'),
      value: projectList.filter((p) => p.status === 'completed').length,
      active: statusFilter === 'completed',
      onClick: () => {
        setStatusFilter('completed');
        setOverdueOnly(false);
      },
    },
    {
      key: 'overdue',
      label: t('projects.overdueTasks'),
      value: overdueCount,
      active: overdueOnly,
      onClick: () => {
        setStatusFilter('');
        setOverdueOnly(true);
      },
    },
  ];

  const hasActiveFilters = Boolean(searchTerm || statusFilter || overdueOnly);

  if (isLoading) {
    return <LoadingState message={t('common.loading')} />;
  }

  if (error) {
    return (
      <Box textAlign="center" py={10}>
        <Text color="red.500">{t('common.loadErrorDesc')}</Text>
        <Button mt={4} onClick={() => queryClient.invalidateQueries('projects')}>
          {t('common.retry')}
        </Button>
      </Box>
    );
  }

  return (
    <Box>
      <HStack justify="space-between" mb={6}>
        <Heading size="lg">{t('projects.title')}</Heading>
        <Button
          leftIcon={<FiPlus />}
          colorScheme="blue"
          onClick={() => handleOpenModal()}
        >
          {t('projects.newProject')}
        </Button>
      </HStack>

      {/* Statistiques rapides (cliquables = filtres) */}
      <SimpleGrid columns={{ base: 2, md: 4 }} spacing={4} mb={6}>
        {statCards.map((card) => (
          <Card
            key={card.key}
            cursor="pointer"
            onClick={card.onClick}
            borderWidth="2px"
            borderColor={card.active ? 'brand.400' : 'transparent'}
            boxShadow={card.active ? '0 0 0 3px rgba(59, 91, 219, 0.15)' : 'sm'}
            _hover={{ shadow: 'md', transform: 'translateY(-1px)' }}
            transition="all 0.15s"
            role="group"
          >
            <CardBody py={4}>
              <Stat>
                <StatLabel color={card.active ? 'brand.600' : 'inherit'}>
                  {card.label}
                </StatLabel>
                <StatNumber fontSize="2xl">{card.value}</StatNumber>
              </Stat>
            </CardBody>
          </Card>
        ))}
      </SimpleGrid>

      {/* Barre de filtres */}
      <HStack spacing={4} mb={6} wrap="wrap">
        <InputGroup maxW="320px">
          <InputLeftElement pointerEvents="none">
            <FiSearch color="gray.300" />
          </InputLeftElement>
          <Input
            placeholder={t('projects.searchPlaceholder')}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            size="sm"
            borderRadius="md"
          />
        </InputGroup>

        <Select
          placeholder={t('common.allStatuses')}
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setOverdueOnly(false);
          }}
          size="sm"
          width="200px"
        >
          {STATUS_KEYS.map((s) => (
            <option key={s} value={s}>{getProjectStatusLabel(s)}</option>
          ))}
        </Select>

        {hasActiveFilters && (
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              setSearchTerm('');
              setStatusFilter('');
              setOverdueOnly(false);
            }}
          >
            {t('kanban.clearFilters')}
          </Button>
        )}

        <Text fontSize="sm" color="gray.500" ml="auto">
          {filteredProjects.length} / {projectList.length}
        </Text>
      </HStack>

      {/* Tableau des projets */}
      <Box bg="white" borderRadius="lg" boxShadow="sm" overflowX="auto">
        <Table variant="simple" size="sm">
          <Thead bg="gray.50">
            <Tr>
              <SortableTh label={t('projects.column.name')} column="name" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
              <SortableTh label={t('common.status')} column="status" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
              <SortableTh label={t('common.progress')} column="progress" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
              <Th>{t('common.tasks')}</Th>
              <Th>{t('common.members')}</Th>
              <SortableTh label={t('projects.column.deadline')} column="deadline" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
              <Th>{t('common.actions')}</Th>
            </Tr>
          </Thead>
          <Tbody>
            {filteredProjects.length > 0 ? (
              filteredProjects.map((project) => {
                const progress = Math.round(project.progress || 0);
                const progressColor = progress >= 100 ? 'green' : progress >= 50 ? 'blue' : progress >= 25 ? 'orange' : 'red';
                const overdue = isProjectOverdue(project);
                return (
                  <Tr
                    key={project.id}
                    onClick={() => navigate(`/projects/${project.id}`)}
                    cursor="pointer"
                    _hover={{ bg: 'gray.50' }}
                    transition="background 0.15s"
                  >
                    <Td>
                      <HStack spacing={2}>
                        {overdue && (
                          <Tooltip label={t('common.overdue')}>
                            <FiAlertCircle color="red.500" />
                          </Tooltip>
                        )}
                        <Box>
                          <Text fontWeight="500">{project.name}</Text>
                          <Text fontSize="sm" color="gray.500" noOfLines={1}>
                            {project.description}
                          </Text>
                        </Box>
                      </HStack>
                    </Td>
                    <Td onClick={(e) => e.stopPropagation()}>
                      {statusUpdatingId === project.id ? (
                        <Spinner size="sm" color="blue.500" />
                      ) : (
                        <Select
                          size="xs"
                          width="140px"
                          value={project.status}
                          onChange={(e) => {
                            setStatusUpdatingId(project.id);
                            updateStatusMutation.mutate({ id: project.id, status: e.target.value });
                          }}
                          borderColor={`${getStatusColor(project.status)}.300`}
                        >
                          {STATUS_KEYS.map((s) => (
                            <option key={s} value={s}>{getProjectStatusLabel(s)}</option>
                          ))}
                        </Select>
                      )}
                    </Td>
                    <Td>
                      <HStack spacing={3}>
                        <Progress
                          value={progress}
                          size="sm"
                          colorScheme={progressColor}
                          width="100px"
                          borderRadius="full"
                        />
                        <Text fontSize="sm">{progress}%</Text>
                      </HStack>
                    </Td>
                    <Td>
                      <HStack spacing={1}>
                        <FiList size={12} color="gray.400" />
                        <Text fontSize="sm">{project.task_count ?? '-'}</Text>
                      </HStack>
                    </Td>
                    <Td>
                      <HStack spacing={1}>
                        <FiUsers size={12} color="gray.400" />
                        <Text fontSize="sm">{project.members_count ?? '-'}</Text>
                      </HStack>
                    </Td>
                    <Td>
                      {project.deadline ? (
                        <Text
                          fontSize="sm"
                          color={overdue ? 'red.500' : 'inherit'}
                          fontWeight={overdue ? 'bold' : 'normal'}
                        >
                          {format(new Date(project.deadline), 'dd/MM/yyyy')}
                        </Text>
                      ) : (
                        <Text fontSize="sm" color="gray.400">-</Text>
                      )}
                    </Td>
                    <Td onClick={(e) => e.stopPropagation()}>
                      <HStack spacing={2}>
                        <IconButton
                          as={RouterLink}
                          to={`/projects/${project.id}`}
                          icon={<FiEye />}
                          size="sm"
                          variant="ghost"
                          aria-label={t('common.view')}
                        />
                        <IconButton
                          icon={<FiEdit2 />}
                          size="sm"
                          variant="ghost"
                          aria-label={t('common.edit')}
                          onClick={() => handleOpenModal(project)}
                        />
                        <IconButton
                          icon={<FiTrash2 />}
                          size="sm"
                          variant="ghost"
                          colorScheme="red"
                          aria-label={t('common.delete')}
                          onClick={() => handleDelete(project)}
                        />
                      </HStack>
                    </Td>
                  </Tr>
                );
              })
            ) : (
              <Tr>
                <Td colSpan={7} py={8}>
                  {projectList.length === 0 ? (
                    <EmptyState
                      icon={FiFolder}
                      message={t('projects.notFound')}
                      description={t('projects.emptyDescription')}
                      actionLabel={t('projects.createFirst')}
                      onAction={() => handleOpenModal()}
                    />
                  ) : (
                    <VStack spacing={4} py={6}>
                      <Text color="gray.500">{t('common.noResults')}</Text>
                      <Button
                        mt={2}
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setSearchTerm('');
                          setStatusFilter('');
                          setOverdueOnly(false);
                        }}
                      >
                        {t('kanban.clearFilters')}
                      </Button>
                    </VStack>
                  )}
                </Td>
              </Tr>
            )}
          </Tbody>
        </Table>
      </Box>

      {/* Modal de création/édition */}
      <Modal isOpen={isOpen} onClose={handleCloseModal} size="xl">
        <ModalOverlay />
        <ModalContent>
          <form onSubmit={handleSubmit}>
            <ModalHeader>
              {selectedProject ? t('projects.editProject') : t('projects.newProject')}
            </ModalHeader>
            <ModalCloseButton />
            <ModalBody>
              <VStack spacing={4}>
                <FormControl isRequired>
                  <FormLabel>{t('projects.projectName')}</FormLabel>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder={t('projects.namePlaceholder')}
                  />
                </FormControl>

                <FormControl>
                  <FormLabel>{t('common.description')}</FormLabel>
                  <Textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder={t('projects.projectDescription')}
                    rows={3}
                  />
                </FormControl>

                <FormControl>
                  <FormLabel>{t('common.status')}</FormLabel>
                  <Select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  >
                    <option value="not_started">{t('common.notStarted')}</option>
                    <option value="in_progress">{t('common.inProgress')}</option>
                    <option value="paused">{t('common.paused')}</option>
                    <option value="completed">{t('common.completed')}</option>
                    <option value="archived">{t('common.archived')}</option>
                  </Select>
                </FormControl>

                <FormControl>
                  <FormLabel>{t('common.startDate')}</FormLabel>
                  <Input
                    type="date"
                    value={formData.start_date}
                    onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                  />
                </FormControl>

                <FormControl>
                  <FormLabel>{t('common.endDate')}</FormLabel>
                  <Input
                    type="date"
                    value={formData.deadline}
                    onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
                  />
                </FormControl>

                <FormControl>
                  <FormLabel>{t('projects.groups')}</FormLabel>
                  <HStack mb={2}>
                    <Select
                      value={selectedGroupId}
                      onChange={(e) => setSelectedGroupId(e.target.value)}
                      placeholder={t('projects.selectGroup')}
                      flex={1}
                    >
                      {availableGroups
                        .filter((g) => !formData.groups.includes(g.id))
                        .map((g) => (
                          <option key={g.id} value={g.id}>{g.name} ({g.company_name})</option>
                        ))}
                    </Select>
                    <Button size="sm" colorScheme="purple" onClick={() => addToList('groups', selectedGroupId, setSelectedGroupId)}>
                      {t('common.add')}
                    </Button>
                  </HStack>
                  {formData.groups.length > 0 && (
                    <Wrap>
                      {formData.groups.map((id) => {
                        const g = availableGroups.find((gr) => gr.id === id);
                        return (
                          <WrapItem key={id}>
                            <Tag size="md" colorScheme="purple" borderRadius="full">
                              <TagLabel>{g ? g.name : `#${id}`}</TagLabel>
                              <TagCloseButton onClick={() => removeFromList('groups', id)} />
                            </Tag>
                          </WrapItem>
                        );
                      })}
                    </Wrap>
                  )}
                </FormControl>

                <FormControl>
                  <FormLabel>{t('projects.projectManagers')}</FormLabel>
                  <HStack mb={2}>
                    <Select
                      value={selectedManagerId}
                      onChange={(e) => setSelectedManagerId(e.target.value)}
                      placeholder={t('projects.selectManager')}
                      flex={1}
                    >
                      {availableUsers
                        .filter((u) => !formData.managers.includes(u.id))
                        .map((u) => (
                          <option key={u.id} value={u.id}>{u.username} ({u.email})</option>
                        ))}
                    </Select>
                    <Button size="sm" colorScheme="orange" onClick={() => addToList('managers', selectedManagerId, setSelectedManagerId)}>
                      {t('common.add')}
                    </Button>
                  </HStack>
                  {formData.managers.length > 0 && (
                    <Wrap>
                      {formData.managers.map((id) => {
                        const u = availableUsers.find((usr) => usr.id === id);
                        return (
                          <WrapItem key={id}>
                            <Tag size="md" colorScheme="orange" borderRadius="full">
                              <TagLabel>{u ? u.username : `#${id}`}</TagLabel>
                              <TagCloseButton onClick={() => removeFromList('managers', id)} />
                            </Tag>
                          </WrapItem>
                        );
                      })}
                    </Wrap>
                  )}
                </FormControl>

                <FormControl>
                  <FormLabel>{t('projectMembers.title')}</FormLabel>
                  <HStack mb={2}>
                    <Select
                      value={selectedMemberId}
                      onChange={(e) => setSelectedMemberId(e.target.value)}
                      placeholder={t('projects.selectMember')}
                      flex={1}
                    >
                      {availableUsers
                        .filter((u) => !formData.members.includes(u.id))
                        .map((u) => (
                          <option key={u.id} value={u.id}>{u.username} ({u.email})</option>
                        ))}
                    </Select>
                    <Button size="sm" colorScheme="blue" onClick={() => addToList('members', selectedMemberId, setSelectedMemberId)}>
                      {t('common.add')}
                    </Button>
                  </HStack>
                  {formData.members.length > 0 && (
                    <Wrap>
                      {formData.members.map((id) => {
                        const u = availableUsers.find((usr) => usr.id === id);
                        return (
                          <WrapItem key={id}>
                            <Tag size="md" colorScheme="blue" borderRadius="full">
                              <TagLabel>{u ? u.username : `#${id}`}</TagLabel>
                              <TagCloseButton onClick={() => removeFromList('members', id)} />
                            </Tag>
                          </WrapItem>
                        );
                      })}
                    </Wrap>
                  )}
                </FormControl>
              </VStack>
            </ModalBody>

            <ModalFooter>
              <Button variant="ghost" mr={3} onClick={handleCloseModal}>
                {t('common.cancel')}
              </Button>
              <Button
                type="submit"
                colorScheme="blue"
                isLoading={createMutation.isLoading || updateMutation.isLoading}
              >
                {selectedProject ? t('common.update') : t('common.create')}
              </Button>
            </ModalFooter>
          </form>
        </ModalContent>
      </Modal>

      {/* Dialog de confirmation de suppression */}
      <AlertDialog
        isOpen={isDeleteOpen}
        leastDestructiveRef={cancelRef}
        onClose={onDeleteClose}
      >
        <AlertDialogOverlay>
          <AlertDialogContent>
            <AlertDialogHeader fontSize="lg" fontWeight="bold">
              {t('projects.confirmDelete')}
            </AlertDialogHeader>

            <AlertDialogBody>
              {t('common.confirmDelete')} "{selectedProject?.name}" ?
              {t('common.irreversible')}
            </AlertDialogBody>

            <AlertDialogFooter>
              <Button ref={cancelRef} onClick={onDeleteClose}>
                {t('common.cancel')}
              </Button>
              <Button
                colorScheme="red"
                onClick={confirmDelete}
                ml={3}
                isLoading={deleteMutation.isLoading}
              >
                {t('common.delete')}
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialogOverlay>
      </AlertDialog>
      <PageGuide
        guideId="projects"
        i18nPrefix="pageGuides.projects"
        steps={PROJECTS_STEPS}
      />
    </Box>
  );
};

// En-tête de colonne triable
const SortableTh = ({ label, column, sortKey, sortDir, onSort }) => (
  <Th cursor="pointer" userSelect="none" onClick={() => onSort(column)}>
    <HStack spacing={1}>
      <Text>{label}</Text>
      {sortKey === column ? (
        sortDir === 'asc' ? <FiArrowUp size={12} /> : <FiArrowDown size={12} />
      ) : (
        <FiChevronsDown size={12} color="gray.300" />
      )}
    </HStack>
  </Th>
);

export default Projects;
