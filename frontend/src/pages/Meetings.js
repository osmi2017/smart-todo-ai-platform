import React, { useState, useEffect } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import {
  Box, Heading, Button, HStack, VStack, Text, Badge, Icon,
  SimpleGrid, IconButton,
  useToast, useColorModeValue, Spinner,
  Input, Select, InputGroup, InputLeftElement,
  Menu, MenuButton, MenuList, MenuItem,
  Flex, Avatar, Tooltip,
  AlertDialog, AlertDialogOverlay, AlertDialogContent,
  AlertDialogHeader, AlertDialogBody, AlertDialogFooter,
  useDisclosure,
} from '@chakra-ui/react';
import {
  FiPlus, FiSearch, FiMoreVertical, FiCalendar, FiMic,
  FiFileText, FiTrash2, FiEye, FiCpu, FiEdit2, FiUsers,
  FiPlay, FiCheck, FiXCircle, FiClock, FiVideo,
} from 'react-icons/fi';
import { useMeetingService } from '../services/meetingService';

const statusConfig = {
  scheduled: { color: 'blue', label: 'Scheduled', icon: FiClock },
  in_progress: { color: 'orange', label: 'In Progress', icon: FiPlay },
  completed: { color: 'green', label: 'Completed', icon: FiCheck },
  cancelled: { color: 'red', label: 'Cancelled', icon: FiXCircle },
};

const inputTypeConfig = {
  audio: { icon: FiMic, label: 'Audio' },
  text: { icon: FiFileText, label: 'Text' },
  both: { icon: FiCpu, label: 'Audio + Text' },
};

