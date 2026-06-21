import React, { useState } from 'react';
import {
  Box,
  Heading,
  Button,
  VStack,
  HStack,
  Input,
  Select,
  Badge,
  Card,
  CardBody,
  Text,
  SimpleGrid,
  IconButton,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  Avatar,
  useToast,
  Flex,
  Progress,
  Tag,
  TagLabel,
  TagLeftIcon,
  Tooltip,
} from '@chakra-ui/react';
import {
  FiPlus,
  FiFilter,
  FiSearch,
  FiAlertCircle,
  FiClock,
  FiCheckCircle,
  FiMoreVertical,
  FiEye,
  FiEdit2,
  FiTrash2,
} from 'react-icons/fi';
import { useQuery } from 'react-query';
import { useTaskService } from '../services/taskService';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  TASK_STATUS_COLORS,
  TASK_STATUS_LABELS,
  PRIORITY_COLORS,
  PRIORITY_LABELS,
  getPriorityColor,
  getPriorityLabel,
} from '../utils/constants';
import LoadingState from '../components/LoadingState';
import EmptyState from '../components/EmptyState';

const Tasks = () => {
  const [filters, setFilters] = useState({
    status: '',
    priority: '',
    search: '',
  });

  const toast = useToast();
  const navigate = useNavigate();
  const taskService = useTaskService();

  const { data: tasks, isLoading } = useQuery(
    ['tasks', filters],
    () => taskService.getTasks(filters),
    {
      onError: (error) => {
        toast({
          title: 'Erreur',
          description: 'Impossible de charger les tâches',
          status: 'error',
          duration: 3000,
        });
      },
    }
  );

  const getStatusColor = (status) => TASK_STATUS_COLORS[status] || 'gray';
  const getStatusLabel = (status) => TASK_STATUS_LABELS[status] || status;

  const handleTaskClick = (taskId) => {
    navigate(`/tasks/${taskId}`);
  };

  if (isLoading) {
    return <LoadingState message="Chargement des tâches..." />;
  }

  return (
    <Box>
      <VStack spacing={6} align="stretch">
        {/* En-tête */}
        <HStack justify="space-between">
          <Heading size="lg">Tâches</Heading>
          <Button
            leftIcon={<FiPlus />}
            colorScheme="blue"
            as={RouterLink}
            to="/tasks/create"  // ← CORRIGÉ: /create au lieu de /new
          >
            Nouvelle tâche
          </Button>
        </HStack>

        {/* Filtres */}
        <Card>
          <CardBody>
            <VStack spacing={4}>
              <HStack spacing={4} width="100%">
                <Input
                  placeholder="Rechercher une tâche..."
                  value={filters.search}
                  onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                  leftElement={<FiSearch />}
                />
                <Select
                  placeholder="Tous les statuts"
                  value={filters.status}
                  onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                  width="200px"
                >
                  <option value="todo">À faire</option>
                  <option value="in_progress">En cours</option>
                  <option value="review">En révision</option>
                  <option value="blocked">Bloquée</option>
                  <option value="completed">Terminée</option>
                </Select>
                <Select
                  placeholder="Toutes priorités"
                  value={filters.priority}
                  onChange={(e) => setFilters({ ...filters, priority: e.target.value })}
                  width="200px"
                >
                  <option value="1">Basse</option>
                  <option value="2">Moyenne</option>
                  <option value="3">Haute</option>
                  <option value="4">Critique</option>
                </Select>
              </HStack>
            </VStack>
          </CardBody>
        </Card>

        {/* Liste des tâches */}
        {tasks && tasks.length > 0 ? (
          <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={4}>
            {tasks.map((task) => (
              <Card
                key={task.id}
                onClick={() => handleTaskClick(task.id)}
                cursor="pointer"
                _hover={{ shadow: 'md', transform: 'translateY(-2px)' }}
                transition="all 0.2s"
                position="relative"
                borderLeft="4px solid"
                borderLeftColor={
                  task.delay_probability > 0.7 ? 'red.400' :
                  task.priority === 4 ? 'red.500' :
                  task.priority === 3 ? 'orange.500' :
                  task.priority === 2 ? 'blue.500' : 'gray.400'
                }
              >
                <CardBody>
                  <VStack align="stretch" spacing={3}>
                    {/* En-tête de la carte */}
                    <HStack justify="space-between">
                      <HStack spacing={2}>
                        <Badge colorScheme={getPriorityColor(task.priority)}>
                          {getPriorityLabel(task.priority)}
                        </Badge>
                        <Badge colorScheme={getStatusColor(task.status)}>
                          {getStatusLabel(task.status)}
                        </Badge>
                      </HStack>
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
                            onClick={() => navigate(`/tasks/${task.id}`)}
                          >
                            Voir détails
                          </MenuItem>
                          <MenuItem 
                            icon={<FiEdit2 />}
                            onClick={() => navigate(`/tasks/${task.id}/edit`)}
                          >
                            Modifier
                          </MenuItem>
                          <MenuItem icon={<FiTrash2 />} color="red.500">
                            Supprimer
                          </MenuItem>
                        </MenuList>
                      </Menu>
                    </HStack>

                    {/* Titre */}
                    <Text fontWeight="600" noOfLines={2}>
                      {task.title}
                    </Text>

                    {/* Description courte */}
                    {task.description && (
                      <Text fontSize="sm" color="gray.600" noOfLines={2}>
                        {task.description}
                      </Text>
                    )}

                    {/* Tags */}
                    {task.tags && task.tags.length > 0 && (
                      <HStack spacing={1} flexWrap="wrap">
                        {task.tags.slice(0, 3).map((tag, index) => (
                          <Tag key={index} size="sm" colorScheme="blue" variant="subtle">
                            <TagLabel>{tag}</TagLabel>
                          </Tag>
                        ))}
                        {task.tags.length > 3 && (
                          <Tag size="sm">+{task.tags.length - 3}</Tag>
                        )}
                      </HStack>
                    )}

                    {/* Prédictions ML */}
                    {task.delay_probability && task.delay_probability > 0.5 && (
                      <Tooltip label={`Risque de retard: ${Math.round(task.delay_probability * 100)}%`}>
                        <Tag
                          size="sm"
                          colorScheme={task.delay_probability > 0.7 ? 'red' : 'orange'}
                          variant="subtle"
                        >
                          <TagLeftIcon as={FiAlertCircle} />
                          <TagLabel>Risque {Math.round(task.delay_probability * 100)}%</TagLabel>
                        </Tag>
                      </Tooltip>
                    )}

                    {/* Projet */}
                    {task.project_name && (
                      <Badge colorScheme="purple" alignSelf="flex-start">
                        {task.project_name}
                      </Badge>
                    )}

                    {/* Pied de carte */}
                    <HStack justify="space-between" mt={2}>
                      <HStack spacing={3} fontSize="sm" color="gray.500">
                        {task.deadline && (
                          <Tooltip label="Date limite">
                            <HStack spacing={1}>
                              <FiClock size={12} />
                              <Text>
                                {format(new Date(task.deadline), 'dd/MM')}
                              </Text>
                            </HStack>
                          </Tooltip>
                        )}
                        {task.estimated_time && (
                          <Text>{task.estimated_time}h</Text>
                        )}
                      </HStack>

                      {task.assigned_to_name && (
                        <Avatar size="xs" name={task.assigned_to_name} />
                      )}
                    </HStack>

                    {/* Progression si en cours */}
                    {task.status === 'in_progress' && task.checklist && task.checklist.length > 0 && (
                      <Box>
                        <Progress
                          value={(task.checklist.filter(item => item.completed).length / task.checklist.length) * 100}
                          size="xs"
                          colorScheme="blue"
                          borderRadius="full"
                        />
                      </Box>
                    )}
                  </VStack>
                </CardBody>
              </Card>
            ))}
          </SimpleGrid>
        ) : (
          <EmptyState
            message="Aucune tâche trouvée"
            actionLabel="Créer votre première tâche"
            actionTo="/tasks/create"
          />
        )}
      </VStack>
    </Box>
  );
};

export default Tasks;
