import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link as RouterLink } from 'react-router-dom';
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
  planned: { color: 'blue', label: 'Planifiée', icon: FiClock },
  in_progress: { color: 'orange', label: 'En cours', icon: FiPlay },
  completed: { color: 'green', label: 'Terminée', icon: FiCheck },
  cancelled: { color: 'red', label: 'Annulée', icon: FiXCircle },
};

const MissionDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
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

  // Reports editing
  const [editingReports, setEditingReports] = useState(false);
  const [reportsForm, setReportsForm] = useState({ mission_report: '' });

  // Cost editing
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
      toast({ title: 'Erreur lors du chargement', status: 'error', duration: 3000 });
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
      toast({ title: 'Mission mise à jour', status: 'success', duration: 2000 });
      await loadMission();
    } catch (error) {
      toast({
        title: 'Erreur',
        description: error.response?.data?.error || 'Action non autorisée',
        status: 'error', duration: 3000,
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async () => {
    try {
      await deleteMission(id);
      toast({ title: 'Mission supprimée', status: 'success', duration: 2000 });
      navigate('/missions');
    } catch (error) {
      toast({ title: 'Erreur lors de la suppression', status: 'error', duration: 3000 });
    } finally {
      onDeleteClose();
    }
  };

  const handleSaveReports = async () => {
    try {
      await updateReports(id, reportsForm);
      toast({ title: 'Rapports mis à jour', status: 'success', duration: 2000 });
      setEditingReports(false);
      await loadMission();
    } catch (error) {
      toast({ title: 'Erreur', description: error.response?.data?.error || 'Erreur inconnue', status: 'error', duration: 3000 });
    }
  };

  const handleSaveCosts = async () => {
    try {
      await updateCosts(id, costsForm);
      toast({ title: 'Coûts mis à jour', status: 'success', duration: 2000 });
      setEditingCosts(false);
      await loadMission();
    } catch (error) {
      toast({ title: 'Erreur', status: 'error', duration: 3000 });
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return null;
    return new Date(dateStr + 'T00:00:00').toLocaleDateString('fr-FR', {
      day: 'numeric', month: 'long', year: 'numeric',
    });
  };

  const formatCost = (amount, currency) => {
    const cur = (currency || 'XOF').toUpperCase();
    try {
      return new Intl.NumberFormat('fr-FR', {
        style: 'currency', currency: cur, minimumFractionDigits: 0,
      }).format(amount || 0);
    } catch {
      return `${(amount || 0).toLocaleString('fr-FR')} ${cur}`;
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
        <Heading size="md" color="gray.500" mb={2}>Mission introuvable</Heading>
        <Button as={RouterLink} to="/missions" leftIcon={<FiArrowLeft />} mt={4}>
          Retour aux missions
        </Button>
      </Box>
    );
  }

  const status = statusConfig[mission.status] || statusConfig.planned;
  const isLeader = mission.members?.some(m => m.is_leader && m.user === user?.id);

  return (
    <Box>
      <Button leftIcon={<FiArrowLeft />} variant="ghost" mb={4} onClick={() => navigate('/missions')}>
        Retour aux missions
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
              <Tooltip label="Modifier">
                <IconButton
                  as={RouterLink}
                  to={`/missions/${id}/edit`}
                  icon={<FiEdit2 />}
                  variant="outline"
                  size="sm"
                  aria-label="Modifier"
                />
              </Tooltip>
              <Tooltip label="Supprimer">
                <IconButton
                  icon={<FiTrash2 />}
                  variant="outline"
                  colorScheme="red"
                  size="sm"
                  onClick={onDeleteOpen}
                  aria-label="Supprimer"
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
              {status.label}
            </Badge>
            {mission.duration_days != null && (
              <HStack spacing={1} color="gray.500">
                <Icon as={FiClock} />
                <Text fontSize="sm">{mission.duration_days} jour{mission.duration_days > 1 ? 's' : ''}</Text>
              </HStack>
            )}
            <HStack spacing={1} color="gray.500">
              <Icon as={FiMapPin} />
              <Text fontSize="sm">{mission.destination_name}</Text>
            </HStack>
            {mission.created_by_name && (
              <Text fontSize="sm" color="gray.400">Créé par {mission.created_by_name}</Text>
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
                  Démarrer la mission
                </Button>
              )}
              {mission.status === 'in_progress' && (
                <Button
                  size="sm" leftIcon={<FiCheck />} colorScheme="green" variant="outline"
                  onClick={() => handleAction('end')} isLoading={actionLoading}
                >
                  Terminer la mission
                </Button>
              )}
              {(mission.status === 'planned' || mission.status === 'in_progress') && (
                <Button
                  size="sm" leftIcon={<FiXCircle />} colorScheme="red" variant="ghost"
                  onClick={() => handleAction('cancel')} isLoading={actionLoading}
                >
                  Annuler
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
            <StatLabel><Icon as={FiDollarSign} mr={1} />Frais de mission</StatLabel>
            <StatNumber fontSize="lg">{formatCost(mission.frais_de_mission || mission.total_cost)}</StatNumber>
          </Stat>
        </Box>
        <Box bg={bgColor} borderRadius="xl" shadow="sm" borderWidth="1px" borderColor={borderColor} p={4}>
          <Stat>
            <StatLabel><Icon as={FiUsers} mr={1} />Équipe</StatLabel>
            <StatNumber fontSize="lg">{mission.members?.length || 0} membre{(mission.members?.length || 0) > 1 ? 's' : ''}</StatNumber>
          </Stat>
        </Box>
        <Box bg={bgColor} borderRadius="xl" shadow="sm" borderWidth="1px" borderColor={borderColor} p={4}>
          <Stat>
            <StatLabel><Icon as={FiCalendar} mr={1} />Durée</StatLabel>
            <StatNumber fontSize="lg">{mission.duration_days != null ? `${mission.duration_days}j` : '—'}</StatNumber>
          </Stat>
        </Box>
        <Box bg={bgColor} borderRadius="xl" shadow="sm" borderWidth="1px" borderColor={borderColor} p={4}>
          <Stat>
            <StatLabel><Icon as={FiMapPin} mr={1} />Destination</StatLabel>
            <Text fontSize="sm" noOfLines={2} mt={1}>{mission.destination_name}</Text>
          </Stat>
        </Box>
      </SimpleGrid>

      {/* Tabs */}
      <Box bg={bgColor} borderRadius="xl" shadow="sm" borderWidth="1px" borderColor={borderColor} overflow="hidden">
        <Tabs colorScheme="blue">
          <TabList px={4}>
            <Tab>Équipe</Tab>
            <Tab>Coûts</Tab>
            <Tab>Note de frais</Tab>
            <Tab>Rapport de mission</Tab>
            <Tab>Associations</Tab>
            <Tab>Carte</Tab>
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
                              <Badge colorScheme="orange" borderRadius="full">Chef de mission</Badge>
                            )}
                          </HStack>
                          {m.user_email && <Text fontSize="sm" color="gray.500">{m.user_email}</Text>}
                        </Box>
                      </HStack>
                      <Text fontSize="xs" color="gray.400">
                        Depuis le {new Date(m.joined_at).toLocaleDateString('fr-FR')}
                      </Text>
                    </Flex>
                  ))}
                </VStack>
              ) : (
                <Box textAlign="center" py={12}>
                  <Icon as={FiUsers} boxSize={16} color="gray.300" mb={4} />
                  <Heading size="md" color="gray.500" mb={2}>Aucun membre</Heading>
                  <Text color="gray.400">Ajoutez des membres à cette mission.</Text>
                </Box>
              )}
            </TabPanel>

            {/* Costs Tab */}
            <TabPanel>
              <VStack spacing={4} align="stretch">
                <Flex justify="space-between" align="center">
                  <Heading size="sm">Coûts détaillés</Heading>
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
                      {editingCosts ? 'Annuler' : 'Modifier'}
                    </Button>
                  )}
                </Flex>

                {editingCosts ? (
                  <VStack spacing={3} align="stretch">
                    <HStack spacing={4} flexWrap="wrap">
                      <FormControl flex={1}>
                        <FormLabel>Indemnité (F CFA/jour)</FormLabel>
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
                        <FormLabel>Hébergement (F CFA)</FormLabel>
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
                        <FormLabel>Transport (F CFA)</FormLabel>
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
                        <FormLabel>Autres frais (F CFA)</FormLabel>
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
                      Enregistrer
                    </Button>
                  </VStack>
                ) : (
                  <VStack spacing={2} align="stretch">
                    <Flex justify="space-between" p={3} bg={codeBg} borderRadius="lg">
                      <Text fontWeight="500">Indemnité</Text>
                      <Text fontWeight="600">{formatCost(mission.cost_per_diem)}</Text>
                    </Flex>
                    <Flex justify="space-between" p={3} bg={codeBg} borderRadius="lg">
                      <Text fontWeight="500">Hébergement</Text>
                      <Text fontWeight="600">{formatCost(mission.cost_accommodation)}</Text>
                    </Flex>
                    <Flex justify="space-between" p={3} bg={codeBg} borderRadius="lg">
                      <Text fontWeight="500">Transport</Text>
                      <Text fontWeight="600">{formatCost(mission.cost_transport)}</Text>
                    </Flex>
                    <Flex justify="space-between" p={3} bg={codeBg} borderRadius="lg">
                      <Text fontWeight="500">Autres frais</Text>
                      <Text fontWeight="600">{formatCost(mission.cost_other)}</Text>
                    </Flex>
                    <Divider />
                    <Flex justify="space-between" p={3} bg="blue.50" borderRadius="lg">
                      <Text fontWeight="700">Frais de mission</Text>
                      <Text fontWeight="700" color="blue.600">{formatCost(mission.frais_de_mission || mission.total_cost)}</Text>
                    </Flex>
                  </VStack>
                )}
              </VStack>
            </TabPanel>

            {/* Expense Report Tab — Note de frais */}
            <TabPanel>
              <NoteDeFrais mission={mission} formatCost={formatCost} getCostBreakdown={getCostBreakdown} />
            </TabPanel>

            {/* Mission Report Tab */}
            <TabPanel>
              <VStack spacing={4} align="stretch">
                <Flex justify="space-between" align="center">
                  <Heading size="sm">Rapport de mission</Heading>
                  {(isLeader || user?.role === 'admin' || user?.role === 'superadmin') && (
                    editingReports ? (
                      <HStack>
                        <Button size="sm" variant="ghost" leftIcon={<FiXCircle />}
                          onClick={() => setEditingReports(false)}>
                          Annuler
                        </Button>
                        <Button size="sm" variant="ghost" leftIcon={<FiSave />}
                          onClick={handleSaveReports}>
                          Enregistrer
                        </Button>
                      </HStack>
                    ) : (
                      <Button size="sm" variant="ghost" leftIcon={<FiEdit2 />}
                        onClick={() => {
                          setReportsForm({ mission_report: mission.mission_report || '' });
                          setEditingReports(true);
                        }}>
                        Modifier
                      </Button>
                    )
                  )}
                </Flex>

                {editingReports ? (
                  <FormControl>
                    <Textarea
                      value={reportsForm.mission_report}
                      onChange={(e) => setReportsForm(prev => ({ ...prev, mission_report: e.target.value }))}
                      placeholder="Rapport d'activité..."
                      rows={12}
                    />
                  </FormControl>
                ) : (
                  <Box bg={codeBg} p={4} borderRadius="lg" borderWidth="1px" borderColor={borderColor}>
                    {mission.mission_report ? (
                      <Text whiteSpace="pre-wrap" lineHeight="tall">{mission.mission_report}</Text>
                    ) : (
                      <Text color="gray.400" fontStyle="italic">Aucun rapport de mission renseigné</Text>
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
                    <HStack><Icon as={FiLink} /> Projet associé</HStack>
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
                          <Text fontSize="sm" color="gray.500">{mission.project_detail.progress || 0}% complété</Text>
                        </Box>
                      </HStack>
                      <Badge colorScheme={mission.project_detail.status === 'completed' ? 'green' : 'blue'}>
                        {mission.project_detail.status}
                      </Badge>
                    </Flex>
                  ) : (
                    <Text color="gray.400" fontStyle="italic">Aucun projet associé</Text>
                  )}
                </Box>

                <Divider />

                {/* Tasks */}
                <Box>
                  <Heading size="sm" mb={3}>
                    <HStack><Icon as={FiFileText} /> Tâches associées</HStack>
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
                              <Text fontSize="xs" color="gray.500">Assigné à {task.assigned_to_name}</Text>
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
                    <Text color="gray.400" fontStyle="italic">Aucune tâche associée</Text>
                  )}
                </Box>

                <Divider />

                {/* Milestones */}
                <Box>
                  <Heading size="sm" mb={3}>
                    <HStack><Icon as={FiCalendar} /> Jalons associés</HStack>
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
                              Échéance : {formatDate(ms.due_date) || '—'}
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
                    <Text color="gray.400" fontStyle="italic">Aucun jalon associé</Text>
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
                  <Heading size="md" color="gray.500" mb={2}>Géolocalisation non disponible</Heading>
                  <Text color="gray.400">Ajoutez les coordonnées GPS de la destination pour afficher la carte.</Text>
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
            <AlertDialogHeader fontSize="lg" fontWeight="bold">Supprimer la mission</AlertDialogHeader>
            <AlertDialogBody>Êtes-vous sûr ? Cette action est irréversible.</AlertDialogBody>
            <AlertDialogFooter>
              <Button ref={deleteRef} onClick={onDeleteClose}>Annuler</Button>
              <Button colorScheme="red" onClick={handleDelete} ml={3}>Supprimer</Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialogOverlay>
      </AlertDialog>
    </Box>
  );
};

