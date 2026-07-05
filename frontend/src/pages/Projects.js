import React, { useState } from 'react';
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
import { fr } from 'date-fns/locale';
import { PROJECT_STATUS_COLORS, PROJECT_STATUS_LABELS } from '../utils/constants';
import LoadingState from '../components/LoadingState';

const Projects = () => {
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
  const groupService = useCrudService('/groups', { resourceName: 'groupes' });
  const userService = useCrudService('/users', { resourceName: 'utilisateurs' });

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
          title: 'Erreur',
          description: 'Impossible de charger les projets',
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
          title: 'Succès',
          description: 'Projet créé avec succès',
          status: 'success',
          duration: 3000,
        });
        handleCloseModal();
      },
      onError: (error) => {
        toast({
          title: 'Erreur',
          description: error.response?.data?.message || 'Erreur lors de la création',
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
          title: 'Succès',
          description: 'Projet mis à jour avec succès',
          status: 'success',
          duration: 3000,
        });
        handleCloseModal();
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

  // Mutation pour supprimer un projet
  const deleteMutation = useMutation(
    (id) => projectService.deleteProject(id),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('projects');
        toast({
          title: 'Succès',
          description: 'Projet supprimé avec succès',
          status: 'success',
          duration: 3000,
        });
        onDeleteClose();
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
    console.log('📦 Données à envoyer:', formData);
    alert('la')
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
  const getStatusLabel = (status) => PROJECT_STATUS_LABELS[status] || status;

  if (isLoading) {
    return <LoadingState message="Chargement des projets..." />;
  }

  if (error) {
    return (
      <Box textAlign="center" py={10}>
        <Text color="red.500">Erreur lors du chargement des projets</Text>
        <Button mt={4} onClick={() => queryClient.invalidateQueries('projects')}>
          Réessayer
        </Button>
      </Box>
    );
  }

  return (
    <Box>
      <HStack justify="space-between" mb={6}>
        <Heading size="lg">Projets</Heading>
        <Button
          leftIcon={<FiPlus />}
          colorScheme="blue"
          onClick={() => handleOpenModal()}
        >
          Nouveau projet
        </Button>
      </HStack>

      {/* Statistiques rapides */}
      {projects && projects.length > 0 && (
        <SimpleGrid columns={{ base: 1, md: 4 }} spacing={4} mb={6}>
          <Card>
            <CardBody>
              <Stat>
                <StatLabel>Total projets</StatLabel>
                <StatNumber>{projects.length}</StatNumber>
              </Stat>
            </CardBody>
          </Card>
          <Card>
            <CardBody>
              <Stat>
                <StatLabel>En cours</StatLabel>
                <StatNumber>
                  {projects.filter(p => p.status === 'in_progress').length}
                </StatNumber>
              </Stat>
            </CardBody>
          </Card>
          <Card>
            <CardBody>
              <Stat>
                <StatLabel>Terminés</StatLabel>
                <StatNumber>
                  {projects.filter(p => p.status === 'completed').length}
                </StatNumber>
              </Stat>
            </CardBody>
          </Card>
          <Card>
            <CardBody>
              <Stat>
                <StatLabel>Progression moy.</StatLabel>
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
              <Th>Nom</Th>
              <Th>Statut</Th>
              <Th>Progression</Th>
              <Th>Groupes</Th>
              <Th>Chefs de projet</Th>
              <Th>Deadline</Th>
              <Th>Actions</Th>
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
                      {getStatusLabel(project.status)}
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
                        aria-label="Voir"
                      />
                      <IconButton
                        icon={<FiEdit2 />}
                        size="sm"
                        variant="ghost"
                        aria-label="Modifier"
                        onClick={() => handleOpenModal(project)}
                      />
                      <IconButton
                        icon={<FiTrash2 />}
                        size="sm"
                        variant="ghost"
                        colorScheme="red"
                        aria-label="Supprimer"
                        onClick={() => handleDelete(project)}
                      />
                    </HStack>
                  </Td>
                </Tr>
              ))
            ) : (
              <Tr>
                <Td colSpan={7} textAlign="center" py={8}>
                  <Text color="gray.500">Aucun projet trouvé</Text>
                  <Button
                    mt={4}
                    size="sm"
                    leftIcon={<FiPlus />}
                    onClick={() => handleOpenModal()}
                  >
                    Créer votre premier projet
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
              {selectedProject ? 'Modifier le projet' : 'Nouveau projet'}
            </ModalHeader>
            <ModalCloseButton />
            <ModalBody>
              <VStack spacing={4}>
                <FormControl isRequired>
                  <FormLabel>Nom du projet</FormLabel>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Ex: Site e-commerce"
                  />
                </FormControl>

                <FormControl>
                  <FormLabel>Description</FormLabel>
                  <Textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Description du projet..."
                    rows={3}
                  />
                </FormControl>

                <FormControl>
                  <FormLabel>Statut</FormLabel>
                  <Select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
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
                    value={formData.start_date}
                    onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                  />
                </FormControl>

                <FormControl>
                  <FormLabel>Date de fin prévue</FormLabel>
                  <Input
                    type="date"
                    value={formData.deadline}
                    onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
                  />
                </FormControl>

                <FormControl>
                  <FormLabel>Groupes</FormLabel>
                  <HStack mb={2}>
                    <Select
                      value={selectedGroupId}
                      onChange={(e) => setSelectedGroupId(e.target.value)}
                      placeholder="Sélectionner un groupe"
                      flex={1}
                    >
                      {availableGroups
                        .filter((g) => !formData.groups.includes(g.id))
                        .map((g) => (
                          <option key={g.id} value={g.id}>{g.name} ({g.company_name})</option>
                        ))}
                    </Select>
                    <Button size="sm" colorScheme="purple" onClick={() => addToList('groups', selectedGroupId, setSelectedGroupId)}>
                      Ajouter
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
                  <FormLabel>Chefs de projet</FormLabel>
                  <HStack mb={2}>
                    <Select
                      value={selectedManagerId}
                      onChange={(e) => setSelectedManagerId(e.target.value)}
                      placeholder="Sélectionner un chef de projet"
                      flex={1}
                    >
                      {availableUsers
                        .filter((u) => !formData.managers.includes(u.id))
                        .map((u) => (
                          <option key={u.id} value={u.id}>{u.username} ({u.email})</option>
                        ))}
                    </Select>
                    <Button size="sm" colorScheme="orange" onClick={() => addToList('managers', selectedManagerId, setSelectedManagerId)}>
                      Ajouter
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
                  <FormLabel>Membres</FormLabel>
                  <HStack mb={2}>
                    <Select
                      value={selectedMemberId}
                      onChange={(e) => setSelectedMemberId(e.target.value)}
                      placeholder="Sélectionner un membre"
                      flex={1}
                    >
                      {availableUsers
                        .filter((u) => !formData.members.includes(u.id))
                        .map((u) => (
                          <option key={u.id} value={u.id}>{u.username} ({u.email})</option>
                        ))}
                    </Select>
                    <Button size="sm" colorScheme="blue" onClick={() => addToList('members', selectedMemberId, setSelectedMemberId)}>
                      Ajouter
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
                Annuler
              </Button>
              <Button
                type="submit"
                colorScheme="blue"
                isLoading={createMutation.isLoading || updateMutation.isLoading}
              >
                {selectedProject ? 'Mettre à jour' : 'Créer'}
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
              Supprimer le projet
            </AlertDialogHeader>

            <AlertDialogBody>
              Êtes-vous sûr de vouloir supprimer le projet "{selectedProject?.name}" ?
              Cette action est irréversible.
            </AlertDialogBody>

            <AlertDialogFooter>
              <Button ref={cancelRef} onClick={onDeleteClose}>
                Annuler
              </Button>
              <Button
                colorScheme="red"
                onClick={confirmDelete}
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

export default Projects;
