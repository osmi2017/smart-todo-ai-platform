import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link as RouterLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Box, Heading, Text, Button, HStack, VStack, Badge, Icon,
  Tabs, TabList, TabPanels, Tab, TabPanel,
  useToast, useColorModeValue, Spinner, Divider,
  Flex, IconButton, Tooltip, Skeleton, SkeletonText,
  Modal, ModalOverlay, ModalContent, ModalHeader, ModalBody,
  ModalFooter, ModalCloseButton, useDisclosure,
  AlertDialog, AlertDialogOverlay, AlertDialogContent,
  AlertDialogHeader, AlertDialogBody, AlertDialogFooter,
  FormControl, FormLabel, Textarea, NumberInput, NumberInputField,
  NumberInputStepper, NumberIncrementStepper, NumberDecrementStepper,
  Avatar, AvatarGroup, SimpleGrid, Stat, StatLabel, StatNumber,
} from '@chakra-ui/react';
import {
  FiArrowLeft, FiEdit2, FiTrash2, FiCalendar, FiMapPin,
  FiUsers, FiDollarSign, FiClock, FiCheck, FiXCircle, FiPlay,
  FiFileText, FiSave, FiPrinter, FiDownload, FiLink,
} from 'react-icons/fi';
import { useMissionService } from '../services/missionService';
import { useAuth } from '../context/AuthContext';

const statusConfig = {
  planned: { color: 'blue', labelKey: 'missions.planned', icon: FiClock },
  in_progress: { color: 'orange', labelKey: 'missions.inProgress', icon: FiPlay },
  completed: { color: 'green', labelKey: 'missions.completed', icon: FiCheck },
  cancelled: { color: 'red', labelKey: 'missions.cancelled', icon: FiXCircle },
};

const MissionDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t, i18n } = useTranslation();
  const {
    getMission, deleteMission, endMission, startMission,
    cancelMission, updateCosts, updateReports,
  } = useMissionService();
  const { axiosInstance } = useAuth();
  const toast = useToast();
  const bgColor = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.600');
  const codeBg = useColorModeValue('gray.50', 'gray.900');

  const [mission, setMission] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  const [editingReports, setEditingReports] = useState(false);
  const [reportsForm, setReportsForm] = useState({ mission_report: '' });

  const [editingCosts, setEditingCosts] = useState(false);
  const [costsForm, setCostsForm] = useState({
    cost_per_diem: 0, cost_accommodation: 0, cost_transport: 0, cost_other: 0,
  });

  const { isOpen: isDeleteOpen, onOpen: onDeleteOpen, onClose: onDeleteClose } = useDisclosure();
  const deleteRef = React.useRef();

  useEffect(() => { loadMission(); }, [id]);

  const loadMission = async () => {
    setLoading(true);
    try {
      const data = await getMission(id);
      setMission(data);
    } catch (error) {
      toast({ title: t('missions.loadError'), status: 'error', duration: 3000 });
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (action) => {
    setActionLoading(true);
    try {
      if (action === 'start') await startMission(id);
      else if (action === 'end') await endMission(id);
      else if (action === 'cancel') await cancelMission(id);
      toast({ title: t('missions.updatedSuccess'), status: 'success', duration: 2000 });
      await loadMission();
    } catch (error) {
      toast({
        title: t('common.error'),
        description: error.response?.data?.error || t('missions.updateError'),
        status: 'error', duration: 3000,
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async () => {
    try {
      await deleteMission(id);
      toast({ title: t('missions.deletedSuccess'), status: 'success', duration: 2000 });
      navigate('/missions');
    } catch (error) {
      toast({ title: t('missions.deleteError'), status: 'error', duration: 3000 });
    } finally {
      onDeleteClose();
    }
  };

  const handleSaveReports = async () => {
    try {
      await updateReports(id, reportsForm);
      toast({ title: t('missions.reportsUpdated'), status: 'success', duration: 2000 });
      setEditingReports(false);
      await loadMission();
    } catch (error) {
      toast({ title: t('common.error'), description: error.response?.data?.error || t('common.unknownError'), status: 'error', duration: 3000 });
    }
  };

  const handleSaveCosts = async () => {
    try {
      await updateCosts(id, costsForm);
      toast({ title: t('missions.costsUpdated'), status: 'success', duration: 2000 });
      setEditingCosts(false);
      await loadMission();
    } catch (error) {
      toast({ title: t('common.error'), status: 'error', duration: 3000 });
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return null;
    return new Date(dateStr + 'T00:00:00').toLocaleDateString(i18n.language === 'fr' ? 'fr-FR' : 'en-US', {
      day: 'numeric', month: 'long', year: 'numeric',
    });
  };

  const formatCost = (amount, currency) => {
    const cur = (currency || 'XOF').toUpperCase();
    try {
      return new Intl.NumberFormat(i18n.language === 'fr' ? 'fr-FR' : 'en-US', {
        style: 'currency', currency: cur, minimumFractionDigits: 0,
      }).format(amount || 0);
    } catch {
      return `${(amount || 0).toLocaleString(i18n.language === 'fr' ? 'fr-FR' : 'en-US')} ${cur}`;
    }
  };

  const getCostBreakdown = (m) => {
    const days = m.duration_days || 1;
    const accomDays = Math.max(days - 1, 0);
    const perDiemTotal = (parseFloat(m.cost_per_diem) || 0) * days;
    const accomTotal = (parseFloat(m.cost_accommodation) || 0) * accomDays;
    const transport = parseFloat(m.cost_transport) || 0;
    const other = parseFloat(m.cost_other) || 0;
    const total = perDiemTotal + accomTotal + transport + other;
    return { days, accomDays, perDiemTotal, accomTotal, transport, other, total };
  };

  const dateLocale = i18n.language === 'fr' ? 'fr-FR' : 'en-US';

  if (loading) {
    return (
      <Box>
        <Skeleton height="40px" width="200px" mb={4} />
        <Box bg={bgColor} borderRadius="lg" shadow="sm" p={6} mb={6}>
          <SkeletonText noOfLines={3} spacing={4} />
        </Box>
        <Skeleton height="400px" borderRadius="lg" />
      </Box>
    );
  }

  if (!mission) {
    return (
      <Box textAlign="center" py={20}>
        <Icon as={FiMapPin} boxSize={16} color="gray.300" mb={4} />
        <Heading size="md" color="gray.500" mb={2}>{t('missions.notFound')}</Heading>
        <Button as={RouterLink} to="/missions" leftIcon={<FiArrowLeft />} mt={4}>
          {t('missions.backToMissions')}
        </Button>
      </Box>
    );
  }

  const status = statusConfig[mission.status] || statusConfig.planned;
  const isLeader = mission.members?.some(m => m.is_leader && m.user === user?.id);

  return (
    <Box>
      <Button leftIcon={<FiArrowLeft />} variant="ghost" mb={4} onClick={() => navigate('/missions')}>
        {t('missions.backToMissions')}
      </Button>

      {/* Header Card */}
      <Box bg={bgColor} borderRadius="xl" shadow="sm" borderWidth="1px" borderColor={borderColor} overflow="hidden" mb={6}>
        <Box h="4px" bg={`${status.color}.400`} />
        <Box p={6}>
          <Flex justify="space-between" align="flex-start" mb={4} wrap="wrap" gap={3}>
            <VStack align="start" spacing={1} flex={1}>
              <Heading size="lg">{mission.title}</Heading>
              {mission.description && <Text color="gray.500" fontSize="md">{mission.description}</Text>}
            </VStack>
            <HStack spacing={2}>
              <Tooltip label={t('missions.actions.edit')}>
                <IconButton
                  as={RouterLink}
                  to={`/missions/${id}/edit`}
                  icon={<FiEdit2 />}
                  variant="outline"
                  size="sm"
                  aria-label={t('missions.actions.edit')}
                />
              </Tooltip>
              <Tooltip label={t('missions.actions.delete')}>
                <IconButton
                  icon={<FiTrash2 />}
                  variant="outline"
                  colorScheme="red"
                  size="sm"
                  onClick={onDeleteOpen}
                  aria-label={t('missions.actions.delete')}
                />
              </Tooltip>
            </HStack>
          </Flex>

          {/* Status & metadata */}
          <HStack spacing={4} flexWrap="wrap" mb={4}>
            <Badge
              colorScheme={status.color}
              fontSize="sm"
              px={3}
              py={1}
              borderRadius="full"
              display="flex"
              alignItems="center"
              gap={1}
            >
              <Icon as={status.icon} boxSize={3} />
              {t(status.labelKey)}
            </Badge>
            {mission.duration_days != null && (
              <HStack spacing={1} color="gray.500">
                <Icon as={FiClock} />
                <Text fontSize="sm">{mission.duration_days} {t('missions.days')}{mission.duration_days > 1 ? t('missions.daysPlural') : ''}</Text>
              </HStack>
            )}
            <HStack spacing={1} color="gray.500">
              <Icon as={FiMapPin} />
              <Text fontSize="sm">{mission.destination_name}</Text>
            </HStack>
            {mission.created_by_name && (
              <Text fontSize="sm" color="gray.400">{t('missions.createdBy')} {mission.created_by_name}</Text>
            )}
          </HStack>

          {/* Action buttons based on status and role */}
          {(isLeader || user?.role === 'admin' || user?.role === 'superadmin') && (
            <HStack spacing={2} flexWrap="wrap">
              {mission.status === 'planned' && (
                <Button
                  size="sm" leftIcon={<FiPlay />} colorScheme="orange" variant="outline"
                  onClick={() => handleAction('start')} isLoading={actionLoading}
                >
                  {t('missions.startMission')}
                </Button>
              )}
              {mission.status === 'in_progress' && (
                <Button
                  size="sm" leftIcon={<FiCheck />} colorScheme="green" variant="outline"
                  onClick={() => handleAction('end')} isLoading={actionLoading}
                >
                  {t('missions.completeMission')}
                </Button>
              )}
              {(mission.status === 'planned' || mission.status === 'in_progress') && (
                <Button
                  size="sm" leftIcon={<FiXCircle />} colorScheme="red" variant="ghost"
                  onClick={() => handleAction('cancel')} isLoading={actionLoading}
                >
                  {t('common.cancel')}
                </Button>
              )}
            </HStack>
          )}
        </Box>
      </Box>

      {/* Stats */}
      <SimpleGrid columns={{ base: 2, md: 4 }} spacing={4} mb={6}>
        <Box bg={bgColor} borderRadius="xl" shadow="sm" borderWidth="1px" borderColor={borderColor} p={4}>
          <Stat>
            <StatLabel><Icon as={FiDollarSign} mr={1} />{t('missions.totalExpenses')}</StatLabel>
            <StatNumber fontSize="lg">{formatCost(mission.frais_de_mission || mission.total_cost, mission.currency)}</StatNumber>
          </Stat>
        </Box>
        <Box bg={bgColor} borderRadius="xl" shadow="sm" borderWidth="1px" borderColor={borderColor} p={4}>
          <Stat>
            <StatLabel><Icon as={FiUsers} mr={1} />{t('missions.team')}</StatLabel>
            <StatNumber fontSize="lg">{mission.members?.length || 0} {t('missions.members')}{(mission.members?.length || 0) > 1 ? t('missions.membersPlural') : ''}</StatNumber>
          </Stat>
        </Box>
        <Box bg={bgColor} borderRadius="xl" shadow="sm" borderWidth="1px" borderColor={borderColor} p={4}>
          <Stat>
            <StatLabel><Icon as={FiCalendar} mr={1} />{t('missions.durationLabel')}</StatLabel>
            <StatNumber fontSize="lg">{mission.duration_days != null ? `${mission.duration_days}j` : '—'}</StatNumber>
          </Stat>
        </Box>
        <Box bg={bgColor} borderRadius="xl" shadow="sm" borderWidth="1px" borderColor={borderColor} p={4}>
          <Stat>
            <StatLabel><Icon as={FiMapPin} mr={1} />{t('missions.destination')}</StatLabel>
            <Text fontSize="sm" noOfLines={2} mt={1}>{mission.destination_name}</Text>
          </Stat>
        </Box>
      </SimpleGrid>

      {/* Tabs */}
      <Box bg={bgColor} borderRadius="xl" shadow="sm" borderWidth="1px" borderColor={borderColor} overflow="hidden">
        <Tabs colorScheme="blue">
          <TabList px={4}>
            <Tab>{t('missionDetail.tabs.team')}</Tab>
            <Tab>{t('missionDetail.tabs.costs')}</Tab>
            <Tab>{t('missionDetail.tabs.expenseReport')}</Tab>
            <Tab>{t('missionDetail.tabs.report')}</Tab>
            <Tab>{t('missionDetail.tabs.associations')}</Tab>
            <Tab>{t('missionDetail.tabs.map')}</Tab>
          </TabList>

          <TabPanels>
            {/* Team Tab */}
            <TabPanel>
              {mission.members?.length > 0 ? (
                <VStack spacing={2} align="stretch">
                  {mission.members.map(m => (
                    <Flex
                      key={m.id}
                      p={4} borderRadius="lg" borderWidth="1px" borderColor={borderColor}
                      justify="space-between" align="center"
                    >
                      <HStack>
                        <Avatar name={m.user_name} size="md" />
                        <Box>
                          <HStack spacing={2}>
                            <Text fontWeight="600">{m.user_name}</Text>
                            {m.is_leader && (
                              <Badge colorScheme="orange" borderRadius="full">{t('missions.chief')}</Badge>
                            )}
                          </HStack>
                          {m.user_email && <Text fontSize="sm" color="gray.500">{m.user_email}</Text>}
                        </Box>
                      </HStack>
                      <Text fontSize="xs" color="gray.400">
                        {t('missions.since')} {new Date(m.joined_at).toLocaleDateString(dateLocale)}
                      </Text>
                    </Flex>
                  ))}
                </VStack>
              ) : (
                <Box textAlign="center" py={12}>
                  <Icon as={FiUsers} boxSize={16} color="gray.300" mb={4} />
                  <Heading size="md" color="gray.500" mb={2}>{t('missions.noMembers')}</Heading>
                  <Text color="gray.400">{t('missions.addMembersPrompt')}</Text>
                </Box>
              )}
            </TabPanel>

            {/* Costs Tab */}
            <TabPanel>
              <VStack spacing={4} align="stretch">
                <Flex justify="space-between" align="center">
                  <Heading size="sm">{t('missionDetail.detailedCosts')}</Heading>
                  {(isLeader || user?.role === 'admin' || user?.role === 'superadmin') && (
                    <Button
                      size="sm" variant="ghost" leftIcon={editingCosts ? <FiXCircle /> : <FiEdit2 />}
                      onClick={() => {
                        if (editingCosts) {
                          setEditingCosts(false);
                        } else {
                          setCostsForm({
                            cost_per_diem: mission.cost_per_diem || 0,
                            cost_accommodation: mission.cost_accommodation || 0,
                            cost_transport: mission.cost_transport || 0,
                            cost_other: mission.cost_other || 0,
                          });
                          setEditingCosts(true);
                        }
                      }}
                    >
                      {editingCosts ? t('common.cancel') : t('missions.actions.edit')}
                    </Button>
                  )}
                </Flex>

                {editingCosts ? (
                  <VStack spacing={3} align="stretch">
                    <HStack spacing={4} flexWrap="wrap">
                      <FormControl flex={1}>
                        <FormLabel>{t('missions.form.allowance')} ({(mission.currency || 'XOF').toUpperCase()}/jour)</FormLabel>
                        <NumberInput
                          value={costsForm.cost_per_diem}
                          onChange={(val) => setCostsForm(prev => ({ ...prev, cost_per_diem: parseFloat(val) || 0 }))}
                          min={0}
                        >
                          <NumberInputField />
                          <NumberInputStepper><NumberIncrementStepper /><NumberDecrementStepper /></NumberInputStepper>
                        </NumberInput>
                      </FormControl>
                      <FormControl flex={1}>
                        <FormLabel>{t('missions.form.housing')} ({(mission.currency || 'XOF').toUpperCase()})</FormLabel>
                        <NumberInput
                          value={costsForm.cost_accommodation}
                          onChange={(val) => setCostsForm(prev => ({ ...prev, cost_accommodation: parseFloat(val) || 0 }))}
                          min={0}
                        >
                          <NumberInputField />
                          <NumberInputStepper><NumberIncrementStepper /><NumberDecrementStepper /></NumberInputStepper>
                        </NumberInput>
                      </FormControl>
                    </HStack>
                    <HStack spacing={4} flexWrap="wrap">
                      <FormControl flex={1}>
                        <FormLabel>{t('missions.form.transport')} ({(mission.currency || 'XOF').toUpperCase()})</FormLabel>
                        <NumberInput
                          value={costsForm.cost_transport}
                          onChange={(val) => setCostsForm(prev => ({ ...prev, cost_transport: parseFloat(val) || 0 }))}
                          min={0}
                        >
                          <NumberInputField />
                          <NumberInputStepper><NumberIncrementStepper /><NumberDecrementStepper /></NumberInputStepper>
                        </NumberInput>
                      </FormControl>
                      <FormControl flex={1}>
                        <FormLabel>{t('missions.form.otherExpenses')} ({(mission.currency || 'XOF').toUpperCase()})</FormLabel>
                        <NumberInput
                          value={costsForm.cost_other}
                          onChange={(val) => setCostsForm(prev => ({ ...prev, cost_other: parseFloat(val) || 0 }))}
                          min={0}
                        >
                          <NumberInputField />
                          <NumberInputStepper><NumberIncrementStepper /><NumberDecrementStepper /></NumberInputStepper>
                        </NumberInput>
                      </FormControl>
                    </HStack>
                    <Button colorScheme="blue" leftIcon={<FiSave />} onClick={handleSaveCosts} alignSelf="flex-end">
                      {t('missions.form.save')}
                    </Button>
                  </VStack>
                ) : (
                  <VStack spacing={2} align="stretch">
                    <Flex justify="space-between" p={3} bg={codeBg} borderRadius="lg">
                      <Text fontWeight="500">{t('missions.form.allowance')}</Text>
                      <Text fontWeight="600">{formatCost(mission.cost_per_diem, mission.currency)}</Text>
                    </Flex>
                    <Flex justify="space-between" p={3} bg={codeBg} borderRadius="lg">
                      <Text fontWeight="500">{t('missions.form.housing')}</Text>
                      <Text fontWeight="600">{formatCost(mission.cost_accommodation, mission.currency)}</Text>
                    </Flex>
                    <Flex justify="space-between" p={3} bg={codeBg} borderRadius="lg">
                      <Text fontWeight="500">{t('missions.form.transport')}</Text>
                      <Text fontWeight="600">{formatCost(mission.cost_transport, mission.currency)}</Text>
                    </Flex>
                    <Flex justify="space-between" p={3} bg={codeBg} borderRadius="lg">
                      <Text fontWeight="500">{t('missions.form.otherExpenses')}</Text>
                      <Text fontWeight="600">{formatCost(mission.cost_other, mission.currency)}</Text>
                    </Flex>
                    <Divider />
                    <Flex justify="space-between" p={3} bg="blue.50" borderRadius="lg">
                      <Text fontWeight="700">{t('missions.totalExpenses')}</Text>
                      <Text fontWeight="700" color="blue.600">{formatCost(mission.frais_de_mission || mission.total_cost, mission.currency)}</Text>
                    </Flex>
                  </VStack>
                )}
              </VStack>
            </TabPanel>

            {/* Expense Report Tab */}
            <TabPanel>
              <NoteDeFrais mission={mission} formatCost={formatCost} getCostBreakdown={getCostBreakdown} />
            </TabPanel>

            {/* Mission Report Tab */}
            <TabPanel>
              <VStack spacing={4} align="stretch">
                <Flex justify="space-between" align="center">
                  <Heading size="sm">{t('missionDetail.tabs.report')}</Heading>
                  {(isLeader || user?.role === 'admin' || user?.role === 'superadmin') && (
                    editingReports ? (
                      <HStack>
                        <Button size="sm" variant="ghost" leftIcon={<FiXCircle />}
                          onClick={() => setEditingReports(false)}>
                          {t('common.cancel')}
                        </Button>
                        <Button size="sm" variant="ghost" leftIcon={<FiSave />}
                          onClick={handleSaveReports}>
                          {t('missions.form.save')}
                        </Button>
                      </HStack>
                    ) : (
                      <Button size="sm" variant="ghost" leftIcon={<FiEdit2 />}
                        onClick={() => {
                          setReportsForm({ mission_report: mission.mission_report || '' });
                          setEditingReports(true);
                        }}>
                        {t('missions.actions.edit')}
                      </Button>
                    )
                  )}
                </Flex>

                {editingReports ? (
                  <FormControl>
                    <Textarea
                      value={reportsForm.mission_report}
                      onChange={(e) => setReportsForm(prev => ({ ...prev, mission_report: e.target.value }))}
                      placeholder={t('missions.form.reportPlaceholder')}
                      rows={12}
                    />
                  </FormControl>
                ) : (
                  <Box bg={codeBg} p={4} borderRadius="lg" borderWidth="1px" borderColor={borderColor}>
                    {mission.mission_report ? (
                      <Text whiteSpace="pre-wrap" lineHeight="tall">{mission.mission_report}</Text>
                    ) : (
                      <Text color="gray.400" fontStyle="italic">{t('missionDetail.noReport')}</Text>
                    )}
                  </Box>
                )}
              </VStack>
            </TabPanel>

            {/* Associations Tab */}
            <TabPanel>
              <VStack spacing={4} align="stretch">
                {/* Project */}
                <Box>
                  <Heading size="sm" mb={3}>
                    <HStack><Icon as={FiLink} /> {t('missionDetail.associatedProject')}</HStack>
                  </Heading>
                  {mission.project_detail ? (
                    <Flex
                      p={4} borderRadius="lg" borderWidth="1px" borderColor={borderColor}
                      justify="space-between" align="center"
                    >
                      <HStack spacing={3}>
                        <Box w="12px" h="12px" borderRadius="full" bg={mission.project_detail.color || 'blue.400'} />
                        <Box>
                          <Text fontWeight="600">{mission.project_detail.name}</Text>
                          <Text fontSize="sm" color="gray.500">{mission.project_detail.progress || 0}% {t('missionDetail.completed')}</Text>
                        </Box>
                      </HStack>
                      <Badge colorScheme={mission.project_detail.status === 'completed' ? 'green' : 'blue'}>
                        {mission.project_detail.status}
                      </Badge>
                    </Flex>
                  ) : (
                    <Text color="gray.400" fontStyle="italic">{t('missionDetail.noProject')}</Text>
                  )}
                </Box>

                <Divider />

                {/* Tasks */}
                <Box>
                  <Heading size="sm" mb={3}>
                    <HStack><Icon as={FiFileText} /> {t('missionDetail.associatedTasks')}</HStack>
                  </Heading>
                  {mission.tasks_detail?.length > 0 ? (
                    <VStack spacing={2} align="stretch">
                      {mission.tasks_detail.map(task => (
                        <Flex
                          key={task.id}
                          p={3} borderRadius="lg" borderWidth="1px" borderColor={borderColor}
                          justify="space-between" align="center"
                        >
                          <VStack align="start" spacing={0}>
                            <Text fontWeight="500" fontSize="sm">{task.title}</Text>
                            {task.assigned_to_name && (
                              <Text fontSize="xs" color="gray.500">{t('missionDetail.assignedTo')} {task.assigned_to_name}</Text>
                            )}
                          </VStack>
                          <HStack spacing={2}>
                            <Badge colorScheme={task.priority >= 3 ? 'red' : task.priority === 2 ? 'orange' : 'gray'} fontSize="xs">
                              P{task.priority}
                            </Badge>
                            <Badge colorScheme={task.status === 'completed' ? 'green' : 'blue'} fontSize="xs">
                              {task.status}
                            </Badge>
                          </HStack>
                        </Flex>
                      ))}
                    </VStack>
                  ) : (
                    <Text color="gray.400" fontStyle="italic">{t('missionDetail.noTasks')}</Text>
                  )}
                </Box>

                <Divider />

                {/* Milestones */}
                <Box>
                  <Heading size="sm" mb={3}>
                    <HStack><Icon as={FiCalendar} /> {t('missionDetail.associatedMilestones')}</HStack>
                  </Heading>
                  {mission.milestones_detail?.length > 0 ? (
                    <VStack spacing={2} align="stretch">
                      {mission.milestones_detail.map(ms => (
                        <Flex
                          key={ms.id}
                          p={3} borderRadius="lg" borderWidth="1px" borderColor={borderColor}
                          justify="space-between" align="center"
                        >
                          <VStack align="start" spacing={0}>
                            <Text fontWeight="500" fontSize="sm">{ms.name}</Text>
                            <Text fontSize="xs" color="gray.500">
                              {t('missionDetail.dueDate')} {formatDate(ms.due_date) || '—'}
                            </Text>
                          </VStack>
                          <HStack spacing={2}>
                            <Text fontSize="xs" color="gray.500">{ms.progress || 0}%</Text>
                            <Badge colorScheme={ms.status === 'completed' ? 'green' : ms.status === 'delayed' ? 'red' : 'blue'} fontSize="xs">
                              {ms.status}
                            </Badge>
                          </HStack>
                        </Flex>
                      ))}
                    </VStack>
                  ) : (
                    <Text color="gray.400" fontStyle="italic">{t('missionDetail.noMilestones')}</Text>
                  )}
                </Box>
              </VStack>
            </TabPanel>

            {/* Map Tab */}
            <TabPanel>
              {mission.destination_lat && mission.destination_lng ? (() => {
                const lat = parseFloat(mission.destination_lat);
                const lng = parseFloat(mission.destination_lng);
                return (
                  <Box borderRadius="lg" overflow="hidden" borderWidth="1px" borderColor={borderColor}>
                    <iframe
                      title="Mission Location"
                      width="100%"
                      height="450"
                      frameBorder="0"
                      style={{ border: 0 }}
                      src={`https://www.openstreetmap.org/export/embed.html?bbox=${lng - 0.05},${lat - 0.05},${lng + 0.05},${lat + 0.05}&layer=mapnik&marker=${lat},${lng}`}
                      allowFullScreen
                    />
                    <Flex p={3} bg={codeBg} justify="space-between" align="center">
                      <HStack>
                        <Icon as={FiMapPin} color="blue.500" />
                        <Text fontWeight="500">{mission.destination_name}</Text>
                      </HStack>
                      <Text fontSize="sm" color="gray.500">
                        {lat.toFixed(6)}, {lng.toFixed(6)}
                      </Text>
                    </Flex>
                  </Box>
                );
              })() : (
                <Box textAlign="center" py={12}>
                  <Icon as={FiMapPin} boxSize={16} color="gray.300" mb={4} />
                  <Heading size="md" color="gray.500" mb={2}>{t('missionDetail.geoUnavailable')}</Heading>
                  <Text color="gray.400">{t('missionDetail.geoDescription')}</Text>
                </Box>
              )}
            </TabPanel>
          </TabPanels>
        </Tabs>
      </Box>

      {/* Delete Confirmation */}
      <AlertDialog isOpen={isDeleteOpen} leastDestructiveRef={deleteRef} onClose={onDeleteClose}>
        <AlertDialogOverlay>
          <AlertDialogContent>
            <AlertDialogHeader fontSize="lg" fontWeight="bold">{t('missions.confirmDelete')}</AlertDialogHeader>
            <AlertDialogBody>{t('missions.confirmDeleteDesc')}</AlertDialogBody>
            <AlertDialogFooter>
              <Button ref={deleteRef} onClick={onDeleteClose}>{t('common.cancel')}</Button>
              <Button colorScheme="red" onClick={handleDelete} ml={3}>{t('missions.actions.delete')}</Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialogOverlay>
      </AlertDialog>
    </Box>
  );
};

const NoteDeFrais = ({ mission, formatCost, getCostBreakdown }) => {
  const { t, i18n } = useTranslation();
  const bgColor = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.600');
  const codeBg = useColorModeValue('gray.50', 'gray.900');
  const printRef = useRef(null);
  const cur = (mission.currency || 'XOF').toUpperCase();
  const breakdown = getCostBreakdown(mission);
  const dateLocale = i18n.language === 'fr' ? 'fr-FR' : 'en-US';

  const handlePrint = () => {
    const content = printRef.current;
    if (!content) return;
    const win = window.open('', '_blank');
    win.document.write(`<html><head><title>${t('missionDetail.expenseReport.title')} - ${mission.title}</title>
      <style>
        body { font-family: Arial, sans-serif; padding: 40px; color: #333; }
        h1 { font-size: 22px; border-bottom: 2px solid #333; padding-bottom: 8px; }
        h2 { font-size: 16px; color: #555; margin-top: 24px; }
        .header { display: flex; justify-content: space-between; margin-bottom: 20px; }
        .info { font-size: 13px; color: #666; margin-bottom: 4px; }
        table { width: 100%; border-collapse: collapse; margin-top: 16px; }
        th, td { border: 1px solid #ddd; padding: 10px 12px; text-align: left; font-size: 13px; }
        th { background: #f5f5f5; font-weight: 600; }
        .total-row td { background: #e8f4fd; font-weight: 700; font-size: 14px; }
        .footer { margin-top: 30px; font-size: 11px; color: #999; text-align: center; }
        @media print { body { padding: 20px; } }
      </style></head><body>
        <h1>${t('missionDetail.expenseReport.title')}</h1>
        <div class="header">
          <div>
            <div class="info"><strong>${t('expenseReport.mission')}</strong> ${mission.title}</div>
            <div class="info"><strong>${t('expenseReport.destination')}</strong> ${mission.destination_name}</div>
            <div class="info"><strong>${t('expenseReport.startDate')}</strong> ${mission.start_date || '—'}</div>
            <div class="info"><strong>${t('expenseReport.endDate')}</strong> ${mission.end_date || '—'}</div>
            <div class="info"><strong>${t('expenseReport.duration')}</strong> ${breakdown.days} ${t('expenseReport.days')}</div>
            <div class="info"><strong>${t('expenseReport.currency')}</strong> ${cur}</div>
          </div>
          <div style="text-align:right">
            <div class="info"><strong>${t('expenseReport.chief')}</strong> ${mission.members?.find(m => m.is_leader)?.user_name || '—'}</div>
            <div class="info"><strong>${t('expenseReport.status')}</strong> ${mission.status}</div>
          </div>
        </div>
        <table>
          <thead><tr><th>${t('expenseReport.designation')}</th><th>${t('expenseReport.quantity')}</th><th>${t('expenseReport.unitCost')} (${cur})</th><th>${t('missionDetail.print.amount')} (${cur})</th></tr></thead>
          <tbody>
            <tr><td>${t('expenseReport.perDiem')}</td><td>${breakdown.days} ${t('expenseReport.days')}</td><td>${Number(mission.cost_per_diem).toLocaleString(dateLocale)}</td><td>${Number(breakdown.perDiemTotal).toLocaleString(dateLocale)}</td></tr>
            <tr><td>${t('expenseReport.accommodation')}</td><td>${breakdown.accomDays} ${t('expenseReport.nights')}</td><td>${Number(mission.cost_accommodation).toLocaleString(dateLocale)}</td><td>${Number(breakdown.accomTotal).toLocaleString(dateLocale)}</td></tr>
            <tr><td>${t('expenseReport.transport')}</td><td>—</td><td>—</td><td>${Number(breakdown.transport).toLocaleString(dateLocale)}</td></tr>
            <tr><td>${t('expenseReport.otherExpenses')}</td><td>—</td><td>—</td><td>${Number(breakdown.other).toLocaleString(dateLocale)}</td></tr>
            <tr class="total-row"><td colspan="3">${t('expenseReport.total')}</td><td>${Number(breakdown.total).toLocaleString(dateLocale)} ${cur}</td></tr>
          </tbody>
        </table>
        <div class="footer">${t('expenseReport.generatedOn')} ${new Date().toLocaleDateString(dateLocale)} ${t('expenseReport.at')} ${new Date().toLocaleTimeString(dateLocale)}</div>
      </body></html>`);
    win.document.close();
    win.print();
  };

  const handleDownloadPDF = () => {
    const content = printRef.current;
    if (!content) return;
    const win = window.open('', '_blank');
    win.document.write(`<html><head><title>${t('missionDetail.expenseReport.title')} - ${mission.title}</title>
      <style>
        body { font-family: Arial, sans-serif; padding: 40px; color: #333; }
        h1 { font-size: 22px; border-bottom: 2px solid #333; padding-bottom: 8px; }
        h2 { font-size: 16px; color: #555; margin-top: 24px; }
        .header { display: flex; justify-content: space-between; margin-bottom: 20px; }
        .info { font-size: 13px; color: #666; margin-bottom: 4px; }
        table { width: 100%; border-collapse: collapse; margin-top: 16px; }
        th, td { border: 1px solid #ddd; padding: 10px 12px; text-align: left; font-size: 13px; }
        th { background: #f5f5f5; font-weight: 600; }
        .total-row td { background: #e8f4fd; font-weight: 700; font-size: 14px; }
        .footer { margin-top: 30px; font-size: 11px; color: #999; text-align: center; }
        @media print { body { padding: 20px; } }
      </style></head><body>
        <h1>${t('missionDetail.expenseReport.title')}</h1>
        <div class="header">
          <div>
            <div class="info"><strong>${t('expenseReport.mission')}</strong> ${mission.title}</div>
            <div class="info"><strong>${t('expenseReport.destination')}</strong> ${mission.destination_name}</div>
            <div class="info"><strong>${t('expenseReport.startDate')}</strong> ${mission.start_date || '—'}</div>
            <div class="info"><strong>${t('expenseReport.endDate')}</strong> ${mission.end_date || '—'}</div>
            <div class="info"><strong>${t('expenseReport.duration')}</strong> ${breakdown.days} ${t('expenseReport.days')}</div>
            <div class="info"><strong>${t('expenseReport.currency')}</strong> ${cur}</div>
          </div>
          <div style="text-align:right">
            <div class="info"><strong>${t('expenseReport.chief')}</strong> ${mission.members?.find(m => m.is_leader)?.user_name || '—'}</div>
            <div class="info"><strong>${t('expenseReport.status')}</strong> ${mission.status}</div>
          </div>
        </div>
        <table>
          <thead><tr><th>${t('expenseReport.designation')}</th><th>${t('expenseReport.quantity')}</th><th>${t('expenseReport.unitCost')} (${cur})</th><th>${t('missionDetail.print.amount')} (${cur})</th></tr></thead>
          <tbody>
            <tr><td>${t('expenseReport.perDiem')}</td><td>${breakdown.days} ${t('expenseReport.days')}</td><td>${Number(mission.cost_per_diem).toLocaleString(dateLocale)}</td><td>${Number(breakdown.perDiemTotal).toLocaleString(dateLocale)}</td></tr>
            <tr><td>${t('expenseReport.accommodation')}</td><td>${breakdown.accomDays} ${t('expenseReport.nights')}</td><td>${Number(mission.cost_accommodation).toLocaleString(dateLocale)}</td><td>${Number(breakdown.accomTotal).toLocaleString(dateLocale)}</td></tr>
            <tr><td>${t('expenseReport.transport')}</td><td>—</td><td>—</td><td>${Number(breakdown.transport).toLocaleString(dateLocale)}</td></tr>
            <tr><td>${t('expenseReport.otherExpenses')}</td><td>—</td><td>—</td><td>${Number(breakdown.other).toLocaleString(dateLocale)}</td></tr>
            <tr class="total-row"><td colspan="3">${t('expenseReport.totalExpenses')}</td><td>${Number(breakdown.total).toLocaleString(dateLocale)} ${cur}</td></tr>
          </tbody>
        </table>
        <div class="footer">${t('expenseReport.generatedOn')} ${new Date().toLocaleDateString(dateLocale)} ${t('expenseReport.at')} ${new Date().toLocaleTimeString(dateLocale)}</div>
      </body></html>`);
    win.document.close();
    setTimeout(() => { win.print(); }, 300);
  };

  return (
    <VStack spacing={4} align="stretch">
      <Flex justify="space-between" align="center">
        <Heading size="sm">{t('missionDetail.expenseReport.title')}</Heading>
        <HStack spacing={2}>
          <Button size="sm" leftIcon={<FiPrinter />} onClick={handlePrint} variant="outline">
            {t('expenseReport.print')}
          </Button>
          <Button size="sm" leftIcon={<FiDownload />} onClick={handleDownloadPDF} variant="outline" colorScheme="green">
            {t('expenseReport.downloadPdf')}
          </Button>
        </HStack>
      </Flex>

      <Box ref={printRef} bg={codeBg} p={5} borderRadius="lg" borderWidth="1px" borderColor={borderColor}>
        <VStack spacing={4} align="stretch">
          <Box>
            <Text fontWeight="700" fontSize="lg" mb={1}>{t('missionDetail.expenseReport.title')}</Text>
            <Divider mb={3} />
            <SimpleGrid columns={{ base: 1, md: 2 }} spacing={2}>
              <VStack align="start" spacing={0}>
                <Text fontSize="sm"><Text as="span" fontWeight="600">{t('expenseReport.mission')}</Text> {mission.title}</Text>
                <Text fontSize="sm"><Text as="span" fontWeight="600">{t('expenseReport.destination')}</Text> {mission.destination_name}</Text>
                <Text fontSize="sm"><Text as="span" fontWeight="600">{t('expenseReport.startDate')}</Text> {mission.start_date || '—'}</Text>
                <Text fontSize="sm"><Text as="span" fontWeight="600">{t('expenseReport.endDate')}</Text> {mission.end_date || '—'}</Text>
                <Text fontSize="sm"><Text as="span" fontWeight="600">{t('expenseReport.duration')}</Text> {breakdown.days} {t('expenseReport.days')}</Text>
              </VStack>
              <VStack align="start" spacing={0}>
                <Text fontSize="sm"><Text as="span" fontWeight="600">{t('expenseReport.chief')}</Text> {mission.members?.find(m => m.is_leader)?.user_name || '—'}</Text>
                <Text fontSize="sm"><Text as="span" fontWeight="600">{t('expenseReport.status')}</Text> {mission.status}</Text>
                <Text fontSize="sm"><Text as="span" fontWeight="600">{t('expenseReport.currency')}</Text> {cur}</Text>
              </VStack>
            </SimpleGrid>
          </Box>

          <Box overflowX="auto">
            <Box as="table" w="100%" borderWidth="1px" borderColor={borderColor} borderRadius="lg" overflow="hidden">
              <Box as="thead" bg="gray.100">
                <Box as="tr">
                  <Box as="th" p={3} textAlign="left" fontWeight="600" fontSize="sm">{t('expenseReport.designation')}</Box>
                  <Box as="th" p={3} textAlign="left" fontWeight="600" fontSize="sm">{t('expenseReport.quantity')}</Box>
                  <Box as="th" p={3} textAlign="right" fontWeight="600" fontSize="sm">{t('expenseReport.unitCost')}</Box>
                  <Box as="th" p={3} textAlign="right" fontWeight="600" fontSize="sm">{t('missionDetail.expenseReport.amount')} ({cur})</Box>
                </Box>
              </Box>
              <Box as="tbody">
                <Box as="tr" borderBottomWidth="1px" borderColor={borderColor}>
                  <Box as="td" p={3} fontSize="sm">{t('expenseReport.perDiem')}</Box>
                  <Box as="td" p={3} fontSize="sm">{breakdown.days} {t('expenseReport.days')}</Box>
                  <Box as="td" p={3} fontSize="sm" textAlign="right">{Number(mission.cost_per_diem).toLocaleString(dateLocale)}</Box>
                  <Box as="td" p={3} fontSize="sm" textAlign="right" fontWeight="500">{Number(breakdown.perDiemTotal).toLocaleString(dateLocale)}</Box>
                </Box>
                <Box as="tr" borderBottomWidth="1px" borderColor={borderColor}>
                  <Box as="td" p={3} fontSize="sm">{t('expenseReport.accommodation')}</Box>
                  <Box as="td" p={3} fontSize="sm">{breakdown.accomDays} {t('expenseReport.nights')}</Box>
                  <Box as="td" p={3} fontSize="sm" textAlign="right">{Number(mission.cost_accommodation).toLocaleString(dateLocale)}</Box>
                  <Box as="td" p={3} fontSize="sm" textAlign="right" fontWeight="500">{Number(breakdown.accomTotal).toLocaleString(dateLocale)}</Box>
                </Box>
                <Box as="tr" borderBottomWidth="1px" borderColor={borderColor}>
                  <Box as="td" p={3} fontSize="sm">{t('expenseReport.transport')}</Box>
                  <Box as="td" p={3} fontSize="sm">—</Box>
                  <Box as="td" p={3} fontSize="sm" textAlign="right">—</Box>
                  <Box as="td" p={3} fontSize="sm" textAlign="right" fontWeight="500">{Number(breakdown.transport).toLocaleString(dateLocale)}</Box>
                </Box>
                <Box as="tr" borderBottomWidth="1px" borderColor={borderColor}>
                  <Box as="td" p={3} fontSize="sm">{t('expenseReport.otherExpenses')}</Box>
                  <Box as="td" p={3} fontSize="sm">—</Box>
                  <Box as="td" p={3} fontSize="sm" textAlign="right">—</Box>
                  <Box as="td" p={3} fontSize="sm" textAlign="right" fontWeight="500">{Number(breakdown.other).toLocaleString(dateLocale)}</Box>
                </Box>
                <Box as="tr" bg="blue.50">
                  <Box as="td" p={3} fontWeight="700" fontSize="sm" colSpan="3">{t('expenseReport.total')}</Box>
                  <Box as="td" p={3} fontWeight="700" fontSize="sm" textAlign="right" color="blue.600">
                    {Number(breakdown.total).toLocaleString(dateLocale)} {cur}
                  </Box>
                </Box>
              </Box>
            </Box>
          </Box>
        </VStack>
      </Box>
    </VStack>
  );
};

export default MissionDetail;
