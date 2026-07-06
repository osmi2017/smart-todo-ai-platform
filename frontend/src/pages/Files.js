import React, { useState, useRef } from 'react';
import {
  Box, Heading, Button, Table, Thead, Tbody, Tr, Th, Td, Badge,
  useDisclosure, Modal, ModalOverlay, ModalContent, ModalHeader,
  ModalBody, ModalFooter, ModalCloseButton, FormControl, FormLabel,
  Input, Textarea, useToast, IconButton, HStack, VStack, Spinner,
  Alert, AlertIcon, AlertTitle, AlertDescription, Progress, Text,
  Select, Checkbox, Tag, TagLabel, TagCloseButton, Wrap, WrapItem,
  Tooltip, Menu, MenuButton, MenuList, MenuItem, Flex, Spacer,
  InputGroup, InputLeftElement,
} from '@chakra-ui/react';
import {
  FiPlus, FiEdit2, FiTrash2, FiDownload, FiShare2, FiEye,
  FiFile, FiImage, FiVideo, FiFileText, FiSearch, FiMoreVertical,
  FiUpload, FiX,
} from 'react-icons/fi';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { useAuth } from '../context/AuthContext';

const Files = () => {
  const toast = useToast();
  const queryClient = useQueryClient();
  const { axiosInstance, user, isAdmin, isSuperAdmin } = useAuth();
  const fileInputRef = useRef(null);

  const { isOpen: isUploadOpen, onOpen: onUploadOpen, onClose: onUploadClose } = useDisclosure();
  const { isOpen: isShareOpen, onOpen: onShareOpen, onClose: onShareClose } = useDisclosure();
  const { isOpen: isPreviewOpen, onOpen: onPreviewOpen, onClose: onPreviewClose } = useDisclosure();
  const { isOpen: isEditOpen, onOpen: onEditOpen, onClose: onEditClose } = useDisclosure();

  const [selectedFile, setSelectedFile] = useState(null);
  const [uploadFile, setUploadFile] = useState(null);
  const [uploadForm, setUploadForm] = useState({ name: '', description: '' });
  const [uploading, setUploading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [editForm, setEditForm] = useState({ name: '', description: '' });

  // Share form
  const [shareType, setShareType] = useState('user');
  const [shareUserId, setShareUserId] = useState('');
  const [shareGroupId, setShareGroupId] = useState('');
  const [shareCanEdit, setShareCanEdit] = useState(false);
  const [shareCanDelete, setShareCanDelete] = useState(false);

  // Fetch files
  const { data: filesData = [], isLoading: filesLoading } = useQuery(
    ['files', searchQuery],
    async () => {
      const params = {};
      if (searchQuery) params.search = searchQuery;
      const res = await axiosInstance.get('/files/', { params });
      return res.data;
    },
  );

  // Fetch storage info
  const { data: storageInfo } = useQuery(
    'storage-info',
    async () => {
      const res = await axiosInstance.get('/files/storage_info/');
      return res.data;
    },
  );

  // Fetch users for sharing
  const { data: usersData = [] } = useQuery('managed-users', async () => {
    const res = await axiosInstance.get('/users/');
    return res.data;
  });

  // Fetch groups for sharing
  const { data: groupsData = [] } = useQuery('groups', async () => {
    const res = await axiosInstance.get('/groups/');
    return res.data;
  });

  // Fetch storage notifications
  const { data: notificationsData = [] } = useQuery(
    'storage-notifications',
    async () => {
      if (!isAdmin) return [];
      const res = await axiosInstance.get('/storage-notifications/');
      return res.data;
    },
    { enabled: isAdmin },
  );

  const files = Array.isArray(filesData) ? filesData : filesData.results || [];
  const users = Array.isArray(usersData) ? usersData : usersData.results || [];
  const groups = Array.isArray(groupsData) ? groupsData : groupsData.results || [];
  const notifications = Array.isArray(notificationsData) ? notificationsData : notificationsData.results || [];
  const unreadNotifications = notifications.filter(n => !n.is_read);

  // Delete mutation
  const deleteMutation = useMutation(
    async (id) => {
      await axiosInstance.delete(`/files/${id}/`);
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries('files');
        queryClient.invalidateQueries('storage-info');
        toast({ title: 'Fichier supprime', status: 'info', duration: 3000 });
      },
      onError: (err) => {
        toast({
          title: 'Erreur',
          description: err.response?.data?.detail || err.response?.data?.error || 'Impossible de supprimer',
          status: 'error',
          duration: 3000,
        });
      },
    },
  );

  // Update mutation
  const updateMutation = useMutation(
    async ({ id, data }) => {
      const res = await axiosInstance.patch(`/files/${id}/`, data);
      return res.data;
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries('files');
        toast({ title: 'Fichier mis a jour', status: 'success', duration: 3000 });
        handleEditClose();
      },
      onError: (err) => {
        toast({
          title: 'Erreur',
          description: JSON.stringify(err.response?.data || 'Erreur'),
          status: 'error',
          duration: 3000,
        });
      },
    },
  );

  const handleUpload = async () => {
    if (!uploadFile) {
      toast({ title: 'Veuillez selectionner un fichier', status: 'warning', duration: 3000 });
      return;
    }

    setUploading(true);
    const formData = new FormData();
    formData.append('file', uploadFile);
    formData.append('name', uploadForm.name || uploadFile.name);
    if (uploadForm.description) formData.append('description', uploadForm.description);

    try {
      await axiosInstance.post('/files/', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      queryClient.invalidateQueries('files');
      queryClient.invalidateQueries('storage-info');
      toast({ title: 'Fichier uploade avec succes', status: 'success', duration: 3000 });
      handleUploadClose();
    } catch (err) {
      const errorData = err.response?.data;
      if (err.response?.status === 413) {
        toast({
          title: 'Quota de stockage depasse',
          description: errorData?.error || 'Impossible d\'uploader ce fichier. Quota atteint.',
          status: 'error',
          duration: 6000,
          isClosable: true,
        });
      } else {
        toast({
          title: 'Erreur d\'upload',
          description: errorData?.error || 'Une erreur est survenue',
          status: 'error',
          duration: 3000,
        });
      }
    } finally {
      setUploading(false);
    }
  };

  const handleUploadClose = () => {
    setUploadFile(null);
    setUploadForm({ name: '', description: '' });
    onUploadClose();
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      setUploadFile(file);
      if (!uploadForm.name) {
        setUploadForm({ ...uploadForm, name: file.name });
      }
    }
  };

  const handleShare = async () => {
    if (!selectedFile) return;
    const data = {
      can_edit: shareCanEdit,
      can_delete: shareCanDelete,
    };
    if (shareType === 'user' && shareUserId) {
      data.shared_with_user = parseInt(shareUserId);
    } else if (shareType === 'group' && shareGroupId) {
      data.shared_with_group = parseInt(shareGroupId);
    } else {
      toast({ title: 'Selectionnez un destinataire', status: 'warning', duration: 3000 });
      return;
    }

    try {
      await axiosInstance.post(`/files/${selectedFile.id}/share/`, data);
      queryClient.invalidateQueries('files');
      toast({ title: 'Fichier partage', status: 'success', duration: 3000 });
      handleShareClose();
    } catch (err) {
      toast({
        title: 'Erreur',
        description: err.response?.data?.error || 'Erreur de partage',
        status: 'error',
        duration: 3000,
      });
    }
  };

  const handleUnshare = async (shareId) => {
    if (!selectedFile) return;
    try {
      await axiosInstance.post(`/files/${selectedFile.id}/unshare/`, { share_id: shareId });
      queryClient.invalidateQueries('files');
      // Refresh the file detail to update shares list
      const res = await axiosInstance.get(`/files/${selectedFile.id}/`);
      setSelectedFile(res.data);
      toast({ title: 'Partage supprime', status: 'info', duration: 2000 });
    } catch (err) {
      toast({ title: 'Erreur', status: 'error', duration: 2000 });
    }
  };

  const handleShareClose = () => {
    setShareUserId('');
    setShareGroupId('');
    setShareCanEdit(false);
    setShareCanDelete(false);
    setShareType('user');
    onShareClose();
  };

  const handleOpenShare = async (file) => {
    try {
      const res = await axiosInstance.get(`/files/${file.id}/`);
      setSelectedFile(res.data);
    } catch {
      setSelectedFile(file);
    }
    onShareOpen();
  };

  const handlePreview = (file) => {
    setSelectedFile(file);
    onPreviewOpen();
  };

  const handleDownload = async (file) => {
    try {
      const res = await axiosInstance.get(`/files/${file.id}/download/`, {
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', file.name);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      toast({ title: 'Erreur de telechargement', status: 'error', duration: 3000 });
    }
  };

  const handleEditOpen = (file) => {
    setSelectedFile(file);
    setEditForm({ name: file.name, description: file.description || '' });
    onEditOpen();
  };

  const handleEditClose = () => {
    setSelectedFile(null);
    setEditForm({ name: '', description: '' });
    onEditClose();
  };

  const handleEditSubmit = () => {
    if (!selectedFile) return;
    updateMutation.mutate({ id: selectedFile.id, data: editForm });
  };

  const handleMarkNotificationRead = async (id) => {
    try {
      await axiosInstance.patch(`/storage-notifications/${id}/mark_read/`);
      queryClient.invalidateQueries('storage-notifications');
    } catch {
      // silent
    }
  };

  const getFileIcon = (mimeType) => {
    if (!mimeType) return FiFile;
    if (mimeType.startsWith('image/')) return FiImage;
    if (mimeType.startsWith('video/')) return FiVideo;
    if (mimeType === 'application/pdf') return FiFileText;
    return FiFile;
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'Ko', 'Mo', 'Go', 'To'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getPreviewUrl = (file) => {
    const apiUrl = axiosInstance.defaults.baseURL || 'http://localhost:8000/api';
    return `${apiUrl}/files/${file.id}/preview/`;
  };

  if (filesLoading) return <Box p={8}><Spinner size="xl" /></Box>;

  return (
    <Box p={8}>
      {/* Storage notifications */}
      {unreadNotifications.length > 0 && (
        <VStack spacing={2} mb={4} align="stretch">
          {unreadNotifications.map((n) => (
            <Alert
              key={n.id}
              status={n.notification_type === 'quota_reached' ? 'error' : 'warning'}
              borderRadius="md"
            >
              <AlertIcon />
              <Box flex={1}>
                <AlertTitle fontSize="sm">
                  {n.notification_type === 'quota_reached' ? 'Quota atteint' : 'Avertissement stockage'}
                </AlertTitle>
                <AlertDescription fontSize="sm">{n.message}</AlertDescription>
              </Box>
              <IconButton
                size="xs"
                icon={<FiX />}
                onClick={() => handleMarkNotificationRead(n.id)}
                aria-label="Fermer"
                variant="ghost"
              />
            </Alert>
          ))}
        </VStack>
      )}

      {/* Header */}
      <Flex mb={6} align="center" wrap="wrap" gap={4}>
        <Heading size="lg">Fichiers</Heading>
        <Spacer />

        {/* Storage usage bar */}
        {storageInfo && storageInfo.storage_tier !== 'unlimited' && (
          <Box minW="200px" maxW="300px">
            <HStack justify="space-between" mb={1}>
              <Text fontSize="xs" color="gray.500">Stockage</Text>
              <Text fontSize="xs" color="gray.500">
                {formatFileSize(storageInfo.storage_used)} / {formatFileSize(storageInfo.storage_limit_bytes)}
              </Text>
            </HStack>
            <Progress
              value={storageInfo.storage_percent_used}
              size="sm"
              borderRadius="full"
              colorScheme={
                storageInfo.storage_percent_used >= 90 ? 'red' :
                storageInfo.storage_percent_used >= 80 ? 'orange' : 'blue'
              }
            />
          </Box>
        )}
        {storageInfo && storageInfo.storage_tier === 'unlimited' && (
          <Badge colorScheme="green" fontSize="sm" px={3} py={1}>
            Stockage illimite ({formatFileSize(storageInfo.storage_used)} utilise)
          </Badge>
        )}

        <Button leftIcon={<FiUpload />} colorScheme="blue" onClick={onUploadOpen}>
          Uploader un fichier
        </Button>
      </Flex>

      {/* Search */}
      <InputGroup mb={4} maxW="400px">
        <InputLeftElement pointerEvents="none">
          <FiSearch color="gray.300" />
        </InputLeftElement>
        <Input
          placeholder="Rechercher des fichiers..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </InputGroup>

      {/* Files table */}
      {files.length === 0 ? (
        <Alert status="info" borderRadius="md">
          <AlertIcon />
          Aucun fichier. Cliquez sur "Uploader un fichier" pour commencer.
        </Alert>
      ) : (
        <Table variant="simple">
          <Thead>
            <Tr>
              <Th>Nom</Th>
              <Th>Type</Th>
              <Th>Taille</Th>
              <Th>Uploade par</Th>
              <Th>Partages</Th>
              <Th>Date</Th>
              <Th>Actions</Th>
            </Tr>
          </Thead>
          <Tbody>
            {files.map((file) => {
              const FileIcon = getFileIcon(file.mime_type);
              const perms = file.user_permissions || {};
              return (
                <Tr key={file.id}>
                  <Td>
                    <HStack>
                      <FileIcon />
                      <Text fontWeight="600">{file.name}</Text>
                    </HStack>
                  </Td>
                  <Td>
                    <Badge colorScheme="gray" fontSize="xs">
                      {file.mime_type?.split('/').pop() || 'inconnu'}
                    </Badge>
                  </Td>
                  <Td>{formatFileSize(file.size_bytes)}</Td>
                  <Td>{file.uploaded_by_name}</Td>
                  <Td>
                    <Badge colorScheme="blue">{file.shares_count || 0}</Badge>
                  </Td>
                  <Td fontSize="sm" color="gray.500">
                    {new Date(file.created_at).toLocaleDateString('fr-FR')}
                  </Td>
                  <Td>
                    <HStack spacing={1}>
                      {file.is_previewable && (
                        <Tooltip label="Previsualiser">
                          <IconButton
                            size="sm"
                            icon={<FiEye />}
                            onClick={() => handlePreview(file)}
                            aria-label="Previsualiser"
                            variant="ghost"
                          />
                        </Tooltip>
                      )}
                      <Tooltip label="Telecharger">
                        <IconButton
                          size="sm"
                          icon={<FiDownload />}
                          onClick={() => handleDownload(file)}
                          aria-label="Telecharger"
                          variant="ghost"
                        />
                      </Tooltip>
                      {(perms.is_owner || isAdmin) && (
                        <Tooltip label="Partager">
                          <IconButton
                            size="sm"
                            icon={<FiShare2 />}
                            onClick={() => handleOpenShare(file)}
                            aria-label="Partager"
                            variant="ghost"
                            colorScheme="blue"
                          />
                        </Tooltip>
                      )}
                      {perms.can_edit && (
                        <Tooltip label="Modifier">
                          <IconButton
                            size="sm"
                            icon={<FiEdit2 />}
                            onClick={() => handleEditOpen(file)}
                            aria-label="Modifier"
                            variant="ghost"
                          />
                        </Tooltip>
                      )}
                      {perms.can_delete && (
                        <Tooltip label="Supprimer">
                          <IconButton
                            size="sm"
                            icon={<FiTrash2 />}
                            onClick={() => deleteMutation.mutate(file.id)}
                            aria-label="Supprimer"
                            variant="ghost"
                            colorScheme="red"
                          />
                        </Tooltip>
                      )}
                    </HStack>
                  </Td>
                </Tr>
              );
            })}
          </Tbody>
        </Table>
      )}

      {/* Upload Modal */}
      <Modal isOpen={isUploadOpen} onClose={handleUploadClose} size="lg">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Uploader un fichier</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            {storageInfo && storageInfo.storage_tier !== 'unlimited' && (
              <Alert
                status={storageInfo.storage_percent_used >= 90 ? 'error' : storageInfo.storage_percent_used >= 80 ? 'warning' : 'info'}
                mb={4}
                borderRadius="md"
                fontSize="sm"
              >
                <AlertIcon />
                <Text>
                  Stockage: {formatFileSize(storageInfo.storage_used)} / {formatFileSize(storageInfo.storage_limit_bytes)}
                  {' '}({storageInfo.storage_percent_used}%)
                </Text>
              </Alert>
            )}

            <FormControl mb={4}>
              <FormLabel>Fichier</FormLabel>
              <Input
                type="file"
                ref={fileInputRef}
                onChange={handleFileSelect}
                pt={1}
              />
              {uploadFile && (
                <Text fontSize="sm" color="gray.500" mt={1}>
                  {uploadFile.name} - {formatFileSize(uploadFile.size)}
                </Text>
              )}
            </FormControl>
            <FormControl mb={4}>
              <FormLabel>Nom</FormLabel>
              <Input
                value={uploadForm.name}
                onChange={(e) => setUploadForm({ ...uploadForm, name: e.target.value })}
                placeholder="Nom du fichier"
              />
            </FormControl>
            <FormControl mb={4}>
              <FormLabel>Description</FormLabel>
              <Textarea
                value={uploadForm.description}
                onChange={(e) => setUploadForm({ ...uploadForm, description: e.target.value })}
                placeholder="Description optionnelle"
              />
            </FormControl>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={handleUploadClose}>Annuler</Button>
            <Button
              colorScheme="blue"
              onClick={handleUpload}
              isLoading={uploading}
              leftIcon={<FiUpload />}
            >
              Uploader
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Share Modal */}
      <Modal isOpen={isShareOpen} onClose={handleShareClose} size="lg">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Partager: {selectedFile?.name}</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            {/* Existing shares */}
            {selectedFile?.shares && selectedFile.shares.length > 0 && (
              <Box mb={4}>
                <Text fontWeight="600" mb={2}>Partages existants</Text>
                <VStack spacing={2} align="stretch">
                  {selectedFile.shares.map((share) => (
                    <HStack key={share.id} p={2} bg="gray.50" borderRadius="md" justify="space-between">
                      <Box>
                        <Text fontSize="sm" fontWeight="500">
                          {share.shared_with_user_name
                            ? `Utilisateur: ${share.shared_with_user_name} (${share.shared_with_user_email})`
                            : `Groupe: ${share.shared_with_group_name}`
                          }
                        </Text>
                        <HStack spacing={2} mt={1}>
                          <Badge colorScheme="green" fontSize="xs">Lecture</Badge>
                          {share.can_edit && <Badge colorScheme="orange" fontSize="xs">Modification</Badge>}
                          {share.can_delete && <Badge colorScheme="red" fontSize="xs">Suppression</Badge>}
                        </HStack>
                      </Box>
                      <IconButton
                        size="xs"
                        icon={<FiX />}
                        colorScheme="red"
                        variant="ghost"
                        onClick={() => handleUnshare(share.id)}
                        aria-label="Supprimer le partage"
                      />
                    </HStack>
                  ))}
                </VStack>
              </Box>
            )}

            <Text fontWeight="600" mb={2}>Nouveau partage</Text>
            <FormControl mb={4}>
              <FormLabel>Partager avec</FormLabel>
              <Select value={shareType} onChange={(e) => setShareType(e.target.value)}>
                <option value="user">Un utilisateur</option>
                <option value="group">Un groupe</option>
              </Select>
            </FormControl>

            {shareType === 'user' ? (
              <FormControl mb={4}>
                <FormLabel>Utilisateur</FormLabel>
                <Select
                  value={shareUserId}
                  onChange={(e) => setShareUserId(e.target.value)}
                  placeholder="Selectionner un utilisateur"
                >
                  {users
                    .filter((u) => u.id !== user?.id)
                    .map((u) => (
                      <option key={u.id} value={u.id}>{u.username} ({u.email})</option>
                    ))}
                </Select>
              </FormControl>
            ) : (
              <FormControl mb={4}>
                <FormLabel>Groupe</FormLabel>
                <Select
                  value={shareGroupId}
                  onChange={(e) => setShareGroupId(e.target.value)}
                  placeholder="Selectionner un groupe"
                >
                  {groups.map((g) => (
                    <option key={g.id} value={g.id}>{g.name}</option>
                  ))}
                </Select>
              </FormControl>
            )}

            <FormControl mb={2}>
              <Checkbox
                isChecked={shareCanEdit}
                onChange={(e) => setShareCanEdit(e.target.checked)}
              >
                Peut modifier le fichier
              </Checkbox>
            </FormControl>
            <FormControl mb={4}>
              <Checkbox
                isChecked={shareCanDelete}
                onChange={(e) => setShareCanDelete(e.target.checked)}
              >
                Peut supprimer le fichier
              </Checkbox>
            </FormControl>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={handleShareClose}>Fermer</Button>
            <Button colorScheme="blue" onClick={handleShare} leftIcon={<FiShare2 />}>
              Partager
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Preview Modal */}
      <Modal isOpen={isPreviewOpen} onClose={onPreviewClose} size="6xl">
        <ModalOverlay />
        <ModalContent maxH="90vh">
          <ModalHeader>{selectedFile?.name}</ModalHeader>
          <ModalCloseButton />
          <ModalBody overflow="auto" pb={6}>
            {selectedFile && <FilePreview file={selectedFile} getPreviewUrl={getPreviewUrl} axiosInstance={axiosInstance} />}
          </ModalBody>
        </ModalContent>
      </Modal>

      {/* Edit Modal */}
      <Modal isOpen={isEditOpen} onClose={handleEditClose}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Modifier le fichier</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <FormControl mb={4} isRequired>
              <FormLabel>Nom</FormLabel>
              <Input
                value={editForm.name}
                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
              />
            </FormControl>
            <FormControl mb={4}>
              <FormLabel>Description</FormLabel>
              <Textarea
                value={editForm.description}
                onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
              />
            </FormControl>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={handleEditClose}>Annuler</Button>
            <Button colorScheme="blue" onClick={handleEditSubmit} isLoading={updateMutation.isLoading}>
              Mettre a jour
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  );
};