const NoteDeFrais = ({ mission, formatCost, getCostBreakdown }) => {
  const bgColor = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.600');
  const codeBg = useColorModeValue('gray.50', 'gray.900');
  const printRef = useRef(null);
  const cur = (mission.currency || 'XOF').toUpperCase();
  const breakdown = getCostBreakdown(mission);

  const handlePrint = () => {
    const content = printRef.current;
    if (!content) return;
    const win = window.open('', '_blank');
    win.document.write(`
      <html><head><title>Note de frais - ${mission.title}</title>
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
        <h1>NOTE DE FRAIS</h1>
        <div class="header">
          <div>
            <div class="info"><strong>Mission :</strong> ${mission.title}</div>
            <div class="info"><strong>Destination :</strong> ${mission.destination_name}</div>
            <div class="info"><strong>Date début :</strong> ${mission.start_date || '—'}</div>
            <div class="info"><strong>Date fin :</strong> ${mission.end_date || '—'}</div>
            <div class="info"><strong>Durée :</strong> ${breakdown.days} jour(s)</div>
            <div class="info"><strong>Devise :</strong> ${cur}</div>
          </div>
          <div style="text-align:right">
            <div class="info"><strong>Chef de mission :</strong> ${mission.members?.find(m => m.is_leader)?.user_name || '—'}</div>
            <div class="info"><strong>Statut :</strong> ${mission.status}</div>
          </div>
        </div>
        <table>
          <thead><tr><th>Désignation</th><th>Quantité</th><th>Coût unitaire (${cur})</th><th>Montant (${cur})</th></tr></thead>
          <tbody>
            <tr><td>Indemnité (per diem)</td><td>${breakdown.days} jour(s)</td><td>${Number(mission.cost_per_diem).toLocaleString('fr-FR')}</td><td>${Number(breakdown.perDiemTotal).toLocaleString('fr-FR')}</td></tr>
            <tr><td>Hébergement</td><td>${breakdown.accomDays} nuit(s)</td><td>${Number(mission.cost_accommodation).toLocaleString('fr-FR')}</td><td>${Number(breakdown.accomTotal).toLocaleString('fr-FR')}</td></tr>
            <tr><td>Transport</td><td>—</td><td>—</td><td>${Number(breakdown.transport).toLocaleString('fr-FR')}</td></tr>
            <tr><td>Autres frais</td><td>—</td><td>—</td><td>${Number(breakdown.other).toLocaleString('fr-FR')}</td></tr>
            <tr class="total-row"><td colspan="3">TOTAL</td><td>${Number(breakdown.total).toLocaleString('fr-FR')} ${cur}</td></tr>
          </tbody>
        </table>
        <div class="footer">Généré le ${new Date().toLocaleDateString('fr-FR')} à ${new Date().toLocaleTimeString('fr-FR')}</div>
      </body></html>
    `);
    win.document.close();
    win.print();
  };

  const handleDownloadPDF = () => {
    const content = printRef.current;
    if (!content) return;
    const win = window.open('', '_blank');
    win.document.write(`
      <html><head><title>Note de frais - ${mission.title}</title>
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
        <h1>NOTE DE FRAIS</h1>
        <div class="header">
          <div>
            <div class="info"><strong>Mission :</strong> ${mission.title}</div>
            <div class="info"><strong>Destination :</strong> ${mission.destination_name}</div>
            <div class="info"><strong>Date début :</strong> ${mission.start_date || '—'}</div>
            <div class="info"><strong>Date fin :</strong> ${mission.end_date || '—'}</div>
            <div class="info"><strong>Durée :</strong> ${breakdown.days} jour(s)</div>
            <div class="info"><strong>Devise :</strong> ${cur}</div>
          </div>
          <div style="text-align:right">
            <div class="info"><strong>Chef de mission :</strong> ${mission.members?.find(m => m.is_leader)?.user_name || '—'}</div>
            <div class="info"><strong>Statut :</strong> ${mission.status}</div>
          </div>
        </div>
        <table>
          <thead><tr><th>Désignation</th><th>Quantité</th><th>Coût unitaire (${cur})</th><th>Montant (${cur})</th></tr></thead>
          <tbody>
            <tr><td>Indemnité (per diem)</td><td>${breakdown.days} jour(s)</td><td>${Number(mission.cost_per_diem).toLocaleString('fr-FR')}</td><td>${Number(breakdown.perDiemTotal).toLocaleString('fr-FR')}</td></tr>
            <tr><td>Hébergement</td><td>${breakdown.accomDays} nuit(s)</td><td>${Number(mission.cost_accommodation).toLocaleString('fr-FR')}</td><td>${Number(breakdown.accomTotal).toLocaleString('fr-FR')}</td></tr>
            <tr><td>Transport</td><td>—</td><td>—</td><td>${Number(breakdown.transport).toLocaleString('fr-FR')}</td></tr>
            <tr><td>Autres frais</td><td>—</td><td>—</td><td>${Number(breakdown.other).toLocaleString('fr-FR')}</td></tr>
            <tr class="total-row"><td colspan="3">TOTAL FRAIS DE MISSION</td><td>${Number(breakdown.total).toLocaleString('fr-FR')} ${cur}</td></tr>
          </tbody>
        </table>
        <div class="footer">Généré le ${new Date().toLocaleDateString('fr-FR')} à ${new Date().toLocaleTimeString('fr-FR')}</div>
      </body></html>
    `);
    win.document.close();
    setTimeout(() => { win.print(); }, 300);
  };

  return (
    <VStack spacing={4} align="stretch">
      <Flex justify="space-between" align="center">
        <Heading size="sm">Note de frais</Heading>
        <HStack spacing={2}>
          <Button size="sm" leftIcon={<FiPrinter />} onClick={handlePrint} variant="outline">
            Imprimer
          </Button>
          <Button size="sm" leftIcon={<FiDownload />} onClick={handleDownloadPDF} variant="outline" colorScheme="green">
            Télécharger PDF
          </Button>
        </HStack>
      </Flex>

      <Box ref={printRef} bg={codeBg} p={5} borderRadius="lg" borderWidth="1px" borderColor={borderColor}>
        <VStack spacing={4} align="stretch">
          <Box>
            <Text fontWeight="700" fontSize="lg" mb={1}>NOTE DE FRAIS</Text>
            <Divider mb={3} />
            <SimpleGrid columns={{ base: 1, md: 2 }} spacing={2}>
              <VStack align="start" spacing={0}>
                <Text fontSize="sm"><Text as="span" fontWeight="600">Mission :</Text> {mission.title}</Text>
                <Text fontSize="sm"><Text as="span" fontWeight="600">Destination :</Text> {mission.destination_name}</Text>
                <Text fontSize="sm"><Text as="span" fontWeight="600">Date début :</Text> {mission.start_date || '—'}</Text>
                <Text fontSize="sm"><Text as="span" fontWeight="600">Date fin :</Text> {mission.end_date || '—'}</Text>
                <Text fontSize="sm"><Text as="span" fontWeight="600">Durée :</Text> {breakdown.days} jour(s)</Text>
              </VStack>
              <VStack align="start" spacing={0}>
                <Text fontSize="sm"><Text as="span" fontWeight="600">Chef de mission :</Text> {mission.members?.find(m => m.is_leader)?.user_name || '—'}</Text>
                <Text fontSize="sm"><Text as="span" fontWeight="600">Statut :</Text> {mission.status}</Text>
                <Text fontSize="sm"><Text as="span" fontWeight="600">Devise :</Text> {cur}</Text>
              </VStack>
            </SimpleGrid>
          </Box>

          <Box overflowX="auto">
            <Box as="table" w="100%" borderWidth="1px" borderColor={borderColor} borderRadius="lg" overflow="hidden">
              <Box as="thead" bg="gray.100">
                <Box as="tr">
                  <Box as="th" p={3} textAlign="left" fontWeight="600" fontSize="sm">Désignation</Box>
                  <Box as="th" p={3} textAlign="left" fontWeight="600" fontSize="sm">Quantité</Box>
                  <Box as="th" p={3} textAlign="right" fontWeight="600" fontSize="sm">Coût unitaire</Box>
                  <Box as="th" p={3} textAlign="right" fontWeight="600" fontSize="sm">Montant ({cur})</Box>
                </Box>
              </Box>
              <Box as="tbody">
                <Box as="tr" borderBottomWidth="1px" borderColor={borderColor}>
                  <Box as="td" p={3} fontSize="sm">Indemnité (per diem)</Box>
                  <Box as="td" p={3} fontSize="sm">{breakdown.days} jour(s)</Box>
                  <Box as="td" p={3} fontSize="sm" textAlign="right">{Number(mission.cost_per_diem).toLocaleString('fr-FR')}</Box>
                  <Box as="td" p={3} fontSize="sm" textAlign="right" fontWeight="500">{Number(breakdown.perDiemTotal).toLocaleString('fr-FR')}</Box>
                </Box>
                <Box as="tr" borderBottomWidth="1px" borderColor={borderColor}>
                  <Box as="td" p={3} fontSize="sm">Hébergement</Box>
                  <Box as="td" p={3} fontSize="sm">{breakdown.accomDays} nuit(s)</Box>
                  <Box as="td" p={3} fontSize="sm" textAlign="right">{Number(mission.cost_accommodation).toLocaleString('fr-FR')}</Box>
                  <Box as="td" p={3} fontSize="sm" textAlign="right" fontWeight="500">{Number(breakdown.accomTotal).toLocaleString('fr-FR')}</Box>
                </Box>
                <Box as="tr" borderBottomWidth="1px" borderColor={borderColor}>
                  <Box as="td" p={3} fontSize="sm">Transport</Box>
                  <Box as="td" p={3} fontSize="sm">—</Box>
                  <Box as="td" p={3} fontSize="sm" textAlign="right">—</Box>
                  <Box as="td" p={3} fontSize="sm" textAlign="right" fontWeight="500">{Number(breakdown.transport).toLocaleString('fr-FR')}</Box>
                </Box>
                <Box as="tr" borderBottomWidth="1px" borderColor={borderColor}>
                  <Box as="td" p={3} fontSize="sm">Autres frais</Box>
                  <Box as="td" p={3} fontSize="sm">—</Box>
                  <Box as="td" p={3} fontSize="sm" textAlign="right">—</Box>
                  <Box as="td" p={3} fontSize="sm" textAlign="right" fontWeight="500">{Number(breakdown.other).toLocaleString('fr-FR')}</Box>
                </Box>
                <Box as="tr" bg="blue.50">
                  <Box as="td" p={3} fontWeight="700" fontSize="sm" colSpan="3">TOTAL</Box>
                  <Box as="td" p={3} fontWeight="700" fontSize="sm" textAlign="right" color="blue.600">
                    {Number(breakdown.total).toLocaleString('fr-FR')} {cur}
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
