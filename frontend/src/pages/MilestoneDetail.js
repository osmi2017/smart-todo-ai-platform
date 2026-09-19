import React, { useState } from 'react';
import {
  Box,
  Heading,
  Button,
  VStack,
  HStack,
  SimpleGrid,
  Card,
  CardBody,
  CardHeader,
  Text,
  Badge,
  Progress,
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
  useToast,
  Flex,
  Stat,
  StatLabel,
  StatNumber,
  Tooltip,
  Tag,
  TagLabel,
  TagLeftIcon,
  Alert,
  AlertIcon,
  AlertDialog,
  AlertDialogBody,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogContent,
  AlertDialogOverlay,
  Slider,
  SliderTrack,
  SliderFilledTrack,
  SliderThumb,
  SliderMark,
  Divider,
  Avatar,
  Spinner,
} from '@chakra-ui/react';
import {
  FiArrowLeft,
  FiCalendar,
  FiClock,
  FiAlertCircle,
  FiCheckCircle,
  FiTrendingUp,
  FiTrendingDown,
  FiEdit2,
  FiTrash2,
  FiCpu,
  FiPlus,
  FiFlag,
} from 'react-icons/fi';
import { useParams, useNavigate, Link as RouterLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { useMilestoneService } from '../services/milestoneService';
import { useTaskService } from '../services/taskService';
import { useProjectService } from '../services/projectService';
import { format, formatDistance } from 'date-fns';
import { fr as frLocale, enUS } from 'date-fns/locale';
import {
  MILESTONE_STATUS_COLORS,
  getMilestoneStatusLabel,
  getPriorityColor,
  getPriorityLabel,
  getTaskStatusLabel,
  TASK_STATUS_COLORS,
} from '../utils/constants';
import LoadingState from '../components/LoadingState';

const MilestoneDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const toast = useToast();
  const queryClient = useQueryClient();
  const milestoneService = useMilestoneService();
  const taskService = useTaskService();
  const projectService = useProjectService();

  const { isOpen, onOpen, onClose } = useDisclosure();
  const {
    isOpen: isDeleteOpen,
    onOpen: onDeleteOpen,
    onClose: onDeleteClose,
  } = useDisclosure();

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    due_date: '',
    project_id: '',
    status: 'not_started',
    progress: 0,
  });

  const [progressValue, setProgressValue] = useState(0);

  const { data: milestone, isLoading } = useQuery(
    ['milestone', id],
    () => milestoneService.getMilestone(id),
    {
      onError: () => {
        toast({
          title: t('common.error'),
          description: t('milestones.loadErrorDesc'),
          status: 'error',
          duration: 3000,
        });
      },
      onSuccess: (data) => {
        if (data) {
          setProgressValue(Math.round(data.progress || 0));
          setFormData({
            name: data.name,
            description: data.description || '',
            due_date: data.due_date,
            project_id: data.project,
            status: data.status || 'not_started',
            progress: data.progress || 0,
          });
        }
      },
    }
  );

  const { data: tasks, isLoading: tasksLoading } = useQuery(
    ['milestone-tasks', id],
    () => taskService.getTasks({ milestone: id }),
    { enabled: !!id }
  );

  const { data: projects } = useQuery(
    'projects',
    () => projectService.getProjects(),
    { onError: () => {} }
  );

  const updateMutation = useMutation(
    ({ id: mid, data }) => milestoneService.updateMilestone(mid, data),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['milestone', id]);
        toast({
          title: t('common.success'),
          description: t('milestones.updatedSuccess'),
          status: 'success',
          duration: 3000,
        });
        onClose();
      },
      onError: (error) => {
        toast({
          title: t('common.error'),
          description: error.response?.data?.message || t('common.updateError'),
          status: 'error',
          duration: 3000,
        });
      },
    }
  );

  const statusMutation = useMutation(
    ({ mid, status }) => milestoneService.patchMilestone(mid, { status }),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['milestone', id]);
      },
      onError: () => {
        toast({
          title: t('common.error'),
          description: t('milestones.updateStatusError'),
          status: 'error',
          duration: 3000,
        });
      },
    }
  );

  const progressMutation = useMutation(
    ({ mid, progress }) => milestoneService.patchMilestone(mid, { progress }),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['milestone', id]);
      },
      onError: () => {
        toast({
          title: t('common.error'),
          description: t('milestones.updateProgressError'),
          status: 'error',
          duration: 3000,
        });
      },
    }
  );

  const deleteMutation = useMutation(
    (mid) => milestoneService.deleteMilestone(mid),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('milestones');
        toast({
          title: t('common.success'),
          description: t('milestones.deletedSuccess'),
          status: 'success',
          duration: 3000,
        });
        navigate('/milestones');
      },
      onError: () => {
        toast({
          title: t('common.error'),
          description: t('milestones.deleteErrorDesc'),
          status: 'error',
          duration: 3000,
        });
      },
    }
  );

  const predictMutation = useMutation(
    (mid) => milestoneService.predictRisk(mid),
    {
      onSuccess: (data) => {
        queryClient.invalidateQueries(['milestone', id]);
        toast({
          title: t('milestones.aiAnalysis'),
          description: t('milestones.riskCalculated', { risk: data.risk_score }),
          status: 'info',
          duration: 3000,
        });
      },
      onError: () => {
        toast({
          title: t('common.error'),
          description: t('milestones.aiAnalysisError'),
          status: 'error',
          duration: 3000,
        });
      },
    }
  );

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.project_id) {
      toast({
        title: t('common.error'),
        description: t('milestones.selectProjectError'),
        status: 'error',
        duration: 3000,
      });
      return;
    }
    updateMutation.mutate({
      id,
      data: {
        name: formData.name,
        description: formData.description,
        due_date: formData.due_date,
        project: parseInt(formData.project_id, 10),
        status: formData.status,
        progress: parseFloat(formData.progress) || 0,
      },
    });
  };

  if (isLoading) {
    return <LoadingState message={t('milestones.loadingDetail')} />;
  }

  if (!milestone) {
    return (
      <Box textAlign="center" py={16}>
        <Text color="gray.500">{t('milestones.notFound')}</Text>
        <Button mt={4} leftIcon={<FiArrowLeft />} onClick={() => navigate('/milestones')}>
          {t('milestones.backToMilestones')}
        </Button>
      </Box>
    );
  }

  const getRiskColor = (risk) => {
    if (risk >= 75) return 'red';
    if (risk >= 50) return 'orange';
    if (risk >= 25) return 'yellow';
    return 'green';
  };

  const getRiskIcon = (risk) => {
    if (risk >= 75) return FiAlertCircle;
    if (risk >= 50) return FiTrendingUp;
    if (risk >= 25) return FiTrendingDown;
    return FiCheckCircle;
  };

  const overdue = milestone.status !== 'completed' && milestone.status !== 'cancelled' &&
    milestone.due_date && new Date(milestone.due_date) < new Date();

  return (
    <Box>
      <VStack spacing={6} align="stretch">
        {/* En-tête */}
        <Flex justify="space-between" align="center" wrap="wrap" gap={3}>
          <HStack spacing={3}>
            <IconButton
              icon={<FiArrowLeft />}
              variant="ghost"
              aria-label={t('common.back')}
              onClick={() => navigate('/milestones')}
            />
            <Box>
              <Heading size="lg">{milestone.name}</Heading>
              <HStack spacing={2} mt={1}>
                <Select
                  size="sm"
                  variant="filled"
                  width="auto"
                  value={milestone.status}
                  colorScheme={MILESTONE_STATUS_COLORS[milestone.status] || 'gray'}
                  onChange={(e) => statusMutation.mutate({ mid: milestone.id, status: e.target.value })}
                >
                  <option value="not_started">{t('common.notStarted')}</option>
                  <option value="in_progress">{t('common.inProgress')}</option>
                  <option value="completed">{t('common.completed')}</option>
                  <option value="delayed">{t('common.delayed')}</option>
                  <option value="cancelled">{t('common.cancelled')}</option>
                </Select>
                <Badge colorScheme="purple">
                  {milestone.project_name || t('milestones.noProject')}
                </Badge>
              </HStack>
            </Box>
          </HStack>

          <HStack spacing={2}>
            <Button
              size="sm"
              leftIcon={<FiCpu />}
              onClick={() => predictMutation.mutate(milestone.id)}
              isLoading={predictMutation.isLoading}
            >
              {t('milestones.analyzeRisk')}
            </Button>
            <Button
              size="sm"
              leftIcon={<FiEdit2 />}
              colorScheme="blue"
              onClick={onOpen}
            >
              {t('common.edit')}
            </Button>
            <Button
              size="sm"
              leftIcon={<FiTrash2 />}
              colorScheme="red"
              variant="outline"
              onClick={onDeleteOpen}
            >
              {t('common.delete')}
            </Button>
          </HStack>
        </Flex>

        {/* Statistiques */}
        <SimpleGrid columns={{ base: 2, md: 4 }} spacing={4}>
          <Card>
            <CardBody>
              <Stat>
                <StatLabel>{t('common.progress')}</StatLabel>
                <StatNumber color="blue.500">{milestone.progress}%</StatNumber>
              </Stat>
            </CardBody>
          </Card>
          <Card>
            <CardBody>
              <Stat>
                <StatLabel>{t('milestones.tasksCount')}</StatLabel>
                <StatNumber color="green.500">
                  {milestone.completed_task_count}/{milestone.task_count}
                </StatNumber>
              </Stat>
            </CardBody>
          </Card>
          <Card>
            <CardBody>
              <Stat>
                <StatLabel>{t('milestones.dueDate')}</StatLabel>
                <StatNumber fontSize="md" color={overdue ? 'red.500' : undefined}>
                  {milestone.due_date ? format(new Date(milestone.due_date), 'dd/MM/yyyy') : '—'}
                </StatNumber>
              </Stat>
            </CardBody>
          </Card>
          <Card>
            <CardBody>
              <Stat>
                <StatLabel>{t('milestones.riskStat')}</StatLabel>
                <StatNumber color={getRiskColor(milestone.risk_score) + '.500'}>
                  {milestone.risk_score > 0 ? `${milestone.risk_score}%` : '—'}
                </StatNumber>
              </Stat>
            </CardBody>
          </Card>
        </SimpleGrid>

        {overdue && (
          <Alert status="error" borderRadius="md">
            <AlertIcon />
            <Text>{t('milestones.overdueDesc')}</Text>
          </Alert>
        )}

        {/* Progression ajustable */}
        <Card>
          <CardHeader>
            <Heading size="sm">{t('projects.adjustProgress')}</Heading>
          </CardHeader>
          <CardBody>
            <Slider
              aria-label="progress-slider"
              min={0}
              max={100}
              step={1}
              value={progressValue}
              onChange={setProgressValue}
              onChangeEnd={(v) => progressMutation.mutate({ mid: milestone.id, progress: v })}
              mb={6}
            >
              <SliderMark
                value={progressValue}
                textAlign="center"
                bg="blue.500"
                color="white"
                mt="3"
                ml="-5"
                w="10"
                borderRadius="full"
                fontSize="sm"
              >
                {progressValue}%
              </SliderMark>
              <SliderTrack bg="gray.200">
                <SliderFilledTrack bg="blue.500" />
              </SliderTrack>
              <SliderThumb boxSize={5}>
                <Box color="blue.500" />
              </SliderThumb>
            </Slider>
            <Progress
              value={milestone.progress}
              colorScheme={milestone.progress === 100 ? 'green' : 'blue'}
              size="sm"
              borderRadius="full"
            />
          </CardBody>
        </Card>

        {/* Tâches du jalon */}
        <Card>
          <CardHeader>
            <Flex justify="space-between" align="center">
              <Heading size="sm">{`${t('common.tasks')} (${tasks?.length || 0})`}</Heading>
              <Button
                size="sm"
                leftIcon={<FiPlus />}
                colorScheme="blue"
                as={RouterLink}
                to={`/tasks/create?milestone=${milestone.id}&project=${milestone.project}`}
              >
                {t('tasks.newTask')}
              </Button>
            </Flex>
          </CardHeader>
          <CardBody>
            {tasksLoading ? (
              <Flex justify="center" py={8}>
                <Spinner />
              </Flex>
            ) : tasks?.length > 0 ? (
              <VStack spacing={3} align="stretch">
                {tasks.map((task) => (
                  <Card
                    key={task.id}
                    onClick={() => navigate(`/tasks/${task.id}`)}
                    cursor="pointer"
                    borderLeft="4px solid"
                    borderLeftColor={
                      task.delay_probability > 0.7 ? 'red.400' :
                      task.priority === 4 ? 'red.500' :
                      task.priority === 3 ? 'orange.500' :
                      task.priority === 2 ? 'blue.500' : 'gray.400'
                    }
                    _hover={{ shadow: 'md' }}
                    transition="all 0.2s"
                  >
                    <CardBody>
                      <Flex justify="space-between" align="start" gap={3}>
                        <Box>
                          <HStack spacing={2} mb={1}>
                            <Badge colorScheme={getPriorityColor(task.priority)}>
                              {getPriorityLabel(task.priority)}
                            </Badge>
                            <Badge colorScheme={TASK_STATUS_COLORS[task.status] || 'gray'}>
                              {getTaskStatusLabel(task.status)}
                            </Badge>
                          </HStack>
                          <Text fontWeight="600">{task.title}</Text>
                          {task.delay_probability > 0.5 && (
                            <Tooltip label={`${t('tasks.delayProbability')} ${Math.round(task.delay_probability * 100)}%`}>
                              <Tag
                                size="sm"
                                mt={1}
                                colorScheme={task.delay_probability > 0.7 ? 'red' : 'orange'}
                                variant="subtle"
                              >
                                <TagLeftIcon as={FiAlertCircle} />
                                <TagLabel>{`${t('tasks.risk')} ${Math.round(task.delay_probability * 100)}%`}</TagLabel>
                              </Tag>
                            </Tooltip>
                          )}
                        </Box>
                        <HStack spacing={3} fontSize="sm" color="gray.500">
                          {task.deadline && (
                            <HStack spacing={1}>
                              <FiClock size={12} />
                              <Text>{format(new Date(task.deadline), 'dd/MM')}</Text>
                            </HStack>
                          )}
                          {task.assigned_to_name && (
                            <Avatar size="xs" name={task.assigned_to_name} />
                          )}
                        </HStack>
                      </Flex>
                    </CardBody>
                  </Card>
                ))}
              </VStack>
            ) : (
              <Text color="gray.500" textAlign="center" py={6}>
                {t('milestones.noTasks')}
              </Text>
            )}
          </CardBody>
        </Card>
      </VStack>

      {/* Modal d'édition */}
      <Modal isOpen={isOpen} onClose={onClose} size="xl">
        <ModalOverlay />
        <ModalContent>
          <form onSubmit={handleSubmit}>
            <ModalHeader>{t('milestones.editMilestone')}</ModalHeader>
            <ModalCloseButton />
            <ModalBody maxH="70vh" overflowY="auto">
              <VStack spacing={4}>
                <FormControl isRequired>
                  <FormLabel>{t('milestones.milestoneName')}</FormLabel>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder={t('milestones.milestoneNamePlaceholder')}
                  />
                </FormControl>

                <FormControl>
                  <FormLabel>{t('common.description')}</FormLabel>
                  <Textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder={t('milestones.descriptionPlaceholder')}
                    rows={3}
                  />
                </FormControl>

                <FormControl isRequired>
                  <FormLabel>{t('milestones.deadline')}</FormLabel>
                  <Input
                    type="date"
                    value={formData.due_date}
                    onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                  />
                </FormControl>

                <FormControl isRequired>
                  <FormLabel>{t('milestones.project')}</FormLabel>
                  <Select
                    value={formData.project_id}
                    onChange={(e) => setFormData({ ...formData, project_id: e.target.value })}
                    placeholder={t('milestones.selectProject')}
                  >
                    {projects?.map(project => (
                      <option key={project.id} value={project.id}>
                        {project.name}
                      </option>
                    ))}
                  </Select>
                </FormControl>

                <FormControl>
                  <FormLabel>{t('common.status')}</FormLabel>
                  <Select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  >
                    <option value="not_started">{t('common.notStarted')}</option>
                    <option value="in_progress">{t('common.inProgress')}</option>
                    <option value="completed">{t('common.completed')}</option>
                    <option value="delayed">{t('common.delayed')}</option>
                    <option value="cancelled">{t('common.cancelled')}</option>
                  </Select>
                </FormControl>

                <FormControl>
                  <FormLabel>{t('milestones.progressPercent')}</FormLabel>
                  <Slider
                    aria-label="progression-slider"
                    min={0}
                    max={100}
                    step={1}
                    value={formData.progress}
                    onChange={(val) => setFormData({ ...formData, progress: val })}
                    mb={6}
                  >
                    <SliderMark
                      value={formData.progress}
                      textAlign="center"
                      bg="blue.500"
                      color="white"
                      mt="3"
                      ml="-5"
                      w="10"
                      borderRadius="full"
                      fontSize="sm"
                    >
                      {Math.round(formData.progress)}%
                    </SliderMark>
                    <SliderTrack bg="gray.200">
                      <SliderFilledTrack bg="blue.500" />
                    </SliderTrack>
                    <SliderThumb boxSize={5}>
                      <Box color="blue.500" />
                    </SliderThumb>
                  </Slider>
                </FormControl>
              </VStack>
            </ModalBody>

            <ModalFooter>
              <Button variant="ghost" mr={3} onClick={onClose}>
                {t('common.cancel')}
              </Button>
              <Button
                type="submit"
                colorScheme="blue"
                isLoading={updateMutation.isLoading}
              >
                {t('common.update')}
              </Button>
            </ModalFooter>
          </form>
        </ModalContent>
      </Modal>

      {/* Dialog de suppression */}
      <AlertDialog isOpen={isDeleteOpen} leastDestructiveRef={null} onClose={onDeleteClose}>
        <AlertDialogOverlay>
          <AlertDialogContent>
            <AlertDialogHeader fontSize="lg" fontWeight="bold">
              {t('milestones.deleteTitle')}
            </AlertDialogHeader>
            <AlertDialogBody>
              {t('common.confirmDelete')} "{milestone.name}" ? {t('common.irreversible')}
            </AlertDialogBody>
            <AlertDialogFooter>
              <Button onClick={onDeleteClose}>{t('common.cancel')}</Button>
              <Button
                colorScheme="red"
                onClick={() => deleteMutation.mutate(milestone.id)}
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

export default MilestoneDetail;
