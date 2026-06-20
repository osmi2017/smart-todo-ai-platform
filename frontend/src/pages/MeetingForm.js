import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Heading, Button, VStack, HStack,
  FormControl, FormLabel, Input, Textarea, Select,
  useToast, useColorModeValue, Icon, Text,
} from '@chakra-ui/react';
import { FiArrowLeft, FiUpload, FiMic, FiFileText } from 'react-icons/fi';
import { useMeetingService } from '../services/meetingService';
import { useProjectService } from '../services/projectService';

const MeetingForm = () => {
  const navigate = useNavigate();
  const { createMeeting } = useMeetingService();
  const { getProjects } = useProjectService();
  const toast = useToast();
  const bgColor = useColorModeValue('white', 'gray.800');

  const [projects, setProjects] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [audioFile, setAudioFile] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    input_type: 'text',
    scheduled_at: '',
    raw_notes: '',
    project: '',
  });

  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    try {
      const data = await getProjects();
      setProjects(Array.isArray(data) ? data : data.results || []);
    } catch (error) {
      // non-critical
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setAudioFile(file);
      if (formData.input_type === 'text') {
        setFormData(prev => ({ ...prev, input_type: 'both' }));
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      toast({ title: 'Title is required', status: 'warning', duration: 2000 });
      return;
    }

    setSubmitting(true);
    try {
      const data = { ...formData };
      if (audioFile) {
        data.audio_file = audioFile;
      }
      if (!data.project) delete data.project;
      if (!data.scheduled_at) delete data.scheduled_at;

      const meeting = await createMeeting(data);
      toast({ title: 'Meeting created', status: 'success', duration: 2000 });
      navigate(`/meetings/${meeting.id}`);
    } catch (error) {
      toast({
        title: 'Error creating meeting',
        description: error.response?.data?.detail || 'Unknown error',
        status: 'error',
        duration: 3000,
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Box>
      <Button leftIcon={<FiArrowLeft />} variant="ghost" mb={4} onClick={() => navigate('/meetings')}>
        Back to Meetings
      </Button>

      <Heading size="lg" mb={6}>New Meeting</Heading>

      <Box bg={bgColor} borderRadius="lg" shadow="sm" p={6} maxW="600px">
        <form onSubmit={handleSubmit}>
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
              <Select name="project" value={formData.project} onChange={handleChange} placeholder="Select project">
                {projects.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </Select>
            </FormControl>

            {(formData.input_type === 'audio' || formData.input_type === 'both') && (
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
                  <Icon as={audioFile ? FiMic : FiUpload} boxSize={8} color="gray.400" mb={2} />
                  <Text color="gray.500">
                    {audioFile ? audioFile.name : 'Click to upload audio file (mp3, wav, m4a)'}
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

            <HStack w="full" justify="flex-end" pt={4}>
              <Button variant="ghost" onClick={() => navigate('/meetings')}>Cancel</Button>
              <Button type="submit" colorScheme="blue" isLoading={submitting} loadingText="Creating...">
                Create Meeting
              </Button>
            </HStack>
          </VStack>
        </form>
      </Box>
    </Box>
  );
};

export default MeetingForm;
