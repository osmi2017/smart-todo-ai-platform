import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Box, Heading, Button, HStack, VStack, Text, Badge, Icon, Table,
  Thead, Tbody, Tr, Th, Td, useToast, useColorModeValue, Spinner,
  Input, Select, Drawer, DrawerOverlay, DrawerContent, DrawerCloseButton,
  DrawerHeader, DrawerBody, DrawerFooter, FormLabel, FormControl,
  SimpleGrid, Flex, Divider,
  AlertDialog, AlertDialogOverlay, AlertDialogContent,
  AlertDialogHeader, AlertDialogBody, AlertDialogFooter, useDisclosure,
  Tab, Tabs, TabList, TabPanels, TabPanel, IconButton, Menu, MenuButton, MenuList, MenuItem,
} from '@chakra-ui/react';
import { FiPlus, FiTool, FiCheck, FiClock, FiTrash2, FiMoreVertical, FiEdit2, FiAlertTriangle } from 'react-icons/fi';
import { useMaintenanceService, useScheduleService, useVehicleService } from '../../services/parcService';
import EmptyState from '../../components/EmptyState';

const mStatusConfig = {
  planifiee: { color: 'blue' },
  en_cours: { color: 'orange' },
  terminee: { color: 'green' },
  annulee: { color: 'red' },
};

const mTypeConfig = {
  preventive: { color: 'teal' }, corrective: { color: 'orange' }, vidange: { color: 'cyan' },
  controle_technique: { color: 'purple' }, pneu: { color: 'gray' }, autre: { color: 'gray' },
};

