import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Box, Heading, Button, HStack, VStack, Text, Badge, Icon,
  SimpleGrid, IconButton, useToast, useColorModeValue, Spinner,
  Input, Select, Flex, Avatar,
  Drawer, DrawerOverlay, DrawerContent, DrawerCloseButton,
  DrawerHeader, DrawerBody, DrawerFooter, FormLabel, FormControl,
  AlertDialog, AlertDialogOverlay, AlertDialogContent,
  AlertDialogHeader, AlertDialogBody, AlertDialogFooter, useDisclosure,
  Menu, MenuButton, MenuList, MenuItem,
} from '@chakra-ui/react';
import { FiPlus, FiUser, FiEdit2, FiTrash2, FiMoreVertical, FiEye, FiAlertCircle } from 'react-icons/fi';
import { useDriverService, useInfractionService } from '../../services/parcService';
import { useCrudService } from '../../utils/createCrudService';
import EmptyState from '../../components/EmptyState';

const Drivers = () => {
  const { t } = useTranslation();
  const { getDrivers, createDriver, updateDriver, deleteDriver } = useDriverService();
  const { getInfractions, createInfraction } = useInfractionService();
  const usersService = useCrudService('/users');
  const [drivers, setDrivers] = useState([]);
  const [infractions, setInfractions] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const toast = useToast();
  const bgColor = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.600');
  const { isOpen, onOpen, onClose } = useDisclosure();
  const cancelRef = React.useRef();

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({});
  const [selected, setSelected] = useState(null);
  const [infForm, setInfForm] = useState({});
  const [deleteId, setDeleteId] = useState(null);

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    try {
      const [d, i, u] = await Promise.all([getDrivers(), getInfractions(), usersService.getAll()]);
      setDrivers(Array.isArray(d) ? d : d.results || []);
      setInfractions(Array.isArray(i) ? i : i.results || []);
      const uList = Array.isArray(u) ? u : u.results || [];
      setUsers(uList.filter(uu => uu.id));
    } catch (e) {
      toast({ title: t('parc.loadError'), status: 'error', duration: 3000 });
    } finally {
      setLoading(false);
    }
  };

  const openForm = (d = null) => {
    setEditing(d);
    setForm(d ? {
      user: d.user || '', user_name: d.user_name || '', full_name: d.full_name,
      type_permis: d.type_permis,
      date_expiration_permis: d.date_expiration_permis || '', numero_permis: d.numero_permis || '',
      telephone: d.telephone || '', email: d.email || '', notes: d.notes || '',
    } : {});
    setFormOpen(true);
  };

  const onUserChange = (userId) => {
    const u = users.find(x => x.id === Number(userId));
    setForm({
      ...form,
      user: userId || null,
      user_name: u ? (u.full_name || u.username || '') : '',
      full_name: u ? (u.full_name || u.username || '') : (form.full_name || ''),
      email: u && u.email ? u.email : (form.email || ''),
    });
  };

  const handleSave = async () => {
    try {
      if (editing) await updateDriver(editing.id, form);
      else await createDriver(form);
      toast({ title: t('parc.saved'), status: 'success', duration: 2000 });
      setFormOpen(false); load();
    } catch (e) {
      toast({ title: t('parc.saveError'), status: 'error', duration: 3000 });
    }
  };

  const confirmDelete = (id) => { setDeleteId(id); onOpen(); };
  const handleDelete = async () => {
    try {
      await deleteDriver(deleteId);
      setDrivers(drivers.filter(d => d.id !== deleteId));
      toast({ title: t('parc.deleted'), status: 'success', duration: 2000 });
    } catch (e) {
      toast({ title: t('parc.deleteError'), status: 'error', duration: 3000 });
    } finally { onClose(); setDeleteId(null); }
  };

  const addInfraction = async () => {
    if (!infForm.type || !infForm.date) return;
    try {
      await createInfraction(infForm);
      toast({ title: t('parc.saved'), status: 'success', duration: 2000 });
      setInfForm({}); setSelected(null); load();
    } catch (e) {
      toast({ title: t('parc.saveError'), status: 'error', duration: 3000 });
    }
  };

  const openDetail = (d) => setSelected(d);

  if (loading) return <Box textAlign="center" py={20}><Spinner size="xl" /></Box>;

  return (
    <Box>
      <Flex justify="space-between" align="center" mb={6}>
        <Heading size="lg">{t('parc.drivers.title')}</Heading>
        <Button leftIcon={<FiPlus />} colorScheme="blue" onClick={() => openForm(null)}>
          {t('parc.drivers.newDriver')}
        </Button>
      </Flex>

      {drivers.length === 0 ? (
        <EmptyState icon={FiUser} message={t('parc.drivers.notFound')} actionLabel={t('parc.drivers.newDriver')} onAction={() => openForm(null)} />
      ) : (
        <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={4}>
          {drivers.map(d => {
            const permitBadge = d.permis_expired ? { color: 'red', label: t('parc.detail.expired') } :
              d.permis_expires_soon ? { color: 'orange', label: t('parc.detail.expiringSoon') } : null;
            return (
              <Box key={d.id} bg={bgColor} borderRadius="xl" borderWidth="1px" borderColor={borderColor} p={5}
                transition="all 0.2s" _hover={{ shadow: 'md', transform: 'translateY(-2px)' }}>
                <Flex justify="space-between" align="flex-start">
                  <HStack>
                    <Avatar name={d.full_name} size="md" bgGradient="linear(135deg, brand.400, accent.400)" color="white" />
                    <Box>
                      <Heading size="sm">{d.full_name}</Heading>
                      <Text fontSize="xs" color="gray.500">{d.type_permis || '—'}</Text>
                    </Box>
                  </HStack>
                  <Menu>
                    <MenuButton as={IconButton} icon={<FiMoreVertical />} variant="ghost" size="sm" />
                    <MenuList>
                      <MenuItem icon={<FiEye />} onClick={() => openDetail(d)}>{t('parc.actions.view')}</MenuItem>
                      <MenuItem icon={<FiEdit2 />} onClick={() => openForm(d)}>{t('parc.actions.edit')}</MenuItem>
                      <MenuItem icon={<FiTrash2 />} color="red.500" onClick={() => confirmDelete(d.id)}>{t('parc.actions.delete')}</MenuItem>
                    </MenuList>
                  </Menu>
                </Flex>
                <VStack align="stretch" spacing={1} mt={3} fontSize="sm" color="gray.600">
                  {d.telephone && <Text>{t('parc.drivers.phone')} : {d.telephone}</Text>}
                  {d.email && <Text>{d.email}</Text>}
                  <Text>{t('parc.drivers.licenseExp')} : {d.date_expiration_permis || '—'}</Text>
                </VStack>
                <HStack mt={3}>
                  {permitBadge && (
                    <Badge colorScheme={permitBadge.color} display="flex" alignItems="center" gap={1}>
                      <FiAlertCircle /> {permitBadge.label}
                    </Badge>
                  )}
                </HStack>
              </Box>
            );
          })}
        </SimpleGrid>
      )}

      {/* Formulaire conducteur */}
      <Drawer isOpen={formOpen} onClose={() => setFormOpen(false)} size="md">
        <DrawerOverlay /><DrawerContent>
          <DrawerCloseButton />
          <DrawerHeader>{editing ? t('parc.drivers.edit') : t('parc.drivers.newDriver')}</DrawerHeader>
          <DrawerBody>
            <VStack spacing={3} align="stretch">
              <FormControl isRequired>
                <FormLabel>{t('parc.drivers.user')}</FormLabel>
                <Select placeholder={t('parc.drivers.selectUser')} value={form.user || ''} onChange={(e) => onUserChange(e.target.value)}>
                  {users.map(u => (
                    <option key={u.id} value={u.id}>
                      {u.full_name || u.username}{u.first_name ? ` (${u.first_name}${u.last_name ? ' ' + u.last_name : ''})` : ''}
                    </option>
                  ))}
                </Select>
              </FormControl>
              <FormControl>
                <FormLabel>{t('parc.drivers.fullName')}</FormLabel>
                <Input value={form.full_name || ''} onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                  placeholder={form.user_name || ''} />
              </FormControl>
              <Flex gap={3}>
                <FormControl><FormLabel>{t('parc.drivers.licenseType')}</FormLabel>
                  <Input value={form.type_permis || ''} onChange={(e) => setForm({ ...form, type_permis: e.target.value })} /></FormControl>
                <FormControl><FormLabel>{t('parc.drivers.licenseNumber')}</FormLabel>
                  <Input value={form.numero_permis || ''} onChange={(e) => setForm({ ...form, numero_permis: e.target.value })} /></FormControl>
              </Flex>
              <FormControl><FormLabel>{t('parc.drivers.licenseExp')}</FormLabel>
                <Input type="date" value={form.date_expiration_permis || ''} onChange={(e) => setForm({ ...form, date_expiration_permis: e.target.value || null })} /></FormControl>
              <FormControl isReadOnly>
                <FormLabel>{t('parc.drivers.phone')} ({t('parc.drivers.fromUser')})</FormLabel>
                <Input value={form.telephone || ''} readOnly opacity={0.7} />
              </FormControl>
              <FormControl isReadOnly>
                <FormLabel>Email ({t('parc.drivers.fromUser')})</FormLabel>
                <Input value={form.email || ''} readOnly opacity={0.7} />
              </FormControl>
              <FormControl><FormLabel>{t('parc.drivers.notes')}</FormLabel>
                <Input value={form.notes || ''} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></FormControl>
            </VStack>
          </DrawerBody>
          <DrawerFooter>
            <Button variant="ghost" mr={3} onClick={() => setFormOpen(false)}>{t('common.cancel')}</Button>
            <Button colorScheme="blue" onClick={handleSave}>{t('common.save')}</Button>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>

      {/* Détail / infractions */}
      <Drawer isOpen={!!selected} onClose={() => setSelected(null)} size="lg">
        <DrawerOverlay /><DrawerContent>
          <DrawerCloseButton />
          <DrawerHeader>{selected?.full_name}</DrawerHeader>
          <DrawerBody>
            <VStack align="stretch" spacing={4}>
              {infractions.filter(i => i.driver === selected?.id).length === 0 ? (
                <Text color="gray.500">{t('parc.drivers.noInfractions')}</Text>
              ) : (
                infractions.filter(i => i.driver === selected?.id).map(i => (
                  <HStack key={i.id} justify="space-between" borderWidth="1px" borderColor={borderColor} borderRadius="lg" p={3}>
                    <Box>
                      <Text fontWeight="600">{t(`parc.infractionType.${i.type}`)}</Text>
                      <Text fontSize="xs" color="gray.500">{i.date} · {i.lieu || ''}</Text>
                    </Box>
                    <VStack align="end" spacing={1}>
                      <Badge colorScheme={i.status === 'payee' ? 'green' : i.status === 'conteste' ? 'orange' : 'red'}>
                        {t(`parc.infractionStatus.${i.status}`)}
                      </Badge>
                      <Text fontSize="sm" fontWeight="600">{Number(i.montant || 0).toLocaleString()}</Text>
                    </VStack>
                  </HStack>
                ))
              )}

              <Box borderWidth="1px" borderColor={borderColor} borderRadius="lg" p={4}>
                <Text fontWeight="600" mb={2}>{t('parc.drivers.addInfraction')}</Text>
                <VStack spacing={2}>
                  <Select placeholder={t('parc.infractionType.placeholder')} value={infForm.type || ''} onChange={(e) => setInfForm({ ...infForm, type: e.target.value })}>
                    {['excès_vitesse','stationnement','feu_rouge','telephone','alcool','autre'].map(x => <option key={x} value={x}>{t(`parc.infractionType.${x}`)}</option>)}
                  </Select>
                  <Flex gap={2} w="100%">
                    <Input type="date" value={infForm.date || ''} onChange={(e) => setInfForm({ ...infForm, date: e.target.value })} />
                    <Input type="number" placeholder={t('parc.infraction.amount')} value={infForm.montant || ''} onChange={(e) => setInfForm({ ...infForm, montant: e.target.value })} />
                  </Flex>
                  <Input placeholder={t('parc.infraction.location')} value={infForm.lieu || ''} onChange={(e) => setInfForm({ ...infForm, lieu: e.target.value })} />
                  <Button colorScheme="red" size="sm" w="100%" onClick={addInfraction}>{t('parc.drivers.addInfraction')}</Button>
                </VStack>
              </Box>
            </VStack>
          </DrawerBody>
        </DrawerContent>
      </Drawer>

      <AlertDialog isOpen={isOpen} leastDestructiveRef={cancelRef} onClose={onClose}>
        <AlertDialogOverlay><AlertDialogContent>
          <AlertDialogHeader fontSize="lg" fontWeight="bold">{t('parc.confirmDelete')}</AlertDialogHeader>
          <AlertDialogBody>{t('parc.confirmDeleteDesc')}</AlertDialogBody>
          <AlertDialogFooter>
            <Button ref={cancelRef} onClick={onClose}>{t('common.cancel')}</Button>
            <Button colorScheme="red" onClick={handleDelete} ml={3}>{t('common.delete')}</Button>
          </AlertDialogFooter>
        </AlertDialogContent></AlertDialogOverlay>
      </AlertDialog>
    </Box>
  );
};

export default Drivers;