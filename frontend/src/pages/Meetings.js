import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Box, Heading, Button, HStack, VStack, Text, Badge, Icon,
  SimpleGrid, IconButton,
  useToast, useColorModeValue, Spinner,
  Input, Select, InputGroup, InputLeftElement,
  Menu, MenuButton, MenuList, MenuItem,
  Flex, Tooltip,
  AlertDialog, AlertDialogOverlay, AlertDialogContent,
  AlertDialogHeader, AlertDialogBody, AlertDialogFooter,
  useDisclosure, Stat, StatLabel, StatNumber, Card, CardBody,
} from '@chakra-ui/react';
import {
  FiPlus, FiSearch, FiMoreVertical, FiCalendar, FiMic,
  FiFileText, FiTrash2, FiEye, FiCpu, FiEdit2, FiUsers,
  FiPlay, FiCheck, FiXCircle, FiClock, FiVideo, FiFilter,
  FiChevronUp, FiChevronDown, FiAlertCircle,
} from 'react-icons/fi';
import { useMeetingService } from '../services/meetingService';
import EmptyState from '../components/EmptyState';
import PageGuide from '../components/PageGuide';

const MEETINGS_STEPS = [
  { key: 'overview', icon: FiCalendar },
  { key: 'create', icon: FiVideo },
  { key: 'join', icon: FiUsers },
];

const inputTypeConfig = {
  audio: { icon: FiMic, label: 'Audio' },
  text: { icon: FiFileText, label: 'Text' },
  both: { icon: FiCpu, label: 'Audio + Text' },
};

