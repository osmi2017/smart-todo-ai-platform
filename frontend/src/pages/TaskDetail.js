import React, { useState } from 'react';
import TaskComments from '../components/TaskComments';
import {
  Box,
  Heading,
  Text,
  Badge,
  VStack,
  HStack,
  Button,
  Card,
  CardHeader,
  CardBody,
  CardHeader,
  Divider,
  useToast,
  Spinner,
  Flex,
  Avatar,
  AvatarGroup,
  Textarea,
  Checkbox,
  CheckboxGroup,
  Tag,
  TagLabel,
  TagCloseButton,
  Input,
  FormControl,
  FormLabel,
  Select,
  SimpleGrid,
  Progress,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
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
  NumberInput,
  NumberInputField,
  NumberInputStepper,
  NumberIncrementStepper,
  NumberDecrementStepper,
} from '@chakra-ui/react';
import {
  FiCalendar,
  FiClock,
  FiUser,
  FiFlag,
  FiCheckCircle,
  FiAlertCircle,
  FiMoreVertical,
  FiEdit2,
  FiTrash2,
  FiCpu,
  FiMessageSquare,
  FiSave,
  FiX,
  FiPlus,
} from 'react-icons/fi';
import { useParams, useNavigate, Link as RouterLink } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { useTaskService } from '../services/taskService';
import { useProjectService } from '../services/projectService';
import { useMilestoneService } from '../services/milestoneService';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

const TaskDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const queryClient = useQueryClient();
  const taskService = useTaskService();
  const projectService = useProjectService();
  const milestoneService = useMilestoneService();

  const [newComment, setNewComment] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({});
  const [newTag, setNewTag] = useState('');
  
  const { isOpen: isDeleteOpen, onOpen: onDeleteOpen, onClose: onDeleteClose } = useDisclosure();

  // Charger la tâche
  const { data: task, isLoading: taskLoading } = useQuery(
    ['task', id],
    () => taskService.getTask(id),
    {
      onSuccess: (data) => {
        if (data) {
          setEditForm({
            title: data.title || '',
            description: data.description || '',
            priority: data.priority || 2,
            status: data.status || 'todo',
            deadline: data.deadline || '',
            estimated_time: data.estimated_time || '',
            project: data.project || '',
            milestone: data.milestone || '',
            assigned_to: data.assigned_to || '',
          });
        }
      },
      onError: (error) => {
        toast({
          title: 'Erreur',
          description: 'Impossible de charger la tâche',
          status: 'error',
          duration: 3000,
        });
        navigate('/tasks');
      },
    }
  );

  // Charger les projets pour le formulaire d'édition
  const { data: projects } = useQuery(
    'projects',
    () => projectService.getProjects(),
    { enabled: isEditing }
  );

  // Charger les milestones du projet sélectionné
  const { data: milestones } = useQuery(
    ['milestones', editForm.project],
    () => milestoneService.getMilestones({ project: editForm.project }),
    { enabled: !!editForm.project && isEditing }
  );

  // Mutation pour mettre à jour la tâche
  const updateMutation = useMutation(
    (data) => taskService.patchTask(id, data),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['task', id]);
        queryClient.invalidateQueries('tasks');
        toast({
          title: 'Succès',
          description: 'Tâche mise à jour',
          status: 'success',
          duration: 3000,
        });
        setIsEditing(false);
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

  // Mutation pour supprimer la tâche
  const deleteMutation = useMutation(
    () => taskService.deleteTask(id),
    {
      onSuccess: () => {
        toast({
          title: 'Succès',
          description: 'Tâche supprimée',
          status: 'success',
          duration: 3000,
        });
        navigate('/tasks');
      },
    }
  );

  // Mutation pour lancer une prédiction ML
  const predictMutation = useMutation(
    () => taskService.predictTask(id),
    {
      onSuccess: (data) => {
        queryClient.invalidateQueries(['task', id]);
        toast({
          title: 'Prédiction ML',
          description: `Temps estimé: ${data.predicted_time?.toFixed(1)}h, Risque: ${Math.round(data.delay_probability * 100)}%`,
          status: 'info',
          duration: 5000,
        });
      },
    }
  );

  if (taskLoading) {
    return (
      <Box textAlign="center" py={10}>
        <Spinner size="xl" color="blue.500" />
        <Text mt={4}>Chargement de la tâche...</Text>
      </Box>
    );
  }

  if (!task) {
    return (
      <Box textAlign="center" py={10}>
        <Text color="red.500">Tâche non trouvée</Text>
        <Button mt={4} as={RouterLink} to="/tasks">
          Retour aux tâches
        </Button>
      </Box>
    );
  }

  const getPriorityColor = (priority) => {
    const colors = { 1: 'gray', 2: 'blue', 3: 'orange', 4: 'red' };
    return colors[priority] || 'gray';
  };

  const getPriorityLabel = (priority) => {
    const labels = { 1: 'Basse', 2: 'Moyenne', 3: 'Haute', 4: 'Critique' };
    return labels[priority] || priority;
  };

  const getStatusColor = (status) => {
    const colors = {
      'todo': 'gray',
      'in_progress': 'blue',
      'review': 'purple',
      'blocked': 'red',
      'completed': 'green',
    };
    return colors[status] || 'gray';
  };

  const getStatusLabel = (status) => {
    const labels = {
      'todo': 'À faire',
      'in_progress': 'En cours',
      'review': 'En révision',
      'blocked': 'Bloquée',
      'completed': 'Terminée',
    };
    return labels[status] || status;
  };

  const handleStatusChange = (newStatus) => {
    updateMutation.mutate({ status: newStatus });
  };

  const handleChecklistToggle = (index) => {
    const newChecklist = [...(task.checklist || [])];
    newChecklist[index].completed = !newChecklist[index].completed;
    updateMutation.mutate({ checklist: newChecklist });
  };

  const handleAddTag = () => {
    if (newTag && !task.tags?.includes(newTag)) {
      const newTags = [...(task.tags || []), newTag];
      updateMutation.mutate({ tags: newTags });
      setNewTag('');
    }
  };

  const handleRemoveTag = (tagToRemove) => {
    const newTags = task.tags?.filter(t => t !== tagToRemove) || [];
    updateMutation.mutate({ tags: newTags });
  };

  const handleEditSubmit = (e) => {
    e.preventDefault();
    updateMutation.mutate(editForm);
  };

  const handleAddChecklistItem = () => {
    const newChecklist = [...(task.checklist || []), { text: 'Nouvel élément', completed: false }];
    updateMutation.mutate({ checklist: newChecklist });
  };

  return (
    <Box>
      <VStack spacing={6} align="stretch">
        {/* En-tête */}
        <Flex justify="space-between" align="center">
          <HStack spacing={4}>
            <Heading size="lg">{task.title}</Heading>
            <HStack spacing={2}>
              <Badge colorScheme={getPriorityColor(task.priority)} fontSize="md" px={3} py={1}>
                {getPriorityLabel(task.priority)}
              </Badge>
              <Badge colorScheme={getStatusColor(task.status)} fontSize="md" px={3} py={1}>
                {getStatusLabel(task.status)}
              </Badge>
            </HStack>
          </HStack>
          <HStack spacing={2}>
            <Button
              leftIcon={<FiCpu />}
              size="sm"
              colorScheme="purple"
              variant="outline"
              onClick={() => predictMutation.mutate()}
              isLoading={predictMutation.isLoading}
            >
              Prédire
            </Button>
            <Menu>
              <MenuButton as={IconButton} icon={<FiMoreVertical />} variant="ghost" />
              <MenuList>
                <MenuItem icon={<FiEdit2 />} onClick={() => setIsEditing(true)}>
                  Modifier
                </MenuItem>
                <MenuItem icon={<FiTrash2 />} color="red.500" onClick={onDeleteOpen}>
                  Supprimer
                </MenuItem>
              </MenuList>
            </Menu>
          </HStack>
        </Flex>

        {/* Alertes IA */}
        {task.delay_probability > 0.5 && (
          <Alert
            status={task.delay_probability > 0.7 ? 'error' : 'warning'}
            variant="left-accent"
            borderRadius="md"
          >
            <AlertIcon />
            <Box flex={1}>
              <AlertTitle>Risque de retard détecté</AlertTitle>
              <AlertDescription>
                Probabilité de retard: {Math.round(task.delay_probability * 100)}%
                {task.predicted_time && ` | Temps estimé: ${task.predicted_time.toFixed(1)}h`}
              </AlertDescription>
            </Box>
            <Button size="sm" colorScheme="blue" onClick={() => predictMutation.mutate()}>
              Recalculer
            </Button>
          </Alert>
        )}

        {/* Grille principale */}
        <SimpleGrid columns={{ base: 1, lg: 3 }} spacing={6}>
          {/* Colonne principale */}
          <VStack gridColumn="span 2" spacing={6} align="stretch">
            {/* Description */}
            <Card>
              <CardBody>
                <Heading size="md" mb={4}>Description</Heading>
                <Text color="gray.700" whiteSpace="pre-wrap">
                  {task.description || 'Aucune description'}
                </Text>
              </CardBody>
            </Card>

            {/* Checklist */}
            {task.checklist && task.checklist.length > 0 && (
              <Card>
                <CardBody>
                  <Flex justify="space-between" align="center" mb={4}>
                    <Heading size="md">Checklist</Heading>
                    <Button
                      size="xs"
                      leftIcon={<FiPlus />}
                      colorScheme="blue"
                      variant="ghost"
                      onClick={handleAddChecklistItem}
                    >
                      Ajouter
                    </Button>
                  </Flex>
                  <VStack align="stretch" spacing={2}>
                    {task.checklist.map((item, index) => (
                      <HStack key={index}>
                        <Checkbox
                          isChecked={item.completed}
                          onChange={() => handleChecklistToggle(index)}
                          flex={1}
                        >
                          {item.text}
                        </Checkbox>
                        <IconButton
                          icon={<FiTrash2 />}
                          size="xs"
                          variant="ghost"
                          colorScheme="red"
                          aria-label="Supprimer"
                          onClick={() => {
                            const newChecklist = task.checklist.filter((_, i) => i !== index);
                            updateMutation.mutate({ checklist: newChecklist });
                          }}
                        />
                      </HStack>
                    ))}
                  </VStack>
                  <Progress
                    value={(task.checklist.filter(i => i.completed).length / task.checklist.length) * 100}
                    size="sm"
                    colorScheme="green"
                    mt={4}
                    borderRadius="full"
                  />
                </CardBody>
              </Card>
            )}

            {/* Commentaires - INTÉGRATION DU COMPOSANT */}
            <Card>
              <CardHeader>
                <HStack>
                  <FiMessageSquare />
                  <Heading size="md">Commentaires</Heading>
                </HStack>
              </CardHeader>
              <CardBody>
                <TaskComments taskId={id} />
              </CardBody>
            </Card>
          </VStack>

          {/* Colonne latérale */}
          <VStack spacing={6} align="stretch">
            {/* Métadonnées */}
            <Card>
              <CardBody>
                <Heading size="md" mb={4}>Détails</Heading>
                <VStack align="stretch" spacing={3}>
                  <HStack justify="space-between">
                    <Text color="gray.500">Projet</Text>
                    <Text fontWeight="500">{task.project_name}</Text>
                  </HStack>
                  
                  {task.milestone_name && (
                    <HStack justify="space-between">
                      <Text color="gray.500">Jalon</Text>
                      <Text fontWeight="500">{task.milestone_name}</Text>
                    </HStack>
                  )}
                  
                  <HStack justify="space-between">
                    <Text color="gray.500">Assigné à</Text>
                    <HStack>
                      {task.assigned_to_name ? (
                        <>
                          <Avatar size="xs" name={task.assigned_to_name} />
                          <Text>{task.assigned_to_name}</Text>
                        </>
                      ) : (
                        <Text color="gray.400">Non assigné</Text>
                      )}
                    </HStack>
                  </HStack>
                  
                  <HStack justify="space-between">
                    <Text color="gray.500">Date limite</Text>
                    <HStack>
                      <FiCalendar />
                      <Text>
                        {task.deadline 
                          ? format(new Date(task.deadline), 'dd MMMM yyyy', { locale: fr })
                          : 'Non définie'
                        }
                      </Text>
                    </HStack>
                  </HStack>
                  
                  <HStack justify="space-between">
                    <Text color="gray.500">Temps estimé</Text>
                    <Text>{task.estimated_time || 'Non défini'}h</Text>
                  </HStack>
                  
                  {task.actual_time && (
                    <HStack justify="space-between">
                      <Text color="gray.500">Temps réel</Text>
                      <Text>{task.actual_time.toFixed(1)}h</Text>
                    </HStack>
                  )}
                </VStack>
              </CardBody>
            </Card>

            {/* Prédictions ML */}
            {(task.predicted_time || task.delay_probability || task.predicted_priority) && (
              <Card bg="purple.50">
                <CardBody>
                  <HStack mb={4}>
                    <FiCpu />
                    <Heading size="md">Prédictions IA</Heading>
                  </HStack>
                  <SimpleGrid columns={2} spacing={4}>
                    {task.predicted_time && (
                      <Box>
                        <Text fontSize="sm" color="gray.600">Temps estimé</Text>
                        <Text fontSize="lg" fontWeight="bold">
                          {task.predicted_time.toFixed(1)}h
                        </Text>
                      </Box>
                    )}
                    {task.delay_probability && (
                      <Box>
                        <Text fontSize="sm" color="gray.600">Risque retard</Text>
                        <Text fontSize="lg" fontWeight="bold" color={task.delay_probability > 0.7 ? 'red.500' : 'orange.500'}>
                          {Math.round(task.delay_probability * 100)}%
                        </Text>
                      </Box>
                    )}
                    {task.predicted_priority && (
                      <Box>
                        <Text fontSize="sm" color="gray.600">Priorité suggérée</Text>
                        <Badge colorScheme={getPriorityColor(task.predicted_priority)}>
                          {getPriorityLabel(task.predicted_priority)}
                        </Badge>
                      </Box>
                    )}
                  </SimpleGrid>
                </CardBody>
              </Card>
            )}

            {/* Tags */}
            <Card>
              <CardBody>
                <Heading size="md" mb={4}>Tags</Heading>
                <HStack spacing={2} flexWrap="wrap" mb={3}>
                  {task.tags?.map((tag, index) => (
                    <Tag key={index} size="md" colorScheme="blue" borderRadius="full">
                      <TagLabel>{tag}</TagLabel>
                      <TagCloseButton onClick={() => handleRemoveTag(tag)} />
                    </Tag>
                  ))}
                </HStack>
                <HStack>
                  <Input
                    placeholder="Nouveau tag"
                    size="sm"
                    value={newTag}
                    onChange={(e) => setNewTag(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleAddTag()}
                  />
                  <Button size="sm" onClick={handleAddTag} isDisabled={!newTag}>
                    Ajouter
                  </Button>
                </HStack>
              </CardBody>
            </Card>

            {/* Actions rapides */}
            <Card>
              <CardBody>
                <Heading size="md" mb={4}>Actions</Heading>
                <VStack spacing={2}>
                  <Button
                    w="100%"
                    size="sm"
                    colorScheme="blue"
                    variant={task.status === 'in_progress' ? 'solid' : 'outline'}
                    onClick={() => handleStatusChange('in_progress')}
                    isLoading={updateMutation.isLoading}
                  >
                    {task.status === 'in_progress' ? 'Déjà en cours' : 'Commencer'}
                  </Button>
                  <Button
                    w="100%"
                    size="sm"
                    colorScheme="green"
                    variant={task.status === 'completed' ? 'solid' : 'outline'}
                    onClick={() => handleStatusChange('completed')}
                    isDisabled={task.status === 'completed'}
                    isLoading={updateMutation.isLoading}
                  >
                    Marquer comme terminée
                  </Button>
                  {task.status === 'blocked' && (
                    <Button
                      w="100%"
                      size="sm"
                      colorScheme="orange"
                      variant="outline"
                      onClick={() => handleStatusChange('todo')}
                      isLoading={updateMutation.isLoading}
                    >
                      Réactiver
                    </Button>
                  )}
                </VStack>
              </CardBody>
            </Card>
          </VStack>
        </SimpleGrid>
      </VStack>

      {/* Modal d'édition */}
      <Modal isOpen={isEditing} onClose={() => setIsEditing(false)} size="xl">
        <ModalOverlay />
        <ModalContent>
          <form onSubmit={handleEditSubmit}>
            <ModalHeader>Modifier la tâche</ModalHeader>
            <ModalCloseButton />
            <ModalBody>
              <VStack spacing={4}>
                <FormControl isRequired>
                  <FormLabel>Titre</FormLabel>
                  <Input
                    value={editForm.title}
                    onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                  />
                </FormControl>

                <FormControl>
                  <FormLabel>Description</FormLabel>
                  <Textarea
                    value={editForm.description}
                    onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                    rows={3}
                  />
                </FormControl>

                <FormControl>
                  <FormLabel>Projet</FormLabel>
                  <Select
                    value={editForm.project}
                    onChange={(e) => setEditForm({ 
                      ...editForm, 
                      project: e.target.value,
                      milestone: '' 
                    })}
                  >
                    {projects?.map(project => (
                      <option key={project.id} value={project.id}>
                        {project.name}
                      </option>
                    ))}
                  </Select>
                </FormControl>

                {editForm.project && (
                  <FormControl>
                    <FormLabel>Jalon</FormLabel>
                    <Select
                      value={editForm.milestone}
                      onChange={(e) => setEditForm({ ...editForm, milestone: e.target.value })}
                    >
                      <option value="">Aucun jalon</option>
                      {milestones?.map(milestone => (
                        <option key={milestone.id} value={milestone.id}>
                          {milestone.name}
                        </option>
                      ))}
                    </Select>
                  </FormControl>
                )}

                <SimpleGrid columns={2} spacing={4}>
                  <FormControl>
                    <FormLabel>Priorité</FormLabel>
                    <Select
                      value={editForm.priority}
                      onChange={(e) => setEditForm({ ...editForm, priority: parseInt(e.target.value) })}
                    >
                      <option value={1}>Basse</option>
                      <option value={2}>Moyenne</option>
                      <option value={3}>Haute</option>
                      <option value={4}>Critique</option>
                    </Select>
                  </FormControl>

                  <FormControl>
                    <FormLabel>Statut</FormLabel>
                    <Select
                      value={editForm.status}
                      onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                    >
                      <option value="todo">À faire</option>
                      <option value="in_progress">En cours</option>
                      <option value="review">En révision</option>
                      <option value="blocked">Bloquée</option>
                      <option value="completed">Terminée</option>
                    </Select>
                  </FormControl>
                </SimpleGrid>

                <SimpleGrid columns={2} spacing={4}>
                  <FormControl>
                    <FormLabel>Temps estimé (heures)</FormLabel>
                    <NumberInput
                      value={editForm.estimated_time}
                      onChange={(value) => setEditForm({ ...editForm, estimated_time: value })}
                      min={0}
                      step={0.5}
                    >
                      <NumberInputField />
                      <NumberInputStepper>
                        <NumberIncrementStepper />
                        <NumberDecrementStepper />
                      </NumberInputStepper>
                    </NumberInput>
                  </FormControl>

                  <FormControl>
                    <FormLabel>Date limite</FormLabel>
                    <Input
                      type="date"
                      value={editForm.deadline}
                      onChange={(e) => setEditForm({ ...editForm, deadline: e.target.value })}
                    />
                  </FormControl>
                </SimpleGrid>

                <FormControl>
                  <FormLabel>Assigné à</FormLabel>
                  <Select
                    value={editForm.assigned_to}
                    onChange={(e) => setEditForm({ ...editForm, assigned_to: e.target.value })}
                  >
                    <option value="">Non assigné</option>
                    <option value="1">Moi</option>
                  </Select>
                </FormControl>
              </VStack>
            </ModalBody>

            <ModalFooter>
              <Button variant="ghost" mr={3} onClick={() => setIsEditing(false)}>
                Annuler
              </Button>
              <Button
                type="submit"
                colorScheme="blue"
                isLoading={updateMutation.isLoading}
              >
                Enregistrer
              </Button>
            </ModalFooter>
          </form>
        </ModalContent>
      </Modal>

      {/* Modal de confirmation de suppression */}
      <Modal isOpen={isDeleteOpen} onClose={onDeleteClose}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Supprimer la tâche</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            Êtes-vous sûr de vouloir supprimer cette tâche ? Cette action est irréversible.
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={onDeleteClose}>
              Annuler
            </Button>
            <Button
              colorScheme="red"
              onClick={() => {
                deleteMutation.mutate();
                onDeleteClose();
              }}
              isLoading={deleteMutation.isLoading}
            >
              Supprimer
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  );
};

export default TaskDetail;
