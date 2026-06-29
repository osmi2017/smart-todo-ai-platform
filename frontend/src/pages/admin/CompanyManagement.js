import React, { useState } from 'react';
import {
  Box, Heading, Button, Table, Thead, Tbody, Tr, Th, Td, Badge,
  useDisclosure, Modal, ModalOverlay, ModalContent, ModalHeader,
  ModalBody, ModalFooter, ModalCloseButton, FormControl, FormLabel,
  Input, Textarea, useToast, IconButton, HStack, Spinner, Alert, AlertIcon,
} from '@chakra-ui/react';
import { FiPlus, FiEdit2, FiTrash2 } from 'react-icons/fi';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { useCrudService } from '../../utils/createCrudService';

const CompanyManagement = () => {
  const toast = useToast();
  const queryClient = useQueryClient();
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [editingCompany, setEditingCompany] = useState(null);
  const [form, setForm] = useState({ name: '', slug: '', description: '' });
  const companyService = useCrudService('/companies', { resourceName: 'entreprises' });

  const { data: companies = [], isLoading, error } = useQuery(
    'companies',
    () => companyService.getAll(),
  );

  const createMutation = useMutation(
    (data) => companyService.create(data),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('companies');
        toast({ title: 'Entreprise cr\u00e9\u00e9e', status: 'success', duration: 3000 });
        handleClose();
      },
      onError: (err) => {
        toast({ title: 'Erreur', description: JSON.stringify(err.response?.data || 'Erreur'), status: 'error', duration: 3000 });
      },
    }
  );

  const updateMutation = useMutation(
    ({ id, data }) => companyService.update(id, data),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('companies');
        toast({ title: 'Entreprise mise \u00e0 jour', status: 'success', duration: 3000 });
        handleClose();
      },
      onError: (err) => {
        toast({ title: 'Erreur', description: JSON.stringify(err.response?.data || 'Erreur'), status: 'error', duration: 3000 });
      },
    }
  );

  const deleteMutation = useMutation(
    (id) => companyService.remove(id),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('companies');
        toast({ title: 'Entreprise supprim\u00e9e', status: 'info', duration: 3000 });
      },
    }
  );

  const handleOpen = (company = null) => {
    if (company) {
      setEditingCompany(company);
      setForm({ name: company.name, slug: company.slug, description: company.description || '' });
    } else {
      setEditingCompany(null);
      setForm({ name: '', slug: '', description: '' });
    }
    onOpen();
  };

  const handleClose = () => {
    setEditingCompany(null);
    setForm({ name: '', slug: '', description: '' });
    onClose();
  };

  const handleSubmit = () => {
    if (editingCompany) {
      updateMutation.mutate({ id: editingCompany.id, data: form });
    } else {
      createMutation.mutate(form);
    }
  };

  const handleNameChange = (e) => {
    const name = e.target.value;
    setForm({
      ...form,
      name,
      slug: editingCompany ? form.slug : name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''),
    });
  };

  if (isLoading) return <Box p={8}><Spinner size="xl" /></Box>;
  if (error) return <Box p={8}><Alert status="error"><AlertIcon />Erreur de chargement</Alert></Box>;

  return (
    <Box p={8}>
      <HStack justify="space-between" mb={6}>
        <Heading size="lg">Gestion des entreprises</Heading>
        <Button leftIcon={<FiPlus />} colorScheme="blue" onClick={() => handleOpen()}>
          Nouvelle entreprise
        </Button>
      </HStack>

      <Table variant="simple">
        <Thead>
          <Tr>
            <Th>Nom</Th>
            <Th>Slug</Th>
            <Th>Utilisateurs</Th>
            <Th>Groupes</Th>
            <Th>Statut</Th>
            <Th>Actions</Th>
          </Tr>
        </Thead>
        <Tbody>
          {(Array.isArray(companies) ? companies : companies.results || []).map((c) => (
            <Tr key={c.id}>
              <Td fontWeight="600">{c.name}</Td>
              <Td>{c.slug}</Td>
              <Td>{c.users_count}</Td>
              <Td>{c.groups_count}</Td>
              <Td>
                <Badge colorScheme={c.is_active ? 'green' : 'red'}>
                  {c.is_active ? 'Actif' : 'Inactif'}
                </Badge>
              </Td>
              <Td>
                <HStack spacing={2}>
                  <IconButton size="sm" icon={<FiEdit2 />} onClick={() => handleOpen(c)} aria-label="Modifier" />
                  <IconButton size="sm" icon={<FiTrash2 />} colorScheme="red" onClick={() => deleteMutation.mutate(c.id)} aria-label="Supprimer" />
                </HStack>
              </Td>
            </Tr>
          ))}
        </Tbody>
      </Table>

      <Modal isOpen={isOpen} onClose={handleClose}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>{editingCompany ? 'Modifier' : 'Cr\u00e9er'} une entreprise</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <FormControl mb={4} isRequired>
              <FormLabel>Nom</FormLabel>
              <Input value={form.name} onChange={handleNameChange} placeholder="Nom de l'entreprise" />
            </FormControl>
            <FormControl mb={4} isRequired>
              <FormLabel>Slug</FormLabel>
              <Input value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} placeholder="slug-entreprise" />
            </FormControl>
            <FormControl mb={4}>
              <FormLabel>Description</FormLabel>
              <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </FormControl>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={handleClose}>Annuler</Button>
            <Button colorScheme="blue" onClick={handleSubmit} isLoading={createMutation.isLoading || updateMutation.isLoading}>
              {editingCompany ? 'Mettre \u00e0 jour' : 'Cr\u00e9er'}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  );
};

export default CompanyManagement;
