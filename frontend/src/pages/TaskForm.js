import React, { useState, useEffect } from 'react';
import {
  Box,
  Heading,
  Button,
  VStack,
  FormControl,
  FormLabel,
  Input,
  Textarea,
  Select,
  useToast,
  Card,
  CardBody,
  HStack,
  NumberInput,
  NumberInputField,
  NumberInputStepper,
  NumberIncrementStepper,
  NumberDecrementStepper,
  Tag,
  TagLabel,
  TagCloseButton,
  Wrap,
  WrapItem,
  FormErrorMessage,
} from '@chakra-ui/react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { useTaskService } from '../services/taskService';
import { useProjectService } from '../services/projectService';
import { useMilestoneService } from '../services/milestoneService';

const TaskForm = () => {
  const [searchParams] = useSearchParams();
  const { id } = useParams(); // Pour l'édition
  const projectIdFromUrl = searchParams.get('project');
  
  const navigate = useNavigate();
  const toast = useToast();
  const queryClient = useQueryClient();
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    priority: 2,
    status: 'todo',
    deadline: '',
    estimated_time: '',
    project: projectIdFromUrl || '',
    milestone: '',
    assigned_to: '',
    tags: [],
    checklist: [],
  });
  
  const [tagInput, setTagInput] = useState('');
  const [errors, setErrors] = useState({});

  const taskService = useTaskService();
  const projectService = useProjectService();
  const milestoneService = useMilestoneService();

  // Charger les projets
  const { data: projects } = useQuery('projects', () => projectService.getProjects());

  // Charger les milestones du projet sélectionné
  const { data: milestones } = useQuery(
    ['milestones', formData.project],
    () => milestoneService.getMilestones({ project: formData.project }),
    { enabled: !!formData.project }
  );

  // Charger la tâche si on est en mode édition
  const { data: task, isLoading: taskLoading } = useQuery(
    ['task', id],
    () => taskService.getTask(id),
    { 
      enabled: !!id,
      onSuccess: (data) => {
        if (data) {
          setFormData({
            title: data.title || '',
            description: data.description || '',
            priority: data.priority || 2,
            status: data.status || 'todo',
            deadline: data.deadline || '',
            estimated_time: data.estimated_time || '',
            project: data.project || '',
            milestone: data.milestone || '',
            assigned_to: data.assigned_to || '',
            tags: data.tags || [],
            checklist: data.checklist || [],
          });
        }
      }
    }
  );

  // Mutation pour créer une tâche
  const createMutation = useMutation(
    (data) => taskService.createTask(data),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('tasks');
        toast({
          title: 'Succès',
          description: 'Tâche créée avec succès',
          status: 'success',
          duration: 3000,
        });
        navigate('/tasks');
      },
      onError: (error) => {
        const errorData = error.response?.data;
        if (errorData) {
          setErrors(errorData);
        }
        toast({
          title: 'Erreur',
          description: errorData?.message || 'Erreur lors de la création',
          status: 'error',
          duration: 3000,
        });
      },
    }
  );

  // Mutation pour mettre à jour une tâche
  const updateMutation = useMutation(
    ({ id, data }) => taskService.updateTask(id, data),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('tasks');
        queryClient.invalidateQueries(['task', id]);
        toast({
          title: 'Succès',
          description: 'Tâche mise à jour avec succès',
          status: 'success',
          duration: 3000,
        });
        navigate('/tasks');
      },
      onError: (error) => {
        const errorData = error.response?.data;
        if (errorData) {
          setErrors(errorData);
        }
        toast({
          title: 'Erreur',
          description: errorData?.message || 'Erreur lors de la mise à jour',
          status: 'error',
          duration: 3000,
        });
      },
    }
  );

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Validation de base
    if (!formData.title) {
      setErrors({ title: ['Le titre est requis'] });
      return;
    }
    
    if (!formData.project) {
      setErrors({ project: ['Le projet est requis'] });
      return;
    }
    
    // Formatage des données pour l'API
    const taskData = {
      ...formData,
      estimated_time: formData.estimated_time ? parseFloat(formData.estimated_time) : null,
      deadline: formData.deadline || null,
      milestone: formData.milestone || null,
      assigned_to: formData.assigned_to || null,
    };
    
    if (id) {
      // Mode édition
      updateMutation.mutate({ id, data: taskData });
    } else {
      // Mode création
      createMutation.mutate(taskData);
    }
  };

  const handleAddTag = () => {
    if (tagInput && !formData.tags.includes(tagInput)) {
      setFormData({
        ...formData,
        tags: [...formData.tags, tagInput],
      });
      setTagInput('');
    }
  };

  const handleRemoveTag = (tagToRemove) => {
    setFormData({
      ...formData,
      tags: formData.tags.filter(tag => tag !== tagToRemove),
    });
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddTag();
    }
  };

  if (id && taskLoading) {
    return (
      <Box textAlign="center" py={10}>
        <Spinner size="xl" color="blue.500" />
        <Text mt={4}>Chargement de la tâche...</Text>
      </Box>
    );
  }

  return (
    <Box>
      <Heading size="lg" mb={6}>
        {id ? 'Modifier la tâche' : projectIdFromUrl ? 'Nouvelle tâche dans le projet' : 'Nouvelle tâche'}
      </Heading>

      <Card>
        <CardBody>
          <form onSubmit={handleSubmit}>
            <VStack spacing={4} align="stretch">
              <FormControl isRequired isInvalid={!!errors.title}>
                <FormLabel>Titre</FormLabel>
                <Input
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Titre de la tâche"
                />
                <FormErrorMessage>{errors.title?.[0]}</FormErrorMessage>
              </FormControl>

              <FormControl>
                <FormLabel>Description</FormLabel>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Description détaillée..."
                  rows={4}
                />
              </FormControl>

              <FormControl isRequired isInvalid={!!errors.project}>
                <FormLabel>Projet</FormLabel>
                <Select
                  value={formData.project}
                  onChange={(e) => setFormData({ 
                    ...formData, 
                    project: e.target.value,
                    milestone: '' // Reset milestone when project changes
                  })}
                  isDisabled={!!projectIdFromUrl}
                >
                  <option value="">Sélectionner un projet</option>
                  {projects?.map(project => (
                    <option key={project.id} value={project.id}>
                      {project.name}
                    </option>
                  ))}
                </Select>
                <FormErrorMessage>{errors.project?.[0]}</FormErrorMessage>
              </FormControl>

              {formData.project && (
                <FormControl>
                  <FormLabel>Jalon (optionnel)</FormLabel>
                  <Select
                    value={formData.milestone}
                    onChange={(e) => setFormData({ ...formData, milestone: e.target.value })}
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

              <HStack spacing={4}>
                <FormControl>
                  <FormLabel>Statut</FormLabel>
                  <Select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  >
                    <option value="todo">À faire</option>
                    <option value="in_progress">En cours</option>
                    <option value="review">En révision</option>
                    <option value="blocked">Bloquée</option>
                    <option value="completed">Terminée</option>
                  </Select>
                </FormControl>

                <FormControl>
                  <FormLabel>Priorité</FormLabel>
                  <Select
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: parseInt(e.target.value) })}
                  >
                    <option value={1}>Basse</option>
                    <option value={2}>Moyenne</option>
                    <option value={3}>Haute</option>
                    <option value={4}>Critique</option>
                  </Select>
                </FormControl>
              </HStack>

              <HStack spacing={4}>
                <FormControl>
                  <FormLabel>Temps estimé (heures)</FormLabel>
                  <NumberInput
                    value={formData.estimated_time}
                    onChange={(value) => setFormData({ ...formData, estimated_time: value })}
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
                    value={formData.deadline}
                    onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
                  />
                </FormControl>
              </HStack>

              <FormControl>
                <FormLabel>Assigné à</FormLabel>
                <Select
                  value={formData.assigned_to}
                  onChange={(e) => setFormData({ ...formData, assigned_to: e.target.value })}
                >
                  <option value="">Non assigné</option>
                  <option value="1">Moi</option>
                </Select>
              </FormControl>

              <FormControl>
                <FormLabel>Tags</FormLabel>
                <HStack>
                  <Input
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    placeholder="Ajouter un tag"
                    onKeyPress={handleKeyPress}
                  />
                  <Button onClick={handleAddTag} size="sm">Ajouter</Button>
                </HStack>
                <Wrap mt={2}>
                  {formData.tags.map(tag => (
                    <WrapItem key={tag}>
                      <Tag size="md" borderRadius="full" variant="solid" colorScheme="blue">
                        <TagLabel>{tag}</TagLabel>
                        <TagCloseButton onClick={() => handleRemoveTag(tag)} />
                      </Tag>
                    </WrapItem>
                  ))}
                </Wrap>
              </FormControl>

              <HStack spacing={4} justify="flex-end" mt={4}>
                <Button variant="ghost" onClick={() => navigate('/tasks')}>
                  Annuler
                </Button>
                <Button
                  type="submit"
                  colorScheme="blue"
                  isLoading={createMutation.isLoading || updateMutation.isLoading}
                >
                  {id ? 'Mettre à jour' : 'Créer la tâche'}
                </Button>
              </HStack>
            </VStack>
          </form>
        </CardBody>
      </Card>
    </Box>
  );
};

export default TaskForm;
