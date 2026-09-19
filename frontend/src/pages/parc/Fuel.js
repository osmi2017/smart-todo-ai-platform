import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Box, Heading, Button, HStack, VStack, Text, Badge, Icon, Table,
  Thead, Tbody, Tr, Th, Td, useToast, useColorModeValue, Spinner,
  Select, Drawer, DrawerOverlay, DrawerContent, DrawerCloseButton,
  DrawerHeader, DrawerBody, DrawerFooter, FormLabel, FormControl, Input,
  Flex, Stat, StatLabel, StatNumber, StatHelpText,
  Tab, Tabs, TabList, TabPanels, TabPanel, IconButton, SimpleGrid,
} from '@chakra-ui/react';
import { FiPlus, FiDroplet, FiGitCommit, FiTrash2 } from 'react-icons/fi';
import { useFuelService, useOdometerService, useVehicleService } from '../../services/parcService';
import EmptyState from '../../components/EmptyState';

const Fuel = () => {
  const { t } = useTranslation();
  const { getFuelRecords, createFuelRecord, deleteFuelRecord } = useFuelService();
  const { getReadings, createReading, deleteReading } = useOdometerService();
  const { getVehicles } = useVehicleService();
  const [fuel, setFuel] = useState([]);
  const [readings, setReadings] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [vehicleFilter, setVehicleFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [fuelForm, setFuelForm] = useState({});
  const [odoForm, setOdoForm] = useState({});
  const [fuelOpen, setFuelOpen] = useState(false);
  const [odoOpen, setOdoOpen] = useState(false);
  const toast = useToast();
  const bgColor = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.600');

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    try {
      const [f, r, v] = await Promise.all([getFuelRecords(), getReadings(), getVehicles()]);
      setFuel(Array.isArray(f) ? f : f.results || []);
      setReadings(Array.isArray(r) ? r : r.results || []);
      setVehicles(Array.isArray(v) ? v : v.results || []);
    } catch (e) {
      toast({ title: t('parc.loadError'), status: 'error', duration: 3000 });
    } finally {
      setLoading(false);
    }
  };

  const addFuel = async () => {
    try {
      await createFuelRecord(fuelForm);
      toast({ title: t('parc.saved'), status: 'success', duration: 2000 });
      setFuelOpen(false); setFuelForm({}); load();
    } catch (e) {
      toast({ title: t('parc.saveError'), status: 'error', duration: 3000 });
    }
  };

  const addReading = async () => {
    try {
      await createReading(odoForm);
      toast({ title: t('parc.saved'), status: 'success', duration: 2000 });
      setOdoOpen(false); setOdoForm({}); load();
    } catch (e) {
      toast({ title: t('parc.saveError'), status: 'error', duration: 3000 });
    }
  };

  const vehicleLabel = (id) => {
    const v = vehicles.find(x => x.id === id);
    return v ? v.immatriculation : '—';
  };

  const fuelFiltered = fuel.filter(f => !vehicleFilter || f.vehicle === Number(vehicleFilter));
  const odoFiltered = readings.filter(r => !vehicleFilter || r.vehicle === Number(vehicleFilter));

  const totalLiters = fuel.reduce((s, f) => s + (f.volume_liters || 0), 0);
  const totalFuelCost = fuel.reduce((s, f) => s + (Number(f.cost) || 0), 0);

  if (loading) return <Box textAlign="center" py={20}><Spinner size="xl" /></Box>;

  return (
    <Box>
      <Flex justify="space-between" align="center" mb={6} wrap="wrap" gap={3}>
        <Heading size="lg">{t('parc.fuel.title')}</Heading>
        <HStack>
          <Button leftIcon={<FiGitCommit />} colorScheme="teal" onClick={() => { setOdoOpen(true); setOdoForm({ vehicle: vehicles[0]?.id || '' }); }}>
            {t('parc.fuel.newReading')}
          </Button>
          <Button leftIcon={<FiPlus />} colorScheme="blue" onClick={() => { setFuelOpen(true); setFuelForm({ vehicle: vehicles[0]?.id || '' }); }}>
            {t('parc.fuel.newRefuel')}
          </Button>
        </HStack>
      </Flex>

      <SimpleGrid columns={{ base: 2, md: 4 }} spacing={4} mb={6}>
        <Box bg={bgColor} borderRadius="xl" borderWidth="1px" borderColor={borderColor} p={4}>
          <Stat><StatLabel fontSize="xs" color="gray.500">{t('parc.fuel.totalLiters')}</StatLabel>
            <StatNumber>{totalLiters.toLocaleString()} L</StatNumber></Stat>
        </Box>
        <Box bg={bgColor} borderRadius="xl" borderWidth="1px" borderColor={borderColor} p={4}>
          <Stat><StatLabel fontSize="xs" color="gray.500">{t('parc.fuel.totalCost')}</StatLabel>
            <StatNumber>{totalFuelCost.toLocaleString()}</StatNumber></Stat>
        </Box>
        <Box bg={bgColor} borderRadius="xl" borderWidth="1px" borderColor={borderColor} p={4}>
          <Stat><StatLabel fontSize="xs" color="gray.500">{t('parc.fuel.readings')}</StatLabel>
            <StatNumber>{readings.length}</StatNumber></Stat>
        </Box>
        <Box bg={bgColor} borderRadius="xl" borderWidth="1px" borderColor={borderColor} p={4}>
          <Stat><StatLabel fontSize="xs" color="gray.500">{t('parc.fuel.refuels')}</StatLabel>
            <StatNumber>{fuel.length}</StatNumber></Stat>
        </Box>
      </SimpleGrid>

      <Select maxW="260px" mb={4} placeholder={t('parc.allVehicles')} value={vehicleFilter} onChange={(e) => setVehicleFilter(e.target.value)}>
        {vehicles.map(v => <option key={v.id} value={v.id}>{v.immatriculation} {v.marque} {v.modele}</option>)}
      </Select>

      <Tabs colorScheme="blue">
        <TabList>
          <Tab>{t('parc.fuel.refuels')}</Tab>
          <Tab>{t('parc.fuel.readings')}</Tab>
        </TabList>
        <TabPanels>
          <TabPanel px={0}>
            {fuelFiltered.length === 0 ? (
              <EmptyState icon={FiDroplet} message={t('parc.fuel.notFound')} actionLabel={t('parc.fuel.newRefuel')} onAction={() => setFuelOpen(true)} />
            ) : (
              <Box overflowX="auto" bg={bgColor} borderRadius="xl" borderWidth="1px" borderColor={borderColor}>
                <Table size="sm">
                  <Thead><Tr><Th>{t('parc.vehicles.title')}</Th><Th>Date</Th><Th>L</Th><Th>Coût</Th><Th>Station</Th><Th>Km</Th><Th></Th></Tr></Thead>
                  <Tbody>
                    {fuelFiltered.map(f => (
                      <Tr key={f.id}>
                        <Td>{vehicleLabel(f.vehicle)}</Td>
                        <Td>{f.date}</Td>
                        <Td>{f.volume_liters}</Td>
                        <Td>{Number(f.cost || 0).toLocaleString()}</Td>
                        <Td>{f.station || '—'}</Td>
                        <Td>{f.odometer_km || '—'}</Td>
                        <Td><IconButton icon={<FiTrash2 />} size="sm" variant="ghost" colorScheme="red"
                          onClick={async () => { await deleteFuelRecord(f.id); load(); }} /></Td>
                      </Tr>
                    ))}
                  </Tbody>
                </Table>
              </Box>
            )}
          </TabPanel>
          <TabPanel px={0}>
            {odoFiltered.length === 0 ? (
              <EmptyState icon={FiGitCommit} message={t('parc.fuel.noReadings')} actionLabel={t('parc.fuel.newReading')} onAction={() => setOdoOpen(true)} />
            ) : (
              <Box overflowX="auto" bg={bgColor} borderRadius="xl" borderWidth="1px" borderColor={borderColor}>
                <Table size="sm">
                  <Thead><Tr><Th>{t('parc.vehicles.title')}</Th><Th>Km</Th><Th>Date</Th><Th>{t('parc.fuel.source')}</Th><Th></Th></Tr></Thead>
                  <Tbody>
                    {odoFiltered.map(r => (
                      <Tr key={r.id}>
                        <Td>{vehicleLabel(r.vehicle)}</Td>
                        <Td>{r.odometer_km}</Td>
                        <Td>{r.recorded_date}</Td>
                        <Td>{r.source}</Td>
                        <Td><IconButton icon={<FiTrash2 />} size="sm" variant="ghost" colorScheme="red"
                          onClick={async () => { await deleteReading(r.id); load(); }} /></Td>
                      </Tr>
                    ))}
                  </Tbody>
                </Table>
              </Box>
            )}
          </TabPanel>
        </TabPanels>
      </Tabs>

      {/* Formulaire carburant */}
      <Drawer isOpen={fuelOpen} onClose={() => setFuelOpen(false)} size="md">
        <DrawerOverlay /><DrawerContent>
          <DrawerCloseButton />
          <DrawerHeader>{t('parc.fuel.newRefuel')}</DrawerHeader>
          <DrawerBody>
            <VStack spacing={3} align="stretch">
              <FormControl><FormLabel>{t('parc.vehicles.title')}</FormLabel>
                <Select value={fuelForm.vehicle || ''} onChange={(e) => setFuelForm({ ...fuelForm, vehicle: Number(e.target.value) })}>
                  {vehicles.map(v => <option key={v.id} value={v.id}>{v.immatriculation} {v.marque} {v.modele}</option>)}
                </Select></FormControl>
              <FormControl><FormLabel>Date</FormLabel>
                <Input type="date" value={fuelForm.date || ''} onChange={(e) => setFuelForm({ ...fuelForm, date: e.target.value })} /></FormControl>
              <Flex gap={3}>
                <FormControl><FormLabel>Volume (L)</FormLabel>
                  <Input type="number" value={fuelForm.volume_liters || ''} onChange={(e) => setFuelForm({ ...fuelForm, volume_liters: e.target.value })} /></FormControl>
                <FormControl><FormLabel>Coût</FormLabel>
                  <Input type="number" value={fuelForm.cost || ''} onChange={(e) => setFuelForm({ ...fuelForm, cost: e.target.value })} /></FormControl>
              </Flex>
              <FormControl><FormLabel>{t('parc.fuel.station')}</FormLabel>
                <Input value={fuelForm.station || ''} onChange={(e) => setFuelForm({ ...fuelForm, station: e.target.value })} /></FormControl>
              <FormControl><FormLabel>{t('parc.fuel.odometer')}</FormLabel>
                <Input type="number" value={fuelForm.odometer_km || ''} onChange={(e) => setFuelForm({ ...fuelForm, odometer_km: e.target.value || null })} /></FormControl>
            </VStack>
          </DrawerBody>
          <DrawerFooter>
            <Button variant="ghost" mr={3} onClick={() => setFuelOpen(false)}>{t('common.cancel')}</Button>
            <Button colorScheme="blue" onClick={addFuel}>{t('common.save')}</Button>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>

      {/* Formulaire relevé */}
      <Drawer isOpen={odoOpen} onClose={() => setOdoOpen(false)} size="md">
        <DrawerOverlay /><DrawerContent>
          <DrawerCloseButton />
          <DrawerHeader>{t('parc.fuel.newReading')}</DrawerHeader>
          <DrawerBody>
            <VStack spacing={3} align="stretch">
              <FormControl><FormLabel>{t('parc.vehicles.title')}</FormLabel>
                <Select value={odoForm.vehicle || ''} onChange={(e) => setOdoForm({ ...odoForm, vehicle: Number(e.target.value) })}>
                  {vehicles.map(v => <option key={v.id} value={v.id}>{v.immatriculation} {v.marque} {v.modele}</option>)}
                </Select></FormControl>
              <FormControl><FormLabel>Km</FormLabel>
                <Input type="number" value={odoForm.odometer_km || ''} onChange={(e) => setOdoForm({ ...odoForm, odometer_km: e.target.value })} /></FormControl>
              <FormControl><FormLabel>Date</FormLabel>
                <Input type="date" value={odoForm.recorded_date || ''} onChange={(e) => setOdoForm({ ...odoForm, recorded_date: e.target.value || null })} /></FormControl>
            </VStack>
          </DrawerBody>
          <DrawerFooter>
            <Button variant="ghost" mr={3} onClick={() => setOdoOpen(false)}>{t('common.cancel')}</Button>
            <Button colorScheme="teal" onClick={addReading}>{t('common.save')}</Button>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    </Box>
  );
};

export default Fuel;
