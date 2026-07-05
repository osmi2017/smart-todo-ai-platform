import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Box, Heading, Button, VStack, HStack,
  FormControl, FormLabel, Input, Textarea, Select,
  useToast, useColorModeValue, Icon, Text,
  Skeleton, Alert, AlertIcon,
  Tabs, TabList, TabPanels, Tab, TabPanel,
  Tag, TagLabel, TagCloseButton, Wrap, WrapItem,
  InputGroup, InputRightElement, IconButton,
  Divider, Badge, Flex, Spinner, Avatar, Checkbox,
  Accordion, AccordionItem, AccordionButton,
  AccordionPanel, AccordionIcon,
} from '@chakra-ui/react';
import {
  FiArrowLeft, FiUpload, FiMic, FiFileText, FiSave,
  FiPlus, FiSearch, FiUsers, FiMail, FiUserPlus, FiX,
} from 'react-icons/fi';
import { useMeetingService } from '../services/meetingService';
import { useProjectService } from '../services/projectService';
import { useAuth } from '../context/AuthContext';

const MeetingForm = () => {
  const { id } = useParams();
  const isEditing = Boolean(id);
  const navigate = useNavigate();
  const { createMeeting, getMeeting, updateMeeting, addParticipant } = useMeetingService();
  const { getProjects } = useProjectService();
  const { axiosInstance, user } = useAuth();
  const toast = useToast();
  const bgColor = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.600');

  const [projects, setProjects] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [loadingMeeting, setLoadingMeeting] = useState(isEditing);
  const [audioFile, setAudioFile] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    input_type: 'text',
    scheduled_at: '',
    raw_notes: '',
    project: '',
    status: 'scheduled',
  });

  // Participant invitation state
  const [invitedParticipants, setInvitedParticipants] = useState([]);
  const [groups, setGroups] = useState([]);
  const [companyUsers, setCompanyUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [loadingGroups, setLoadingGroups] = useState(false);
  const [userSearch, setUserSearch] = useState('');
  const [externalEmail, setExternalEmail] = useState('');
  const [selectedGroupId, setSelectedGroupId] = useState('');
  const [groupMembers, setGroupMembers] = useState([]);
  const [loadingGroupMembers, setLoadingGroupMembers] = useState(false);

  useEffect(() => {
    loadProjects();
    loadCompanyUsers();
    loadGroups();
    if (isEditing) {
      loadMeetingData();
    }
  }, [id]);

  const loadProjects = async () => {
    try {
      const data = await getProjects();
      setProjects(Array.isArray(data) ? data : data.results || []);
    } catch (error) {
      // non-critical
    }
  };

  const loadCompanyUsers = async () => {
    setLoadingUsers(true);
    try {
      const response = await axiosInstance.get('/users/');
      const data = response.data;
      setCompanyUsers(Array.isArray(data) ? data : data.results || []);
    } catch (error) {
      // non-critical
    } finally {
      setLoadingUsers(false);
    }
  };

  const loadGroups = async () => {
    setLoadingGroups(true);
    try {
      const response = await axiosInstance.get('/groups/');
      const data = response.data;
      setGroups(Array.isArray(data) ? data : data.results || []);
    } catch (error) {
      // non-critical
    } finally {
      setLoadingGroups(false);
    }
  };

  const loadGroupMembers = async (groupId) => {
    if (!groupId) {
      setGroupMembers([]);
      return;
    }
    setLoadingGroupMembers(true);
    try {
      const response = await axiosInstance.get(`/groups/${groupId}/`);
      const data = response.data;
      setGroupMembers(data.members || []);
    } catch (error) {
      setGroupMembers([]);
    } finally {
      setLoadingGroupMembers(false);
    }
  };

  const loadMeetingData = async () => {
    setLoadingMeeting(true);
    try {
      const data = await getMeeting(id);
      setFormData({
        title: data.title || '',
        description: data.description || '',
        input_type: data.input_type || 'text',
        scheduled_at: data.scheduled_at ? data.scheduled_at.slice(0, 16) : '',
        raw_notes: data.raw_notes || '',
        project: data.project || '',
        status: data.status || 'scheduled',
      });
      // Load existing participants
      if (data.participants && data.participants.length > 0) {
        setInvitedParticipants(
          data.participants.map((p) => ({
            id: p.user || p.id,
            username: p.username,
            email: p.email || '',
            type: 'enterprise',
            role: p.role || 'attendee',
          }))
        );
      }
    } catch (error) {
      toast({ title: 'Error loading meeting', status: 'error', duration: 3000 });
      navigate('/meetings');
    } finally {
      setLoadingMeeting(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setAudioFile(file);
      if (formData.input_type === 'text') {
        setFormData((prev) => ({ ...prev, input_type: 'both' }));
      }
    }
  };

  // Add enterprise user as participant
  const addEnterpriseUser = (userObj) => {
    if (invitedParticipants.find((p) => p.id === userObj.id && p.type !== 'external')) return;
    setInvitedParticipants((prev) => [
      ...prev,
      {
        id: userObj.id,
        username: userObj.username || userObj.full_name || userObj.email,
        email: userObj.email || '',
        type: 'enterprise',
        role: 'attendee',
      },
    ]);
  };

  // Add all members of a group
  const addGroupMembers = () => {
    if (groupMembers.length === 0) return;
    const newParticipants = [...invitedParticipants];
    let addedCount = 0;
    groupMembers.forEach((member) => {
      const alreadyAdded = newParticipants.find(
        (p) => p.id === member.id && p.type !== 'external'
      );
      if (!alreadyAdded) {
        newParticipants.push({
          id: member.id,
          username: member.username || member.full_name || member.email,
          email: member.email || '',
          type: 'group',
          role: 'attendee',
        });
        addedCount++;
      }
    });
    setInvitedParticipants(newParticipants);
    toast({
      title: `Added ${addedCount} member${addedCount !== 1 ? 's' : ''} from group`,
      status: 'success',
      duration: 2000,
    });
  };

  // Add external participant by email
  const addExternalEmail = () => {
    const email = externalEmail.trim();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast({ title: 'Please enter a valid email address', status: 'warning', duration: 2000 });
      return;
    }
    if (invitedParticipants.find((p) => p.email === email)) {
      toast({ title: 'This email is already added', status: 'info', duration: 2000 });
      return;
    }
    setInvitedParticipants((prev) => [
      ...prev,
      {
        id: `ext-${Date.now()}`,
        username: email,
        email,
        type: 'external',
        role: 'attendee',
      },
    ]);
    setExternalEmail('');
  };

  const removeParticipant = (index) => {
    setInvitedParticipants((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      toast({ title: 'Title is required', status: 'warning', duration: 2000 });
      return;
    }

    setSubmitting(true);
    try {
      let meetingResult;
      if (isEditing) {
        const data = { ...formData };
        if (!data.project) delete data.project;
        if (!data.scheduled_at) delete data.scheduled_at;
        meetingResult = await updateMeeting(id, data);
      } else {
        const data = { ...formData };
        if (audioFile) {
          data.audio_file = audioFile;
        }
        if (!data.project) delete data.project;
        if (!data.scheduled_at) delete data.scheduled_at;
        delete data.status;
        meetingResult = await createMeeting(data);
      }

      const meetingIdResult = meetingResult?.id || id;

      // Add participants (enterprise users)
      if (meetingIdResult) {
        const enterpriseParticipants = invitedParticipants.filter((p) => p.type !== 'external');
        for (const p of enterpriseParticipants) {
          try {
            await addParticipant(meetingIdResult, p.id, p.role);
          } catch {
            // may already exist
          }
        }
      }

      toast({
        title: isEditing ? 'Meeting updated' : 'Meeting created',
        status: 'success',
        duration: 2000,
      });
      navigate(`/meetings/${meetingIdResult}`);
    } catch (error) {
      toast({
        title: isEditing ? 'Error updating meeting' : 'Error creating meeting',
        description: error.response?.data?.detail || 'Unknown error',
        status: 'error',
        duration: 3000,
      });
    } finally {
      setSubmitting(false);
    }
  };

  // Filter users by search
  const filteredUsers = companyUsers.filter((u) => {
    if (!userSearch) return true;
    const q = userSearch.toLowerCase();
    return (
      (u.username && u.username.toLowerCase().includes(q)) ||
      (u.email && u.email.toLowerCase().includes(q)) ||
      (u.first_name && u.first_name.toLowerCase().includes(q)) ||
      (u.last_name && u.last_name.toLowerCase().includes(q))
    );
  });

  if (loadingMeeting) {
    return (
      <Box>
        <Skeleton height="40px" mb={4} />
        <Skeleton height="30px" mb={6} />
        <Box bg={bgColor} borderRadius="lg" shadow="sm" p={6} maxW="800px">
          <VStack spacing={5}>
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} height="60px" w="full" />
            ))}
          </VStack>
        </Box>
      </Box>
    );
  }

  return (
    <Box>
      <Button
        leftIcon={<FiArrowLeft />}
        variant="ghost"
        mb={4}
        onClick={() => navigate(isEditing ? `/meetings/${id}` : '/meetings')}
      >
        {isEditing ? 'Back to Meeting' : 'Back to Meetings'}
      </Button>

      <Heading size="lg" mb={6}>
        {isEditing ? 'Edit Meeting' : 'New Meeting'}
      </Heading>

      <Box bg={bgColor} borderRadius="lg" shadow="sm" p={6} maxW="800px">
        <form onSubmit={handleSubmit}>
          <Tabs colorScheme="blue" variant="enclosed">
            <TabList>
              <Tab>Meeting Details</Tab>
              <Tab>
                Invite Participants
                {invitedParticipants.length > 0 && (
                  <Badge ml={2} colorScheme="blue" borderRadius="full">
                    {invitedParticipants.length}
                  </Badge>
                )}
              </Tab>
            </TabList>

            <TabPanels>
              {/* Meeting Details Tab */}
              <TabPanel>
                <VStack spacing={5}>
                  <FormControl isRequired>
                    <FormLabel>Title</FormLabel>
                    <Input
                      name="title"
                      value={formData.title}
                      onChange={handleChange}
                      placeholder="e.g., Sprint Planning"
                    />
                  </FormControl>

                  <FormControl>
                    <FormLabel>Description</FormLabel>
                    <Textarea
                      name="description"
                      value={formData.description}
                      onChange={handleChange}
                      placeholder="Meeting agenda or description"
                      rows={3}
                    />
                  </FormControl>

                  {isEditing && (
                    <FormControl>
                      <FormLabel>Status</FormLabel>
                      <Select name="status" value={formData.status} onChange={handleChange}>
                        <option value="scheduled">Scheduled</option>
                        <option value="in_progress">In Progress</option>
                        <option value="completed">Completed</option>
                        <option value="cancelled">Cancelled</option>
                      </Select>
                    </FormControl>
                  )}

                  <FormControl>
                    <FormLabel>Input Type</FormLabel>
                    <Select name="input_type" value={formData.input_type} onChange={handleChange}>
                      <option value="text">Text Notes</option>
                      <option value="audio">Audio Upload</option>
                      <option value="both">Audio + Text</option>
                    </Select>
                  </FormControl>

                  <FormControl>
                    <FormLabel>Scheduled Date & Time</FormLabel>
                    <Input
                      name="scheduled_at"
                      type="datetime-local"
                      value={formData.scheduled_at}
                      onChange={handleChange}
                    />
                  </FormControl>

                  <FormControl>
                    <FormLabel>Project (optional)</FormLabel>
                    <Select
                      name="project"
                      value={formData.project}
                      onChange={handleChange}
                      placeholder="Select project"
                    >
                      {projects.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                    </Select>
                  </FormControl>

                  {(formData.input_type === 'audio' || formData.input_type === 'both') &&
                    !isEditing && (
                      <FormControl>
                        <FormLabel>Audio File</FormLabel>
                        <Box
                          borderWidth={2}
                          borderStyle="dashed"
                          borderColor="gray.300"
                          borderRadius="lg"
                          p={6}
                          textAlign="center"
                          cursor="pointer"
                          _hover={{ borderColor: 'blue.400', bg: 'blue.50' }}
                          onClick={() => document.getElementById('audio-upload').click()}
                        >
                          <Icon
                            as={audioFile ? FiMic : FiUpload}
                            boxSize={8}
                            color="gray.400"
                            mb={2}
                          />
                          <Text color="gray.500">
                            {audioFile
                              ? audioFile.name
                              : 'Click to upload audio file (mp3, wav, m4a)'}
                          </Text>
                          <Input
                            id="audio-upload"
                            type="file"
                            accept="audio/*"
                            display="none"
                            onChange={handleFileChange}
                          />
                        </Box>
                      </FormControl>
                    )}

                  {isEditing && formData.input_type !== 'audio' && (
                    <Alert status="info" borderRadius="md" fontSize="sm">
                      <AlertIcon />
                      You can edit meeting notes below. To re-upload audio, create a new meeting.
                    </Alert>
                  )}

                  {(formData.input_type === 'text' || formData.input_type === 'both') && (
                    <FormControl>
                      <FormLabel>Meeting Notes</FormLabel>
                      <Textarea
                        name="raw_notes"
                        value={formData.raw_notes}
                        onChange={handleChange}
                        placeholder="Paste or type your meeting notes here..."
                        rows={8}
                      />
                    </FormControl>
                  )}
                </VStack>
              </TabPanel>

              {/* Invite Participants Tab */}
              <TabPanel>
                <VStack spacing={5} align="stretch">
                  {/* Invited participants list */}
                  {invitedParticipants.length > 0 && (
                    <Box>
                      <Text fontWeight="600" mb={2}>
                        Invited ({invitedParticipants.length})
                      </Text>
                      <Wrap spacing={2}>
                        {invitedParticipants.map((p, i) => (
                          <WrapItem key={`${p.type}-${p.id}-${i}`}>
                            <Tag
                              size="lg"
                              borderRadius="full"
                              variant="subtle"
                              colorScheme={
                                p.type === 'external'
                                  ? 'orange'
                                  : p.type === 'group'
                                  ? 'purple'
                                  : 'blue'
                              }
                            >
                              <Avatar
                                size="xs"
                                name={p.username}
                                ml={-1}
                                mr={2}
                                bg={
                                  p.type === 'external'
                                    ? 'orange.500'
                                    : p.type === 'group'
                                    ? 'purple.500'
                                    : 'blue.500'
                                }
                              />
                              <TagLabel>{p.username}</TagLabel>
                              <Badge ml={1} fontSize="2xs" variant="outline">
                                {p.type === 'external'
                                  ? 'External'
                                  : p.type === 'group'
                                  ? 'Group'
                                  : 'Enterprise'}
                              </Badge>
                              <TagCloseButton onClick={() => removeParticipant(i)} />
                            </Tag>
                          </WrapItem>
                        ))}
                      </Wrap>
                    </Box>
                  )}

                  <Divider />

                  <Accordion allowMultiple defaultIndex={[0]}>
                    {/* From Group */}
                    <AccordionItem border="none">
                      <AccordionButton
                        px={0}
                        _hover={{ bg: 'transparent' }}
                      >
                        <HStack flex={1}>
                          <Icon as={FiUsers} color="purple.500" />
                          <Text fontWeight="600">Add from Group</Text>
                        </HStack>
                        <AccordionIcon />
                      </AccordionButton>
                      <AccordionPanel px={0}>
                        <VStack spacing={3} align="stretch">
                          <Select
                            placeholder="Select a group"
                            value={selectedGroupId}
                            onChange={(e) => {
                              setSelectedGroupId(e.target.value);
                              loadGroupMembers(e.target.value);
                            }}
                          >
                            {groups.map((g) => (
                              <option key={g.id} value={g.id}>
                                {g.name}
                              </option>
                            ))}
                          </Select>

                          {loadingGroupMembers && <Spinner size="sm" />}

                          {groupMembers.length > 0 && (
                            <Box>
                              <HStack justify="space-between" mb={2}>
                                <Text fontSize="sm" color="gray.500">
                                  {groupMembers.length} member{groupMembers.length !== 1 ? 's' : ''}
                                </Text>
                                <Button
                                  size="xs"
                                  colorScheme="purple"
                                  leftIcon={<FiUserPlus />}
                                  onClick={addGroupMembers}
                                >
                                  Add All
                                </Button>
                              </HStack>
                              <VStack
                                spacing={1}
                                align="stretch"
                                maxH="200px"
                                overflow="auto"
                              >
                                {groupMembers.map((member) => {
                                  const isAdded = invitedParticipants.some(
                                    (p) => p.id === member.id && p.type !== 'external'
                                  );
                                  return (
                                    <Flex
                                      key={member.id}
                                      p={2}
                                      borderRadius="md"
                                      align="center"
                                      justify="space-between"
                                      bg={isAdded ? 'purple.50' : 'transparent'}
                                      _hover={{ bg: isAdded ? 'purple.50' : 'gray.50' }}
                                    >
                                      <HStack>
                                        <Avatar size="xs" name={member.username} />
                                        <Box>
                                          <Text fontSize="sm">{member.username}</Text>
                                          {member.email && (
                                            <Text fontSize="xs" color="gray.500">
                                              {member.email}
                                            </Text>
                                          )}
                                        </Box>
                                      </HStack>
                                      {isAdded ? (
                                        <Badge colorScheme="green" fontSize="xs">
                                          Added
                                        </Badge>
                                      ) : (
                                        <IconButton
                                          icon={<FiPlus />}
                                          size="xs"
                                          variant="ghost"
                                          colorScheme="purple"
                                          onClick={() => addEnterpriseUser(member)}
                                          aria-label={`Add ${member.username}`}
                                        />
                                      )}
                                    </Flex>
                                  );
                                })}
                              </VStack>
                            </Box>
                          )}
                        </VStack>
                      </AccordionPanel>
                    </AccordionItem>

                    {/* From Enterprise */}
                    <AccordionItem border="none">
                      <AccordionButton
                        px={0}
                        _hover={{ bg: 'transparent' }}
                      >
                        <HStack flex={1}>
                          <Icon as={FiSearch} color="blue.500" />
                          <Text fontWeight="600">Add from Enterprise</Text>
                        </HStack>
                        <AccordionIcon />
                      </AccordionButton>
                      <AccordionPanel px={0}>
                        <VStack spacing={3} align="stretch">
                          <InputGroup>
                            <Input
                              placeholder="Search users by name or email..."
                              value={userSearch}
                              onChange={(e) => setUserSearch(e.target.value)}
                            />
                            <InputRightElement>
                              {userSearch && (
                                <IconButton
                                  icon={<FiX />}
                                  size="xs"
                                  variant="ghost"
                                  onClick={() => setUserSearch('')}
                                  aria-label="Clear search"
                                />
                              )}
                            </InputRightElement>
                          </InputGroup>

                          {loadingUsers ? (
                            <Spinner size="sm" />
                          ) : (
                            <VStack
                              spacing={1}
                              align="stretch"
                              maxH="250px"
                              overflow="auto"
                            >
                              {filteredUsers.slice(0, 20).map((u) => {
                                const isAdded = invitedParticipants.some(
                                  (p) => p.id === u.id && p.type !== 'external'
                                );
                                const isSelf = u.id === user?.id;
                                return (
                                  <Flex
                                    key={u.id}
                                    p={2}
                                    borderRadius="md"
                                    align="center"
                                    justify="space-between"
                                    bg={isAdded ? 'blue.50' : 'transparent'}
                                    _hover={{ bg: isAdded ? 'blue.50' : 'gray.50' }}
                                    opacity={isSelf ? 0.5 : 1}
                                  >
                                    <HStack>
                                      <Avatar size="xs" name={u.username} />
                                      <Box>
                                        <HStack spacing={1}>
                                          <Text fontSize="sm">{u.username}</Text>
                                          {isSelf && (
                                            <Badge fontSize="2xs" colorScheme="gray">
                                              You
                                            </Badge>
                                          )}
                                        </HStack>
                                        {u.email && (
                                          <Text fontSize="xs" color="gray.500">
                                            {u.email}
                                          </Text>
                                        )}
                                      </Box>
                                    </HStack>
                                    {isAdded ? (
                                      <Badge colorScheme="green" fontSize="xs">
                                        Added
                                      </Badge>
                                    ) : (
                                      <IconButton
                                        icon={<FiPlus />}
                                        size="xs"
                                        variant="ghost"
                                        colorScheme="blue"
                                        onClick={() => addEnterpriseUser(u)}
                                        isDisabled={isSelf}
                                        aria-label={`Add ${u.username}`}
                                      />
                                    )}
                                  </Flex>
                                );
                              })}
                              {filteredUsers.length === 0 && (
                                <Text fontSize="sm" color="gray.500" textAlign="center" py={4}>
                                  No users found
                                </Text>
                              )}
                            </VStack>
                          )}
                        </VStack>
                      </AccordionPanel>
                    </AccordionItem>

                    {/* External Email */}
                    <AccordionItem border="none">
                      <AccordionButton
                        px={0}
                        _hover={{ bg: 'transparent' }}
                      >
                        <HStack flex={1}>
                          <Icon as={FiMail} color="orange.500" />
                          <Text fontWeight="600">Invite by Email (External)</Text>
                        </HStack>
                        <AccordionIcon />
                      </AccordionButton>
                      <AccordionPanel px={0}>
                        <VStack spacing={3} align="stretch">
                          <Text fontSize="sm" color="gray.500">
                            Invite external participants who are not part of your enterprise.
                          </Text>
                          <HStack>
                            <Input
                              placeholder="email@example.com"
                              value={externalEmail}
                              onChange={(e) => setExternalEmail(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  addExternalEmail();
                                }
                              }}
                              type="email"
                            />
                            <Button
                              leftIcon={<FiPlus />}
                              colorScheme="orange"
                              onClick={addExternalEmail}
                              flexShrink={0}
                            >
                              Add
                            </Button>
                          </HStack>
                          {invitedParticipants.filter((p) => p.type === 'external').length > 0 && (
                            <Box>
                              <Text fontSize="xs" color="gray.500" mb={1}>
                                External invites:
                              </Text>
                              <Wrap spacing={2}>
                                {invitedParticipants
                                  .map((p, i) => ({ ...p, originalIndex: i }))
                                  .filter((p) => p.type === 'external')
                                  .map((p) => (
                                    <WrapItem key={p.originalIndex}>
                                      <Tag size="md" colorScheme="orange" borderRadius="full">
                                        <TagLabel>{p.email}</TagLabel>
                                        <TagCloseButton
                                          onClick={() => removeParticipant(p.originalIndex)}
                                        />
                                      </Tag>
                                    </WrapItem>
                                  ))}
                              </Wrap>
                            </Box>
                          )}
                        </VStack>
                      </AccordionPanel>
                    </AccordionItem>
                  </Accordion>
                </VStack>
              </TabPanel>
            </TabPanels>
          </Tabs>

          <HStack w="full" justify="flex-end" pt={6}>
            <Button
              variant="ghost"
              onClick={() => navigate(isEditing ? `/meetings/${id}` : '/meetings')}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              colorScheme="blue"
              leftIcon={isEditing ? <FiSave /> : undefined}
              isLoading={submitting}
              loadingText={isEditing ? 'Saving...' : 'Creating...'}
            >
              {isEditing ? 'Save Changes' : 'Create Meeting'}
            </Button>
          </HStack>
        </form>
      </Box>
    </Box>
  );
};

export default MeetingForm;