const Meetings = () => {
  const [meetings, setMeetings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [deleteId, setDeleteId] = useState(null);
  const { getMeetings, deleteMeeting } = useMeetingService();
  const toast = useToast();
  const bgColor = useColorModeValue('white', 'gray.800');
  const hoverBg = useColorModeValue('gray.50', 'gray.700');
  const borderColor = useColorModeValue('gray.200', 'gray.600');
  const { isOpen, onOpen, onClose } = useDisclosure();
  const cancelRef = React.useRef();

  useEffect(() => {
    loadMeetings();
  }, [statusFilter]);

  const loadMeetings = async () => {
    setLoading(true);
    try {
      const params = {};
      if (statusFilter) params.status = statusFilter;
      const data = await getMeetings(params);
      setMeetings(Array.isArray(data) ? data : data.results || []);
    } catch (error) {
      toast({ title: 'Error loading meetings', status: 'error', duration: 3000 });
    } finally {
      setLoading(false);
    }
  };

  const confirmDelete = (id) => {
    setDeleteId(id);
    onOpen();
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await deleteMeeting(deleteId);
      setMeetings(meetings.filter(m => m.id !== deleteId));
      toast({ title: 'Meeting deleted', status: 'success', duration: 2000 });
    } catch (error) {
      toast({ title: 'Error deleting meeting', status: 'error', duration: 3000 });
    } finally {
      onClose();
      setDeleteId(null);
    }
  };

  const filtered = meetings.filter(m =>
    m.title.toLowerCase().includes(search.toLowerCase())
  );

  const formatDate = (dateStr) => {
    if (!dateStr) return null;
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric',
    });
  };

  const formatTime = (dateStr) => {
    if (!dateStr) return null;
    return new Date(dateStr).toLocaleTimeString('en-US', {
      hour: '2-digit', minute: '2-digit',
    });
  };

  return (
    <Box>
      <Flex justify="space-between" align="center" mb={6} wrap="wrap" gap={3}>
        <Heading size="lg">Meetings</Heading>
        <Button
          as={RouterLink}
          to="/meetings/create"
          leftIcon={<FiPlus />}
          colorScheme="blue"
        >
          New Meeting
        </Button>
      </Flex>

      <HStack mb={6} spacing={4} flexWrap="wrap">
        <InputGroup maxW="300px">
          <InputLeftElement><Icon as={FiSearch} color="gray.400" /></InputLeftElement>
          <Input
            placeholder="Search meetings..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            bg={bgColor}
          />
        </InputGroup>
        <Select
          maxW="200px"
          placeholder="All statuses"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          bg={bgColor}
        >
          <option value="scheduled">Scheduled</option>
          <option value="in_progress">In Progress</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
        </Select>
      </HStack>

      {loading ? (
        <Box textAlign="center" py={10}><Spinner size="xl" /></Box>
      ) : filtered.length === 0 ? (
        <Box textAlign="center" py={16} bg={bgColor} borderRadius="xl" shadow="sm" borderWidth="1px" borderColor={borderColor}>
          <Icon as={FiCalendar} boxSize={16} color="gray.300" mb={4} />
          <Heading size="md" color="gray.500" mb={2}>No meetings found</Heading>
          <Text color="gray.400" mb={6}>Create your first meeting to get started with AI-powered summaries</Text>
          <Button as={RouterLink} to="/meetings/create" colorScheme="blue" leftIcon={<FiPlus />}>
            Create Meeting
          </Button>
        </Box>
      ) : (
        <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={4}>
          {filtered.map(meeting => {
            const status = statusConfig[meeting.status] || statusConfig.scheduled;
            const inputType = inputTypeConfig[meeting.input_type] || inputTypeConfig.text;
            return (
              <Box
                key={meeting.id}
                bg={bgColor}
                borderRadius="xl"
                borderWidth="1px"
                borderColor={borderColor}
                overflow="hidden"
                transition="all 0.2s"
                _hover={{ shadow: 'md', borderColor: 'blue.300', transform: 'translateY(-2px)' }}
              >
                <Box
                  h="4px"
                  bg={`${status.color}.400`}
                />
                <Box p={5}>
                  <Flex justify="space-between" align="flex-start" mb={3}>
                    <VStack align="start" spacing={1} flex={1} mr={2}>
                      <Heading size="sm" noOfLines={1}>{meeting.title}</Heading>
                      {meeting.project_name && (
                        <Text fontSize="xs" color="gray.500" noOfLines={1}>
                          {meeting.project_name}
                        </Text>
                      )}
                    </VStack>
                    <Menu>
                      <MenuButton
                        as={IconButton}
                        icon={<FiMoreVertical />}
                        variant="ghost"
                        size="sm"
                        aria-label="Meeting actions"
                      />
                      <MenuList>
                        <MenuItem as={RouterLink} to={`/meetings/${meeting.id}`} icon={<FiEye />}>
                          View Details
                        </MenuItem>
                        <MenuItem as={RouterLink} to={`/meetings/${meeting.id}/edit`} icon={<FiEdit2 />}>
                          Edit
                        </MenuItem>
                        <MenuItem icon={<FiTrash2 />} color="red.500" onClick={() => confirmDelete(meeting.id)}>
                          Delete
                        </MenuItem>
                      </MenuList>
                    </Menu>
                  </Flex>

                  <HStack spacing={2} mb={4} flexWrap="wrap">
                    <Badge colorScheme={status.color} display="flex" alignItems="center" gap={1}>
                      <Icon as={status.icon} boxSize={3} />
                      {status.label}
                    </Badge>
                    <Tooltip label={inputType.label}>
                      <Badge variant="outline" display="flex" alignItems="center" gap={1}>
                        <Icon as={inputType.icon} boxSize={3} />
                        {inputType.label}
                      </Badge>
                    </Tooltip>
                    {meeting.ai_processed && (
                      <Badge colorScheme="green" variant="subtle">
                        AI Processed
                      </Badge>
                    )}
                  </HStack>

                  <VStack spacing={2} align="stretch">
                    {meeting.scheduled_at && (
                      <HStack fontSize="sm" color="gray.500">
                        <Icon as={FiCalendar} boxSize={4} />
                        <Text>{formatDate(meeting.scheduled_at)}</Text>
                        <Text>{formatTime(meeting.scheduled_at)}</Text>
                      </HStack>
                    )}
                    <HStack fontSize="sm" color="gray.500">
                      <Icon as={FiUsers} boxSize={4} />
                      <Text>{meeting.participants_count || 0} participants</Text>
                    </HStack>
                  </VStack>

                  <Flex mt={4} pt={3} borderTopWidth="1px" borderColor={borderColor} justify="space-between" align="center">
                    <Button
                      as={RouterLink}
                      to={`/meetings/${meeting.id}`}
                      size="sm"
                      variant="ghost"
                      colorScheme="blue"
                    >
                      View Details
                    </Button>
                    <HStack spacing={1}>
                      {(meeting.status === 'scheduled' || meeting.status === 'in_progress') && (
                        <Tooltip label="Join Video Call">
                          <IconButton
                            as={RouterLink}
                            to={`/meetings/${meeting.id}/video`}
                            icon={<FiVideo />}
                            size="sm"
                            variant="ghost"
                            colorScheme="green"
                            aria-label="Join Video Call"
                          />
                        </Tooltip>
                      )}
                      {!meeting.ai_processed && (
                        <Tooltip label="Process with AI">
                          <IconButton
                            as={RouterLink}
                            to={`/meetings/${meeting.id}`}
                            icon={<FiCpu />}
                            size="sm"
                            variant="ghost"
                            colorScheme="purple"
                            aria-label="Process with AI"
                          />
                        </Tooltip>
                      )}
                    </HStack>
                  </Flex>
                </Box>
              </Box>
            );
          })}
        </SimpleGrid>
      )}

      <AlertDialog isOpen={isOpen} leastDestructiveRef={cancelRef} onClose={onClose}>
        <AlertDialogOverlay>
          <AlertDialogContent>
            <AlertDialogHeader fontSize="lg" fontWeight="bold">
              Delete Meeting
            </AlertDialogHeader>
            <AlertDialogBody>
              Are you sure? This action cannot be undone.
            </AlertDialogBody>
            <AlertDialogFooter>
              <Button ref={cancelRef} onClick={onClose}>Cancel</Button>
              <Button colorScheme="red" onClick={handleDelete} ml={3}>Delete</Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialogOverlay>
      </AlertDialog>
    </Box>
  );
};

export default Meetings;