const FilePreview = ({ file, getPreviewUrl, axiosInstance }) => {
  const [blobUrl, setBlobUrl] = React.useState(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    let cancelled = false;
    const fetchPreview = async () => {
      try {
        const res = await axiosInstance.get(`/files/${file.id}/preview/`, {
          responseType: 'blob',
        });
        if (!cancelled) {
          const url = window.URL.createObjectURL(new Blob([res.data], { type: file.mime_type }));
          setBlobUrl(url);
        }
      } catch {
        // ignore
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    fetchPreview();
    return () => {
      cancelled = true;
      if (blobUrl) window.URL.revokeObjectURL(blobUrl);
    };
  }, [file.id]);

  if (loading) {
    return <Box textAlign="center" py={10}><Spinner size="xl" /></Box>;
  }

  if (!blobUrl) {
    return (
      <Alert status="error" borderRadius="md">
        <AlertIcon />
        Impossible de charger la previsualisation.
      </Alert>
    );
  }

  if (file.mime_type?.startsWith('image/')) {
    return (
      <Box textAlign="center">
        <img
          src={blobUrl}
          alt={file.name}
          style={{ maxWidth: '100%', maxHeight: '70vh', objectFit: 'contain' }}
        />
      </Box>
    );
  }

  if (file.mime_type?.startsWith('video/')) {
    return (
      <Box textAlign="center">
        <video
          src={blobUrl}
          controls
          style={{ maxWidth: '100%', maxHeight: '70vh' }}
        >
          Votre navigateur ne supporte pas la lecture video.
        </video>
      </Box>
    );
  }

  if (file.mime_type === 'application/pdf') {
    return (
      <Box h="70vh">
        <iframe
          src={blobUrl}
          title={file.name}
          width="100%"
          height="100%"
          style={{ border: 'none' }}
        />
      </Box>
    );
  }

  return (
    <Alert status="info" borderRadius="md">
      <AlertIcon />
      Previsualisation non disponible pour ce type de fichier.
    </Alert>
  );
};


export default Files;
