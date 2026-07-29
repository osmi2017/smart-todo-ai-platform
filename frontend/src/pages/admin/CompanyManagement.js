import React, { useState } from 'react';
import {
  Box, Heading, Button, Table, Thead, Tbody, Tr, Th, Td, Badge,
  useDisclosure, Modal, ModalOverlay, ModalContent, ModalHeader,
  ModalBody, ModalFooter, ModalCloseButton, FormControl, FormLabel,
  Input, Textarea, useToast, IconButton, HStack, Spinner, Alert, AlertIcon,
  Select, Progress, Text,
} from '@chakra-ui/react';
import { FiPlus, FiEdit2, FiTrash2 } from 'react-icons/fi';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { useCrudService } from '../../utils/createCrudService';
import { useTranslation } from 'react-i18next';

const CompanyManagement = () => {
  const { t } = useTranslation();
  const toast = useToast();
  const queryClient = useQueryClient();
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [editingCompany, setEditingCompany] = useState(null);
  const [form, setForm] = useState({ name: '', slug: '', description: '', storage_tier: '1GB' });
  const companyService = useCrudService('/companies', { resourceName: t('sidebar.companies') });

  const { data: companies = [], isLoading, error } = useQuery(
    'companies',
    () => companyService.getAll(),
  );

  const createMutation = useMutation(
    (data) => companyService.create(data),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('companies');
        toast({ title: t('admin.companyCreated'), status: 'success', duration: 3000 });
        handleClose();
      },
      onError: (err) => {
        toast({ title: t('common.error'), description: JSON.stringify(err.response?.data || t('common.error')), status: 'error', duration: 3000 });
      },
    }
  );

  const updateMutation = useMutation(
    ({ id, data }) => companyService.update(id, data),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('companies');
        toast({ title: t('admin.companyUpdated'), status: 'success', duration: 3000 });
        handleClose();
      },
      onError: (err) => {
        toast({ title: t('common.error'), description: JSON.stringify(err.response?.data || t('common.error')), status: 'error', duration: 3000 });
      },
    }
  );

  const deleteMutation = useMutation(
    (id) => companyService.remove(id),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('companies');
        toast({ title: t('admin.companyDeleted'), status: 'info', duration: 3000 });
      },
    }
  );

  const handleOpen = (company = null) => {
    if (company) {
      setEditingCompany(company);
      setForm({ name: company.name, slug: company.slug, description: company.description || '', storage_tier: company.storage_tier || '1GB' });
    } else {
      setEditingCompany(null);
      setForm({ name: '', slug: '', description: '', storage_tier: '1GB' });
    }
    onOpen();
  };

  const handleClose = () => {
    setEditingCompany(null);
    setForm({ name: '', slug: '', description: '', storage_tier: '1GB' });
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
  if (error) return <Box p={8}><Alert status="error"><AlertIcon />{t('common.loadError')}</Alert></Box>;

  return (
    <Box p={8}>
      <HStack justify="space-between" mb={6}>
        <Heading size="lg">{t('admin.companyManagement')}</Heading>
        <Button leftIcon={<FiPlus />} colorScheme="blue" onClick={() => handleOpen()}>
          {t('admin.newCompany')}
        </Button>
      </HStack>

      <Table variant="simple">
        <Thead>
          <Tr>
            <Th>{t('admin.column.name')}</Th>
            <Th>Slug</Th>
            <Th>{t('sidebar.users')}</Th>
            <Th>{t('sidebar.groups')}</Th>
            <Th>{t('common.status')}</Th>
            <Th>{t('common.actions')}</Th>
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
                <Box minW="120px">
                  <Text fontSize="xs" mb={1}>
                    {c.storage_tier === 'unlimited' ? t('common.notDefined') : c.storage_tier}
                  </Text>
                  {c.storage_tier !== 'unlimited' && c.storage_limit_bytes && (
                    <Progress
                      value={c.storage_percent_used || 0}
                      size="xs"
                      borderRadius="full"
                      colorScheme={c.storage_percent_used >= 90 ? 'red' : c.storage_percent_used >= 80 ? 'orange' : 'blue'}
                    />
                  )}
                </Box>
              </Td>
              <Td>
                <Badge colorScheme={c.is_active ? 'green' : 'red'}>
                  {c.is_active ? t('common.inProgress') : t('common.notDefined')}
                </Badge>
              </Td>
              <Td>
                <HStack spacing={2}>
                  <IconButton size="sm" icon={<FiEdit2 />} onClick={() => handleOpen(c)} aria-label={t('common.edit')} />
                  <IconButton size="sm" icon={<FiTrash2 />} colorScheme="red" onClick={() => deleteMutation.mutate(c.id)} aria-label={t('common.delete')} />
                </HStack>
              </Td>
            </Tr>
          ))}
        </Tbody>
      </Table>

      <Modal isOpen={isOpen} onClose={handleClose}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>{editingCompany ? t('common.edit') : t('common.create')} {t('sidebar.companies').toLowerCase()}</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <FormControl mb={4} isRequired>
              <FormLabel>{t('common.name')}</FormLabel>
              <Input value={form.name} onChange={handleNameChange} placeholder={t('admin.companyName')} />
            </FormControl>
            <FormControl mb={4} isRequired>
              <FormLabel>Slug</FormLabel>
              <Input value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} placeholder="slug-entreprise" />
            </FormControl>
            <FormControl mb={4}>
              <FormLabel>{t('common.description')}</FormLabel>
              <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </FormControl>
            <FormControl mb={4}>
              <FormLabel>{t('files.storage')}</FormLabel>
              <Select value={form.storage_tier} onChange={(e) => setForm({ ...form, storage_tier: e.target.value })}>
                <option value="100MB">100 Mo</option>
                <option value="500MB">500 Mo</option>
                <option value="1GB">1 Go</option>
                <option value="5GB">5 Go</option>
                <option value="10GB">10 Go</option>
                <option value="50GB">50 Go</option>
                <option value="100GB">100 Go</option>
                <option value="unlimited">{t('common.notDefined')}</option>
              </Select>
            </FormControl>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={handleClose}>{t('common.cancel')}</Button>
            <Button colorScheme="blue" onClick={handleSubmit} isLoading={createMutation.isLoading || updateMutation.isLoading}>
              {editingCompany ? t('common.update') : t('common.create')}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  );
};

export default CompanyManagement;
