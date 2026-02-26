import React, { useState } from 'react';
import {
  Box,
  Heading,
  Text,
  Badge,
  VStack,
  HStack,
  Button,
  Card,
  CardBody,
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
} from 'react-icons/fi';
import { useParams, useNavigate, Link as RouterLink } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { useTaskService } from '../services/taskService';
import { useProjectService } from '../services/projectService';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

const TaskDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const queryClient = useQueryClient();
  const taskService = useTaskService();
  const projectService = useProjectService();

  const [newComment, setNewComment] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({});

  // Charger la tâche
  const { data: task, isLoading: taskLoading } = useQuery(
    ['task', id],
    () => taskService.getTask(id),
    {
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

  // Mutation pour mettre à jour la tâche
  const updateMutation = useMutation(
    (data) => taskService.updateTask(id, data),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['task', id]);
        toast({
          title: 'Succès',
          description: 'Tâche mise à jour',
          status: 'success',
          duration: 3000,
        });
        setIsEditing(false);
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
    const newChecklist = [...task.checklist];
    newChecklist[index].completed = !newChecklist[index].completed;
    updateMutation.mutate({ checklist: newChecklist });
  };

  const handleAddTag = (tag) => {
    if (tag && !task.tags.includes(tag)) {
      updateMutation.mutate({ tags: [...task.tags, tag] });
    }
  };

  const handleRemoveTag = (tagToRemove) => {
    updateMutation.mutate({ tags: task.tags.filter(t => t !== tagToRemove) });
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
                <MenuItem icon={<FiTrash2 />} color="red.500" onClick={() => deleteMutation.mutate()}>
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
                  <Heading size="md" mb={4}>Checklist</Heading>
                  <VStack align="stretch" spacing={2}>
                    {task.checklist.map((item, index) => (
                      <Checkbox
                        key={index}
                        isChecked={item.completed}
                        onChange={() => handleChecklistToggle(index)}
                      >
                        {item.text}
                      </Checkbox>
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

            {/* Commentaires */}
            <Card>
              <CardBody>
                <Heading size="md" mb={4}>Commentaires</Heading>
                <VStack spacing={4}>
                  <Textarea
                    placeholder="Ajouter un commentaire..."
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                  />
                  <Button
                    alignSelf="flex-end"
                    colorScheme="blue"
                    size="sm"
                    isDisabled={!newComment.trim()}
                  >
                    Commenter
                  </Button>
                </VStack>
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
            {task.tags && task.tags.length > 0 && (
              <Card>
                <CardBody>
                  <Heading size="md" mb={4}>Tags</Heading>
                  <HStack spacing={2} flexWrap="wrap">
                    {task.tags.map((tag, index) => (
                      <Tag key={index} size="md" colorScheme="blue" borderRadius="full">
                        <TagLabel>{tag}</TagLabel>
                        <TagCloseButton onClick={() => handleRemoveTag(tag)} />
                      </Tag>
                    ))}
                  </HStack>
                </CardBody>
              </Card>
            )}

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
    </Box>
  );
};

export default TaskDetail;
