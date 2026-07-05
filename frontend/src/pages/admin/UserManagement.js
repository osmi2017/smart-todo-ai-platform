import React, { useState } from 'react';
import {
  Box, Heading, Button, Table, Thead, Tbody, Tr, Th, Td, Badge,
  useDisclosure, Modal, ModalOverlay, ModalContent, ModalHeader,
  ModalBody, ModalFooter, ModalCloseButton, FormControl, FormLabel,
  Input, Select, useToast, IconButton, HStack, Spinner, Alert, AlertIcon,
  Text, Tag, TagLabel, TagCloseButton, Wrap, WrapItem,
} from '@chakra-ui/react';
import { FiPlus, FiEdit2, FiTrash2, FiShield } from 'react-icons/fi';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { useCrudService } from '../../utils/createCrudService';
import { useAuth } from '../../context/AuthContext';

const UserManagement = () => {
  const toast = useToast();
  const queryClient = useQueryClient();
  const { user: currentUser, isSuperAdmin } = useAuth();
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [editingUser, setEditingUser] = useState(null);
  const [form, setForm] = useState({
    username: '', email: '', first_name: '', last_name: '', role: 'user', password: '', company: '', group_ids: [],
  });
  const [selectedGroupId, setSelectedGroupId] = useState('');
  const userService = useCrudService('/users', { resourceName: 'utilisateurs' });
  const companyService = useCrudService('/companies', { resourceName: 'entreprises' });
  const groupService = useCrudService('/groups', { resourceName: 'groupes' });

  const { data: companies = [] } = useQuery(
    'companies',
    () => companyService.getAll(),
    { enabled: isSuperAdmin }
  );
  const companyList = Array.isArray(companies) ? companies : companies.results || [];

  const { data: groups = [] } = useQuery('groups', () => groupService.getAll());
  const groupList = Array.isArray(groups) ? groups : groups.results || [];

  const { data: users = [], isLoading, error } = useQuery(
    'managed-users',
    () => userService.getAll(),
  );

  const createMutation = useMutation(
    (data) => userService.create(data),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('managed-users');
        toast({ title: 'Utilisateur cr\u00e9\u00e9', status: 'success', duration: 3000 });
        handleClose();
      },
      onError: (err) => {
        toast({ title: 'Erreur', description: JSON.stringify(err.response?.data || 'Erreur'), status: 'error', duration: 3000 });
      },
    }
  );

  const updateMutation = useMutation(
    ({ id, data }) => userService.patch(id, data),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('managed-users');
        toast({ title: 'Utilisateur mis \u00e0 jour', status: 'success', duration: 3000 });
        handleClose();
      },
      onError: (err) => {
        toast({ title: 'Erreur', description: JSON.stringify(err.response?.data || 'Erreur'), status: 'error', duration: 3000 });
      },
    }
  );

  const deleteMutation = useMutation(
    (id) => userService.remove(id),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('managed-users');
        toast({ title: 'Utilisateur supprim\u00e9', status: 'info', duration: 3000 });
      },
    }
  );

  const handleOpen = (user = null) => {
    if (user) {
      setEditingUser(user);
      setForm({
        username: user.username,
        email: user.email,
        first_name: user.first_name || '',
        last_name: user.last_name || '',
        role: user.role,
        password: '',
        company: user.company || '',
        group_ids: user.groups || [],
      });
    } else {
      setEditingUser(null);
      setForm({ username: '', email: '', first_name: '', last_name: '', role: 'user', password: '', company: isSuperAdmin ? '' : (currentUser?.company || ''), group_ids: [] });
    }
    onOpen();
  };

  const handleClose = () => {
    setEditingUser(null);
    setForm({ username: '', email: '', first_name: '', last_name: '', role: 'user', password: '', company: isSuperAdmin ? '' : (currentUser?.company || ''), group_ids: [] });
    setSelectedGroupId('');
    onClose();
  };

  const addGroupToForm = () => {
    if (!selectedGroupId) return;
    const id = parseInt(selectedGroupId);
    if (!form.group_ids.includes(id)) {
      setForm({ ...form, group_ids: [...form.group_ids, id] });
    }
    setSelectedGroupId('');
  };

  const removeGroupFromForm = (groupId) => {
    setForm({ ...form, group_ids: form.group_ids.filter((id) => id !== groupId) });
  };

  const handleSubmit = async () => {
    const data = { ...form };
    const groupIds = data.group_ids;
    delete data.group_ids;
    if (!data.password) delete data.password;

    const onDone = async (userData) => {
      const userId = editingUser ? editingUser.id : userData?.id;
      if (userId && groupIds.length > 0) {
        const token = localStorage.getItem('token');
        const currentGroups = editingUser?.groups || [];
        const toAdd = groupIds.filter((id) => !currentGroups.includes(id));
        const toRemove = currentGroups.filter((id) => !groupIds.includes(id));
        for (const gid of toAdd) {
          await fetch(`/api/groups/${gid}/add_member/`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ user_id: userId }),
          });
        }
        for (const gid of toRemove) {
          await fetch(`/api/groups/${gid}/remove_member/`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ user_id: userId }),
          });
        }
      }
    };

    if (editingUser) {
      updateMutation.mutate({ id: editingUser.id, data }, {
        onSuccess: () => onDone(),
      });
    } else {
      createMutation.mutate(data, {
        onSuccess: (result) => onDone(result),
      });
    }
  };

  const getRoleBadge = (role) => {
    const colors = { superadmin: 'purple', admin: 'orange', user: 'green' };
    const labels = { superadmin: 'SuperAdmin', admin: 'Admin', user: 'User' };
    return <Badge colorScheme={colors[role] || 'gray'}>{labels[role] || role}</Badge>;
  };

  if (isLoading) return <Box p={8}><Spinner size="xl" /></Box>;
  if (error) return <Box p={8}><Alert status="error"><AlertIcon />Erreur de chargement</Alert></Box>;

  const userList = Array.isArray(users) ? users : users.results || [];

  return (
    <Box p={8}>
      <HStack justify="space-between" mb={6}>
        <Heading size="lg">Gestion des utilisateurs</Heading>
        <Button leftIcon={<FiPlus />} colorScheme="blue" onClick={() => handleOpen()}>
          Nouvel utilisateur
        </Button>
      </HStack>

      <Table variant="simple">
        <Thead>
          <Tr>
            <Th>Nom d'utilisateur</Th>
            <Th>Email</Th>
            <Th>Nom complet</Th>
            <Th>R\u00f4le</Th>
            <Th>Entreprise</Th>
            <Th>Groupes</Th>
            <Th>Actions</Th>
          </Tr>
        </Thead>
        <Tbody>
          {userList.map((u) => (
            <Tr key={u.id}>
              <Td fontWeight="600">{u.username}</Td>
              <Td>{u.email}</Td>
              <Td>{u.first_name} {u.last_name}</Td>
              <Td>{getRoleBadge(u.role)}</Td>
              <Td>{u.company_detail?.name || '-'}</Td>
              <Td>
                {u.groups && u.groups.length > 0 ? (
                  <Wrap>
                    {u.groups.map((gid) => {
                      const g = groupList.find((gr) => gr.id === gid);
                      return (
                        <WrapItem key={gid}>
                          <Badge colorScheme="purple" fontSize="xs">{g ? g.name : `#${gid}`}</Badge>
                        </WrapItem>
                      );
                    })}
                  </Wrap>
                ) : '-'}
              </Td>
              <Td>
                <HStack spacing={2}>
                  <IconButton size="sm" icon={<FiEdit2 />} onClick={() => handleOpen(u)} aria-label="Modifier" />
                  {u.id !== currentUser?.id && (
                    <IconButton size="sm" icon={<FiTrash2 />} colorScheme="red" onClick={() => deleteMutation.mutate(u.id)} aria-label="Supprimer" />
                  )}
                </HStack>
              </Td>
            </Tr>
          ))}
        </Tbody>
      </Table>

      <Modal isOpen={isOpen} onClose={handleClose} size="lg">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>{editingUser ? 'Modifier' : 'Cr\u00e9er'} un utilisateur</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <FormControl mb={4} isRequired>
              <FormLabel>Nom d'utilisateur</FormLabel>
              <Input
                value={form.username}
                onChange={(e) => setForm({ ...form, username: e.target.value })}
                isDisabled={!!editingUser}
              />
            </FormControl>
            <FormControl mb={4} isRequired>
              <FormLabel>Email</FormLabel>
              <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </FormControl>
            <HStack mb={4} spacing={4}>
              <FormControl>
                <FormLabel>Pr\u00e9nom</FormLabel>
                <Input value={form.first_name} onChange={(e) => setForm({ ...form, first_name: e.target.value })} />
              </FormControl>
              <FormControl>
                <FormLabel>Nom</FormLabel>
                <Input value={form.last_name} onChange={(e) => setForm({ ...form, last_name: e.target.value })} />
              </FormControl>
            </HStack>
            <FormControl mb={4}>
              <FormLabel>R\u00f4le</FormLabel>
              <Select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
                <option value="user">User</option>
                <option value="admin">Admin</option>
                {isSuperAdmin && <option value="superadmin">SuperAdmin</option>}
              </Select>
            </FormControl>
            <FormControl mb={4}>
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
            <FormControl mb={4}>
              <FormLabel>Groupes</FormLabel>
              <HStack mb={2}>
                <Select
                  value={selectedGroupId}
                  onChange={(e) => setSelectedGroupId(e.target.value)}
                  placeholder="Sélectionner un groupe"
                  flex={1}
                >
                  {groupList
                    .filter((g) => !form.group_ids.includes(g.id))
                    .map((g) => (
                      <option key={g.id} value={g.id}>{g.name} ({g.company_name})</option>
                    ))}
                </Select>
                <Button size="sm" onClick={addGroupToForm} colorScheme="purple">Ajouter</Button>
              </HStack>
              {form.group_ids.length > 0 && (
                <Wrap>
                  {form.group_ids.map((id) => {
                    const g = groupList.find((gr) => gr.id === id);
                    return (
                      <WrapItem key={id}>
                        <Tag size="md" colorScheme="purple" borderRadius="full">
                          <TagLabel>{g ? g.name : `#${id}`}</TagLabel>
                          <TagCloseButton onClick={() => removeGroupFromForm(id)} />
                        </Tag>
                      </WrapItem>
                    );
                  })}
                </Wrap>
              )}
            </FormControl>
            <FormControl mb={4} isRequired={!editingUser}>
              <FormLabel>Mot de passe{editingUser ? ' (laisser vide pour ne pas changer)' : ''}</FormLabel>
              <Input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
            </FormControl>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={handleClose}>Annuler</Button>
            <Button colorScheme="blue" onClick={handleSubmit} isLoading={createMutation.isLoading || updateMutation.isLoading}>
              {editingUser ? 'Mettre \u00e0 jour' : 'Cr\u00e9er'}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  );
};

export default UserManagement;
