import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Heading,
  Flex,
  HStack,
  VStack,
  Text,
  Badge,
  IconButton,
  Button,
  Select,
  Input,
  InputGroup,
  InputLeftElement,
  Tooltip,
  Card,
  CardBody,
  useToast,
} from '@chakra-ui/react';
import {
  FiPlus,
  FiSearch,
  FiCpu,
  FiClock,
  FiX,
  FiUser,
} from 'react-icons/fi';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
  useDroppable,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { useKanbanService } from '../services/kanbanService';
import { useProjectService } from '../services/projectService';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import SortableTaskCard from '../components/SortableTaskCard';
import { getPriorityColor, getPriorityLabel } from '../utils/constants';
import LoadingState from '../components/LoadingState';
import PageGuide from '../components/PageGuide';
import { FiColumns, FiMove, FiFilter } from 'react-icons/fi';
import { useTranslation } from 'react-i18next';

const KANBAN_STEPS = [
  { key: 'overview', icon: FiColumns },
  { key: 'drag', icon: FiMove },
  { key: 'filter', icon: FiFilter },
];

const Kanban = () => {
  const { t } = useTranslation();

  const [columns, setColumns] = useState({
    todo: { id: 'todo', title: t('common.todo'), tasks: [], color: 'gray' },
    in_progress: { id: 'in_progress', title: t('common.inProgress'), tasks: [], color: 'blue' },
    review: { id: 'review', title: t('common.review'), tasks: [], color: 'purple' },
    blocked: { id: 'blocked', title: t('common.blocked'), tasks: [], color: 'red' },
    completed: { id: 'completed', title: t('common.completed'), tasks: [], color: 'green' },
  });

  const [activeId, setActiveId] = useState(null);
  const [overColumnId, setOverColumnId] = useState(null);
  const [filterProject, setFilterProject] = useState('');
  const [filterPriority, setFilterPriority] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [projects, setProjects] = useState([]);

  const toast = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const kanbanService = useKanbanService();
  const projectService = useProjectService();

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
    () => kanbanService.getKanbanTasks(filterProject || null)
  );

  // Charger les projets pour le filtre
  const { data: projectsData } = useQuery(
    'projects',
    () => projectService.getAll()
  );

  useEffect(() => {
    const list = Array.isArray(projectsData) ? projectsData : (projectsData?.results || []);
    if (list.length) setProjects(list);
  }, [projectsData]);

  // Organiser les tâches par colonne selon les filtres actifs
  const organizeTasksByStatus = useCallback((tasksList, priority, search) => {
    if (!Array.isArray(tasksList)) return;

    const filtered = tasksList.filter(task => {
      if (priority && String(task.priority) !== String(priority)) return false;
      if (search) {
        const q = search.toLowerCase();
        const title = task.title || '';
        const description = task.description || '';
        if (!title.toLowerCase().includes(q) && !description.toLowerCase().includes(q)) return false;
      }
      return true;
    });

    setColumns(prev => {
      const next = {};
      Object.keys(prev).forEach(key => {
        next[key] = { ...prev[key], tasks: [] };
      });
      filtered.forEach(task => {
        if (next[task.status]) {
          next[task.status].tasks.push(task);
        }
      });
      Object.keys(next).forEach(key => {
        next[key].tasks.sort((a, b) => (a.order || 0) - (b.order || 0));
      });
      return next;
    });
  }, []);

  // Réorganiser dès que les tâches ou les filtres changent
  useEffect(() => {
    const list = Array.isArray(tasks) ? tasks : (tasks?.results || []);
    organizeTasksByStatus(list, filterPriority, searchTerm);
  }, [tasks, filterPriority, searchTerm, organizeTasksByStatus]);

  // Mutation pour mettre à jour le statut / l'ordre
  const updateStatusMutation = useMutation(
    ({ taskId, newStatus, newOrder }) =>
      kanbanService.updateTaskStatus(taskId, newStatus, newOrder),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('kanbanTasks');
        toast({ title: t('kanban.taskMoved'), status: 'success', duration: 2000 });
      },
      onError: () => {
        queryClient.invalidateQueries('kanbanTasks');
        toast({ title: t('kanban.taskMoveError'), status: 'error', duration: 3000 });
      },
    }
  );

  // Mutation pour supprimer une tâche
  const deleteTaskMutation = useMutation(
    (taskId) => kanbanService.removeTask(taskId),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('kanbanTasks');
        queryClient.invalidateQueries('sidebar-task-count');
        toast({ title: t('common.deleteSuccess'), status: 'success', duration: 2000 });
      },
      onError: () => {
        toast({ title: t('common.deleteError'), status: 'error', duration: 3000 });
      },
    }
  );

  // Trouver la colonne contenant une tâche
  const findColumnOfTask = (taskId, cols) =>
    Object.keys(cols).find(key => cols[key].tasks.some(task => task.id === taskId));

  const handleAddToColumn = (columnId) => {
    const params = new URLSearchParams();
    params.set('status', columnId);
    if (filterProject) params.set('project', filterProject);
    navigate(`/tasks/create?${params.toString()}`);
  };

  // Gestionnaires d'événements pour le drag & drop
  const handleDragStart = (event) => {
    setActiveId(event.active.id);
  };

  const handleDragOver = (event) => {
    const { over } = event;
    if (!over) return;
    const colId = over.id in columns ? over.id : findColumnOfTask(over.id, columns);
    setOverColumnId(colId || null);
  };

  const handleDragEnd = (event) => {
    const { active, over } = event;
    setActiveId(null);
    setOverColumnId(null);

    if (!over) return;

    const activeTaskId = active.id;
    const overId = over.id;

    const sourceColumnId = findColumnOfTask(activeTaskId, columns);
    if (!sourceColumnId) return;

    const targetColumnId = overId in columns ? overId : findColumnOfTask(overId, columns);
    if (!targetColumnId) return;

    const sourceTasks = columns[sourceColumnId].tasks;
    const targetTasks = columns[targetColumnId].tasks;
    const sourceIndex = sourceTasks.findIndex(task => task.id === activeTaskId);
    if (sourceIndex === -1) return;

    let targetIndex;
    if (targetColumnId === sourceColumnId) {
      const overIndex = targetTasks.findIndex(task => task.id === overId);
      if (overIndex === -1) return;
      if (sourceIndex === overIndex) return;
      targetIndex = overIndex;
    } else {
      targetIndex = overId in columns
        ? targetTasks.length
        : targetTasks.findIndex(task => task.id === overId);
      if (targetIndex === -1) targetIndex = targetTasks.length;
    }

    setColumns(prev => {
      const src = [...prev[sourceColumnId].tasks];
      const [movedTask] = src.splice(sourceIndex, 1);
      movedTask.status = targetColumnId;

      const dst = targetColumnId === sourceColumnId
        ? src
        : [...prev[targetColumnId].tasks];

      dst.splice(targetIndex, 0, movedTask);

      return {
        ...prev,
        [sourceColumnId]: { ...prev[sourceColumnId], tasks: src },
        [targetColumnId]: { ...prev[targetColumnId], tasks: dst },
      };
    });

    updateStatusMutation.mutate({
      taskId: activeTaskId,
      newStatus: targetColumnId,
      newOrder: targetIndex,
    });
  };

  const handleDeleteTask = (task) => {
    if (!window.confirm(t('common.confirmDelete'))) return;
    deleteTaskMutation.mutate(task.id);
  };

  const handleClearFilters = () => {
    setFilterProject('');
    setFilterPriority('');
    setSearchTerm('');
  };

  const hasActiveFilters = Boolean(filterProject || filterPriority || searchTerm);
  const totalTaskCount = Object.values(columns).reduce((sum, col) => sum + col.tasks.length, 0);

  if (isLoading) {
    return <LoadingState message={t('kanban.title')} />;
  }

  return (
    <Box height="calc(100vh - 120px)" overflow="hidden">
      <VStack spacing={4} align="stretch" height="100%">
        {/* En-tête */}
        <Flex justify="space-between" align="center" wrap="wrap" gap={3}>
          <HStack spacing={3}>
            <Heading size="lg">{t('kanban.title')}</Heading>
            <Badge colorScheme="gray" variant="outline" fontSize="sm" px={3} py={1} borderRadius="full">
              {totalTaskCount} {t('common.tasks')}
            </Badge>
          </HStack>
          <Button
            leftIcon={<FiPlus />}
            colorScheme="blue"
            size="sm"
            as={RouterLink}
            to="/tasks/create"
          >
            {t('kanban.newTask')}
          </Button>
        </Flex>

        {/* Filtres */}
        <HStack spacing={3} wrap="wrap">
          <InputGroup maxW="300px">
            <InputLeftElement pointerEvents="none">
              <FiSearch color="gray.300" />
            </InputLeftElement>
            <Input
              placeholder={t('kanban.searchPlaceholder')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              size="sm"
              borderRadius="md"
            />
          </InputGroup>

          <Select
            placeholder={t('common.allProjects')}
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
            placeholder={t('common.allPriorities')}
            value={filterPriority}
            onChange={(e) => setFilterPriority(e.target.value)}
            size="sm"
            width="200px"
          >
            {[1, 2, 3, 4].map(p => (
              <option key={p} value={p}>{getPriorityLabel(p)}</option>
            ))}
          </Select>

          {hasActiveFilters && (
            <Button
              leftIcon={<FiX />}
              variant="ghost"
              size="sm"
              onClick={handleClearFilters}
            >
              {t('kanban.clearFilters')}
            </Button>
          )}

          <Badge colorScheme="purple" px={3} py={1} borderRadius="full" ml="auto">
            <HStack spacing={1}>
              <FiCpu />
              <Text>{t('kanban.predictiveMode')}</Text>
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
          onDragCancel={() => {
            setActiveId(null);
            setOverColumnId(null);
          }}
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
              <KanbanColumn
                key={column.id}
                column={column}
                overColumnId={overColumnId}
                onAdd={handleAddToColumn}
              >
                <SortableContext
                  items={column.tasks.map(task => task.id)}
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
                        onDelete={handleDeleteTask}
                      />
                    ))}

                    {column.tasks.length === 0 && (
                      <Box
                        p={4}
                        border="2px dashed"
                        borderColor={overColumnId === column.id ? 'brand.300' : 'gray.200'}
                        borderRadius="lg"
                        textAlign="center"
                        bg={overColumnId === column.id ? 'brand.50' : 'transparent'}
                        transition="all 0.15s ease"
                      >
                        <Text color={overColumnId === column.id ? 'brand.500' : 'gray.400'} fontSize="sm">
                          {overColumnId === column.id ? t('kanban.dropHere') : t('kanban.noTasks')}
                        </Text>
                      </Box>
                    )}
                  </VStack>
                </SortableContext>
              </KanbanColumn>
            ))}
          </Flex>

          <DragOverlay>
            {activeId ? (
              <TaskCardOverlay
                task={Object.values(columns)
                  .flatMap(col => col.tasks)
                  .find(task => task.id === activeId)}
              />
            ) : null}
          </DragOverlay>
        </DndContext>
      </VStack>
      <PageGuide
        guideId="kanban"
        i18nPrefix="pageGuides.kanban"
        steps={KANBAN_STEPS}
      />
    </Box>
  );
};

