import React, { useState, useEffect } from 'react';
import {
  Box,
  Heading,
  Flex,
  HStack,
  VStack,
  Text,
  Badge,
  Avatar,
  AvatarGroup,
  IconButton,
  Button,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  Select,
  Input,
  InputGroup,
  InputLeftElement,
  Tag,
  TagLabel,
  TagLeftIcon,
  Tooltip,
  Card,
  CardBody,
  useToast,
  Spinner,
  Divider,
  Portal,
} from '@chakra-ui/react';
import {
  FiPlus,
  FiMoreVertical,
  FiClock,
  FiMessageSquare,
  FiFlag,
  FiUser,
  FiCalendar,
  FiFilter,
  FiSearch,
  FiCpu,
  FiAlertCircle,
  FiCheckCircle,
} from 'react-icons/fi';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
  defaultDropAnimation,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import {
  restrictToVerticalAxis,
  restrictToParentElement,
} from '@dnd-kit/modifiers';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { useKanbanService } from '../services/kanbanService';
import { useProjectService } from '../services/projectService';
import { useAuth } from '../context/AuthContext';
import { Link as RouterLink } from 'react-router-dom';
import { format, isAfter, isBefore } from 'date-fns';
import { fr } from 'date-fns/locale';
import SortableTaskCard from '../components/SortableTaskCard';
import { getPriorityColor, getPriorityLabel } from '../utils/constants';
import LoadingState from '../components/LoadingState';