const Meetings = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [meetings, setMeetings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [sortKey, setSortKey] = useState('date');
  const [sortDir, setSortDir] = useState('asc');
  const [updatingId, setUpdatingId] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const { getMeetings, deleteMeeting, updateMeeting } = useMeetingService();
  const toast = useToast();
  const bgColor = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.600');
  const { isOpen, onOpen, onClose } = useDisclosure();
  const cancelRef = useRef();

  const statusConfig = {
    scheduled: { color: 'blue', label: t('meetings.scheduled'), icon: FiClock },
    in_progress: { color: 'orange', label: t('meetings.inProgress'), icon: FiPlay },
    completed: { color: 'green', label: t('meetings.completed'), icon: FiCheck },
    cancelled: { color: 'red', label: t('meetings.cancelled'), icon: FiXCircle },
  };

  useEffect(() => {
    loadMeetings();
  }, []);
  const loadMeetings = async () => {
    setLoading(true);
    try {
      const data = await getMeetings();
      setMeetings(Array.isArray(data) ? data : data.results || []);
    } catch (error) {
      toast({ title: t('meetings.loadError'), status: 'error', duration: 3000 });
    } finally {
      setLoading(false);
    }
  };

  const confirmDelete = (id) => {
    setDeleteId(id);
    onOpen();
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await deleteMeeting(deleteId);
      setMeetings(meetings.filter(m => m.id !== deleteId));
      toast({ title: t('meetings.deletedSuccess'), status: 'success', duration: 2000 });
    } catch (error) {
      toast({ title: t('meetings.deleteError'), status: 'error', duration: 3000 });
    } finally {
      onClose();
      setDeleteId(null);
    }
  };

  const handleStatusChange = async (meeting, newStatus) => {
    if (newStatus === meeting.status) return;
    setUpdatingId(meeting.id);
    try {
      await updateMeeting(meeting.id, { status: newStatus });
      setMeetings(prev => prev.map(m => m.id === meeting.id ? { ...m, status: newStatus } : m));
      toast({ title: t('meetings.updatedSuccess'), status: 'success', duration: 2000 });
    } catch (error) {
      toast({ title: t('meetings.updateError'), status: 'error', duration: 3000 });
    } finally {
      setUpdatingId(null);
    }
  };

  const stats = {
    total: meetings.length,
    scheduled: meetings.filter(m => m.status === 'scheduled').length,
    in_progress: meetings.filter(m => m.status === 'in_progress').length,
    completed: meetings.filter(m => m.status === 'completed').length,
    cancelled: meetings.filter(m => m.status === 'cancelled').length,
  };

  const statCards = [
    {
      label: t('meetings.allStatuses'),
      value: stats.total,
      color: undefined,
      icon: FiCalendar,
      active: !statusFilter,
      onClick: () => setStatusFilter(''),
    },
    {
      label: t('meetings.scheduled'),
      value: stats.scheduled,
      color: 'blue.500',
      icon: FiClock,
      active: statusFilter === 'scheduled',
      onClick: () => setStatusFilter('scheduled'),
    },
    {
      label: t('meetings.inProgress'),
      value: stats.in_progress,
      color: 'orange.500',
      icon: FiPlay,
      active: statusFilter === 'in_progress',
      onClick: () => setStatusFilter('in_progress'),
    },
    {
      label: t('meetings.completed'),
      value: stats.completed,
      color: 'green.500',
      icon: FiCheck,
      active: statusFilter === 'completed',
      onClick: () => setStatusFilter('completed'),
    },
    {
      label: t('meetings.cancelled'),
      value: stats.cancelled,
      color: 'red.500',
      icon: FiXCircle,
      active: statusFilter === 'cancelled',
      onClick: () => setStatusFilter('cancelled'),
    },
  ];

  const hasActiveFilters = Boolean(statusFilter || search.trim());

  const clearFilters = () => {
    setStatusFilter('');
    setSearch('');
  };

  const filtered = useMemo(() => {
    let list = meetings;
    if (statusFilter) list = list.filter(m => m.status === statusFilter);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(m =>
        (m.title || '').toLowerCase().includes(q) ||
        (m.description || '').toLowerCase().includes(q) ||
        (m.project_name || '').toLowerCase().includes(q)
      );
    }
    const sorted = [...list].sort((a, b) => {
      let cmp = 0;
      if (sortKey === 'title') {
        cmp = (a.title || '').localeCompare(b.title || '');
      } else {
        cmp = new Date(a.scheduled_at || 0) - new Date(b.scheduled_at || 0);
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return sorted;
  }, [meetings, statusFilter, search, sortKey, sortDir]);

  const locale = i18n.language === 'fr' ? 'fr-FR' : 'en-US';

  const formatDate = (dateStr) => {
    if (!dateStr) return null;
    return new Date(dateStr).toLocaleDateString(locale, {
      month: 'short', day: 'numeric', year: 'numeric',
    });
  };

  const formatTime = (dateStr) => {
    if (!dateStr) return null;
    return new Date(dateStr).toLocaleTimeString(locale, {
      hour: '2-digit', minute: '2-digit',
    });
  };

  const isPast = (meeting) =>
    meeting.status === 'scheduled' && meeting.scheduled_at && new Date(meeting.scheduled_at) < new Date();

  return (
    <Box>
      <Flex justify="space-between" align="center" mb={6} wrap="wrap" gap={3}>
        <Heading size="lg">{t('meetings.title')}</Heading>
        <Button
          as={RouterLink}
          to="/meetings/create"
          leftIcon={<FiPlus />}
          colorScheme="blue"
        >
          {t('meetings.newMeeting')}
        </Button>
      </Flex>

      {/* Statistiques cliquables */}
      <SimpleGrid columns={{ base: 2, md: 5 }} spacing={4} mb={6}>
        {statCards.map(card => (
          <Card
            key={card.label}
            onClick={card.onClick}
            cursor="pointer"
            borderWidth={card.active ? '2px' : '1px'}
            borderColor={card.active ? 'blue.400' : 'transparent'}
            bg={card.active ? 'blue.50' : undefined}
            _hover={{ shadow: 'md', transform: 'translateY(-2px)' }}
            transition="all 0.2s"
          >
            <CardBody>
              <Stat>
                <StatLabel>{card.label}</StatLabel>
                <StatNumber color={card.color}>{card.value}</StatNumber>
              </Stat>
            </CardBody>
          </Card>
        ))}
      </SimpleGrid>

      {/* Filtres et tri */}
      <HStack mb={6} spacing={3} flexWrap="wrap">
        <InputGroup maxW="260px">
          <InputLeftElement><Icon as={FiSearch} color="gray.400" /></InputLeftElement>
          <Input
            placeholder={t('meetings.searchPlaceholder')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            bg={bgColor}
          />
        </InputGroup>
        <Select
          maxW="180px"
          placeholder={t('meetings.allStatuses')}
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          bg={bgColor}
        >
          <option value="scheduled">{t('meetings.scheduled')}</option>
          <option value="in_progress">{t('meetings.inProgress')}</option>
          <option value="completed">{t('meetings.completed')}</option>
          <option value="cancelled">{t('meetings.cancelled')}</option>
        </Select>
        <Select
          maxW="150px"
          value={sortKey}
          onChange={(e) => setSortKey(e.target.value)}
          bg={bgColor}
        >
          <option value="date">Date</option>
          <option value="title">Titre</option>
        </Select>
        <IconButton
          size="sm"
          variant="outline"
          icon={sortDir === 'asc' ? <FiChevronUp /> : <FiChevronDown />}
          onClick={() => setSortDir(sortDir === 'asc' ? 'desc' : 'asc')}
          aria-label="Sort direction"
        />
        {hasActiveFilters && (
          <Button size="sm" variant="ghost" leftIcon={<FiFilter />} onClick={clearFilters}>
            {t('common.clear')} ({filtered.length}/{meetings.length})
          </Button>
        )}
      </HStack>

      {loading ? (
        <Box textAlign="center" py={10}><Spinner size="xl" /></Box>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={FiCalendar}
          message={t('meetings.notFound')}
          description={t('meetings.emptyDescription')}
          actionLabel={hasActiveFilters ? t('common.clear') : t('meetings.createMeeting')}
          onAction={hasActiveFilters ? clearFilters : undefined}
          actionTo={hasActiveFilters ? undefined : '/meetings/create'}
          secondaryLabel={hasActiveFilters ? t('meetings.createMeeting') : undefined}
          secondaryTo={hasActiveFilters ? '/meetings/create' : undefined}
        />
      ) : (
        <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={4}>
          {filtered.map(meeting => {
            const status = statusConfig[meeting.status] || statusConfig.scheduled;
            const inputType = inputTypeConfig[meeting.input_type] || inputTypeConfig.text;
            const past = isPast(meeting);
            return (
              <Box
                key={meeting.id}
                bg={bgColor}
                borderRadius="xl"
                borderWidth="1px"
                borderColor={borderColor}
                overflow="hidden"
                cursor="pointer"
                transition="all 0.2s"
                onClick={() => navigate(`/meetings/${meeting.id}`)}
                _hover={{ shadow: 'md', borderColor: 'blue.300', transform: 'translateY(-2px)' }}
              >
                <Box h="4px" bg={`${status.color}.400`} />
                <Box p={5}>
                  <Flex justify="space-between" align="flex-start" mb={3}>
                    <VStack align="start" spacing={1} flex={1} mr={2}>
                      <Heading size="sm" noOfLines={1} _hover={{ color: 'blue.500' }}>
                        {meeting.title}
                      </Heading>
                      {meeting.project_name && (
                        <Tooltip label={t('meetings.viewDetails')}>
                          <Badge
                            as={RouterLink}
                            to={`/projects/${meeting.project}`}
                            colorScheme="purple"
                            variant="subtle"
                            fontSize="xs"
                            onClick={(e) => e.stopPropagation()}
                            _hover={{ textDecoration: 'underline' }}
                          >
                            {meeting.project_name}
                          </Badge>
                        </Tooltip>
                      )}
                    </VStack>
                    <Menu>
                      <MenuButton
                        as={IconButton}
                        icon={<FiMoreVertical />}
                        variant="ghost"
                        size="sm"
                        aria-label="Meeting actions"
                        onClick={(e) => e.stopPropagation()}
                      />
                      <MenuList onClick={(e) => e.stopPropagation()}>
                        <MenuItem as={RouterLink} to={`/meetings/${meeting.id}`} icon={<FiEye />}>
                          {t('meetings.viewDetails')}
                        </MenuItem>
                        <MenuItem as={RouterLink} to={`/meetings/${meeting.id}/edit`} icon={<FiEdit2 />}>
                          {t('common.edit')}
                        </MenuItem>
                        <MenuItem icon={<FiTrash2 />} color="red.500" onClick={() => confirmDelete(meeting.id)}>
                          {t('common.delete')}
                        </MenuItem>
                      </MenuList>
                    </Menu>
                  </Flex>

                  <HStack spacing={2} mb={4} flexWrap="wrap">
                    <Select
                      size="xs"
                      variant="filled"
                      width="auto"
                      value={meeting.status}
                      colorScheme={status.color}
                      isLoading={updatingId === meeting.id}
                      onClick={(e) => e.stopPropagation()}
                      onChange={(e) => handleStatusChange(meeting, e.target.value)}
                    >
                      <option value="scheduled">{t('meetings.scheduled')}</option>
                      <option value="in_progress">{t('meetings.inProgress')}</option>
                      <option value="completed">{t('meetings.completed')}</option>
                      <option value="cancelled">{t('meetings.cancelled')}</option>
                    </Select>
                    <Tooltip label={inputType.label}>
                      <Badge variant="outline" display="flex" alignItems="center" gap={1}>
                        <Icon as={inputType.icon} boxSize={3} />
                        {inputType.label}
                      </Badge>
                    </Tooltip>
                    {meeting.ai_processed && (
                      <Badge colorScheme="green" variant="subtle">
                        {t('meetings.aiProcessed')}
                      </Badge>
                    )}
                    {past && (
                      <Tooltip label={t('meetings.scheduled')}>
                        <Badge colorScheme="red" variant="subtle" display="flex" alignItems="center" gap={1}>
                          <Icon as={FiAlertCircle} boxSize={3} />
                          {t('common.overdue')}
                        </Badge>
                      </Tooltip>
                    )}
                  </HStack>

                  <VStack spacing={2} align="stretch">
                    {meeting.scheduled_at && (
                      <HStack fontSize="sm" color={past ? 'red.500' : 'gray.500'}>
                        <Icon as={FiCalendar} boxSize={4} />
                        <Text>{formatDate(meeting.scheduled_at)}</Text>
                        <Text>{formatTime(meeting.scheduled_at)}</Text>
                      </HStack>
                    )}
                    <HStack fontSize="sm" color="gray.500">
                      <Icon as={FiUsers} boxSize={4} />
                      <Text>{meeting.participants_count || 0} {t('meetings.participants')}</Text>
                    </HStack>
                  </VStack>

                  <Flex mt={4} pt={3} borderTopWidth="1px" borderColor={borderColor} justify="space-between" align="center">
                    <Button
                      as={RouterLink}
                      to={`/meetings/${meeting.id}`}
                      size="sm"
                      variant="ghost"
                      colorScheme="blue"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {t('meetings.viewDetails')}
                    </Button>
                    <HStack spacing={1}>
                      {(meeting.status === 'scheduled' || meeting.status === 'in_progress') && (
                        <Tooltip label={t('meetings.joinVideo')}>
                          <IconButton
                            as={RouterLink}
                            to={`/meetings/${meeting.id}/video`}
                            icon={<FiVideo />}
                            size="sm"
                            variant="ghost"
                            colorScheme="green"
                            aria-label={t('meetings.joinVideo')}
                            onClick={(e) => e.stopPropagation()}
                          />
                        </Tooltip>
                      )}
                      {!meeting.ai_processed && (
                        <Tooltip label={t('meetings.processAI')}>
                          <IconButton
                            as={RouterLink}
                            to={`/meetings/${meeting.id}`}
                            icon={<FiCpu />}
                            size="sm"
                            variant="ghost"
                            colorScheme="purple"
                            aria-label={t('meetings.processAI')}
                            onClick={(e) => e.stopPropagation()}
                          />
                        </Tooltip>
                      )}
                    </HStack>
                  </Flex>
                </Box>
              </Box>
            );
          })}
        </SimpleGrid>
      )}

      <AlertDialog isOpen={isOpen} leastDestructiveRef={cancelRef} onClose={onClose}>
        <AlertDialogOverlay>
          <AlertDialogContent>
            <AlertDialogHeader fontSize="lg" fontWeight="bold">
              {t('meetings.deleteConfirm')}
            </AlertDialogHeader>
            <AlertDialogBody>
              {t('common.confirmDelete')}? {t('common.irreversible')}
            </AlertDialogBody>
            <AlertDialogFooter>
              <Button ref={cancelRef} onClick={onClose}>{t('common.cancel')}</Button>
              <Button colorScheme="red" onClick={handleDelete} ml={3}>{t('common.delete')}</Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialogOverlay>
      </AlertDialog>
      <PageGuide
        guideId="meetings"
        i18nPrefix="pageGuides.meetings"
        steps={MEETINGS_STEPS}
      />
    </Box>
  );
};

export default Meetings;
