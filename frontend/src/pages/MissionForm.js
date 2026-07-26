import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Box, Heading, Button, VStack, HStack,
  FormControl, FormLabel, Input, Textarea, Select,
  useToast, useColorModeValue, Text,
  Skeleton, Tag, TagLabel, TagCloseButton, Wrap, WrapItem,
  Divider, Flex, Spinner, Avatar, Icon, Badge,
  NumberInput, NumberInputField, NumberInputStepper, NumberIncrementStepper, NumberDecrementStepper,
} from '@chakra-ui/react';
import {
  FiArrowLeft, FiSave, FiPlus, FiMapPin, FiDollarSign,
  FiUsers, FiTrash2, FiExternalLink, FiLink,
} from 'react-icons/fi';
import { useMissionService } from '../services/missionService';
import { useCrudService } from '../utils/createCrudService';
import { useAuth } from '../context/AuthContext';
import LocationSearch from '../components/LocationSearch';

const MissionForm = () => {
  const { id } = useParams();
  const isEditing = Boolean(id);
  const navigate = useNavigate();
  const { createMission, getMission, updateMission } = useMissionService();
  const { axiosInstance, user } = useAuth();
  const toast = useToast();
  const bgColor = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.600');

  const [submitting, setSubmitting] = useState(false);
  const [loadingMission, setLoadingMission] = useState(isEditing);
  const [companyUsers, setCompanyUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [currencies, setCurrencies] = useState({});
  const [loadingCurrencies, setLoadingCurrencies] = useState(true);

  const [projects, setProjects] = useState([]);
  const [loadingProjects, setLoadingProjects] = useState(false);
  const [projectTasks, setProjectTasks] = useState([]);
  const [projectMilestones, setProjectMilestones] = useState([]);
  const [loadingLinked, setLoadingLinked] = useState(false);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    status: 'planned',
    destination_name: '',
    destination_lat: null,
    destination_lng: null,
    start_date: '',
    end_date: '',
    cost_per_diem: 0,
    cost_accommodation: 0,
    cost_transport: 0,
    cost_other: 0,
    currency: 'xof',
    mission_report: '',
    project: '',
  });

  const [selectedMemberIds, setSelectedMemberIds] = useState([]);
  const [selectedLeaderId, setSelectedLeaderId] = useState('');
  const [selectedMemberId, setSelectedMemberId] = useState('');
  const [destinationDistance, setDestinationDistance] = useState(null);
  const [selectedTaskIds, setSelectedTaskIds] = useState([]);
  const [selectedMilestoneIds, setSelectedMilestoneIds] = useState([]);

  useEffect(() => {
    loadCompanyUsers();
    loadCurrencies();
    loadProjects();
    if (isEditing) loadMissionData();
  }, [id]);

  useEffect(() => {
    if (formData.project) {
      loadProjectLinked(formData.project);
    } else {
      setProjectTasks([]);
      setProjectMilestones([]);
      setSelectedTaskIds([]);
      setSelectedMilestoneIds([]);
    }
  }, [formData.project]);

  const loadCurrencies = async () => {
    setLoadingCurrencies(true);
    try {
      const response = await axiosInstance.get('/currencies/');
      const data = response.data;
      if (data && typeof data === 'object') {
        setCurrencies(data);
      }
    } catch (error) {
      console.error('Error loading currencies:', error);
    } finally {
      setLoadingCurrencies(false);
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

  const loadProjects = async () => {
    setLoadingProjects(true);
    try {
      const response = await axiosInstance.get('/projects/');
      const data = response.data;
      setProjects(Array.isArray(data) ? data : data.results || []);
    } catch (error) {
      // non-critical
    } finally {
      setLoadingProjects(false);
    }
  };

  const loadProjectLinked = async (projectId) => {
    setLoadingLinked(true);
    try {
      const [tasksRes, milestonesRes] = await Promise.all([
        axiosInstance.get('/tasks/', { params: { project: projectId } }),
        axiosInstance.get('/milestones/', { params: { project: projectId } }),
      ]);
      setProjectTasks(Array.isArray(tasksRes.data) ? tasksRes.data : tasksRes.data.results || []);
      setProjectMilestones(Array.isArray(milestonesRes.data) ? milestonesRes.data : milestonesRes.data.results || []);
    } catch (error) {
      // non-critical
    } finally {
      setLoadingLinked(false);
    }
  };

  const loadMissionData = async () => {
    setLoadingMission(true);
    try {
      const data = await getMission(id);
      setFormData({
        title: data.title || '',
        description: data.description || '',
        status: data.status || 'planned',
        destination_name: data.destination_name || '',
        destination_lat: data.destination_lat ? parseFloat(data.destination_lat) : null,
        destination_lng: data.destination_lng ? parseFloat(data.destination_lng) : null,
        start_date: data.start_date || '',
        end_date: data.end_date || '',
        cost_per_diem: data.cost_per_diem || 0,
        cost_accommodation: data.cost_accommodation || 0,
        cost_transport: data.cost_transport || 0,
        cost_other: data.cost_other || 0,
        currency: data.currency || 'xof',
        mission_report: data.mission_report || '',
        project: data.project || '',
      });
      if (data.members && data.members.length > 0) {
        const memberIds = data.members.map(m => m.user);
        setSelectedMemberIds(memberIds);
        const leader = data.members.find(m => m.is_leader);
        if (leader) setSelectedLeaderId(String(leader.user));
      }
      if (data.tasks && data.tasks.length > 0) {
        setSelectedTaskIds(data.tasks);
      }
      if (data.milestones && data.milestones.length > 0) {
        setSelectedMilestoneIds(data.milestones);
      }
    } catch (error) {
      toast({ title: 'Erreur lors du chargement', status: 'error', duration: 3000 });
      navigate('/missions');
    } finally {
      setLoadingMission(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const addMember = () => {
    if (!selectedMemberId) return;
    const uid = parseInt(selectedMemberId);
    if (!selectedMemberIds.includes(uid)) {
      setSelectedMemberIds(prev => [...prev, uid]);
    }
    setSelectedMemberId('');
  };

  const removeMember = (uid) => {
    setSelectedMemberIds(prev => prev.filter(id => id !== uid));
    if (selectedLeaderId === String(uid)) {
      setSelectedLeaderId('');
    }
  };

  const toggleTask = (taskId) => {
    setSelectedTaskIds(prev =>
      prev.includes(taskId) ? prev.filter(id => id !== taskId) : [...prev, taskId]
    );
  };

  const toggleMilestone = (milestoneId) => {
    setSelectedMilestoneIds(prev =>
      prev.includes(milestoneId) ? prev.filter(id => id !== milestoneId) : [...prev, milestoneId]
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      toast({ title: 'Le titre est requis', status: 'warning', duration: 2000 });
      return;
    }
    if (!formData.destination_name.trim()) {
      toast({ title: 'La destination est requise', status: 'warning', duration: 2000 });
      return;
    }
    if (!formData.start_date) {
      toast({ title: 'La date de début est requise', status: 'warning', duration: 2000 });
      return;
    }
    if (selectedMemberIds.length === 0) {
      toast({ title: 'Ajoutez au moins un membre', status: 'warning', duration: 2000 });
      return;
    }
    if (!selectedLeaderId) {
      toast({ title: 'Un chef de mission est obligatoire', status: 'warning', duration: 2000 });
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        ...formData,
        destination_lat: formData.destination_lat != null ? parseFloat(formData.destination_lat) : null,
        destination_lng: formData.destination_lng != null ? parseFloat(formData.destination_lng) : null,
        member_ids: selectedMemberIds,
        leader_id: parseInt(selectedLeaderId),
        tasks: selectedTaskIds,
        milestones: selectedMilestoneIds,
        project: formData.project || null,
      };

      if (isEditing) {
        await updateMission(id, payload);
        toast({ title: 'Mission mise à jour', status: 'success', duration: 2000 });
        navigate(`/missions/${id}`);
      } else {
        const result = await createMission(payload);
        toast({ title: 'Mission créée', status: 'success', duration: 2000 });
        navigate(`/missions/${result.id}`);
      }
    } catch (error) {
      toast({
        title: isEditing ? 'Erreur lors de la mise à jour' : 'Erreur lors de la création',
        description: error.response?.data?.detail || JSON.stringify(error.response?.data) || 'Erreur inconnue',
        status: 'error',
        duration: 5000,
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (loadingMission) {
    return (
      <Box>
        <Skeleton height="40px" mb={4} />
        <Skeleton height="30px" mb={6} />
        <Box bg={bgColor} borderRadius="lg" shadow="sm" p={6} maxW="800px">
          <VStack spacing={5}>
            {[1, 2, 3, 4, 5].map(i => (
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
        onClick={() => navigate(isEditing ? `/missions/${id}` : '/missions')}
      >
        {isEditing ? 'Retour à la mission' : 'Retour aux missions'}
      </Button>

      <Heading size="lg" mb={6}>
        {isEditing ? 'Modifier la mission' : 'Nouvelle mission'}
      </Heading>

      <Flex gap={6} align="start" direction={{ base: 'column', lg: 'row' }}>
        {/* Left: Form */}
        <Box flex={1} bg={bgColor} borderRadius="lg" shadow="sm" p={6} borderWidth="1px" borderColor={borderColor} minW={0}>
          <form onSubmit={handleSubmit}>
            <VStack spacing={5} align="stretch">
              {/* Informations générales */}
              <Heading size="sm" color="gray.600" textTransform="uppercase" letterSpacing="wider">
                Informations générales
              </Heading>

              <FormControl isRequired>
                <FormLabel>Titre de la mission</FormLabel>
                <Input
                  name="title"
                  value={formData.title}
                  onChange={handleChange}
                  placeholder="Ex: Mission d'audit à Abidjan"
                />
              </FormControl>

              <FormControl>
                <FormLabel>Description</FormLabel>
                <Textarea
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  placeholder="Description de la mission..."
                  rows={3}
                />
              </FormControl>

              {isEditing && (
                <FormControl>
                  <FormLabel>Statut</FormLabel>
                  <Select name="status" value={formData.status} onChange={handleChange}>
                    <option value="planned">Planifiée</option>
                    <option value="in_progress">En cours</option>
                    <option value="completed">Terminée</option>
                    <option value="cancelled">Annulée</option>
                  </Select>
                </FormControl>
              )}

              {/* Projet & Liens */}
              <Divider />
              <Heading size="sm" color="gray.600" textTransform="uppercase" letterSpacing="wider">
                <HStack><Icon as={FiLink} /> Projet & Liens</HStack>
              </Heading>

              <FormControl>
                <FormLabel>Projet associé</FormLabel>
                {loadingProjects ? (
                  <HStack><Spinner size="sm" /><Text fontSize="sm" color="gray.500">Chargement...</Text></HStack>
                ) : (
                  <Select
                    name="project"
                    value={formData.project}
                    onChange={handleChange}
                    placeholder="Aucun projet"
                  >
                    {projects.map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </Select>
                )}
              </FormControl>

              {formData.project && (
                <>
                  <FormControl>
                    <FormLabel>Tâches associées</FormLabel>
                    {loadingLinked ? (
                      <HStack><Spinner size="sm" /><Text fontSize="sm" color="gray.500">Chargement...</Text></HStack>
                    ) : projectTasks.length > 0 ? (
                      <Wrap spacing={2}>
                        {projectTasks.map(task => {
                          const isSelected = selectedTaskIds.includes(task.id);
                          return (
                            <WrapItem key={task.id}>
                              <Tag
                                size="md"
                                colorScheme={isSelected ? 'blue' : 'gray'}
                                cursor="pointer"
                                onClick={() => toggleTask(task.id)}
                                variant={isSelected ? 'solid' : 'outline'}
                              >
                                <TagLabel>{task.title}</TagLabel>
                              </Tag>
                            </WrapItem>
                          );
                        })}
                      </Wrap>
                    ) : (
                      <Text fontSize="sm" color="gray.400">Aucune tâche dans ce projet</Text>
                    )}
                  </FormControl>

                  <FormControl>
                    <FormLabel>Jalons associés</FormLabel>
                    {loadingLinked ? (
                      <HStack><Spinner size="sm" /><Text fontSize="sm" color="gray.500">Chargement...</Text></HStack>
                    ) : projectMilestones.length > 0 ? (
                      <Wrap spacing={2}>
                        {projectMilestones.map(ms => {
                          const isSelected = selectedMilestoneIds.includes(ms.id);
                          return (
                            <WrapItem key={ms.id}>
                              <Tag
                                size="md"
                                colorScheme={isSelected ? 'purple' : 'gray'}
                                cursor="pointer"
                                onClick={() => toggleMilestone(ms.id)}
                                variant={isSelected ? 'solid' : 'outline'}
                              >
                                <TagLabel>{ms.name}</TagLabel>
                              </Tag>
                            </WrapItem>
                          );
                        })}
                      </Wrap>
                    ) : (
                      <Text fontSize="sm" color="gray.400">Aucun jalon dans ce projet</Text>
                    )}
                  </FormControl>
                </>
              )}

              {/* Destination */}
              <Divider />
              <Heading size="sm" color="gray.600" textTransform="uppercase" letterSpacing="wider">
                <HStack><Icon as={FiMapPin} /> Destination</HStack>
              </Heading>

              <FormControl isRequired>
                <FormLabel>Nom de la destination</FormLabel>
                <LocationSearch
                  value={formData.destination_name}
                  placeholder="Rechercher une ville, un pays..."
                  onSelect={(loc) => {
                    setFormData(prev => ({
                      ...prev,
                      destination_name: loc.name,
                      destination_lat: loc.lat,
                      destination_lng: loc.lng,
                    }));
                    setDestinationDistance(loc.distance);
                  }}
                  onChange={(val) => {
                    setFormData(prev => ({ ...prev, destination_name: val }));
                  }}
                  onDistanceChange={(dist) => setDestinationDistance(dist)}
                />
              </FormControl>

              <HStack spacing={4}>
                <FormControl>
                  <FormLabel>Latitude</FormLabel>
                  <Input
                    name="destination_lat"
                    type="number"
                    step="any"
                    value={formData.destination_lat ?? ''}
                    onChange={(e) => {
                      const val = e.target.value;
                      setFormData(prev => ({ ...prev, destination_lat: val === '' ? null : parseFloat(val) }));
                    }}
                    placeholder="5.3600"
                  />
                </FormControl>
                <FormControl>
                  <FormLabel>Longitude</FormLabel>
                  <Input
                    name="destination_lng"
                    type="number"
                    step="any"
                    value={formData.destination_lng ?? ''}
                    onChange={(e) => {
                      const val = e.target.value;
                      setFormData(prev => ({ ...prev, destination_lng: val === '' ? null : parseFloat(val) }));
                    }}
                    placeholder="-4.0083"
                  />
                </FormControl>
              </HStack>

              {/* Dates */}
              <Divider />
              <Heading size="sm" color="gray.600" textTransform="uppercase" letterSpacing="wider">
                <HStack><Icon as={FiUsers} /> Dates</HStack>
              </Heading>

              <HStack spacing={4}>
                <FormControl isRequired>
                  <FormLabel>Date de début</FormLabel>
                  <Input
                    name="start_date"
                    type="date"
                    value={formData.start_date}
                    onChange={handleChange}
                  />
                </FormControl>
                <FormControl>
                  <FormLabel>Date de fin</FormLabel>
                  <Input
                    name="end_date"
                    type="date"
                    value={formData.end_date}
                    onChange={handleChange}
                  />
                </FormControl>
              </HStack>

              {/* Membres */}
              <Divider />
              <Heading size="sm" color="gray.600" textTransform="uppercase" letterSpacing="wider">
                <HStack><Icon as={FiUsers} /> Équipe</HStack>
              </Heading>

              <FormControl>
                <FormLabel>Chef de mission (obligatoire)</FormLabel>
                <Select
                  value={selectedLeaderId}
                  onChange={(e) => {
                    const val = e.target.value;
                    setSelectedLeaderId(val);
                    if (val && !selectedMemberIds.includes(parseInt(val))) {
                      setSelectedMemberIds(prev => [...prev, parseInt(val)]);
                    }
                  }}
                  placeholder="Sélectionner le chef de mission"
                >
                  {companyUsers.map(u => (
                    <option key={u.id} value={u.id}>{u.username} ({u.email})</option>
                  ))}
                </Select>
              </FormControl>

              <FormControl>
                <FormLabel>Ajouter des membres</FormLabel>
                <HStack mb={2}>
                  <Select
                    value={selectedMemberId}
                    onChange={(e) => setSelectedMemberId(e.target.value)}
                    placeholder="Sélectionner un membre"
                    flex={1}
                  >
                    {companyUsers
                      .filter(u => !selectedMemberIds.includes(u.id))
                      .map(u => (
                        <option key={u.id} value={u.id}>{u.username} ({u.email})</option>
                      ))}
                  </Select>
                  <Button size="sm" colorScheme="blue" leftIcon={<FiPlus />} onClick={addMember}>
                    Ajouter
                  </Button>
                </HStack>
                {selectedMemberIds.length > 0 && (
                  <Wrap spacing={2}>
                    {selectedMemberIds.map(uid => {
                      const u = companyUsers.find(usr => usr.id === uid);
                      const isLeader = String(uid) === selectedLeaderId;
                      return (
                        <WrapItem key={uid}>
                          <Tag
                            size="md"
                            colorScheme={isLeader ? 'orange' : 'blue'}
                            borderRadius="full"
                          >
                            <Avatar size="xs" name={u?.username} ml={-1} mr={1} />
                            <TagLabel>{u?.username || `#${uid}`}</TagLabel>
                            {isLeader && (
                              <Badge ml={1} fontSize="2xs" variant="outline" colorScheme="orange">
                                Chef
                              </Badge>
                            )}
                            <TagCloseButton onClick={() => removeMember(uid)} />
                          </Tag>
                        </WrapItem>
                      );
                    })}
                  </Wrap>
                )}
              </FormControl>

              {/* Coûts */}
              <Divider />
              <Heading size="sm" color="gray.600" textTransform="uppercase" letterSpacing="wider">
                <HStack><Icon as={FiDollarSign} /> Coûts détaillés</HStack>
              </Heading>

              <FormControl>
                <FormLabel>Devise</FormLabel>
                {loadingCurrencies ? (
                  <HStack><Spinner size="sm" /><Text fontSize="sm" color="gray.500">Chargement des devises...</Text></HStack>
                ) : (
                  <Select
                    value={formData.currency}
                    onChange={(e) => setFormData(prev => ({ ...prev, currency: e.target.value }))}
                  >
                    {Object.entries(currencies).map(([code, name]) => (
                      <option key={code} value={code}>
                        {code.toUpperCase()} — {Array.isArray(name) ? name[0] : name}
                      </option>
                    ))}
                  </Select>
                )}
              </FormControl>

              <HStack spacing={4} flexWrap="wrap">
                <FormControl>
                  <FormLabel>Indemnité ({formData.currency.toUpperCase()}/jour)</FormLabel>
                  <NumberInput
                    value={formData.cost_per_diem}
                    onChange={(val) => setFormData(prev => ({ ...prev, cost_per_diem: parseFloat(val) || 0 }))}
                    min={0}
                  >
                    <NumberInputField />
                    <NumberInputStepper>
                      <NumberIncrementStepper />
                      <NumberDecrementStepper />
                    </NumberInputStepper>
                  </NumberInput>
                </FormControl>
                <FormControl>
                  <FormLabel>Hébergement ({formData.currency.toUpperCase()})</FormLabel>
                  <NumberInput
                    value={formData.cost_accommodation}
                    onChange={(val) => setFormData(prev => ({ ...prev, cost_accommodation: parseFloat(val) || 0 }))}
                    min={0}
                  >
                    <NumberInputField />
                    <NumberInputStepper>
                      <NumberIncrementStepper />
                      <NumberDecrementStepper />
                    </NumberInputStepper>
                  </NumberInput>
                </FormControl>
              </HStack>
              <HStack spacing={4} flexWrap="wrap">
                <FormControl>
                  <FormLabel>Transport ({formData.currency.toUpperCase()})</FormLabel>
                  <NumberInput
                    value={formData.cost_transport}
                    onChange={(val) => setFormData(prev => ({ ...prev, cost_transport: parseFloat(val) || 0 }))}
                    min={0}
                  >
                    <NumberInputField />
                    <NumberInputStepper>
                      <NumberIncrementStepper />
                      <NumberDecrementStepper />
                    </NumberInputStepper>
                  </NumberInput>
                </FormControl>
                <FormControl>
                  <FormLabel>Autres frais ({formData.currency.toUpperCase()})</FormLabel>
                  <NumberInput
                    value={formData.cost_other}
                    onChange={(val) => setFormData(prev => ({ ...prev, cost_other: parseFloat(val) || 0 }))}
                    min={0}
                  >
                    <NumberInputField />
                    <NumberInputStepper>
                      <NumberIncrementStepper />
                      <NumberDecrementStepper />
                    </NumberInputStepper>
                  </NumberInput>
                </FormControl>
              </HStack>

              {/* Rapports */}
              <Divider />
              <Heading size="sm" color="gray.600" textTransform="uppercase" letterSpacing="wider">
                Rapports
              </Heading>

              <FormControl>
                <FormLabel>Rapport de mission</FormLabel>
                <Textarea
                  name="mission_report"
                  value={formData.mission_report}
                  onChange={handleChange}
                  placeholder="Rapport d'activité de la mission..."
                  rows={4}
                />
              </FormControl>
            </VStack>

            <HStack w="full" justify="flex-end" pt={6}>
              <Button
                variant="ghost"
                onClick={() => navigate(isEditing ? `/missions/${id}` : '/missions')}
              >
                Annuler
              </Button>
              <Button
                type="submit"
                colorScheme="blue"
                leftIcon={<FiSave />}
                isLoading={submitting}
                loadingText={isEditing ? 'Enregistrement...' : 'Création...'}
              >
                {isEditing ? 'Enregistrer' : 'Créer la mission'}
              </Button>
            </HStack>
          </form>
        </Box>

        {/* Right: Map */}
        <Box
          w={{ base: '100%', lg: '480px' }}
          flexShrink={0}
          position={{ lg: 'sticky' }}
          top={{ lg: '24px' }}
          bg={bgColor}
          borderRadius="lg"
          shadow="sm"
          borderWidth="1px"
          borderColor={borderColor}
          overflow="hidden"
        >
          {formData.destination_lat && formData.destination_lng ? (
            <Box>
              <iframe
                title="Destination Preview"
                width="100%"
                height="520"
                frameBorder="0"
                style={{ border: 0, display: 'block' }}
                src={`https://www.openstreetmap.org/export/embed.html?bbox=${formData.destination_lng - 0.08},${formData.destination_lat - 0.05},${formData.destination_lng + 0.08},${formData.destination_lat + 0.05}&layer=mapnik&marker=${formData.destination_lat},${formData.destination_lng}`}
                allowFullScreen
              />
              <VStack align="stretch" p={4} spacing={1}>
                <HStack justify="space-between">
                  <HStack spacing={1}>
                    <Icon as={FiMapPin} color="blue.500" boxSize={4} />
                    <Text fontWeight="600" fontSize="sm">{formData.destination_name}</Text>
                  </HStack>
                  <Text fontSize="xs" color="gray.500">
                    {Number(formData.destination_lat).toFixed(4)}, {Number(formData.destination_lng).toFixed(4)}
                  </Text>
                </HStack>
                {destinationDistance != null && (
                  <Badge colorScheme="purple" fontSize="xs" alignSelf="start">
                    Distance : {destinationDistance < 1
                      ? `${Math.round(destinationDistance * 1000)} m`
                      : destinationDistance < 100
                        ? `${destinationDistance.toFixed(1)} km`
                        : `${Math.round(destinationDistance).toLocaleString()} km`
                    } (depuis votre position)
                  </Badge>
                )}
              </VStack>
            </Box>
          ) : (
            <Box h="580px" display="flex" alignItems="center" justifyContent="center" bg="gray.50">
              <VStack spacing={3}>
                <Icon as={FiMapPin} boxSize={12} color="gray.300" />
                <Text color="gray.400" fontSize="sm" textAlign="center">
                  Recherchez une destination pour<br />afficher la carte
                </Text>
              </VStack>
            </Box>
          )}
        </Box>
      </Flex>
    </Box>
  );
};

export default MissionForm;