const Kanban = () => {
  const [columns, setColumns] = useState({
    todo: { id: 'todo', title: 'À faire', tasks: [], color: 'gray' },
    in_progress: { id: 'in_progress', title: 'En cours', tasks: [], color: 'blue' },
    review: { id: 'review', title: 'En révision', tasks: [], color: 'purple' },
    blocked: { id: 'blocked', title: 'Bloquées', tasks: [], color: 'red' },
    completed: { id: 'completed', title: 'Terminées', tasks: [], color: 'green' },
  });

  const [activeId, setActiveId] = useState(null);
  const [filterProject, setFilterProject] = useState('');
  const [filterPriority, setFilterPriority] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [projects, setProjects] = useState([]);

  const toast = useToast();
  const queryClient = useQueryClient();
  const kanbanService = useKanbanService();
  const projectService = useProjectService();
  const { user } = useAuth();

  // Configuration des capteurs pour le drag & drop
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Charger les tâches
  const { data: tasks, isLoading } = useQuery(
    ['kanbanTasks', filterProject],
    () => kanbanService.getKanbanTasks(filterProject || null),
    {
      onSuccess: (data) => {
        organizeTasksByStatus(data);
      },
    }
  );

  // Charger les projets pour le filtre
  const { data: projectsData } = useQuery(
    'projects',
    () => projectService.getAll(),
    {
      onError: () => {
        // Données mockées
        setProjects([
          { id: 1, name: 'Frontend' },
          { id: 2, name: 'Backend' },
          { id: 3, name: 'ML Service' },
        ]);
      }
    }
  );

  useEffect(() => {
    if (projectsData) {
      setProjects(projectsData);
    }
  }, [projectsData]);

  // Mutation pour mettre à jour le statut
  const updateStatusMutation = useMutation(
    ({ taskId, newStatus, newOrder }) => 
      kanbanService.updateTaskStatus(taskId, newStatus, newOrder),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('kanbanTasks');
      },
    }
  );

  // Organiser les tâches par colonne
  const organizeTasksByStatus = (tasksList) => {
    const filteredTasks = tasksList.filter(task => {
      // Filtre par priorité
      if (filterPriority && task.priority.toString() !== filterPriority) {
        return false;
      }
      // Filtre par recherche
      if (searchTerm && !task.title.toLowerCase().includes(searchTerm.toLowerCase()) &&
          !task.description?.toLowerCase().includes(searchTerm.toLowerCase())) {
        return false;
      }
      return true;
    });

    const newColumns = { ...columns };
    Object.keys(newColumns).forEach(key => {
      newColumns[key].tasks = [];
    });

    filteredTasks.forEach(task => {
      if (newColumns[task.status]) {
        newColumns[task.status].tasks.push(task);
      }
    });

    // Trier par ordre
    Object.keys(newColumns).forEach(key => {
      newColumns[key].tasks.sort((a, b) => (a.order || 0) - (b.order || 0));
    });

    setColumns(newColumns);
  };

  // Gestionnaires d'événements pour le drag & drop
  const handleDragStart = (event) => {
    setActiveId(event.active.id);
  };

  const handleDragOver = (event) => {
    const { active, over } = event;
    if (!over) return;

    const activeId = active.id;
    const overId = over.id;

    // Vérifier si on survole une colonne
    if (overId in columns) {
      // Changement de colonne
      const activeColumn = Object.keys(columns).find(key =>
        columns[key].tasks.some(task => task.id === activeId)
      );
      
      if (activeColumn && activeColumn !== overId) {
        setColumns(prev => {
          const activeTasks = [...prev[activeColumn].tasks];
          const overTasks = [...prev[overId].tasks];
          
          const activeIndex = activeTasks.findIndex(t => t.id === activeId);
          const [movedTask] = activeTasks.splice(activeIndex, 1);
          
          movedTask.status = overId;
          overTasks.splice(0, 0, movedTask);
          
          return {
            ...prev,
            [activeColumn]: { ...prev[activeColumn], tasks: activeTasks },
            [overId]: { ...prev[overId], tasks: overTasks },
          };
        });
      }
    }
  };

  const handleDragEnd = (event) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over) return;

    const activeId = active.id;
    const overId = over.id;

    // Déplacement dans la même colonne
    if (overId in columns) {
      const columnId = overId;
      const columnTasks = [...columns[columnId].tasks];
      const oldIndex = columnTasks.findIndex(t => t.id === activeId);
      const newIndex = columnTasks.findIndex(t => t.id === overId);

      if (oldIndex !== newIndex) {
        const newTasks = arrayMove(columnTasks, oldIndex, newIndex);
        setColumns(prev => ({
          ...prev,
          [columnId]: { ...prev[columnId], tasks: newTasks },
        }));

        // Mettre à jour l'ordre dans le backend
        const movedTask = newTasks[newIndex];
        updateStatusMutation.mutate({
          taskId: movedTask.id,
          newStatus: columnId,
          newOrder: newIndex,
        });
      }
    } 
    // Déplacement vers une colonne
    else if (overId && overId in columns) {
      const overColumnId = overId;
      const activeColumnId = Object.keys(columns).find(key =>
        columns[key].tasks.some(task => task.id === activeId)
      );

      if (activeColumnId && activeColumnId !== overColumnId) {
        setColumns(prev => {
          const activeTasks = [...prev[activeColumnId].tasks];
          const overTasks = [...prev[overColumnId].tasks];
          
          const activeIndex = activeTasks.findIndex(t => t.id === activeId);
          const [movedTask] = activeTasks.splice(activeIndex, 1);
          
          movedTask.status = overColumnId;
          overTasks.splice(0, 0, movedTask);
          
          return {
            ...prev,
            [activeColumnId]: { ...prev[activeColumnId], tasks: activeTasks },
            [overColumnId]: { ...prev[overColumnId], tasks: overTasks },
          };
        });

        // Mettre à jour dans le backend
        updateStatusMutation.mutate({
          taskId: activeId,
          newStatus: overColumnId,
          newOrder: 0,
        });
      }
    }
  };



  if (isLoading) {
    return <LoadingState message="Chargement du tableau Kanban..." />;
  }

  return (
    <Box height="calc(100vh - 120px)" overflow="hidden">
      <VStack spacing={4} align="stretch" height="100%">
        {/* En-tête */}
        <Flex justify="space-between" align="center">
          <Heading size="lg">Tableau Kanban</Heading>
          <HStack spacing={3}>
            <Button
              leftIcon={<FiPlus />}
              colorScheme="blue"
              size="sm"
              as={RouterLink}
              to="/tasks/new"
            >
              Nouvelle tâche
            </Button>
          </HStack>
        </Flex>

        {/* Filtres */}
        <HStack spacing={4} wrap="wrap">
          <InputGroup maxW="300px">
            <InputLeftElement pointerEvents="none">
              <FiSearch color="gray.300" />
            </InputLeftElement>
            <Input
              placeholder="Rechercher une tâche..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                if (tasks) organizeTasksByStatus(tasks);
              }}
              size="sm"
              borderRadius="md"
            />
          </InputGroup>

          <Select
            placeholder="Tous les projets"
            value={filterProject}
            onChange={(e) => setFilterProject(e.target.value)}
            size="sm"
            width="200px"
          >
            {projects.map(project => (
              <option key={project.id} value={project.id}>{project.name}</option>
            ))}
          </Select>

          <Select
            placeholder="Toutes priorités"
            value={filterPriority}
            onChange={(e) => {
              setFilterPriority(e.target.value);
              if (tasks) organizeTasksByStatus(tasks);
            }}
            size="sm"
            width="200px"
          >
            <option value="1">Basse</option>
            <option value="2">Moyenne</option>
            <option value="3">Haute</option>
            <option value="4">Critique</option>
          </Select>

          <Badge colorScheme="purple" px={3} py={1} borderRadius="full">
            <HStack spacing={1}>
              <FiCpu />
              <Text>Mode prédictif actif</Text>
            </HStack>
          </Badge>
        </HStack>

        {/* Kanban Board */}
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
          modifiers={[restrictToVerticalAxis]}
        >
          <Flex
            gap={4}
            height="100%"
            overflowX="auto"
            pb={4}
            css={{
              '&::-webkit-scrollbar': {
                height: '8px',
              },
              '&::-webkit-scrollbar-track': {
                background: '#f1f1f1',
                borderRadius: '10px',
              },
              '&::-webkit-scrollbar-thumb': {
                background: '#cbd5e0',
                borderRadius: '10px',
              },
            }}
          >
            {Object.values(columns).map((column) => (
              <Box
                key={column.id}
                flex="1"
                minWidth="280px"
                maxWidth="320px"
                bg="gray.50"
                borderRadius="lg"
                p={3}
                height="100%"
                display="flex"
                flexDirection="column"
              >
                {/* En-tête de colonne */}
                <Flex justify="space-between" align="center" mb={3}>
                  <HStack>
                    <Badge
                      colorScheme={column.color}
                      px={2}
                      py={1}
                      borderRadius="full"
                    >
                      <HStack spacing={1}>
                        <Text fontWeight="bold">{column.title}</Text>
                        <Text>({column.tasks.length})</Text>
                      </HStack>
                    </Badge>
                  </HStack>
                  <IconButton
                    icon={<FiPlus />}
                    size="xs"
                    variant="ghost"
                    aria-label="Ajouter"
                  />
                </Flex>

                {/* Liste des tâches */}
                <SortableContext
                  items={column.tasks.map(t => t.id)}
                  strategy={verticalListSortingStrategy}
                >
                  <VStack
                    spacing={2}
                    align="stretch"
                    flex={1}
                    overflowY="auto"
                    pr={1}
                    css={{
                      '&::-webkit-scrollbar': {
                        width: '4px',
                      },
                      '&::-webkit-scrollbar-track': {
                        background: '#f1f1f1',
                        borderRadius: '10px',
                      },
                      '&::-webkit-scrollbar-thumb': {
                        background: '#cbd5e0',
                        borderRadius: '10px',
                      },
                    }}
                  >
                    {column.tasks.map((task) => (
                      <SortableTaskCard
                        key={task.id}
                        task={task}
                        columnId={column.id}
                      />
                    ))}

                    {column.tasks.length === 0 && (
                      <Box
                        p={4}
                        border="2px dashed"
                        borderColor="gray.200"
                        borderRadius="lg"
                        textAlign="center"
                      >
                        <Text color="gray.400" fontSize="sm">
                          Aucune tâche
                        </Text>
                      </Box>
                    )}
                  </VStack>
                </SortableContext>
              </Box>
            ))}
          </Flex>

          <DragOverlay>
            {activeId ? (
              <TaskCardOverlay
                task={Object.values(columns)
                  .flatMap(col => col.tasks)
                  .find(t => t.id === activeId)}
              />
            ) : null}
          </DragOverlay>
        </DndContext>
      </VStack>
    </Box>
  );
};

// Composant pour l'overlay de drag
const TaskCardOverlay = ({ task }) => {
  if (!task) return null;

  return (
    <Card
      width="280px"
      boxShadow="xl"
      border="2px solid"
      borderColor="blue.400"
      opacity={0.9}
    >
      <CardBody p={3}>
        <VStack align="stretch" spacing={2}>
          <Text fontWeight="600" fontSize="sm">
            {task.title}
          </Text>
          <HStack justify="space-between">
            <Badge colorScheme={
              task.priority === 4 ? 'red' :
              task.priority === 3 ? 'orange' :
              task.priority === 2 ? 'blue' : 'gray'
            }>
              Priorité {task.priority}
            </Badge>
            {task.assigned_to_name && (
              <Avatar size="xs" name={task.assigned_to_name} />
            )}
          </HStack>
        </VStack>
      </CardBody>
    </Card>
  );
};

export default Kanban;
