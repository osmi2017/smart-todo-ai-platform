import React, { useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import {
  Box, Heading, Button, HStack, VStack, Text, Badge, Icon,
  SimpleGrid, IconButton, useToast, useColorModeValue, Spinner,
  Input, Select, InputGroup, InputLeftElement, Flex,
  Menu, MenuButton, MenuList, MenuItem,
  AlertDialog, AlertDialogOverlay, AlertDialogContent,
  AlertDialogHeader, AlertDialogBody, AlertDialogFooter,
  useDisclosure, Avatar, AvatarGroup, Tooltip,
} from '@chakra-ui/react';
import {
  FiPlus, FiSearch, FiCalendar, FiMapPin, FiUsers, FiDollarSign,
  FiEye, FiEdit2, FiTrash2, FiMoreVertical, FiClock, FiCheck,
  FiXCircle, FiPlay,
} from 'react-icons/fi';
import { useMissionService } from '../services/missionService';
import LoadingState from '../components/LoadingState';

const statusConfig = {
  planned: { color: 'blue', label: 'Planifiée', icon: FiClock },
  in_progress: { color: 'orange', label: 'En cours', icon: FiPlay },
  completed: { color: 'green', label: 'Terminée', icon: FiCheck },
  cancelled: { color: 'red', label: 'Annulée', icon: FiXCircle },
};

const Missions = () => {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [deleteId, setDeleteId] = useState(null);
  const { getMissions, deleteMission } = useMissionService();
  const [missions, setMissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const toast = useToast();
  const bgColor = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.600');
  const { isOpen, onOpen, onClose } = useDisclosure();
  const cancelRef = React.useRef();

  React.useEffect(() => {
    loadMissions();
  }, []);

  const loadMissions = async () => {
    setLoading(true);
    try {
      const params = {};
      if (statusFilter) params.status = statusFilter;
      const data = await getMissions(params);
      setMissions(Array.isArray(data) ? data : data.results || []);
    } catch (error) {
      toast({ title: 'Erreur lors du chargement des missions', status: 'error', duration: 3000 });
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
      await deleteMission(deleteId);
      setMissions(missions.filter(m => m.id !== deleteId));
      toast({ title: 'Mission supprimée', status: 'success', duration: 2000 });
    } catch (error) {
      toast({ title: 'Erreur lors de la suppression', status: 'error', duration: 3000 });
    } finally {
      onClose();
      setDeleteId(null);
    }
  };

  const filtered = missions.filter(m =>
    m.title.toLowerCase().includes(search.toLowerCase())
  );

  const formatDate = (dateStr) => {
    if (!dateStr) return null;
    return new Date(dateStr + 'T00:00:00').toLocaleDateString('fr-FR', {
      day: 'numeric', month: 'short', year: 'numeric',
    });
  };

  const formatCost = (amount) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency', currency: 'XOF', minimumFractionDigits: 0,
    }).format(amount || 0);
  };

  if (loading) {
    return <LoadingState message="Chargement des missions..." />;
  }

  return (
    <Box>
      <Flex justify="space-between" align="center" mb={6} wrap="wrap" gap={3}>
        <Heading size="lg">Missions</Heading>
        <Button
          as={RouterLink}
          to="/missions/create"
          leftIcon={<FiPlus />}
          colorScheme="blue"
        >
          Nouvelle mission
        </Button>
      </Flex>

      <HStack mb={6} spacing={4} flexWrap="wrap">
        <InputGroup maxW="300px">
          <InputLeftElement><Icon as={FiSearch} color="gray.400" /></InputLeftElement>
          <Input
            placeholder="Rechercher une mission..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            bg={bgColor}
          />
        </InputGroup>
        <Select
          maxW="200px"
          placeholder="Tous les statuts"
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            loadMissions();
          }}
          bg={bgColor}
        >
          <option value="planned">Planifiée</option>
          <option value="in_progress">En cours</option>
          <option value="completed">Terminée</option>
          <option value="cancelled">Annulée</option>
        </Select>
      </HStack>

      {filtered.length === 0 ? (
        <Box textAlign="center" py={16} bg={bgColor} borderRadius="xl" shadow="sm" borderWidth="1px" borderColor={borderColor}>
          <Icon as={FiMapPin} boxSize={16} color="gray.300" mb={4} />
          <Heading size="md" color="gray.500" mb={2}>Aucune mission trouvée</Heading>
          <Text color="gray.400" mb={6}>Créez votre première mission pour commencer</Text>
          <Button as={RouterLink} to="/missions/create" colorScheme="blue" leftIcon={<FiPlus />}>
            Créer une mission
          </Button>
        </Box>
      ) : (
        <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={4}>
          {filtered.map(mission => {
            const status = statusConfig[mission.status] || statusConfig.planned;
            return (
              <Box
                key={mission.id}
                bg={bgColor}
                borderRadius="xl"
                borderWidth="1px"
                borderColor={borderColor}
                overflow="hidden"
                transition="all 0.2s"
                _hover={{ shadow: 'md', borderColor: 'blue.300', transform: 'translateY(-2px)' }}
              >
                <Box h="4px" bg={`${status.color}.400`} />
                <Box p={5}>
                  <Flex justify="space-between" align="flex-start" mb={3}>
                    <VStack align="start" spacing={1} flex={1} mr={2}>
                      <Heading size="sm" noOfLines={1}>{mission.title}</Heading>
                      {mission.description && (
                        <Text fontSize="xs" color="gray.500" noOfLines={2}>
                          {mission.description}
                        </Text>
                      )}
                    </VStack>
                    <Menu>
                      <MenuButton
                        as={IconButton}
                        icon={<FiMoreVertical />}
                        variant="ghost"
                        size="sm"
                        aria-label="Actions"
                      />
                      <MenuList>
                        <MenuItem as={RouterLink} to={`/missions/${mission.id}`} icon={<FiEye />}>
                          Voir détails
                        </MenuItem>
                        <MenuItem as={RouterLink} to={`/missions/${mission.id}/edit`} icon={<FiEdit2 />}>
                          Modifier
                        </MenuItem>
                        <MenuItem icon={<FiTrash2 />} color="red.500" onClick={() => confirmDelete(mission.id)}>
                          Supprimer
                        </MenuItem>
                      </MenuList>
                    </Menu>
                  </Flex>

                  <HStack spacing={2} mb={4} flexWrap="wrap">
                    <Badge colorScheme={status.color} display="flex" alignItems="center" gap={1}>
                      <Icon as={status.icon} boxSize={3} />
                      {status.label}
                    </Badge>
                    {mission.duration_days != null && (
                      <Badge variant="outline" display="flex" alignItems="center" gap={1}>
                        <Icon as={FiClock} boxSize={3} />
                        {mission.duration_days} jour{mission.duration_days > 1 ? 's' : ''}
                      </Badge>
                    )}
                  </HStack>

                  <VStack spacing={2} align="stretch">
                    <HStack fontSize="sm" color="gray.500">
                      <Icon as={FiMapPin} boxSize={4} />
                      <Text noOfLines={1}>{mission.destination_name}</Text>
                    </HStack>
                    <HStack fontSize="sm" color="gray.500">
                      <Icon as={FiCalendar} boxSize={4} />
                      <Text>{formatDate(mission.start_date)}{mission.end_date ? ` — ${formatDate(mission.end_date)}` : ''}</Text>
                    </HStack>
                    <HStack fontSize="sm" color="gray.500">
                      <Icon as={FiDollarSign} boxSize={4} />
                      <Text fontWeight="600">{formatCost(mission.frais_de_mission || mission.total_cost)}</Text>
                    </HStack>
                    {mission.members && mission.members.length > 0 && (
                      <HStack fontSize="sm" color="gray.500">
                        <Icon as={FiUsers} boxSize={4} />
                        <Text>{mission.members.length} membre{mission.members.length > 1 ? 's' : ''}</Text>
                        <AvatarGroup size="xs" max={4} ml={1}>
                          {mission.members.map(m => (
                            <Tooltip key={m.id} label={`${m.user_name}${m.is_leader ? ' (Chef)' : ''}`}>
                              <Avatar name={m.user_name} size="xs" />
                            </Tooltip>
                          ))}
                        </AvatarGroup>
                      </HStack>
                    )}
                  </VStack>

                  <Flex mt={4} pt={3} borderTopWidth="1px" borderColor={borderColor} justify="space-between" align="center">
                    <Button
                      as={RouterLink}
                      to={`/missions/${mission.id}`}
                      size="sm"
                      variant="ghost"
                      colorScheme="blue"
                    >
                      Voir détails
                    </Button>
                    {mission.created_by_name && (
                      <Text fontSize="xs" color="gray.400">
                        par {mission.created_by_name}
                      </Text>
                    )}
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
              Supprimer la mission
            </AlertDialogHeader>
            <AlertDialogBody>
              Êtes-vous sûr de vouloir supprimer cette mission ? Cette action est irréversible.
            </AlertDialogBody>
            <AlertDialogFooter>
              <Button ref={cancelRef} onClick={onClose}>Annuler</Button>
              <Button colorScheme="red" onClick={handleDelete} ml={3}>Supprimer</Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialogOverlay>
      </AlertDialog>
    </Box>
  );
};

export default Missions;
