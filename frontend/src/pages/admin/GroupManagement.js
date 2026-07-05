import React, { useState } from 'react';
import {
  Box, Heading, Button, Table, Thead, Tbody, Tr, Th, Td, Badge,
  useDisclosure, Modal, ModalOverlay, ModalContent, ModalHeader,
  ModalBody, ModalFooter, ModalCloseButton, FormControl, FormLabel,
  Input, Textarea, useToast, IconButton, HStack, Spinner, Alert, AlertIcon,
  Tag, TagLabel, TagCloseButton, Wrap, WrapItem, Select, Text,
} from '@chakra-ui/react';
import { FiPlus, FiEdit2, FiTrash2, FiUsers } from 'react-icons/fi';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { useCrudService } from '../../utils/createCrudService';
import { useAuth } from '../../context/AuthContext';

const GroupManagement = () => {
  const toast = useToast();
  const queryClient = useQueryClient();
  const { user: currentUser, isSuperAdmin, axiosInstance } = useAuth();
  const { isOpen, onOpen, onClose } = useDisclosure();
  const { isOpen: isMembersOpen, onOpen: onMembersOpen, onClose: onMembersClose } = useDisclosure();
  const [editingGroup, setEditingGroup] = useState(null);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [form, setForm] = useState({ name: '', description: '', company: '', member_ids: [] });
  const [selectedUserId, setSelectedUserId] = useState('');
  const groupService = useCrudService('/groups', { resourceName: 'groupes' });
  const userService = useCrudService('/users', { resourceName: 'utilisateurs' });
  const companyService = useCrudService('/companies', { resourceName: 'entreprises' });

  const { data: groups = [], isLoading } = useQuery('groups', () => groupService.getAll());
  const { data: allUsers = [] } = useQuery('managed-users', () => userService.getAll());
  const { data: companies = [] } = useQuery(
    'companies',
    () => companyService.getAll(),
    { enabled: isSuperAdmin }
  );
  const companyList = Array.isArray(companies) ? companies : companies.results || [];
  const userList = Array.isArray(allUsers) ? allUsers : allUsers.results || [];

  const { data: groupDetail } = useQuery(
    ['group-detail', selectedGroup?.id],
    () => groupService.getOne(selectedGroup.id),
    { enabled: !!selectedGroup }
  );

  const createMutation = useMutation(
    (data) => groupService.create(data),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('groups');
        toast({ title: 'Groupe créé', status: 'success', duration: 3000 });
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
        queryClient.invalidateQueries('group-detail');
        toast({ title: 'Groupe mis à jour', status: 'success', duration: 3000 });
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
        toast({ title: 'Groupe supprimé', status: 'info', duration: 3000 });
      },
      onError: (err) => {
        toast({ title: 'Erreur', description: JSON.stringify(err.response?.data || 'Erreur'), status: 'error', duration: 3000 });
      },
    }
  );

  const handleOpen = (group = null) => {
    if (group) {
      setEditingGroup(group);
      setForm({
        name: group.name,
        description: group.description || '',
        company: group.company || '',
        member_ids: [],
      });
    } else {
      setEditingGroup(null);
      setForm({
        name: '',
        description: '',
        company: isSuperAdmin ? '' : (currentUser?.company || ''),
        member_ids: [],
      });
    }
    onOpen();
  };

  const handleClose = () => {
    setEditingGroup(null);
    setForm({ name: '', description: '', company: '', member_ids: [] });
    onClose();
  };

  const handleSubmit = () => {
    const data = { ...form };
    if (!isSuperAdmin) {
      delete data.company;
    }
    if (editingGroup) {
      updateMutation.mutate({ id: editingGroup.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleManageMembers = (group) => {
    setSelectedGroup(group);
    setSelectedUserId('');
    onMembersOpen();
  };

  const handleAddMember = async () => {
    if (!selectedUserId || !selectedGroup) return;
    try {
      await axiosInstance.post(`/groups/${selectedGroup.id}/add_member/`, { user_id: parseInt(selectedUserId) });
      queryClient.invalidateQueries(['group-detail', selectedGroup.id]);
      queryClient.invalidateQueries('groups');
      setSelectedUserId('');
      toast({ title: 'Membre ajouté', status: 'success', duration: 2000 });
    } catch (err) {
      toast({ title: 'Erreur', status: 'error', duration: 2000 });
    }
  };

  const handleRemoveMember = async (userId) => {
    if (!selectedGroup) return;
    try {
      await axiosInstance.post(`/groups/${selectedGroup.id}/remove_member/`, { user_id: userId });
      queryClient.invalidateQueries(['group-detail', selectedGroup.id]);
      queryClient.invalidateQueries('groups');
      toast({ title: 'Membre retiré', status: 'info', duration: 2000 });
    } catch (err) {
      toast({ title: 'Erreur', status: 'error', duration: 2000 });
    }
  };

  const addMemberToForm = () => {
    if (!selectedUserId) return;
    const id = parseInt(selectedUserId);
    if (!form.member_ids.includes(id)) {
      setForm({ ...form, member_ids: [...form.member_ids, id] });
    }
    setSelectedUserId('');
  };

  const removeMemberFromForm = (userId) => {
    setForm({ ...form, member_ids: form.member_ids.filter((id) => id !== userId) });
  };

  if (isLoading) return <Box p={8}><Spinner size="xl" /></Box>;

  const groupList = Array.isArray(groups) ? groups : groups.results || [];
  const currentMembers = groupDetail?.members || [];
  const currentMemberIds = currentMembers.map((m) => m.id);
  const availableUsersForModal = userList.filter((u) => !currentMemberIds.includes(u.id));

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
            <Th>Créé par</Th>
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
              <Td>{g.created_by_name || '-'}</Td>
              <Td>
                <HStack spacing={2}>
                  <IconButton size="sm" icon={<FiUsers />} onClick={() => handleManageMembers(g)} aria-label="Membres" title="Gérer les membres" />
                  <IconButton size="sm" icon={<FiEdit2 />} onClick={() => handleOpen(g)} aria-label="Modifier" />
                  <IconButton size="sm" icon={<FiTrash2 />} colorScheme="red" onClick={() => deleteMutation.mutate(g.id)} aria-label="Supprimer" />
                </HStack>
              </Td>
            </Tr>
          ))}
        </Tbody>
      </Table>

      {/* Create/Edit Modal */}
      <Modal isOpen={isOpen} onClose={handleClose} size="lg">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>{editingGroup ? 'Modifier' : 'Créer'} un groupe</ModalHeader>
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
            <FormControl mb={4} isRequired>
              <FormLabel>Entreprise{!isSuperAdmin ? '' : ' *'}</FormLabel>
              {isSuperAdmin ? (
                <Select
                  value={form.company}
                  onChange={(e) => setForm({ ...form, company: e.target.value })}
                  placeholder="Sélectionner une entreprise"
                >
                  {companyList.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </Select>
              ) : (
                <Input
                  value={currentUser?.company_detail?.name || ''}
                  isReadOnly
                  bg="gray.100"
                />
              )}
            </FormControl>
            {!editingGroup && (
              <FormControl mb={4}>
                <FormLabel>Membres initiaux</FormLabel>
                <HStack mb={2}>
                  <Select
                    value={selectedUserId}
                    onChange={(e) => setSelectedUserId(e.target.value)}
                    placeholder="Sélectionner un utilisateur"
                    flex={1}
                  >
                    {userList
                      .filter((u) => !form.member_ids.includes(u.id))
                      .map((u) => (
                        <option key={u.id} value={u.id}>{u.username} ({u.email})</option>
                      ))}
                  </Select>
                  <Button size="sm" onClick={addMemberToForm} colorScheme="blue">Ajouter</Button>
                </HStack>
                {form.member_ids.length > 0 && (
                  <Wrap>
                    {form.member_ids.map((id) => {
                      const u = userList.find((usr) => usr.id === id);
                      return (
                        <WrapItem key={id}>
                          <Tag size="md" colorScheme="blue" borderRadius="full">
                            <TagLabel>{u ? u.username : `User #${id}`}</TagLabel>
                            <TagCloseButton onClick={() => removeMemberFromForm(id)} />
                          </Tag>
                        </WrapItem>
                      );
                    })}
                  </Wrap>
                )}
              </FormControl>
            )}
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={handleClose}>Annuler</Button>
            <Button colorScheme="blue" onClick={handleSubmit} isLoading={createMutation.isLoading || updateMutation.isLoading}>
              {editingGroup ? 'Mettre à jour' : 'Créer'}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Members Management Modal */}
      <Modal isOpen={isMembersOpen} onClose={onMembersClose} size="lg">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Membres de {selectedGroup?.name}</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <FormControl mb={4}>
              <FormLabel>Ajouter un membre</FormLabel>
              <HStack>
                <Select
                  value={selectedUserId}
                  onChange={(e) => setSelectedUserId(e.target.value)}
                  placeholder="Sélectionner un utilisateur"
                  flex={1}
                >
                  {availableUsersForModal.map((u) => (
                    <option key={u.id} value={u.id}>{u.username} ({u.email})</option>
                  ))}
                </Select>
                <Button size="sm" colorScheme="blue" onClick={handleAddMember}>Ajouter</Button>
              </HStack>
            </FormControl>
            <Text fontWeight="600" mb={2}>Membres actuels ({currentMembers.length})</Text>
            {currentMembers.length === 0 ? (
              <Text color="gray.500" fontSize="sm">Aucun membre dans ce groupe</Text>
            ) : (
              <Wrap>
                {currentMembers.map((m) => (
                  <WrapItem key={m.id}>
                    <Tag size="lg" colorScheme="blue" borderRadius="full">
                      <TagLabel>{m.username} ({m.email})</TagLabel>
                      <TagCloseButton onClick={() => handleRemoveMember(m.id)} />
                    </Tag>
                  </WrapItem>
                ))}
              </Wrap>
            )}
          </ModalBody>
          <ModalFooter>
            <Button onClick={onMembersClose}>Fermer</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  );
};

export default GroupManagement;
