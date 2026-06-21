import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box, Heading, Text, Button, HStack, VStack, Badge, Icon,
  Tabs, TabList, TabPanels, Tab, TabPanel,
  useToast, useColorModeValue, Spinner, Divider,
  List, ListItem, ListIcon, Tag, TagLabel,
  Alert, AlertIcon, AlertDescription,
  Modal, ModalOverlay, ModalContent, ModalHeader, ModalBody,
  ModalFooter, ModalCloseButton, useDisclosure, Select,
} from '@chakra-ui/react';
import {
  FiMic, FiCpu, FiCheck, FiClock, FiAlertTriangle,
  FiArrowLeft, FiShare2, FiCalendar, FiUser,
} from 'react-icons/fi';
import { useMeetingService } from '../services/meetingService';
import { useProjectService } from '../services/projectService';

const priorityColors = { 1: 'gray', 2: 'blue', 3: 'orange', 4: 'red' };
const priorityLabels = { 1: 'Low', 2: 'Medium', 3: 'High', 4: 'Critical' };
const statusColors = {
  pending: 'yellow', in_progress: 'blue', completed: 'green', cancelled: 'gray',
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
  const { isOpen, onOpen, onClose } = useDisclosure();

  const { getMeeting, processMeeting, convertActionItem } = useMeetingService();
  const { getProjects } = useProjectService();
  const toast = useToast();
  const bgColor = useColorModeValue('white', 'gray.800');

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
      const result = await processMeeting(id);
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

  const handleConvertItem = async () => {
    if (!selectedProject || !convertingItemId) return;
    try {
      await convertActionItem(id, convertingItemId, selectedProject);
      toast({ title: 'Action item converted to task', status: 'success', duration: 3000 });
      onClose();
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
    onOpen();
  };

  if (loading) {
    return <Box textAlign="center" py={20}><Spinner size="xl" /></Box>;
  }

  if (!meeting) {
    return <Text>Meeting not found</Text>;
  }

  return (
    <Box>
      <Button leftIcon={<FiArrowLeft />} variant="ghost" mb={4} onClick={() => navigate('/meetings')}>
        Back to Meetings
      </Button>

      <Box bg={bgColor} borderRadius="lg" shadow="sm" p={6} mb={6}>
        <HStack justify="space-between" mb={4}>
          <VStack align="start" spacing={1}>
            <Heading size="lg">{meeting.title}</Heading>
            {meeting.description && <Text color="gray.500">{meeting.description}</Text>}
          </VStack>
          <HStack>
            {!meeting.ai_processed && (
              <Button
                leftIcon={<FiCpu />}
                colorScheme="purple"
                onClick={handleProcess}
                isLoading={processing}
                loadingText="Processing..."
              >
                Process with AI
              </Button>
            )}
          </HStack>
        </HStack>

        <HStack spacing={4} flexWrap="wrap">
          <Badge colorScheme={meeting.status === 'completed' ? 'green' : 'blue'} fontSize="sm" px={3} py={1}>
            {meeting.status}
          </Badge>
          {meeting.scheduled_at && (
            <HStack>
              <Icon as={FiCalendar} />
              <Text fontSize="sm">{new Date(meeting.scheduled_at).toLocaleString()}</Text>
            </HStack>
          )}
          <HStack>
            <Icon as={FiUser} />
            <Text fontSize="sm">{meeting.participants_count || 0} participants</Text>
          </HStack>
          {meeting.ai_processed && (
            <Badge colorScheme="green"><Icon as={FiCheck} mr={1} />AI Processed</Badge>
          )}
        </HStack>

        {meeting.ai_processing_error && (
          <Alert status="warning" mt={4} borderRadius="md">
            <AlertIcon />
            <AlertDescription>{meeting.ai_processing_error}</AlertDescription>
          </Alert>
        )}
      </Box>

      <Tabs colorScheme="blue">
        <TabList>
          <Tab>Summary</Tab>
          <Tab>Action Items ({meeting.action_items?.length || 0})</Tab>
          <Tab>Transcript / Notes</Tab>
          <Tab>Participants ({meeting.participants?.length || 0})</Tab>
        </TabList>

        <TabPanels>
          {/* Summary Tab */}
          <TabPanel px={0}>
            {meeting.summary ? (
              <VStack spacing={6} align="stretch">
                <Box bg={bgColor} p={6} borderRadius="lg" shadow="sm">
                  <Heading size="sm" mb={3}>Summary</Heading>
                  <Text whiteSpace="pre-wrap">{meeting.summary.summary_text}</Text>
                  <Text fontSize="xs" color="gray.400" mt={2}>
                    Generated by {meeting.summary.model_used}
                  </Text>
                </Box>

                {meeting.summary.key_points?.length > 0 && (
                  <Box bg={bgColor} p={6} borderRadius="lg" shadow="sm">
                    <Heading size="sm" mb={3}>Key Points</Heading>
                    <List spacing={2}>
                      {meeting.summary.key_points.map((point, i) => (
                        <ListItem key={i}>
                          <ListIcon as={FiCheck} color="green.500" />
                          {point}
                        </ListItem>
                      ))}
                    </List>
                  </Box>
                )}

                {meeting.summary.decisions?.length > 0 && (
                  <Box bg={bgColor} p={6} borderRadius="lg" shadow="sm">
                    <Heading size="sm" mb={3}>Decisions</Heading>
                    <List spacing={2}>
                      {meeting.summary.decisions.map((decision, i) => (
                        <ListItem key={i}>
                          <ListIcon as={FiAlertTriangle} color="orange.500" />
                          {decision}
                        </ListItem>
                      ))}
                    </List>
                  </Box>
                )}

                {meeting.summary.follow_ups?.length > 0 && (
                  <Box bg={bgColor} p={6} borderRadius="lg" shadow="sm">
                    <Heading size="sm" mb={3}>Follow-ups</Heading>
                    <List spacing={2}>
                      {meeting.summary.follow_ups.map((item, i) => (
                        <ListItem key={i}>
                          <ListIcon as={FiClock} color="blue.500" />
                          {item}
                        </ListItem>
                      ))}
                    </List>
                  </Box>
                )}
              </VStack>
            ) : (
              <Box textAlign="center" py={10} bg={bgColor} borderRadius="lg">
                <Icon as={FiCpu} boxSize={12} color="gray.300" mb={4} />
                <Text color="gray.500">No summary yet. Click "Process with AI" to generate one.</Text>
              </Box>
            )}
          </TabPanel>

          {/* Action Items Tab */}
          <TabPanel px={0}>
            {meeting.action_items?.length > 0 ? (
              <VStack spacing={3} align="stretch">
                {meeting.action_items.map(item => (
                  <Box key={item.id} bg={bgColor} p={4} borderRadius="lg" shadow="sm">
                    <HStack justify="space-between">
                      <VStack align="start" spacing={1} flex={1}>
                        <HStack>
                          <Text fontWeight="600">{item.title}</Text>
                          <Badge colorScheme={priorityColors[item.priority]}>
                            {priorityLabels[item.priority]}
                          </Badge>
                          <Badge colorScheme={statusColors[item.status]}>
                            {item.status}
                          </Badge>
                        </HStack>
                        {item.description && <Text fontSize="sm" color="gray.500">{item.description}</Text>}
                        <HStack fontSize="xs" color="gray.400" spacing={4}>
                          {item.assigned_to_name && <Text>Assigned to: {item.assigned_to_name}</Text>}
                          {item.deadline && <Text>Deadline: {item.deadline}</Text>}
                        </HStack>
                      </VStack>
                      {!item.linked_task && (
                        <Button size="sm" colorScheme="blue" variant="outline" onClick={() => openConvertModal(item.id)}>
                          Convert to Task
                        </Button>
                      )}
                      {item.linked_task && (
                        <Tag colorScheme="green"><TagLabel>Linked to Task #{item.linked_task_id}</TagLabel></Tag>
                      )}
                    </HStack>
                  </Box>
                ))}
              </VStack>
            ) : (
              <Box textAlign="center" py={10} bg={bgColor} borderRadius="lg">
                <Text color="gray.500">No action items extracted yet.</Text>
              </Box>
            )}
          </TabPanel>

          {/* Transcript Tab */}
          <TabPanel px={0}>
            <VStack spacing={4} align="stretch">
              {meeting.transcript && (
                <Box bg={bgColor} p={6} borderRadius="lg" shadow="sm">
                  <Heading size="sm" mb={3}>Transcript</Heading>
                  <Text whiteSpace="pre-wrap">{meeting.transcript}</Text>
                </Box>
              )}
              {meeting.raw_notes && (
                <Box bg={bgColor} p={6} borderRadius="lg" shadow="sm">
                  <Heading size="sm" mb={3}>Notes</Heading>
                  <Text whiteSpace="pre-wrap">{meeting.raw_notes}</Text>
                </Box>
              )}
              {!meeting.transcript && !meeting.raw_notes && (
                <Box textAlign="center" py={10} bg={bgColor} borderRadius="lg">
                  <Text color="gray.500">No transcript or notes available.</Text>
                </Box>
              )}
            </VStack>
          </TabPanel>

          {/* Participants Tab */}
          <TabPanel px={0}>
            {meeting.participants?.length > 0 ? (
              <VStack spacing={2} align="stretch">
                {meeting.participants.map(p => (
                  <Box key={p.id} bg={bgColor} p={4} borderRadius="lg" shadow="sm">
                    <HStack justify="space-between">
                      <HStack>
                        <Icon as={FiUser} />
                        <Text fontWeight="500">{p.username}</Text>
                        <Text fontSize="sm" color="gray.500">{p.email}</Text>
                      </HStack>
                      <HStack>
                        <Badge>{p.role}</Badge>
                        {p.attended && <Badge colorScheme="green">Attended</Badge>}
                      </HStack>
                    </HStack>
                  </Box>
                ))}
              </VStack>
            ) : (
              <Box textAlign="center" py={10} bg={bgColor} borderRadius="lg">
                <Text color="gray.500">No participants added.</Text>
              </Box>
            )}
          </TabPanel>
        </TabPanels>
      </Tabs>

      {/* Convert to Task Modal */}
      <Modal isOpen={isOpen} onClose={onClose}>
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
            <Button variant="ghost" mr={3} onClick={onClose}>Cancel</Button>
            <Button colorScheme="blue" onClick={handleConvertItem} isDisabled={!selectedProject}>
              Convert
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  );
};

export default MeetingDetail;
