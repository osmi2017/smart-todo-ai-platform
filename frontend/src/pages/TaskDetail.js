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
import { fr, enUS } from 'date-fns/locale';
import { useTranslation } from 'react-i18next';

const TaskDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const queryClient = useQueryClient();
  const taskService = useTaskService();
  const projectService = useProjectService();
  const milestoneService = useMilestoneService();
  const { t, i18n } = useTranslation();
  const dateLocale = i18n.language && i18n.language.toLowerCase().startsWith('en') ? enUS : fr;

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
          setEditForm(toEditForm(data));
        }
      },
      onError: (error) => {
        toast({
          title: t('common.error'),
          description: t('tasks.loadErrorDesc'),
          status: 'error',
          duration: 3000,
        });
        navigate('/tasks');
      },
    }
  );

  const toEditForm = (data) => ({
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

  const openEditModal = () => {
    if (task) {
      setEditForm(toEditForm(task));
    }
    setIsEditing(true);
  };

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
          title: t('common.success'),
          description: t('tasks.updatedSuccess'),
          status: 'success',
          duration: 3000,
        });
        setIsEditing(false);
      },
      onError: (error) => {
        toast({
          title: t('common.error'),
          description: error.response?.data?.message || t('tasks.updateError'),
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
          title: t('common.success'),
          description: t('tasks.deletedSuccess'),
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
          title: t('tasks.mlPrediction'),
          description: `${t('tasks.predictedTime')}: ${data.predicted_time?.toFixed(1)}h, ${t('tasks.risk')}: ${Math.round(data.delay_probability * 100)}%`,
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
        <Text mt={4}>{t('tasks.loading')}</Text>
      </Box>
    );
  }

  if (!task) {
    return (
      <Box textAlign="center" py={10}>
        <Text color="red.500">{t('tasks.taskNotFound')}</Text>
        <Button mt={4} as={RouterLink} to="/tasks">
          {t('tasks.backToTasks')}
        </Button>
      </Box>
    );
  }

  const getPriorityColor = (priority) => {
    const colors = { 1: 'gray', 2: 'blue', 3: 'orange', 4: 'red' };
    return colors[priority] || 'gray';
  };

  const getPriorityLabel = (priority) => {
    const labels = {
      1: t('common.low'),
      2: t('common.medium'),
      3: t('common.high'),
      4: t('common.critical'),
    };
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
      'todo': t('common.todo'),
      'in_progress': t('common.inProgress'),
      'review': t('common.review'),
      'blocked': t('common.blocked'),
      'completed': t('common.completed'),
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
    const newChecklist = [...(task.checklist || []), { text: t('common.newItem'), completed: false }];
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
              {t('tasks.predict')}
            </Button>
            <Menu>
              <MenuButton as={IconButton} icon={<FiMoreVertical />} variant="ghost" />
              <MenuList>
                <MenuItem icon={<FiEdit2 />} onClick={openEditModal}>
                  {t('common.edit')}
                </MenuItem>
                <MenuItem icon={<FiTrash2 />} color="red.500" onClick={onDeleteOpen}>
                  {t('common.delete')}
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
              <AlertTitle>{t('tasks.delayRiskDetected')}</AlertTitle>
              <AlertDescription>
                {t('tasks.delayProbability')}: {Math.round(task.delay_probability * 100)}%
                {task.predicted_time && ` | ${t('tasks.predictedTime')}: ${task.predicted_time.toFixed(1)}h`}
              </AlertDescription>
            </Box>
            <Button size="sm" colorScheme="blue" onClick={() => predictMutation.mutate()}>
              {t('tasks.recalculate')}
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
                <Heading size="md" mb={4}>{t('tasks.taskDescription')}</Heading>
                <Text color="gray.700" whiteSpace="pre-wrap">
                  {task.description || t('tasks.noDescription')}
                </Text>
              </CardBody>
            </Card>

            {/* Checklist */}
            {task.checklist && task.checklist.length > 0 && (
              <Card>
                <CardBody>
                  <Flex justify="space-between" align="center" mb={4}>
                    <Heading size="md">{t('tasks.checklist')}</Heading>
                    <Button
                      size="xs"
                      leftIcon={<FiPlus />}
                      colorScheme="blue"
                      variant="ghost"
                      onClick={handleAddChecklistItem}
                    >
                      {t('common.add')}
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
                          aria-label={t('common.delete')}
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
                  <Heading size="md">{t('tasks.comment')}</Heading>
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
                <Heading size="md" mb={4}>{t('tasks.details')}</Heading>
                <VStack align="stretch" spacing={3}>
                  <HStack justify="space-between">
                    <Text color="gray.500">{t('tasks.project')}</Text>
                    <Text fontWeight="500">{task.project_name}</Text>
                  </HStack>
                  
                  {task.milestone_name && (
                    <HStack justify="space-between">
                      <Text color="gray.500">{t('tasks.milestoneLabel')}</Text>
                      <Text fontWeight="500">{task.milestone_name}</Text>
                    </HStack>
                  )}
                  
                  <HStack justify="space-between">
                    <Text color="gray.500">{t('common.assignedTo')}</Text>
                    <HStack>
                      {task.assigned_to_name ? (
                        <>
                          <Avatar size="xs" name={task.assigned_to_name} />
                          <Text>{task.assigned_to_name}</Text>
                        </>
                      ) : (
                        <Text color="gray.400">{t('common.notAssigned')}</Text>
                      )}
                    </HStack>
                  </HStack>
                  
                  <HStack justify="space-between">
                    <Text color="gray.500">{t('tasks.dueDate')}</Text>
                    <HStack>
                      <FiCalendar />
                      <Text>
                        {task.deadline 
                          ? format(new Date(task.deadline), 'dd MMMM yyyy', { locale: dateLocale })
                          : t('common.notDefined')
                        }
                      </Text>
                    </HStack>
                  </HStack>
                  
                  <HStack justify="space-between">
                    <Text color="gray.500">{t('tasks.estimatedTime')}</Text>
                    <Text>{task.estimated_time || t('common.notDefined')}h</Text>
                  </HStack>
                  
                  {task.actual_time && (
                    <HStack justify="space-between">
                      <Text color="gray.500">{t('tasks.realTime')}</Text>
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
                    <Heading size="md">{t('tasks.aiPredictions')}</Heading>
                  </HStack>
                  <SimpleGrid columns={2} spacing={4}>
                    {task.predicted_time && (
                      <Box>
                        <Text fontSize="sm" color="gray.600">{t('tasks.predictedTime')}</Text>
                        <Text fontSize="lg" fontWeight="bold">
                          {task.predicted_time.toFixed(1)}h
                        </Text>
                      </Box>
                    )}
                    {task.delay_probability && (
                      <Box>
                        <Text fontSize="sm" color="gray.600">{t('tasks.risk')}</Text>
                        <Text fontSize="lg" fontWeight="bold" color={task.delay_probability > 0.7 ? 'red.500' : 'orange.500'}>
                          {Math.round(task.delay_probability * 100)}%
                        </Text>
                      </Box>
                    )}
                    {task.predicted_priority && (
                      <Box>
                        <Text fontSize="sm" color="gray.600">{t('tasks.suggestedPriority')}</Text>
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
                <Heading size="md" mb={4}>{t('tasks.tags')}</Heading>
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
                    placeholder={t('tasks.newTagPlaceholder')}
                    size="sm"
                    value={newTag}
                    onChange={(e) => setNewTag(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleAddTag()}
                  />
                  <Button size="sm" onClick={handleAddTag} isDisabled={!newTag}>
                    {t('common.add')}
                  </Button>
                </HStack>
              </CardBody>
            </Card>

            {/* Actions rapides */}
            <Card>
              <CardBody>
                <Heading size="md" mb={4}>{t('common.actions')}</Heading>
                <VStack spacing={2}>
                  <Button
                    w="100%"
                    size="sm"
                    colorScheme="blue"
                    variant={task.status === 'in_progress' ? 'solid' : 'outline'}
                    onClick={() => handleStatusChange('in_progress')}
                    isLoading={updateMutation.isLoading}
                  >
                    {task.status === 'in_progress' ? t('tasks.alreadyInProgress') : t('tasks.start')}
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
                    {t('tasks.markCompleted')}
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
                      {t('tasks.reactivate')}
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
            <ModalHeader>{t('tasks.editTask')}</ModalHeader>
            <ModalCloseButton />
            <ModalBody>
              <VStack spacing={4}>
                <FormControl isRequired>
                  <FormLabel>{t('tasks.taskTitle')}</FormLabel>
                  <Input
                    value={editForm.title}
                    onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                  />
                </FormControl>

                <FormControl>
                  <FormLabel>{t('tasks.taskDescription')}</FormLabel>
                  <Textarea
                    value={editForm.description}
                    onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                    rows={3}
                  />
                </FormControl>

                <FormControl>
                  <FormLabel>{t('tasks.project')}</FormLabel>
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
                    <FormLabel>{t('tasks.milestoneLabel')}</FormLabel>
                    <Select
                      value={editForm.milestone}
                      onChange={(e) => setEditForm({ ...editForm, milestone: e.target.value })}
                    >
                      <option value="">{t('tasks.noMilestone')}</option>
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
                    <FormLabel>{t('common.priority')}</FormLabel>
                    <Select
                      value={editForm.priority}
                      onChange={(e) => setEditForm({ ...editForm, priority: parseInt(e.target.value) })}
                    >
                      <option value={1}>{t('common.low')}</option>
                      <option value={2}>{t('common.medium')}</option>
                      <option value={3}>{t('common.high')}</option>
                      <option value={4}>{t('common.critical')}</option>
                    </Select>
                  </FormControl>

                  <FormControl>
                    <FormLabel>{t('common.status')}</FormLabel>
                    <Select
                      value={editForm.status}
                      onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                    >
                      <option value="todo">{t('common.todo')}</option>
                      <option value="in_progress">{t('common.inProgress')}</option>
                      <option value="review">{t('common.review')}</option>
                      <option value="blocked">{t('common.blocked')}</option>
                      <option value="completed">{t('common.completed')}</option>
                    </Select>
                  </FormControl>
                </SimpleGrid>

                <SimpleGrid columns={2} spacing={4}>
                  <FormControl>
                    <FormLabel>{t('tasks.estimatedTime')}</FormLabel>
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
                    <FormLabel>{t('tasks.dueDate')}</FormLabel>
                    <Input
                      type="date"
                      value={editForm.deadline}
                      onChange={(e) => setEditForm({ ...editForm, deadline: e.target.value })}
                    />
                  </FormControl>
                </SimpleGrid>

                <FormControl>
                  <FormLabel>{t('tasks.assignTo')}</FormLabel>
                  <Select
                    value={editForm.assigned_to}
                    onChange={(e) => setEditForm({ ...editForm, assigned_to: e.target.value })}
                  >
                    <option value="">{t('common.notAssigned')}</option>
                    <option value="1">{t('tasks.me')}</option>
                  </Select>
                </FormControl>
              </VStack>
            </ModalBody>

            <ModalFooter>
              <Button variant="ghost" mr={3} onClick={() => setIsEditing(false)}>
                {t('common.cancel')}
              </Button>
              <Button
                type="submit"
                colorScheme="blue"
                isLoading={updateMutation.isLoading}
              >
                {t('tasks.save')}
              </Button>
            </ModalFooter>
          </form>
        </ModalContent>
      </Modal>

      {/* Modal de confirmation de suppression */}
      <Modal isOpen={isDeleteOpen} onClose={onDeleteClose}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>{t('tasks.deleteTask')}</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            {t('tasks.confirmDeleteDesc')}
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={onDeleteClose}>
              {t('common.cancel')}
            </Button>
            <Button
              colorScheme="red"
              onClick={() => {
                deleteMutation.mutate();
                onDeleteClose();
              }}
              isLoading={deleteMutation.isLoading}
            >
              {t('common.delete')}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  );
};

export default TaskDetail;