import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Box, Heading, Button, HStack, VStack, Text, Badge, Icon,
  SimpleGrid, IconButton, useToast, useColorModeValue, Spinner,
  Input, Select, InputGroup, InputLeftElement, Flex, Image,
  Menu, MenuButton, MenuList, MenuItem,
  AlertDialog, AlertDialogOverlay, AlertDialogContent,
  AlertDialogHeader, AlertDialogBody, AlertDialogFooter,
  useDisclosure, Drawer, DrawerOverlay, DrawerContent, DrawerCloseButton,
  DrawerHeader, DrawerBody, DrawerFooter, FormLabel, FormControl,
  useColorMode,
} from '@chakra-ui/react';
import {
  FiPlus, FiSearch, FiTruck, FiEye, FiEdit2, FiTrash2, FiMoreVertical,
  FiCalendar, FiTool, FiFileText, FiGitCommit, FiUpload,
  FiHash, FiDollarSign, FiTrendingUp,
} from 'react-icons/fi';
import {
  useVehicleService, useAssignmentService, useDocumentService, useOdometerService,
} from '../../services/parcService';
import { VEHICLE_TYPES, getVehicleTypeImage } from '../../utils/vehicleTypes';
import EmptyState from '../../components/EmptyState';

const FuelLabel = ({ type }) => {
  const map = {
    essence: 'Essence', diesel: 'Diesel', hybride: 'Hybride',
    electrique: 'Électrique', gpl: 'GPL',
  };
  return map[type] || type;
};

const statusConfig = {
  disponible: { color: 'green' },
  en_mission: { color: 'blue' },
  en_maintenance: { color: 'orange' },
  reforme: { color: 'red' },
};

