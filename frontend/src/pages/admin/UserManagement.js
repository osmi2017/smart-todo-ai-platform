import React, { useState } from 'react';
import {
  Box, Heading, Button, Table, Thead, Tbody, Tr, Th, Td, Badge,
  useDisclosure, Modal, ModalOverlay, ModalContent, ModalHeader,
  ModalBody, ModalFooter, ModalCloseButton, FormControl, FormLabel,
  Input, Select, useToast, IconButton, HStack, Spinner, Alert, AlertIcon,
  Text,
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
    username: '', email: '', first_name: '', last_name: '', role: 'user', password: '',
  });
  const userService = useCrudService('/users', { resourceName: 'utilisateurs' });

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
      });
    } else {
      setEditingUser(null);
      setForm({ username: '', email: '', first_name: '', last_name: '', role: 'user', password: '' });
    }
    onOpen();
  };

  const handleClose = () => {
    setEditingUser(null);
    setForm({ username: '', email: '', first_name: '', last_name: '', role: 'user', password: '' });
    onClose();
  };

  const handleSubmit = () => {
    if (editingUser) {
      const data = { ...form };
      if (!data.password) delete data.password;
      updateMutation.mutate({ id: editingUser.id, data });
    } else {
      createMutation.mutate(form);
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
