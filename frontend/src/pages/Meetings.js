import React, { useState, useEffect } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import {
  Box, Heading, Button, HStack, VStack, Text, Badge, Icon,
  Table, Thead, Tbody, Tr, Th, Td, IconButton,
  useToast, useColorModeValue, Spinner,
  Input, Select, InputGroup, InputLeftElement,
  Menu, MenuButton, MenuList, MenuItem,
} from '@chakra-ui/react';
import {
  FiPlus, FiSearch, FiMoreVertical, FiCalendar, FiMic,
  FiFileText, FiTrash2, FiEye, FiCpu,
} from 'react-icons/fi';
import { useMeetingService } from '../services/meetingService';

const statusColors = {
  scheduled: 'blue',
  in_progress: 'orange',
  completed: 'green',
  cancelled: 'red',
};

const statusLabels = {
  scheduled: 'Scheduled',
  in_progress: 'In Progress',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

const inputTypeIcons = {
  audio: FiMic,
  text: FiFileText,
  both: FiCpu,
};

const Meetings = () => {
  const [meetings, setMeetings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const { getMeetings, deleteMeeting } = useMeetingService();
  const toast = useToast();
  const bgColor = useColorModeValue('white', 'gray.800');

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

  const handleDelete = async (id) => {
    try {
      await deleteMeeting(id);
      setMeetings(meetings.filter(m => m.id !== id));
      toast({ title: 'Meeting deleted', status: 'success', duration: 2000 });
    } catch (error) {
      toast({ title: 'Error deleting meeting', status: 'error', duration: 3000 });
    }
  };

  const filtered = meetings.filter(m =>
    m.title.toLowerCase().includes(search.toLowerCase())
  );

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit',
    });
  };

  return (
    <Box>
      <HStack justify="space-between" mb={6}>
        <Heading size="lg">Meetings</Heading>
        <Button
          as={RouterLink}
          to="/meetings/create"
          leftIcon={<FiPlus />}
          colorScheme="blue"
        >
          New Meeting
        </Button>
      </HStack>

      <HStack mb={4} spacing={4}>
        <InputGroup maxW="300px">
          <InputLeftElement><Icon as={FiSearch} color="gray.400" /></InputLeftElement>
          <Input
            placeholder="Search meetings..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </InputGroup>
        <Select
          maxW="200px"
          placeholder="All statuses"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
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
        <Box textAlign="center" py={10} bg={bgColor} borderRadius="lg" shadow="sm">
          <Icon as={FiCalendar} boxSize={12} color="gray.300" mb={4} />
          <Text color="gray.500">No meetings found</Text>
          <Button as={RouterLink} to="/meetings/create" mt={4} colorScheme="blue" size="sm">
            Create your first meeting
          </Button>
        </Box>
      ) : (
        <Box bg={bgColor} borderRadius="lg" shadow="sm" overflow="hidden">
          <Table variant="simple">
            <Thead>
              <Tr>
                <Th>Title</Th>
                <Th>Status</Th>
                <Th>Type</Th>
                <Th>Date</Th>
                <Th>Participants</Th>
                <Th>AI</Th>
                <Th>Actions</Th>
              </Tr>
            </Thead>
            <Tbody>
              {filtered.map(meeting => (
                <Tr key={meeting.id} _hover={{ bg: useColorModeValue('gray.50', 'gray.700') }}>
                  <Td>
                    <Text fontWeight="600">{meeting.title}</Text>
                    {meeting.project_name && (
                      <Text fontSize="xs" color="gray.500">{meeting.project_name}</Text>
                    )}
                  </Td>
                  <Td>
                    <Badge colorScheme={statusColors[meeting.status]}>
                      {statusLabels[meeting.status]}
                    </Badge>
                  </Td>
                  <Td>
                    <Icon as={inputTypeIcons[meeting.input_type] || FiFileText} />
                  </Td>
                  <Td>{formatDate(meeting.scheduled_at)}</Td>
                  <Td>{meeting.participants_count || 0}</Td>
                  <Td>
                    {meeting.ai_processed ? (
                      <Badge colorScheme="green">Processed</Badge>
                    ) : (
                      <Badge colorScheme="gray">Pending</Badge>
                    )}
                  </Td>
                  <Td>
                    <Menu>
                      <MenuButton as={IconButton} icon={<FiMoreVertical />} variant="ghost" size="sm" />
                      <MenuList>
                        <MenuItem as={RouterLink} to={`/meetings/${meeting.id}`} icon={<FiEye />}>
                          View
                        </MenuItem>
                        <MenuItem icon={<FiTrash2 />} color="red.500" onClick={() => handleDelete(meeting.id)}>
                          Delete
                        </MenuItem>
                      </MenuList>
                    </Menu>
                  </Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
        </Box>
      )}
    </Box>
  );
};

export default Meetings;