const Maintenance = () => {
  const { t } = useTranslation();
  const { getMaintenances, createMaintenance, updateMaintenance, deleteMaintenance, setStatus } = useMaintenanceService();
  const { getSchedules, createSchedule, deleteSchedule } = useScheduleService();
  const { getVehicles } = useVehicleService();
  const [maintenances, setMaintenances] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const toast = useToast();
  const bgColor = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.600');
  const { isOpen, onOpen, onClose } = useDisclosure();
  const cancelRef = React.useRef();

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({});
  const [schedOpen, setSchedOpen] = useState(false);
  const [schedForm, setSchedForm] = useState({});
  const [deleteId, setDeleteId] = useState(null);

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    try {
      const [m, s, v] = await Promise.all([getMaintenances(), getSchedules(), getVehicles()]);
      setMaintenances(Array.isArray(m) ? m : m.results || []);
      setSchedules(Array.isArray(s) ? s : s.results || []);
      setVehicles(Array.isArray(v) ? v : v.results || []);
    } catch (e) {
      toast({ title: t('parc.loadError'), status: 'error', duration: 3000 });
    } finally {
      setLoading(false);
    }
  };

  const openForm = (m = null) => {
    setEditing(m);
    setForm(m ? {
      vehicle: m.vehicle, type: m.type, title: m.title, description: m.description || '',
      status: m.status, scheduled_date: m.scheduled_date || '', cout: m.cout || 0,
      fournisseur: m.fournisseur || '', facture_ref: m.facture_ref || '',
    } : { vehicle: vehicles[0]?.id || '', type: 'preventive', status: 'planifiee' });
    setFormOpen(true);
  };

  const handleSave = async () => {
    try {
      if (editing) await updateMaintenance(editing.id, form);
      else await createMaintenance(form);
      toast({ title: t('parc.saved'), status: 'success', duration: 2000 });
      setFormOpen(false); load();
    } catch (e) {
      toast({ title: t('parc.saveError'), status: 'error', duration: 3000 });
    }
  };

  const handleSaveSchedule = async () => {
    try {
      await createSchedule(schedForm);
      toast({ title: t('parc.saved'), status: 'success', duration: 2000 });
      setSchedOpen(false); load();
    } catch (e) {
      toast({ title: t('parc.saveError'), status: 'error', duration: 3000 });
    }
  };

  const confirmDelete = (id) => { setDeleteId(id); onOpen(); };
  const handleDelete = async () => {
    try {
      await deleteMaintenance(deleteId);
      setMaintenances(maintenances.filter(x => x.id !== deleteId));
      toast({ title: t('parc.deleted'), status: 'success', duration: 2000 });
    } catch (e) {
      toast({ title: t('parc.deleteError'), status: 'error', duration: 3000 });
    } finally { onClose(); setDeleteId(null); }
  };

  const filtered = maintenances.filter(m => !statusFilter || m.status === statusFilter);
  const vehicleLabel = (id) => {
    const v = vehicles.find(x => x.id === id);
    return v ? `${v.immatriculation} ${v.marque}` : '—';
  };

  if (loading) return <Box textAlign="center" py={20}><Spinner size="xl" /></Box>;

  return (
    <Box>
      <Flex justify="space-between" align="center" mb={6} wrap="wrap" gap={3}>
        <Heading size="lg">{t('parc.maintenance.title')}</Heading>
        <HStack>
          <Button leftIcon={<FiClock />} colorScheme="teal" onClick={() => setSchedOpen(true)}>
            {t('parc.maintenance.newSchedule')}
          </Button>
          <Button leftIcon={<FiPlus />} colorScheme="blue" onClick={() => openForm(null)}>
            {t('parc.maintenance.newMaintenance')}
          </Button>
        </HStack>
      </Flex>

      <Tabs colorScheme="blue">
        <TabList>
          <Tab>{t('parc.maintenance.maintenances')}</Tab>
          <Tab>{t('parc.maintenance.schedules')}</Tab>
        </TabList>
        <TabPanels>
          <TabPanel px={0}>
            <Select maxW="200px" mb={4} placeholder={t('parc.allStatus')} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              {Object.keys(mStatusConfig).map(k => <option key={k} value={k}>{t(`parc.maintStatus.${k}`)}</option>)}
            </Select>
            {filtered.length === 0 ? (
              <EmptyState icon={FiTool} message={t('parc.maintenance.notFound')} actionLabel={t('parc.maintenance.newMaintenance')} onAction={() => openForm(null)} />
            ) : (
              <Box overflowX="auto" bg={bgColor} borderRadius="xl" borderWidth="1px" borderColor={borderColor}>
                <Table size="sm">
                  <Thead>
                    <Tr>
                      <Th>{t('parc.vehicles.title')}</Th>
                      <Th>{t('parc.maintenance.type')}</Th>
                      <Th>Title</Th>
                      <Th>{t('parc.status.label')}</Th>
                      <Th>Date</Th>
                      <Th>Coût</Th>
                      <Th></Th>
                    </Tr>
                  </Thead>
                  <Tbody>
                    {filtered.map(m => {
                      const sc = mStatusConfig[m.status] || mStatusConfig.planifiee;
                      return (
                        <Tr key={m.id}>
                          <Td>{vehicleLabel(m.vehicle)}</Td>
                          <Td><Badge colorScheme={(mTypeConfig[m.type] || mTypeConfig.autre).color}>{t(`parc.maintType.${m.type}`)}</Badge></Td>
                          <Td>{m.title}</Td>
                          <Td><Badge colorScheme={sc.color}>{t(`parc.maintStatus.${m.status}`)}</Badge></Td>
                          <Td>{m.scheduled_date || '—'}</Td>
                          <Td>{Number(m.cout || 0).toLocaleString()}</Td>
                          <Td>
                            <Menu>
                              <MenuButton as={IconButton} icon={<FiMoreVertical />} variant="ghost" size="sm" />
                              <MenuList>
                                {m.status !== 'terminee' && (
                                  <MenuItem icon={<FiCheck />} onClick={async () => { await setStatus(m.id, 'terminee'); load(); }}>
                                    {t('parc.maintenance.complete')}
                                  </MenuItem>
                                )}
                                <MenuItem icon={<FiEdit2 />} onClick={() => openForm(m)}>{t('parc.actions.edit')}</MenuItem>
                                <MenuItem icon={<FiTrash2 />} color="red.500" onClick={() => confirmDelete(m.id)}>{t('parc.actions.delete')}</MenuItem>
                              </MenuList>
                            </Menu>
                          </Td>
                        </Tr>
                      );
                    })}
                  </Tbody>
                </Table>
              </Box>
            )}
          </TabPanel>

          <TabPanel px={0}>
            {schedules.length === 0 ? (
              <EmptyState icon={FiClock} message={t('parc.maintenance.noSchedules')} actionLabel={t('parc.maintenance.newSchedule')} onAction={() => setSchedOpen(true)} />
            ) : (
              <VStack align="stretch" spacing={3}>
                {schedules.map(s => (
                  <HStack key={s.id} justify="space-between" bg={bgColor} borderWidth="1px" borderColor={borderColor} borderRadius="lg" p={4}>
                    <Box>
                      <HStack spacing={2}>
                        <Text fontWeight="600">{s.title}</Text>
                        {s.is_due && <Badge colorScheme="orange" display="flex" alignItems="center" gap={1}><FiAlertTriangle /> {t('parc.detail.due')}</Badge>}
                      </HStack>
                      <Text fontSize="xs" color="gray.500">{vehicleLabel(s.vehicle)} · {s.interval_kilometers ? `${s.interval_kilometers} km` : ''} {s.interval_months ? ` / ${s.interval_months} mois` : ''}</Text>
                      <Text fontSize="xs" color="gray.500">Prochaine: {s.next_due_date || '—'} {s.next_due_km ? ` / ${s.next_due_km} km` : ''}</Text>
                    </Box>
                    <IconButton icon={<FiTrash2 />} size="sm" variant="ghost" colorScheme="red"
                      onClick={async () => { await deleteSchedule(s.id); load(); }} />
                  </HStack>
                ))}
              </VStack>
            )}
          </TabPanel>
        </TabPanels>
      </Tabs>

      {/* Formulaire maintenance */}
      <Drawer isOpen={formOpen} onClose={() => setFormOpen(false)} size="md">
        <DrawerOverlay /><DrawerContent>
          <DrawerCloseButton />
          <DrawerHeader>{editing ? t('parc.maintenance.edit') : t('parc.maintenance.newMaintenance')}</DrawerHeader>
          <DrawerBody>
            <VStack spacing={3} align="stretch">
              <FormControl><FormLabel>{t('parc.vehicles.title')}</FormLabel>
                <Select value={form.vehicle || ''} onChange={(e) => setForm({ ...form, vehicle: Number(e.target.value) })}>
                  {vehicles.map(v => <option key={v.id} value={v.id}>{v.immatriculation} {v.marque} {v.modele}</option>)}
                </Select></FormControl>
              <FormControl><FormLabel>{t('parc.maintenance.type')}</FormLabel>
                <Select value={form.type || 'preventive'} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                  {Object.keys(mTypeConfig).map(k => <option key={k} value={k}>{t(`parc.maintType.${k}`)}</option>)}
                </Select></FormControl>
              <FormControl><FormLabel>Title</FormLabel>
                <Input value={form.title || ''} onChange={(e) => setForm({ ...form, title: e.target.value })} /></FormControl>
              <FormControl><FormLabel>{t('parc.maintenance.description')}</FormLabel>
                <Input value={form.description || ''} onChange={(e) => setForm({ ...form, description: e.target.value })} /></FormControl>
              <Flex gap={3}>
                <FormControl><FormLabel>Date</FormLabel>
                  <Input type="date" value={form.scheduled_date || ''} onChange={(e) => setForm({ ...form, scheduled_date: e.target.value || null })} /></FormControl>
                <FormControl><FormLabel>Coût</FormLabel>
                  <Input type="number" value={form.cout || 0} onChange={(e) => setForm({ ...form, cout: e.target.value })} /></FormControl>
              </Flex>
              <FormControl><FormLabel>{t('parc.maintenance.supplier')}</FormLabel>
                <Input value={form.fournisseur || ''} onChange={(e) => setForm({ ...form, fournisseur: e.target.value })} /></FormControl>
            </VStack>
          </DrawerBody>
          <DrawerFooter>
            <Button variant="ghost" mr={3} onClick={() => setFormOpen(false)}>{t('common.cancel')}</Button>
            <Button colorScheme="blue" onClick={handleSave}>{t('common.save')}</Button>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>

      {/* Formulaire calendrier entretien */}
      <Drawer isOpen={schedOpen} onClose={() => setSchedOpen(false)} size="md">
        <DrawerOverlay /><DrawerContent>
          <DrawerCloseButton />
          <DrawerHeader>{t('parc.maintenance.newSchedule')}</DrawerHeader>
          <DrawerBody>
            <VStack spacing={3} align="stretch">
              <FormControl><FormLabel>{t('parc.vehicles.title')}</FormLabel>
                <Select value={schedForm.vehicle || ''} onChange={(e) => setSchedForm({ ...schedForm, vehicle: Number(e.target.value) })}>
                  {vehicles.map(v => <option key={v.id} value={v.id}>{v.immatriculation} {v.marque} {v.modele}</option>)}
                </Select></FormControl>
              <FormControl><FormLabel>Title</FormLabel>
                <Input value={schedForm.title || ''} onChange={(e) => setSchedForm({ ...schedForm, title: e.target.value })} /></FormControl>
              <Flex gap={3}>
                <FormControl><FormLabel>Interval km</FormLabel>
                  <Input type="number" value={schedForm.interval_kilometers || ''} onChange={(e) => setSchedForm({ ...schedForm, interval_kilometers: e.target.value || null })} /></FormControl>
                <FormControl><FormLabel>Interval mois</FormLabel>
                  <Input type="number" value={schedForm.interval_months || ''} onChange={(e) => setSchedForm({ ...schedForm, interval_months: e.target.value || null })} /></FormControl>
              </Flex>
              <Flex gap={3}>
                <FormControl><FormLabel>{t('parc.detail.nextDueDate')}</FormLabel>
                  <Input type="date" value={schedForm.next_due_date || ''} onChange={(e) => setSchedForm({ ...schedForm, next_due_date: e.target.value || null })} /></FormControl>
                <FormControl><FormLabel>{t('parc.detail.nextDueKm')}</FormLabel>
                  <Input type="number" value={schedForm.next_due_km || ''} onChange={(e) => setSchedForm({ ...schedForm, next_due_km: e.target.value || null })} /></FormControl>
              </Flex>
            </VStack>
          </DrawerBody>
          <DrawerFooter>
            <Button variant="ghost" mr={3} onClick={() => setSchedOpen(false)}>{t('common.cancel')}</Button>
            <Button colorScheme="teal" onClick={handleSaveSchedule}>{t('common.save')}</Button>
          </DrawerFooter>
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

export default Maintenance;
