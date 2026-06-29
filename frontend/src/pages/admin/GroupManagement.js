import React, { useState } from 'react';
import {
  Box, Heading, Button, Table, Thead, Tbody, Tr, Th, Td, Badge,
  useDisclosure, Modal, ModalOverlay, ModalContent, ModalHeader,
  ModalBody, ModalFooter, ModalCloseButton, FormControl, FormLabel,
  Input, Textarea, useToast, IconButton, HStack, Spinner, Alert, AlertIcon,
  Tag, TagLabel, TagCloseButton, Wrap, WrapItem, Select,
} from '@chakra-ui/react';
import { FiPlus, FiEdit2, FiTrash2, FiUsers } from 'react-icons/fi';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { useCrudService } from '../../utils/createCrudService';
import { useAuth } from '../../context/AuthContext';

const GroupManagement = () => {
  const toast = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { isOpen, onOpen, onClose } = useDisclosure();
  const { isOpen: isMembersOpen, onOpen: onMembersOpen, onClose: onMembersClose } = useDisclosure();
  const [editingGroup, setEditingGroup] = useState(null);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [form, setForm] = useState({ name: '', description: '' });
  const [selectedUserId, setSelectedUserId] = useState('');
  const groupService = useCrudService('/groups', { resourceName: 'groupes' });
  const userService = useCrudService('/users', { resourceName: 'utilisateurs' });

  const { data: groups = [], isLoading } = useQuery('groups', () => groupService.getAll());
  const { data: allUsers = [] } = useQuery('managed-users', () => userService.getAll());
  const { data: groupMembers = [], refetch: refetchMembers } = useQuery(
    ['group-members', selectedGroup?.id],
    () => groupService.getAll().then(() => {
      const { axiosInstance } = require('../../context/AuthContext');
      return fetch(`/api/groups/${selectedGroup.id}/members/`).then(r => r.json());
    }),
    { enabled: false }
  );

  const createMutation = useMutation(
    (data) => groupService.create(data),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('groups');
        toast({ title: 'Groupe cr\u00e9\u00e9', status: 'success', duration: 3000 });
        handleClose();
      },
      onError: (err) => {
        toast({ title: 'Erreur', description: JSON.stringify(err.response?.data || 'Erreur'), status: 'error', duration: 3000 });
      },
    }
  );

  const updateMutation = useMutation(
    ({ id, data }) => groupService.update(id, data),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('groups');
        toast({ title: 'Groupe mis \u00e0 jour', status: 'success', duration: 3000 });
        handleClose();
      },
      onError: (err) => {
        toast({ title: 'Erreur', description: JSON.stringify(err.response?.data || 'Erreur'), status: 'error', duration: 3000 });
      },
    }
  );

  const deleteMutation = useMutation(
    (id) => groupService.remove(id),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('groups');
        toast({ title: 'Groupe supprim\u00e9', status: 'info', duration: 3000 });
      },
    }
  );

  const handleOpen = (group = null) => {
    if (group) {
      setEditingGroup(group);
      setForm({ name: group.name, description: group.description || '' });
    } else {
      setEditingGroup(null);
      setForm({ name: '', description: '' });
    }
    onOpen();
  };

  const handleClose = () => {
    setEditingGroup(null);
    setForm({ name: '', description: '' });
    onClose();
  };

  const handleSubmit = () => {
    if (editingGroup) {
      updateMutation.mutate({ id: editingGroup.id, data: form });
    } else {
      createMutation.mutate(form);
    }
  };

  if (isLoading) return <Box p={8}><Spinner size="xl" /></Box>;

  const groupList = Array.isArray(groups) ? groups : groups.results || [];

  return (
    <Box p={8}>
      <HStack justify="space-between" mb={6}>
        <Heading size="lg">Gestion des groupes</Heading>
        <Button leftIcon={<FiPlus />} colorScheme="blue" onClick={() => handleOpen()}>
          Nouveau groupe
        </Button>
      </HStack>

      <Table variant="simple">
        <Thead>
          <Tr>
            <Th>Nom</Th>
            <Th>Entreprise</Th>
            <Th>Membres</Th>
            <Th>Actions</Th>
          </Tr>
        </Thead>
        <Tbody>
          {groupList.map((g) => (
            <Tr key={g.id}>
              <Td fontWeight="600">{g.name}</Td>
              <Td>{g.company_name}</Td>
              <Td>
                <Badge colorScheme="blue">{g.members_count} membres</Badge>
              </Td>
              <Td>
                <HStack spacing={2}>
                  <IconButton size="sm" icon={<FiEdit2 />} onClick={() => handleOpen(g)} aria-label="Modifier" />
                  <IconButton size="sm" icon={<FiTrash2 />} colorScheme="red" onClick={() => deleteMutation.mutate(g.id)} aria-label="Supprimer" />
                </HStack>
              </Td>
            </Tr>
          ))}
        </Tbody>
      </Table>

      <Modal isOpen={isOpen} onClose={handleClose}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>{editingGroup ? 'Modifier' : 'Cr\u00e9er'} un groupe</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <FormControl mb={4} isRequired>
              <FormLabel>Nom</FormLabel>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Nom du groupe" />
            </FormControl>
            <FormControl mb={4}>
              <FormLabel>Description</FormLabel>
              <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </FormControl>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={handleClose}>Annuler</Button>
            <Button colorScheme="blue" onClick={handleSubmit} isLoading={createMutation.isLoading || updateMutation.isLoading}>
              {editingGroup ? 'Mettre \u00e0 jour' : 'Cr\u00e9er'}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  );
};

export default GroupManagement;
