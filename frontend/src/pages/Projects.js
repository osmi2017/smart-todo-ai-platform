import React, { useState } from 'react';
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
  StatHelpText,
  StatArrow,
  Tag,
  TagLabel,
  TagCloseButton,
  Wrap,
  WrapItem,
} from '@chakra-ui/react';
import {
  FiPlus,
  FiMoreVertical,
  FiEdit2,
  FiTrash2,
  FiEye,
  FiCalendar,
  FiUsers,
} from 'react-icons/fi';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { useProjectService } from '../services/projectService';
import { useCrudService } from '../utils/createCrudService';
import { useAuth } from '../context/AuthContext';
import { Link as RouterLink } from 'react-router-dom';
import { format } from 'date-fns';
import { PROJECT_STATUS_COLORS, getProjectStatusLabel } from '../utils/constants';
import LoadingState from '../components/LoadingState';

const Projects = () => {
  const { t } = useTranslation();
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
  
  const { isOpen, onOpen, onClose } = useDisclosure();
  const { 
    isOpen: isDeleteOpen, 
    onOpen: onDeleteOpen, 
    onClose: onDeleteClose 
  } = useDisclosure();
  const cancelRef = React.useRef();
  
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

      {/* Statistiques rapides */}
      {projects && projects.length > 0 && (
        <SimpleGrid columns={{ base: 1, md: 4 }} spacing={4} mb={6}>
          <Card>
            <CardBody>
              <Stat>
                <StatLabel>{t('projects.title')}</StatLabel>
                <StatNumber>{projects.length}</StatNumber>
              </Stat>
            </CardBody>
          </Card>
          <Card>
            <CardBody>
              <Stat>
                <StatLabel>{t('common.inProgress')}</StatLabel>
                <StatNumber>
                  {projects.filter(p => p.status === 'in_progress').length}
                </StatNumber>
              </Stat>
            </CardBody>
          </Card>
          <Card>
            <CardBody>
              <Stat>
                <StatLabel>{t('common.completed')}</StatLabel>
                <StatNumber>
                  {projects.filter(p => p.status === 'completed').length}
                </StatNumber>
              </Stat>
            </CardBody>
          </Card>
          <Card>
            <CardBody>
              <Stat>
                <StatLabel>{t('projects.progressAvg')}</StatLabel>
                <StatNumber>
                  {Math.round(projects.reduce((acc, p) => acc + p.progress, 0) / projects.length)}%
                </StatNumber>
              </Stat>
            </CardBody>
          </Card>
        </SimpleGrid>
      )}

      {/* Tableau des projets */}
      <Box bg="white" borderRadius="lg" boxShadow="sm" overflow="hidden">
        <Table variant="simple">
          <Thead bg="gray.50">
            <Tr>
              <Th>{t('projects.column.name')}</Th>
              <Th>{t('common.status')}</Th>
              <Th>{t('common.progress')}</Th>
              <Th>{t('projects.column.groups')}</Th>
              <Th>{t('projects.column.managers')}</Th>
              <Th>{t('projects.column.deadline')}</Th>
              <Th>{t('common.actions')}</Th>
            </Tr>
          </Thead>
          <Tbody>
            {projects && projects.length > 0 ? (
              projects.map((project) => (
                <Tr key={project.id}>
                  <Td>
                    <Text fontWeight="500">{project.name}</Text>
                    <Text fontSize="sm" color="gray.500" noOfLines={1}>
                      {project.description}
                    </Text>
                  </Td>
                  <Td>
                    <Badge colorScheme={getStatusColor(project.status)}>
                      {getProjectStatusLabel(project.status)}
                    </Badge>
                  </Td>
                  <Td>
                    <HStack spacing={3}>
                      <Progress
                        value={project.progress}
                        size="sm"
                        colorScheme={project.progress === 100 ? 'green' : 'blue'}
                        width="100px"
                        borderRadius="full"
                      />
                      <Text fontSize="sm">{Math.round(project.progress)}%</Text>
                    </HStack>
                  </Td>
                  <Td>
                    {project.groups_detail && project.groups_detail.length > 0 ? (
                      <Wrap>
                        {project.groups_detail.map((g) => (
                          <WrapItem key={g.id}>
                            <Badge colorScheme="purple" fontSize="xs">{g.name}</Badge>
                          </WrapItem>
                        ))}
                      </Wrap>
                    ) : (
                      <Text fontSize="sm" color="gray.400">-</Text>
                    )}
                  </Td>
                  <Td>
                    {project.managers_detail && project.managers_detail.length > 0 ? (
                      <Wrap>
                        {project.managers_detail.map((m) => (
                          <WrapItem key={m.id}>
                            <Badge colorScheme="orange" fontSize="xs">{m.username}</Badge>
                          </WrapItem>
                        ))}
                      </Wrap>
                    ) : (
                      <Text fontSize="sm" color="gray.400">-</Text>
                    )}
                  </Td>
                  <Td>
                    {project.deadline ? (
                      <Text
                        fontSize="sm"
                        color={
                          new Date(project.deadline) < new Date() &&
                          project.status !== 'completed'
                            ? 'red.500'
                            : 'inherit'
                        }
                        fontWeight={
                          new Date(project.deadline) < new Date() &&
                          project.status !== 'completed'
                            ? 'bold'
                            : 'normal'
                        }
                      >
                        {format(new Date(project.deadline), 'dd/MM/yyyy')}
                      </Text>
                    ) : (
                      <Text fontSize="sm" color="gray.400">-</Text>
                    )}
                  </Td>
                  <Td>
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
              ))
            ) : (
              <Tr>
                <Td colSpan={7} textAlign="center" py={8}>
                  <Text color="gray.500">{t('projects.notFound')}</Text>
                  <Button
                    mt={4}
                    size="sm"
                    leftIcon={<FiPlus />}
                    onClick={() => handleOpenModal()}
                  >
                    {t('projects.createFirst')}
                  </Button>
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
    </Box>
  );
};

export default Projects;