// Colonne du tableau : zone de dépôt (droppable) pour les tâches
const KanbanColumn = ({ column, overColumnId, onAdd, children }) => {
  const { t } = useTranslation();
  const { setNodeRef, isOver } = useDroppable({ id: column.id });
  const effectiveIsOver = isOver || overColumnId === column.id;
  const totalEstimate = (column.tasks || []).reduce(
    (sum, task) => sum + (Number(task.estimated_time) || 0),
    0
  );

  return (
    <Box
      ref={setNodeRef}
      flex="1"
      minWidth="280px"
      maxWidth="320px"
      bg="gray.50"
      borderRadius="lg"
      borderWidth="2px"
      borderColor={effectiveIsOver ? 'brand.400' : 'transparent'}
      borderTopWidth="3px"
      borderTopColor={`${column.color}.400`}
      boxShadow={effectiveIsOver ? '0 0 0 3px rgba(59, 91, 219, 0.15)' : 'none'}
      p={3}
      height="100%"
      display="flex"
      flexDirection="column"
      transition="box-shadow 0.15s ease"
    >
      {/* En-tête de colonne */}
      <Flex justify="space-between" align="center" mb={3}>
        <HStack spacing={2}>
          <Badge
            colorScheme={column.color}
            px={2}
            py={1}
            borderRadius="full"
            fontSize="xs"
          >
            <HStack spacing={1}>
              <Text fontWeight="bold">{column.title}</Text>
              <Text>({column.tasks.length})</Text>
            </HStack>
          </Badge>
          {totalEstimate > 0 && (
            <Tooltip label={t('kanban.totalEstimate')}>
              <HStack spacing={1} color="gray.500" fontSize="xs">
                <FiClock size={12} />
                <Text>{totalEstimate}h</Text>
              </HStack>
            </Tooltip>
          )}
        </HStack>
        <Tooltip label={t('kanban.addToColumn')}>
          <IconButton
            icon={<FiPlus />}
            size="xs"
            variant="ghost"
            aria-label={t('kanban.addToColumn')}
            onClick={() => onAdd(column.id)}
          />
        </Tooltip>
      </Flex>

      {children}
    </Box>
  );
};

// Composant pour l'overlay de drag
const TaskCardOverlay = ({ task }) => {
  const { t } = useTranslation();
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
            <Badge colorScheme={getPriorityColor(task.priority)}>
              {getPriorityLabel(task.priority)}
            </Badge>
            {task.assigned_to_name && (
              <HStack spacing={1} fontSize="xs" color="gray.500">
                <FiUser />
                <Text>{task.assigned_to_name}</Text>
              </HStack>
            )}
          </HStack>
        </VStack>
      </CardBody>
    </Card>
  );
};

export default Kanban;
