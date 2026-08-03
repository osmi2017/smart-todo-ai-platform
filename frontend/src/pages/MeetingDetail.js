import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link as RouterLink } from 'react-router-dom';
import {
  Box, Heading, Text, Button, HStack, VStack, Badge, Icon,
  Tabs, TabList, TabPanels, Tab, TabPanel,
  useToast, useColorModeValue, Spinner, Divider,
  List, ListItem, ListIcon, Tag, TagLabel,
  Alert, AlertIcon, AlertDescription,
  Modal, ModalOverlay, ModalContent, ModalHeader, ModalBody,
  ModalFooter, ModalCloseButton, useDisclosure, Select,
  Flex, IconButton, Tooltip, Progress,
  AlertDialog, AlertDialogOverlay, AlertDialogContent,
  AlertDialogHeader, AlertDialogBody, AlertDialogFooter,
  Skeleton, SkeletonText, SimpleGrid, Stat, StatLabel, StatNumber,
  Card, CardBody, Input, InputGroup, InputLeftElement,
} from '@chakra-ui/react';
import {
  FiMic, FiCpu, FiCheck, FiClock, FiAlertTriangle,
  FiArrowLeft, FiShare2, FiCalendar, FiUser, FiEdit2,
  FiPlay, FiXCircle, FiRefreshCw, FiFileText, FiTrash2,
  FiExternalLink, FiVideo, FiUsers, FiPlus, FiCopy, FiSearch,
} from 'react-icons/fi';
import { useMeetingService } from '../services/meetingService';
import { useProjectService } from '../services/projectService';
import { useAuth } from '../context/AuthContext';

const priorityColors = { 1: 'gray', 2: 'blue', 3: 'orange', 4: 'red' };
const priorityLabels = { 1: 'Low', 2: 'Medium', 3: 'High', 4: 'Critical' };
const actionItemStatusColors = {
  pending: 'yellow', in_progress: 'blue', completed: 'green', cancelled: 'gray',
};

const statusConfig = {
  scheduled: { color: 'blue', label: 'Scheduled', icon: FiClock },
  in_progress: { color: 'orange', label: 'In Progress', icon: FiPlay },
  completed: { color: 'green', label: 'Completed', icon: FiCheck },
  cancelled: { color: 'red', label: 'Cancelled', icon: FiXCircle },
};

const MeetingDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [meeting, setMeeting] = useState(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState('');
  const [convertingItemId, setConvertingItemId] = useState(null);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [updatingItemId, setUpdatingItemId] = useState(null);
  const [tabIndex, setTabIndex] = useState(0);
  const [copied, setCopied] = useState(false);
  const [availableUsers, setAvailableUsers] = useState([]);
  const [addSearch, setAddSearch] = useState('');
  const [addingParticipant, setAddingParticipant] = useState(false);
  const { isOpen: isConvertOpen, onOpen: onConvertOpen, onClose: onConvertClose } = useDisclosure();
  const { isOpen: isDeleteOpen, onOpen: onDeleteOpen, onClose: onDeleteClose } = useDisclosure();
  const { isOpen: isAddOpen, onOpen: onAddOpen, onClose: onAddClose } = useDisclosure();
  const deleteRef = React.useRef();

  const { getMeeting, processMeeting, convertActionItem, updateMeeting, deleteMeeting, updateActionItem, removeParticipant, addParticipant } = useMeetingService();
  const { getProjects } = useProjectService();
  const { axiosInstance } = useAuth();
  const toast = useToast();
  const bgColor = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.600');
  const codeBg = useColorModeValue('gray.50', 'gray.900');

  useEffect(() => {
    loadMeeting();
    loadProjects();
  }, [id]);

  const loadMeeting = async () => {
    setLoading(true);
    try {
      const data = await getMeeting(id);
      setMeeting(data);
    } catch (error) {
      toast({ title: 'Error loading meeting', status: 'error', duration: 3000 });
    } finally {
      setLoading(false);
    }
  };

  const loadProjects = async () => {
    try {
      const data = await getProjects();
      setProjects(Array.isArray(data) ? data : data.results || []);
    } catch (error) {
      // non-critical
    }
  };

  const handleProcess = async () => {
    setProcessing(true);
    try {
      await processMeeting(id);
      toast({ title: 'Meeting processed by AI', status: 'success', duration: 3000 });
      await loadMeeting();
    } catch (error) {
      toast({
        title: 'Error processing meeting',
        description: error.response?.data?.error || 'Unknown error',
        status: 'error',
        duration: 5000,
      });
    } finally {
      setProcessing(false);
    }
  };

  const handleStatusChange = async (newStatus) => {
    setUpdatingStatus(true);
    try {
      await updateMeeting(id, { status: newStatus });
      setMeeting(prev => ({ ...prev, status: newStatus }));
      toast({ title: `Meeting marked as ${newStatus.replace('_', ' ')}`, status: 'success', duration: 2000 });
    } catch (error) {
      toast({ title: 'Error updating status', status: 'error', duration: 3000 });
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleActionItemStatusChange = async (item, newStatus) => {
    if (newStatus === item.status) return;
    setUpdatingItemId(item.id);
    try {
      await updateActionItem(item.id, { status: newStatus });
      setMeeting(prev => ({
        ...prev,
        action_items: prev.action_items?.map(i =>
          i.id === item.id ? { ...i, status: newStatus } : i
        ),
      }));
    } catch (error) {
      toast({ title: 'Error updating action item', status: 'error', duration: 3000 });
    } finally {
      setUpdatingItemId(null);
    }
  };

  const handleRemoveParticipant = async (participant) => {
    try {
      await removeParticipant(id, participant.user);
      setMeeting(prev => ({
        ...prev,
        participants: prev.participants?.filter(p => p.id !== participant.id),
      }));
      toast({ title: 'Participant removed', status: 'success', duration: 2000 });
    } catch (error) {
      toast({
        title: 'Error removing participant',
        description: error.response?.data?.error || 'Unknown error',
        status: 'error',
        duration: 3000,
      });
    }
  };

  const handleActionItemPriorityChange = async (item, newPriority) => {
    if (String(item.priority) === String(newPriority)) return;
    setUpdatingItemId(item.id);
    try {
      await updateActionItem(item.id, { priority: parseInt(newPriority, 10) });
      setMeeting(prev => ({
        ...prev,
        action_items: prev.action_items?.map(i =>
          i.id === item.id ? { ...i, priority: parseInt(newPriority, 10) } : i
        ),
      }));
    } catch (error) {
      toast({ title: 'Error updating action item', status: 'error', duration: 3000 });
    } finally {
      setUpdatingItemId(null);
    }
  };

  const openAddParticipant = async () => {
    try {
      const response = await axiosInstance.get('/users/');
      setAvailableUsers(Array.isArray(response.data) ? response.data : response.data.results || []);
    } catch (error) {
      toast({ title: 'Unable to load users', status: 'error', duration: 3000 });
    }
    setAddSearch('');
    onAddOpen();
  };

  const handleAddParticipant = async (user) => {
    if (addingParticipant) return;
    setAddingParticipant(true);
    try {
      await addParticipant(id, user.id);
      toast({ title: 'Participant added', status: 'success', duration: 2000 });
      await loadMeeting();
      onAddClose();
    } catch (error) {
      toast({
        title: 'Error adding participant',
        description: error.response?.data?.error || 'Unknown error',
        status: 'error',
        duration: 3000,
      });
    } finally {
      setAddingParticipant(false);
    }
  };

  const copySummary = async () => {
    try {
      await navigator.clipboard.writeText(meeting.summary?.summary_text || '');
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      // clipboard unavailable
    }
  };

  const handleDelete = async () => {
    try {
      await deleteMeeting(id);
      toast({ title: 'Meeting deleted', status: 'success', duration: 2000 });
      navigate('/meetings');
    } catch (error) {
      toast({ title: 'Error deleting meeting', status: 'error', duration: 3000 });
    } finally {
      onDeleteClose();
    }
  };

  const handleConvertItem = async () => {
    if (!selectedProject || !convertingItemId) return;
    try {
      await convertActionItem(id, convertingItemId, selectedProject);
      toast({ title: 'Action item converted to task', status: 'success', duration: 3000 });
      onConvertClose();
      await loadMeeting();
    } catch (error) {
      toast({
        title: 'Error converting item',
        description: error.response?.data?.error || 'Unknown error',
        status: 'error',
        duration: 3000,
      });
    }
  };

  const openConvertModal = (itemId) => {
    setConvertingItemId(itemId);
    setSelectedProject('');
    onConvertOpen();
  };

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

  if (!meeting) {
    return (
      <Box textAlign="center" py={20}>
        <Icon as={FiCalendar} boxSize={16} color="gray.300" mb={4} />
        <Heading size="md" color="gray.500" mb={2}>Meeting not found</Heading>
        <Button as={RouterLink} to="/meetings" leftIcon={<FiArrowLeft />} mt={4}>
          Back to Meetings
        </Button>
      </Box>
    );
  }

  const status = statusConfig[meeting.status] || statusConfig.scheduled;
  const actionItemsCount = meeting.action_items?.length || 0;
  const completedItems = meeting.action_items?.filter(i => i.status === 'completed').length || 0;

  const participantUserIds = new Set((meeting.participants || []).map(p => p.user));
  const availableToAdd = availableUsers.filter(u => !participantUserIds.has(u.id)).filter(u => {
    if (!addSearch.trim()) return true;
    const q = addSearch.trim().toLowerCase();
    return (u.username || '').toLowerCase().includes(q) ||
      (u.email || '').toLowerCase().includes(q) ||
      (u.first_name || '').toLowerCase().includes(q);
  });

  const kpiCards = [
    {
      label: 'Scheduled',
      value: meeting.scheduled_at ? new Date(meeting.scheduled_at).toLocaleDateString() : '—',
      icon: FiCalendar,
      color: 'blue.500',
    },
    {
      label: 'Participants',
      value: meeting.participants_count || 0,
      icon: FiUsers,
      color: 'green.500',
      onClick: () => setTabIndex(3),
    },
    {
      label: 'Action Items',
      value: actionItemsCount > 0 ? `${completedItems}/${actionItemsCount}` : '0',
      icon: FiCheck,
      color: 'orange.500',
      onClick: () => setTabIndex(1),
    },
    {
      label: 'Duration',
      value: meeting.duration_minutes ? `${meeting.duration_minutes} min` : '—',
      icon: FiClock,
      color: 'purple.500',
    },
  ];

  return (
    <Box>
      <Button leftIcon={<FiArrowLeft />} variant="ghost" mb={4} onClick={() => navigate('/meetings')}>
        Back to Meetings
      </Button>

      {/* Header Card */}
      <Box bg={bgColor} borderRadius="xl" shadow="sm" borderWidth="1px" borderColor={borderColor} overflow="hidden" mb={6}>
        <Box h="4px" bg={`${status.color}.400`} />
        <Box p={6}>
          <Flex justify="space-between" align="flex-start" mb={4} wrap="wrap" gap={3}>
            <VStack align="start" spacing={1} flex={1}>
              <Heading size="lg">{meeting.title}</Heading>
              {meeting.description && <Text color="gray.500" fontSize="md">{meeting.description}</Text>}
            </VStack>
            <HStack spacing={2}>
              <Tooltip label="Refresh">
                <IconButton
                  icon={<FiRefreshCw />}
                  variant="ghost"
                  size="sm"
                  onClick={loadMeeting}
                  aria-label="Refresh meeting"
                />
              </Tooltip>
              {(meeting.status === 'scheduled' || meeting.status === 'in_progress') && (
                <Button
                  as={RouterLink}
                  to={`/meetings/${id}/video`}
                  leftIcon={<FiVideo />}
                  colorScheme="green"
                  size="sm"
                >
                  Join Video Call
                </Button>
              )}
              <Tooltip label="Edit meeting">
                <IconButton
                  as={RouterLink}
                  to={`/meetings/${id}/edit`}
                  icon={<FiEdit2 />}
                  variant="outline"
                  size="sm"
                  aria-label="Edit meeting"
                />
              </Tooltip>
              <Tooltip label="Delete meeting">
                <IconButton
                  icon={<FiTrash2 />}
                  variant="outline"
                  colorScheme="red"
                  size="sm"
                  onClick={onDeleteOpen}
                  aria-label="Delete meeting"
                />
              </Tooltip>
              {!meeting.ai_processed ? (
                <Button
                  leftIcon={<FiCpu />}
                  colorScheme="purple"
                  onClick={handleProcess}
                  isLoading={processing}
                  loadingText="Processing..."
                  size="sm"
                >
                  Process with AI
                </Button>
              ) : (
                <Button
                  leftIcon={<FiRefreshCw />}
                  variant="outline"
                  colorScheme="purple"
                  onClick={handleProcess}
                  isLoading={processing}
                  loadingText="Reprocessing..."
                  size="sm"
                >
                  Reprocess
                </Button>
              )}
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
              {status.label}
            </Badge>
            {meeting.scheduled_at && (
              <HStack spacing={1} color="gray.500">
                <Icon as={FiCalendar} />
                <Text fontSize="sm">{new Date(meeting.scheduled_at).toLocaleString()}</Text>
              </HStack>
            )}
            <HStack spacing={1} color="gray.500">
              <Icon as={FiUser} />
              <Text fontSize="sm">{meeting.participants_count || 0} participants</Text>
            </HStack>
            {meeting.ai_processed && (
              <Badge colorScheme="green" variant="subtle" borderRadius="full">
                <Icon as={FiCheck} mr={1} />AI Processed
              </Badge>
            )}
            {meeting.duration_minutes && (
              <HStack spacing={1} color="gray.500">
                <Icon as={FiClock} />
                <Text fontSize="sm">{meeting.duration_minutes} min</Text>
              </HStack>
            )}
          </HStack>

          {/* Status management buttons */}
          <HStack spacing={2} flexWrap="wrap">
            {meeting.status === 'scheduled' && (
              <>
                <Button
                  size="sm"
                  leftIcon={<FiPlay />}
                  colorScheme="orange"
                  variant="outline"
                  onClick={() => handleStatusChange('in_progress')}
                  isLoading={updatingStatus}
                >
                  Start Meeting
                </Button>
                <Button
                  size="sm"
                  leftIcon={<FiXCircle />}
                  colorScheme="red"
                  variant="ghost"
                  onClick={() => handleStatusChange('cancelled')}
                  isLoading={updatingStatus}
                >
                  Cancel
                </Button>
              </>
            )}
            {meeting.status === 'in_progress' && (
              <Button
                size="sm"
                leftIcon={<FiCheck />}
                colorScheme="green"
                variant="outline"
                onClick={() => handleStatusChange('completed')}
                isLoading={updatingStatus}
              >
                Complete Meeting
              </Button>
            )}
            {meeting.status === 'cancelled' && (
              <Button
                size="sm"
                leftIcon={<FiClock />}
                variant="outline"
                onClick={() => handleStatusChange('scheduled')}
                isLoading={updatingStatus}
              >
                Reschedule
              </Button>
            )}
          </HStack>
        </Box>

        {meeting.ai_processing_error && (
          <Alert status="warning" borderRadius={0}>
            <AlertIcon />
            <AlertDescription>{meeting.ai_processing_error}</AlertDescription>
          </Alert>
        )}
      </Box>

      {/* KPIs cliquables */}
      <SimpleGrid columns={{ base: 2, md: 4 }} spacing={4} mb={6}>
        {kpiCards.map(card => (
          <Card
            key={card.label}
            onClick={card.onClick}
            cursor={card.onClick ? 'pointer' : 'default'}
            _hover={card.onClick ? { shadow: 'md', transform: 'translateY(-2px)' } : undefined}
            transition="all 0.2s"
          >
            <CardBody>
              <Stat>
                <StatLabel>{card.label}</StatLabel>
                <StatNumber color={card.color}>{card.value}</StatNumber>
              </Stat>
            </CardBody>
          </Card>
        ))}
      </SimpleGrid>

      {/* Action Items Progress (shown if there are items) */}
      {actionItemsCount > 0 && (
        <Box bg={bgColor} borderRadius="xl" shadow="sm" borderWidth="1px" borderColor={borderColor} p={4} mb={6}>
          <Flex justify="space-between" align="center" mb={2}>
            <Text fontWeight="600" fontSize="sm">Action Items Progress</Text>
            <Text fontSize="sm" color="gray.500">{completedItems}/{actionItemsCount} completed</Text>
          </Flex>
          <Progress
            value={(completedItems / actionItemsCount) * 100}
            colorScheme="green"
            borderRadius="full"
            size="sm"
          />
        </Box>
      )}

      {/* Tabs */}
      <Box bg={bgColor} borderRadius="xl" shadow="sm" borderWidth="1px" borderColor={borderColor} overflow="hidden">
        <Tabs colorScheme="blue" index={tabIndex} onChange={setTabIndex}>
          <TabList px={4}>
            <Tab>Summary</Tab>
            <Tab>
              Action Items
              {actionItemsCount > 0 && (
                <Badge ml={2} colorScheme="blue" borderRadius="full">{actionItemsCount}</Badge>
              )}
            </Tab>
            <Tab>Transcript / Notes</Tab>
            <Tab>
              Participants
              {(meeting.participants?.length || 0) > 0 && (
                <Badge ml={2} colorScheme="gray" borderRadius="full">{meeting.participants?.length}</Badge>
              )}
            </Tab>
          </TabList>

          <TabPanels>
            {/* Summary Tab */}
            <TabPanel>
              {meeting.summary ? (
                <VStack spacing={6} align="stretch">
                  <Box>
                    <Flex justify="space-between" align="center" mb={3}>
                      <Heading size="sm">Summary</Heading>
                      <Button
                        size="xs"
                        variant="ghost"
                        leftIcon={<FiCopy />}
                        onClick={copySummary}
                      >
                        {copied ? 'Copied!' : 'Copy'}
                      </Button>
                    </Flex>
                    <Text whiteSpace="pre-wrap" lineHeight="tall">{meeting.summary.summary_text}</Text>
                    <Text fontSize="xs" color="gray.400" mt={3}>
                      Generated by {meeting.summary.model_used} on {new Date(meeting.summary.generated_at).toLocaleString()}
                    </Text>
                  </Box>

                  {meeting.summary.key_points?.length > 0 && (
                    <Box>
                      <Heading size="sm" mb={3}>Key Points</Heading>
                      <List spacing={2}>
                        {meeting.summary.key_points.map((point, i) => (
                          <ListItem key={i} display="flex" alignItems="flex-start">
                            <ListIcon as={FiCheck} color="green.500" mt={1} />
                            <Text>{point}</Text>
                          </ListItem>
                        ))}
                      </List>
                    </Box>
                  )}

                  {meeting.summary.decisions?.length > 0 && (
                    <Box>
                      <Heading size="sm" mb={3}>Decisions</Heading>
                      <List spacing={2}>
                        {meeting.summary.decisions.map((decision, i) => (
                          <ListItem key={i} display="flex" alignItems="flex-start">
                            <ListIcon as={FiAlertTriangle} color="orange.500" mt={1} />
                            <Text>{decision}</Text>
                          </ListItem>
                        ))}
                      </List>
                    </Box>
                  )}

                  {meeting.summary.follow_ups?.length > 0 && (
                    <Box>
                      <Heading size="sm" mb={3}>Follow-ups</Heading>
                      <List spacing={2}>
                        {meeting.summary.follow_ups.map((item, i) => (
                          <ListItem key={i} display="flex" alignItems="flex-start">
                            <ListIcon as={FiClock} color="blue.500" mt={1} />
                            <Text>{item}</Text>
                          </ListItem>
                        ))}
                      </List>
                    </Box>
                  )}
                </VStack>
              ) : (
                <Box textAlign="center" py={12}>
                  <Icon as={FiCpu} boxSize={16} color="gray.300" mb={4} />
                  <Heading size="md" color="gray.500" mb={2}>No summary yet</Heading>
                  <Text color="gray.400" mb={4}>Click "Process with AI" to generate a summary with key points and decisions.</Text>
                  <Button
                    leftIcon={<FiCpu />}
                    colorScheme="purple"
                    onClick={handleProcess}
                    isLoading={processing}
                  >
                    Process with AI
                  </Button>
                </Box>
              )}
            </TabPanel>

            {/* Action Items Tab */}
            <TabPanel>
              {actionItemsCount > 0 ? (
                <VStack spacing={3} align="stretch">
                  {meeting.action_items.map(item => (
                    <Box
                      key={item.id}
                      p={4}
                      borderRadius="lg"
                      borderWidth="1px"
                      borderColor={borderColor}
                      borderLeftWidth="4px"
                      borderLeftColor={`${priorityColors[item.priority]}.400`}
                    >
                      <Flex justify="space-between" align="flex-start" wrap="wrap" gap={2}>
                        <VStack align="start" spacing={1} flex={1}>
                          <HStack flexWrap="wrap">
                            <Text fontWeight="600">{item.title}</Text>
                            <Badge colorScheme={priorityColors[item.priority]} size="sm">
                              {priorityLabels[item.priority]}
                            </Badge>
                            <Select
                              size="xs"
                              variant="filled"
                              width="auto"
                              value={String(item.priority)}
                              isLoading={updatingItemId === item.id}
                              onChange={(e) => handleActionItemPriorityChange(item, e.target.value)}
                            >
                              <option value="1">Low</option>
                              <option value="2">Medium</option>
                              <option value="3">High</option>
                              <option value="4">Critical</option>
                            </Select>
                            <Select
                              size="xs"
                              variant="filled"
                              width="auto"
                              value={item.status}
                              colorScheme={actionItemStatusColors[item.status]}
                              isLoading={updatingItemId === item.id}
                              onChange={(e) => handleActionItemStatusChange(item, e.target.value)}
                            >
                              <option value="pending">pending</option>
                              <option value="in_progress">in_progress</option>
                              <option value="completed">completed</option>
                              <option value="cancelled">cancelled</option>
                            </Select>
                          </HStack>
                          {item.description && <Text fontSize="sm" color="gray.500">{item.description}</Text>}
                          <HStack fontSize="xs" color="gray.400" spacing={4} flexWrap="wrap">
                            {item.assigned_to_name && (
                              <HStack spacing={1}>
                                <Icon as={FiUser} />
                                <Text>{item.assigned_to_name}</Text>
                              </HStack>
                            )}
                            {item.deadline && (
                              <HStack spacing={1}>
                                <Icon as={FiCalendar} />
                                <Text>{new Date(item.deadline).toLocaleDateString()}</Text>
                              </HStack>
                            )}
                          </HStack>
                        </VStack>
                        {!item.linked_task ? (
                          <Button size="sm" colorScheme="blue" variant="outline" onClick={() => openConvertModal(item.id)} leftIcon={<FiExternalLink />}>
                            Convert to Task
                          </Button>
                        ) : (
                          <Tag
                            as={RouterLink}
                            to={`/tasks/${item.linked_task_id}`}
                            colorScheme="green"
                            size="md"
                            cursor="pointer"
                            _hover={{ textDecoration: 'underline' }}
                          >
                            <TagLabel>Linked to Task #{item.linked_task_id}</TagLabel>
                          </Tag>
                        )}
                      </Flex>
                    </Box>
                  ))}
                </VStack>
              ) : (
                <Box textAlign="center" py={12}>
                  <Icon as={FiFileText} boxSize={16} color="gray.300" mb={4} />
                  <Heading size="md" color="gray.500" mb={2}>No action items yet</Heading>
                  <Text color="gray.400">Process the meeting with AI to extract action items.</Text>
                </Box>
              )}
            </TabPanel>

            {/* Transcript Tab */}
            <TabPanel>
              <VStack spacing={4} align="stretch">
                {meeting.transcript && (
                  <Box>
                    <Flex justify="space-between" align="center" mb={3}>
                      <Heading size="sm">Transcript</Heading>
                      <Badge variant="outline"><Icon as={FiMic} mr={1} />Audio</Badge>
                    </Flex>
                    <Box bg={codeBg} p={4} borderRadius="lg" borderWidth="1px" borderColor={borderColor}>
                      <Text whiteSpace="pre-wrap" fontSize="sm" lineHeight="tall">{meeting.transcript}</Text>
                    </Box>
                  </Box>
                )}
                {meeting.raw_notes && (
                  <Box>
                    <Flex justify="space-between" align="center" mb={3}>
                      <Heading size="sm">Notes</Heading>
                      <HStack spacing={2}>
                        <Badge variant="outline"><Icon as={FiFileText} mr={1} />Text</Badge>
                        <Tooltip label="Edit notes">
                          <IconButton
                            as={RouterLink}
                            to={`/meetings/${id}/edit`}
                            icon={<FiEdit2 />}
                            variant="ghost"
                            size="sm"
                            aria-label="Edit notes"
                          />
                        </Tooltip>
                      </HStack>
                    </Flex>
                    <Box bg={codeBg} p={4} borderRadius="lg" borderWidth="1px" borderColor={borderColor}>
                      <Text whiteSpace="pre-wrap" fontSize="sm" lineHeight="tall">{meeting.raw_notes}</Text>
                    </Box>
                  </Box>
                )}
                {!meeting.transcript && !meeting.raw_notes && (
                  <Box textAlign="center" py={12}>
                    <Icon as={FiFileText} boxSize={16} color="gray.300" mb={4} />
                    <Heading size="md" color="gray.500" mb={2}>No transcript or notes</Heading>
                    <Text color="gray.400" mb={4}>Add meeting notes by editing this meeting.</Text>
                    <Button as={RouterLink} to={`/meetings/${id}/edit`} leftIcon={<FiEdit2 />} variant="outline">
                      Edit Meeting
                    </Button>
                  </Box>
                )}
              </VStack>
            </TabPanel>

            {/* Participants Tab */}
            <TabPanel>
              <Flex justify="space-between" align="center" mb={4}>
                <Text fontWeight="600" fontSize="sm">Participants</Text>
                <Button
                  size="xs"
                  colorScheme="blue"
                  variant="outline"
                  leftIcon={<FiPlus />}
                  onClick={openAddParticipant}
                >
                  Add participant
                </Button>
              </Flex>
              {meeting.participants?.length > 0 ? (
                <VStack spacing={2} align="stretch">
                  {meeting.participants.map(p => (
                    <Flex
                      key={p.id}
                      p={4}
                      borderRadius="lg"
                      borderWidth="1px"
                      borderColor={borderColor}
                      justify="space-between"
                      align="center"
                    >
                      <HStack>
                        <Icon as={FiUser} color="gray.400" />
                        <Box>
                          <Text fontWeight="500">{p.username}</Text>
                          {p.email && <Text fontSize="xs" color="gray.500">{p.email}</Text>}
                        </Box>
                      </HStack>
                      <HStack>
                        <Badge textTransform="capitalize">{p.role}</Badge>
                        {p.attended && <Badge colorScheme="green">Attended</Badge>}
                        {p.role !== 'organizer' && (
                          <Tooltip label="Remove participant">
                            <IconButton
                              icon={<FiXCircle />}
                              variant="ghost"
                              size="sm"
                              colorScheme="red"
                              aria-label="Remove participant"
                              onClick={() => handleRemoveParticipant(p)}
                            />
                          </Tooltip>
                        )}
                      </HStack>
                    </Flex>
                  ))}
                </VStack>
              ) : (
                <Box textAlign="center" py={12}>
                  <Icon as={FiUser} boxSize={16} color="gray.300" mb={4} />
                  <Heading size="md" color="gray.500" mb={2}>No participants</Heading>
                  <Text color="gray.400">No participants have been added to this meeting yet.</Text>
                </Box>
              )}
            </TabPanel>
          </TabPanels>
        </Tabs>
      </Box>

      {/* Convert to Task Modal */}
      <Modal isOpen={isConvertOpen} onClose={onConvertClose}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Convert to Task</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <Text mb={3}>Select a project for this task:</Text>
            <Select
              placeholder="Select project"
              value={selectedProject}
              onChange={(e) => setSelectedProject(e.target.value)}
            >
              {projects.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </Select>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={onConvertClose}>Cancel</Button>
            <Button colorScheme="blue" onClick={handleConvertItem} isDisabled={!selectedProject}>
              Convert
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Add Participant Modal */}
      <Modal isOpen={isAddOpen} onClose={onAddClose}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Add Participant</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <InputGroup mb={3}>
              <InputLeftElement pointerEvents="none">
                <Icon as={FiSearch} color="gray.400" />
              </InputLeftElement>
              <Input
                placeholder="Search by name or email"
                value={addSearch}
                onChange={(e) => setAddSearch(e.target.value)}
              />
            </InputGroup>
            <VStack spacing={2} align="stretch" maxH="60vh" overflowY="auto">
              {availableToAdd.length === 0 ? (
                <Text color="gray.400" textAlign="center" py={6}>
                  {availableUsers.length === 0 ? 'No users available.' : 'No matching users.'}
                </Text>
              ) : (
                availableToAdd.map(user => (
                  <Flex
                    key={user.id}
                    p={3}
                    borderRadius="lg"
                    borderWidth="1px"
                    borderColor={borderColor}
                    justify="space-between"
                    align="center"
                  >
                    <HStack>
                      <Icon as={FiUser} color="gray.400" />
                      <Box>
                        <Text fontWeight="500">{user.first_name || user.last_name ? `${user.first_name} ${user.last_name}`.trim() : user.username}</Text>
                        <Text fontSize="xs" color="gray.500">{user.email}</Text>
                      </Box>
                    </HStack>
                    <Button
                      size="xs"
                      colorScheme="blue"
                      isLoading={addingParticipant}
                      onClick={() => handleAddParticipant(user)}
                    >
                      Add
                    </Button>
                  </Flex>
                ))
              )}
            </VStack>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" onClick={onAddClose}>Close</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Delete Confirmation */}
      <AlertDialog isOpen={isDeleteOpen} leastDestructiveRef={deleteRef} onClose={onDeleteClose}>
        <AlertDialogOverlay>
          <AlertDialogContent>
            <AlertDialogHeader fontSize="lg" fontWeight="bold">Delete Meeting</AlertDialogHeader>
            <AlertDialogBody>Are you sure? This will delete the meeting, its summary, and all action items.</AlertDialogBody>
            <AlertDialogFooter>
              <Button ref={deleteRef} onClick={onDeleteClose}>Cancel</Button>
              <Button colorScheme="red" onClick={handleDelete} ml={3}>Delete</Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialogOverlay>
      </AlertDialog>
    </Box>
  );
};

export default MeetingDetail;