const Vehicles = () => {
  const { t } = useTranslation();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deleteId, setDeleteId] = useState(null);
  const { getVehicles, createVehicle, updateVehicle, deleteVehicle, recordOdometer, uploadPhoto, deletePhoto } = useVehicleService();
  const { createAssignment, deleteAssignment } = useAssignmentService();
  const { createDocument, deleteDocument } = useDocumentService();
  const { createReading } = useOdometerService();
  const toast = useToast();
  const bgColor = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.600');
  const tileColor = useColorModeValue('gray.100', 'gray.700');
  const { isOpen, onOpen, onClose } = useDisclosure();
  const cancelRef = React.useRef();

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({});
  const [tab, setTab] = useState('main');
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [assignForm, setAssignForm] = useState({});
  const [docForm, setDocForm] = useState({});
  const [odoForm, setOdoForm] = useState({});
  const [photoFile, setPhotoFile] = useState(null);

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    try {
      const data = await getVehicles();
      setVehicles(Array.isArray(data) ? data : data.results || []);
    } catch (e) {
      toast({ title: t('parc.loadError'), status: 'error', duration: 3000 });
    } finally {
      setLoading(false);
    }
  };

  const openForm = async (v = null) => {
    setEditing(v);
    if (v) {
      let d = v;
      if (d.annee === undefined || d.numero_chassis === undefined) {
        try { d = await getVehicle(v.id); } catch (e) { /* garde le résumé */ }
      }
      setForm({
        immatriculation: d.immatriculation, marque: d.marque, modele: d.modele,
        annee: d.annee || '', type_vehicule: d.type_vehicule || 'berline',
        type_carburant: d.type_carburant,
        numero_chassis: d.numero_chassis || '', statut: d.statut,
        odometer_km: d.odometer_km || '',
        cout_achat: d.cout_achat || 0, cout_kilometre: d.cout_kilometre || 0,
        consommation_moyenne: d.consommation_moyenne || 0,
      });
    } else {
      setForm({});
    }
    setTab('main');
    setFormOpen(true);
  };

  const handleSave = async () => {
    try {
      if (editing) {
        await updateVehicle(editing.id, form);
        toast({ title: t('parc.saved'), status: 'success', duration: 2000 });
      } else {
        await createVehicle(form);
        toast({ title: t('parc.saved'), status: 'success', duration: 2000 });
      }
      setFormOpen(false);
      load();
    } catch (e) {
      toast({ title: t('parc.saveError'), status: 'error', duration: 3000 });
    }
  };

  const confirmDelete = (id) => { setDeleteId(id); onOpen(); };
  const handleDelete = async () => {
    try {
      await deleteVehicle(deleteId);
      setVehicles(vehicles.filter(v => v.id !== deleteId));
      toast({ title: t('parc.deleted'), status: 'success', duration: 2000 });
    } catch (e) {
      toast({ title: t('parc.deleteError'), status: 'error', duration: 3000 });
    } finally {
      onClose(); setDeleteId(null);
    }
  };

  const openDetail = async (v) => {
    setSelectedVehicle(v);
    setTab('main');
    try {
      const detail = await getVehicle(v.id);
      setSelectedVehicle(detail);
    } catch (e) {
      console.error(e);
    }
  };

  const handleAddAssignment = async () => {
    if (!assignForm.vehicle || !assignForm.start_date) return;
    try {
      await createAssignment(assignForm);
      toast({ title: t('parc.saved'), status: 'success', duration: 2000 });
      setAssignForm({});
      openDetail(selectedVehicle);
    } catch (e) {
      toast({ title: t('parc.saveError'), status: 'error' });
    }
  };

  const handleAddDocument = async () => {
    if (!docForm.type || !docForm.title) return;
    try {
      await createDocument(docForm);
      toast({ title: t('parc.saved'), status: 'success', duration: 2000 });
      setDocForm({});
      openDetail(selectedVehicle);
    } catch (e) {
      toast({ title: t('parc.saveError'), status: 'error' });
    }
  };

  const handleRecordOdometer = async () => {
    if (!odoForm.odometer_km) return;
    try {
      await recordOdometer(selectedVehicle.id, { ...odoForm, vehicle: selectedVehicle.id });
      toast({ title: t('parc.saved'), status: 'success', duration: 2000 });
      setOdoForm({});
      openDetail(selectedVehicle);
      load();
    } catch (e) {
      toast({ title: t('parc.saveError'), status: 'error' });
    }
  };

  const handleUploadPhoto = async () => {
    if (!photoFile) return;
    try {
      await uploadPhoto(selectedVehicle.id, photoFile);
      toast({ title: t('parc.saved'), status: 'success', duration: 2000 });
      setPhotoFile(null);
      openDetail(selectedVehicle);
      load();
    } catch (e) {
      toast({ title: t('parc.saveError'), status: 'error' });
    }
  };

  const handleDeletePhoto = async (photoId) => {
    try {
      await deletePhoto(photoId);
      toast({ title: t('parc.deleted'), status: 'success', duration: 2000 });
      openDetail(selectedVehicle);
    } catch (e) {
      toast({ title: t('parc.deleteError'), status: 'error' });
    }
  };

  const filtered = vehicles.filter(v =>
    `${v.immatriculation} ${v.marque} ${v.modele}`.toLowerCase().includes(search.toLowerCase()) &&
    (!statusFilter || v.statut === statusFilter)
  );

  return (
    <Box>
      <Flex justify="space-between" align="center" mb={6} wrap="wrap" gap={3}>
        <Heading size="lg">{t('parc.vehicles.title')}</Heading>
        <Button leftIcon={<FiPlus />} colorScheme="blue" onClick={() => openForm(null)}>
          {t('parc.vehicles.newVehicle')}
        </Button>
      </Flex>

      <HStack mb={6} spacing={4} flexWrap="wrap">
        <InputGroup maxW="300px">
          <InputLeftElement><Icon as={FiSearch} color="gray.400" /></InputLeftElement>
          <Input placeholder={t('parc.vehicles.search')} value={search} onChange={(e) => setSearch(e.target.value)} bg={bgColor} />
        </InputGroup>
        <Select maxW="200px" placeholder={t('parc.allStatus')} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} bg={bgColor}>
          {Object.keys(statusConfig).map(k => (
            <option key={k} value={k}>{t(`parc.status.${k}`)}</option>
          ))}
        </Select>
      </HStack>

      {loading ? (
        <Box textAlign="center" py={20}><Spinner size="xl" /></Box>
      ) : filtered.length === 0 ? (
        <EmptyState icon={FiTruck} message={t('parc.vehicles.notFound')} actionLabel={t('parc.vehicles.newVehicle')} onAction={() => openForm(null)} />
      ) : (
        <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={4}>
          {filtered.map(v => {
            const sc = statusConfig[v.statut] || statusConfig.disponible;
            const activeAss = v.current_assignment;
            return (
<Box key={v.id} bg={bgColor} borderRadius="xl" borderWidth="1px" borderColor={borderColor} p={5}
                  transition="all 0.2s" _hover={{ shadow: 'md', transform: 'translateY(-2px)' }}>
                  <Box bg={tileColor} borderRadius="lg" overflow="hidden" mb={3} h="140px">
                    <Image src={v.first_photo || getVehicleTypeImage(v.type_vehicule)}
                      alt={v.type_vehicule_display || v.type_vehicule}
                      w="100%" h="100%" objectFit={v.first_photo ? 'cover' : 'contain'} />
                  </Box>
                  <Flex justify="space-between" align="flex-start" mb={2}>
                  <VStack align="start" spacing={0}>
                    <Heading size="sm">{v.immatriculation}</Heading>
                    <Text fontSize="sm" color="gray.500">{v.marque} {v.modele}</Text>
                  </VStack>
                  <Menu>
                    <MenuButton as={IconButton} icon={<FiMoreVertical />} variant="ghost" size="sm" />
                    <MenuList>
                      <MenuItem icon={<FiEye />} onClick={() => openDetail(v)}>{t('parc.actions.view')}</MenuItem>
                      <MenuItem icon={<FiEdit2 />} onClick={() => openForm(v)}>{t('parc.actions.edit')}</MenuItem>
                      <MenuItem icon={<FiTrash2 />} color="red.500" onClick={() => confirmDelete(v.id)}>{t('parc.actions.delete')}</MenuItem>
                    </MenuList>
                  </Menu>
                </Flex>

                <HStack spacing={2} mb={3} flexWrap="wrap">
                  <Badge colorScheme={sc.color}>{t(`parc.status.${v.statut}`)}</Badge>
                  <Badge variant="subtle" colorScheme="blue">{t(`parc.vehicleType.${v.type_vehicule}`)}</Badge>
                  <Badge variant="outline"><FuelLabel type={v.type_carburant} /></Badge>
                </HStack>

                <VStack spacing={1} align="stretch" fontSize="sm" color="gray.600">
                  <HStack><Icon as={FiGitCommit} boxSize={4} /><Text>{v.odometer_km} km</Text></HStack>
                  <HStack><Icon as={FiCalendar} boxSize={4} /><Text>{v.annee || '—'}</Text></HStack>
                  <HStack><Icon as={FiHash} boxSize={4} /><Text>{t('parc.vehicles.vin')}: {v.numero_chassis || '—'}</Text></HStack>
                  <HStack><Icon as={FiDollarSign} boxSize={4} /><Text>{t('parc.vehicles.purchaseCost')}: {Number(v.cout_achat || 0).toLocaleString()}</Text></HStack>
                  <HStack><Icon as={FiTrendingUp} boxSize={4} /><Text>{t('parc.vehicles.costPerKm')}: {v.cout_kilometre}</Text></HStack>
                  {activeAss && activeAss.user_name && (
                    <HStack><Icon as={FiTool} boxSize={4} /><Text>{activeAss.user_name}</Text></HStack>
                  )}
                </VStack>

                <Button mt={4} size="sm" variant="ghost" colorScheme="blue" onClick={() => openDetail(v)}>
                  {t('parc.actions.view')}
                </Button>
              </Box>
            );
          })}
        </SimpleGrid>
      )}

      {/* Formulaire véhicule */}
      <Drawer isOpen={formOpen} onClose={() => setFormOpen(false)} size="md">
        <DrawerOverlay />
        <DrawerContent>
          <DrawerCloseButton />
          <DrawerHeader>{editing ? t('parc.vehicles.edit') : t('parc.vehicles.newVehicle')}</DrawerHeader>
          <DrawerBody>
            <VStack spacing={3} align="stretch">
              <FormControl><FormLabel>{t('parc.vehicles.reg')}</FormLabel>
                <Input value={form.immatriculation || ''} onChange={(e) => setForm({ ...form, immatriculation: e.target.value })} /></FormControl>
              <Flex gap={3}>
                <FormControl><FormLabel>{t('parc.vehicles.brand')}</FormLabel>
                  <Input value={form.marque || ''} onChange={(e) => setForm({ ...form, marque: e.target.value })} /></FormControl>
                <FormControl><FormLabel>{t('parc.vehicles.model')}</FormLabel>
                  <Input value={form.modele || ''} onChange={(e) => setForm({ ...form, modele: e.target.value })} /></FormControl>
              </Flex>
              <Flex gap={3}>
                <FormControl><FormLabel>{t('parc.vehicles.year')}</FormLabel>
                  <Input type="number" value={form.annee || ''} onChange={(e) => setForm({ ...form, annee: e.target.value })} /></FormControl>
                <FormControl><FormLabel>{t('parc.vehicles.fuel')}</FormLabel>
                  <Select value={form.type_carburant || 'diesel'} onChange={(e) => setForm({ ...form, type_carburant: e.target.value })}>
                    {['essence','diesel','hybride','electrique','gpl'].map(f => <option key={f} value={f}>{FuelLabel({type:f})}</option>)}
                  </Select></FormControl>
              </Flex>
              <FormControl><FormLabel>{t('parc.vehicles.type')}</FormLabel>
                <Select value={form.type_vehicule || 'berline'} onChange={(e) => setForm({ ...form, type_vehicule: e.target.value })}>
                  {VEHICLE_TYPES.map(tp => <option key={tp} value={tp}>{t(`parc.vehicleType.${tp}`)}</option>)}
                </Select></FormControl>
              <Box borderWidth="1px" borderColor={borderColor} borderRadius="lg" p={2} bg={tileColor}>
                <Image src={getVehicleTypeImage(form.type_vehicule)} alt={t(`parc.vehicleType.${form.type_vehicule}`)} w="100%" h="120px" objectFit="contain" />
              </Box>
              <FormControl><FormLabel>{t('parc.vehicles.vin')}</FormLabel>
                <Input value={form.numero_chassis || ''} onChange={(e) => setForm({ ...form, numero_chassis: e.target.value })} /></FormControl>
              <FormControl><FormLabel>{t('parc.status.label')}</FormLabel>
                <Select value={form.statut || 'disponible'} onChange={(e) => setForm({ ...form, statut: e.target.value })}>
                  {Object.keys(statusConfig).map(k => <option key={k} value={k}>{t(`parc.status.${k}`)}</option>)}
                </Select></FormControl>
              <Flex gap={3}>
                <FormControl><FormLabel>{t('parc.vehicles.purchaseCost')}</FormLabel>
                  <Input type="number" value={form.cout_achat || 0} onChange={(e) => setForm({ ...form, cout_achat: e.target.value })} /></FormControl>
                <FormControl><FormLabel>{t('parc.vehicles.costPerKm')}</FormLabel>
                  <Input type="number" value={form.cout_kilometre || 0} onChange={(e) => setForm({ ...form, cout_kilometre: e.target.value })} /></FormControl>
              </Flex>
              <FormControl><FormLabel>Odomètre (km)</FormLabel>
                <Input type="number" value={form.odometer_km || ''} onChange={(e) => setForm({ ...form, odometer_km: e.target.value })} /></FormControl>
            </VStack>
          </DrawerBody>
          <DrawerFooter>
            <Button variant="ghost" mr={3} onClick={() => setFormOpen(false)}>{t('common.cancel')}</Button>
            <Button colorScheme="blue" onClick={handleSave}>{t('common.save')}</Button>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>

      {/* Détail véhicule avec onglets */}
      <Drawer isOpen={!!selectedVehicle} onClose={() => setSelectedVehicle(null)} size="lg">
        <DrawerOverlay />
        <DrawerContent>
          <DrawerCloseButton />
          <DrawerHeader>{selectedVehicle?.immatriculation}</DrawerHeader>
          <DrawerBody>
            <HStack spacing={1} mb={4} flexWrap="wrap">
              {['main','photos','assign','doc','odo'].map(tk => (
                <Button key={tk} size="sm" variant={tab === tk ? 'solid' : 'ghost'} colorScheme="blue" onClick={() => setTab(tk)}>
                  {t(`parc.detail.${tk}`)}
                </Button>
              ))}
            </HStack>

            {tab === 'main' && selectedVehicle && (
              <VStack align="stretch" spacing={3}>
                <Box borderWidth="1px" borderColor={borderColor} borderRadius="lg" p={3} bg={tileColor}>
                  <Image src={getVehicleTypeImage(selectedVehicle.type_vehicule)}
                    alt={selectedVehicle.type_vehicule_display || selectedVehicle.type_vehicule}
                    w="100%" h="140px" objectFit="contain" />
                </Box>
                <Text fontSize="lg" fontWeight="600">{selectedVehicle.marque} {selectedVehicle.modele}</Text>
                <SimpleGrid columns={2} spacing={3}>
                  <Box><Text color="gray.500" fontSize="xs">{t('parc.vehicles.type')}</Text><Text fontWeight="600">{selectedVehicle.type_vehicule_display || '—'}</Text></Box>
                  <Box><Text color="gray.500" fontSize="xs">{t('parc.vehicles.fuel')}</Text><Text fontWeight="600"><FuelLabel type={selectedVehicle.type_carburant} /></Text></Box>
                  <Box><Text color="gray.500" fontSize="xs">VIN</Text><Text fontWeight="600">{selectedVehicle.numero_chassis || '—'}</Text></Box>
                  <Box><Text color="gray.500" fontSize="xs">{t('parc.vehicles.year')}</Text><Text fontWeight="600">{selectedVehicle.annee || '—'}</Text></Box>
                  <Box><Text color="gray.500" fontSize="xs">Odomètre</Text><Text fontWeight="600">{selectedVehicle.odometer_km} km</Text></Box>
                  <Box><Text color="gray.500" fontSize="xs">{t('parc.vehicles.purchaseCost')}</Text><Text fontWeight="600">{Number(selectedVehicle.cout_achat || 0).toLocaleString()}</Text></Box>
                  <Box><Text color="gray.500" fontSize="xs">{t('parc.vehicles.costPerKm')}</Text><Text fontWeight="600">{selectedVehicle.cout_kilometre}</Text></Box>
                </SimpleGrid>
              </VStack>
            )}

            {tab === 'photos' && selectedVehicle && (
              <VStack align="stretch" spacing={4}>
                {selectedVehicle.photos && selectedVehicle.photos.length > 0 ? (
                  <SimpleGrid columns={{ base: 2, md: 3 }} spacing={3}>
                    {selectedVehicle.photos.map(p => (
                      <Box key={p.id} position="relative" borderWidth="1px" borderColor={borderColor} borderRadius="lg" overflow="hidden">
                        <Image src={p.image} alt={p.caption || selectedVehicle.immatriculation} w="100%" h="120px" objectFit="cover" />
                        <IconButton icon={<FiTrash2 />} size="xs" variant="solid" colorScheme="red"
                          position="absolute" top={1} right={1} aria-label={t('parc.photos.delete')}
                          onClick={() => handleDeletePhoto(p.id)} />
                      </Box>
                    ))}
                  </SimpleGrid>
                ) : <Text color="gray.500">{t('parc.photos.empty')}</Text>}
                <Box borderWidth="1px" borderColor={borderColor} borderRadius="lg" p={4}>
                  <Text fontWeight="600" mb={2}>{t('parc.photos.add')}</Text>
                  <VStack spacing={2}>
                    <Input type="file" accept="image/*" onChange={(e) => setPhotoFile(e.target.files[0] || null)} />
                    <Button colorScheme="blue" size="sm" w="100%" leftIcon={<FiUpload />}
                      onClick={handleUploadPhoto} isDisabled={!photoFile}>{t('parc.photos.upload')}</Button>
                  </VStack>
                </Box>
              </VStack>
            )}

            {tab === 'assign' && selectedVehicle && (
              <VStack align="stretch" spacing={4}>
                {selectedVehicle.assignments && selectedVehicle.assignments.length > 0 ? (
                  selectedVehicle.assignments.map(a => (
                    <HStack key={a.id} justify="space-between" borderWidth="1px" borderColor={borderColor} borderRadius="lg" p={3}>
                      <Box>
                        <Text fontWeight="600">{a.user_name}</Text>
                        <Text fontSize="xs" color="gray.500">{a.type} · {a.start_date}{a.end_date ? ` → ${a.end_date}` : ' → …'}</Text>
                      </Box>
                      <IconButton icon={<FiTrash2 />} size="sm" variant="ghost" colorScheme="red"
                        onClick={async () => { await deleteAssignment(a.id); openDetail(selectedVehicle); }} />
                    </HStack>
                  ))
                ) : <Text color="gray.500">{t('parc.detail.noData')}</Text>}
                <Box borderWidth="1px" borderColor={borderColor} borderRadius="lg" p={4}>
                  <Text fontWeight="600" mb={2}>{t('parc.assign.add')}</Text>
                  <VStack spacing={2}>
                    <Input placeholder={t('parc.assign.serviceName')} value={assignForm.service_name || ''}
                      onChange={(e) => setAssignForm({ ...assignForm, service_name: e.target.value })} />
                    <Input type="date" value={assignForm.start_date || ''}
                      onChange={(e) => setAssignForm({ ...assignForm, start_date: e.target.value })} />
                    <Input type="date" value={assignForm.end_date || ''}
                      onChange={(e) => setAssignForm({ ...assignForm, end_date: e.target.value || null })} />
                    <Select value={assignForm.type || 'temporaire'} onChange={(e) => setAssignForm({ ...assignForm, type: e.target.value })}>
                      <option value="temporaire">{t('parc.assign.temporary')}</option>
                      <option value="permanente">{t('parc.assign.permanent')}</option>
                    </Select>
                    <Button colorScheme="blue" size="sm" w="100%" onClick={() => handleAddAssignment()}>{t('parc.assign.add')}</Button>
                  </VStack>
                </Box>
              </VStack>
            )}

            {tab === 'doc' && selectedVehicle && (
              <VStack align="stretch" spacing={4}>
                {selectedVehicle.documents && selectedVehicle.documents.length > 0 ? (
                  selectedVehicle.documents.map(d => (
                    <HStack key={d.id} justify="space-between" borderWidth="1px" borderColor={borderColor} borderRadius="lg" p={3}>
                      <Box>
                        <Text fontWeight="600">{d.type_display} — {d.title}</Text>
                        <HStack spacing={2}>
                          <Text fontSize="xs" color="gray.500">{d.date_expiration ? `Exp: ${d.date_expiration}` : ''}</Text>
                          {d.is_expired && <Badge colorScheme="red">{t('parc.detail.expired')}</Badge>}
                          {!d.is_expired && d.expires_soon && <Badge colorScheme="orange">{t('parc.detail.expiringSoon')}</Badge>}
                        </HStack>
                      </Box>
                      <IconButton icon={<FiTrash2 />} size="sm" variant="ghost" colorScheme="red"
                        onClick={async () => { await deleteDocument(d.id); openDetail(selectedVehicle); }} />
                    </HStack>
                  ))
                ) : <Text color="gray.500">{t('parc.detail.noData')}</Text>}
                <Box borderWidth="1px" borderColor={borderColor} borderRadius="lg" p={4}>
                  <Text fontWeight="600" mb={2}>{t('parc.doc.add')}</Text>
                  <VStack spacing={2}>
                    <Select placeholder={t('parc.doc.type')} value={docForm.type || ''} onChange={(e) => setDocForm({ ...docForm, type: e.target.value })}>
                      {['carte_grise','assurance','controle_technique','leasing','autre'].map(x => <option key={x} value={x}>{t(`parc.docType.${x}`)}</option>)}
                    </Select>
                    <Input placeholder={t('parc.doc.title')} value={docForm.title || ''} onChange={(e) => setDocForm({ ...docForm, title: e.target.value })} />
                    <Input placeholder={t('parc.doc.number')} value={docForm.numero || ''} onChange={(e) => setDocForm({ ...docForm, numero: e.target.value })} />
                    <Input placeholder={t('parc.doc.fileUrl')} value={docForm.file_url || ''} onChange={(e) => setDocForm({ ...docForm, file_url: e.target.value })} />
                    <Input type="date" value={docForm.date_expiration || ''} onChange={(e) => setDocForm({ ...docForm, date_expiration: e.target.value || null })} />
                    <Button colorScheme="blue" size="sm" w="100%" onClick={handleAddDocument}>{t('parc.doc.add')}</Button>
                  </VStack>
                </Box>
              </VStack>
            )}

            {tab === 'odo' && selectedVehicle && (
              <Box borderWidth="1px" borderColor={borderColor} borderRadius="lg" p={4}>
                <Text fontWeight="600" mb={2}>{t('parc.odo.add')}</Text>
                <VStack spacing={2}>
                  <Input type="number" placeholder={t('parc.odo.value')} value={odoForm.odometer_km || ''}
                    onChange={(e) => setOdoForm({ ...odoForm, odometer_km: e.target.value })} />
                  <Input type="date" value={odoForm.recorded_date || ''} onChange={(e) => setOdoForm({ ...odoForm, recorded_date: e.target.value })} />
                  <Button colorScheme="blue" size="sm" w="100%" onClick={handleRecordOdometer}>{t('parc.odo.add')}</Button>
                </VStack>
              </Box>
            )}
          </DrawerBody>
        </DrawerContent>
      </Drawer>

      <AlertDialog isOpen={isOpen} leastDestructiveRef={cancelRef} onClose={onClose}>
        <AlertDialogOverlay>
          <AlertDialogContent>
            <AlertDialogHeader fontSize="lg" fontWeight="bold">{t('parc.confirmDelete')}</AlertDialogHeader>
            <AlertDialogBody>{t('parc.confirmDeleteDesc')}</AlertDialogBody>
            <AlertDialogFooter>
              <Button ref={cancelRef} onClick={onClose}>{t('common.cancel')}</Button>
              <Button colorScheme="red" onClick={handleDelete} ml={3}>{t('common.delete')}</Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialogOverlay>
      </AlertDialog>
    </Box>
  );
};

export default Vehicles;
