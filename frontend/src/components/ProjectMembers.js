import React, { useState, useEffect } from 'react';
import {
  Box,
  Heading,
  VStack,
  HStack,
  Avatar,
  Text,
  Button,
  IconButton,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  useDisclosure,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  ModalCloseButton,
  FormControl,
  FormLabel,
  Input,
  useToast,
  Badge,
  Spinner,
  Divider,
  Tag,
  TagLabel,
  TagCloseButton,
  Wrap,
  WrapItem,
  Tooltip,
} from '@chakra-ui/react';
import {
  FiUserPlus,
  FiMoreVertical,
  FiMail,
  FiUser,
  FiTrash2,
  FiShield,
  FiSearch,
} from 'react-icons/fi';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { useMemberService } from '../services/memberService';
import { useAuth } from '../context/AuthContext';

const ProjectMembers = ({ projectId, projectOwnerId }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  
  const { isOpen, onOpen, onClose } = useDisclosure();
  const toast = useToast();
  const queryClient = useQueryClient();
  const memberService = useMemberService();
  const { user: currentUser } = useAuth();

  // Charger les membres
  const { data: members, isLoading } = useQuery(
    ['projectMembers', projectId],
    () => memberService.getProjectMembers(projectId),
    {
      enabled: !!projectId,
    }
  );

  // Mutation pour ajouter un membre
  const addMemberMutation = useMutation(
    (userData) => memberService.addMember(projectId, userData),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['projectMembers', projectId]);
        toast({
          title: 'Membre ajouté',
          description: 'Le membre a été ajouté au projet',
          status: 'success',
          duration: 3000,
        });
        setSearchTerm('');
        setSearchResults([]);
        onClose();
      },
      onError: (error) => {
        toast({
          title: 'Erreur',
          description: error.response?.data?.error || "Impossible d'ajouter le membre",
          status: 'error',
          duration: 3000,
        });
      },
    }
  );

  // Mutation pour retirer un membre
  const removeMemberMutation = useMutation(
    (userId) => memberService.removeMember(projectId, userId),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['projectMembers', projectId]);
        toast({
          title: 'Membre retiré',
          description: 'Le membre a été retiré du projet',
          status: 'info',
          duration: 3000,
        });
      },
    }
  );

  // Recherche d'utilisateurs
  useEffect(() => {
    const searchUsers = async () => {
      if (searchTerm.length < 2) {
        setSearchResults([]);
        return;
      }
      
      setIsSearching(true);
      const results = await memberService.searchAvailableUsers(projectId, searchTerm);
      setSearchResults(results);
      setIsSearching(false);
    };

    const debounce = setTimeout(searchUsers, 500);
    return () => clearTimeout(debounce);
  }, [searchTerm, projectId, memberService]);

  const handleAddMember = (user) => {
    addMemberMutation.mutate({ user_id: user.id });
  };

  const handleRemoveMember = (userId, username) => {
    if (window.confirm(`Voulez-vous vraiment retirer ${username} du projet ?`)) {
      removeMemberMutation.mutate(userId);
    }
  };

  // Vérifier si l'utilisateur courant est le propriétaire
  const isOwner = currentUser?.id === projectOwnerId;

  if (isLoading) {
    return <Spinner />;
  }

  return (
    <Box>
      <HStack justify="space-between" mb={4}>
        <Heading size="md">Membres ({members?.length || 0})</Heading>
        {isOwner && (
          <Button
            leftIcon={<FiUserPlus />}
            size="sm"
            colorScheme="blue"
            onClick={onOpen}
          >
            Inviter
          </Button>
        )}
      </HStack>

      {/* Liste des membres */}
      <VStack spacing={3} align="stretch">
        {/* Propriétaire */}
        <HStack justify="space-between" p={2} bg="yellow.50" borderRadius="md">
          <HStack spacing={3}>
            <Avatar size="sm" name="Propriétaire" />
            <Box>
              <HStack>
                <Text fontWeight="500">Propriétaire</Text>
                <Badge colorScheme="yellow">Owner</Badge>
              </HStack>
              <Text fontSize="sm" color="gray.500">Vous</Text>
            </Box>
          </HStack>
          <Tooltip label="Propriétaire du projet">
            <FiShield />
          </Tooltip>
        </HStack>

        {/* Membres */}
        {members?.map((member) => (
          <HStack key={member.id} justify="space-between" p={2} _hover={{ bg: 'gray.50' }} borderRadius="md">
            <HStack spacing={3}>
              <Avatar size="sm" name={member.username} src={member.avatar} />
              <Box>
                <Text fontWeight="500">{member.username}</Text>
                <Text fontSize="sm" color="gray.500">{member.email}</Text>
              </Box>
            </HStack>
            
            {isOwner && member.id !== currentUser?.id && (
              <Menu>
                <MenuButton
                  as={IconButton}
                  icon={<FiMoreVertical />}
                  variant="ghost"
                  size="sm"
                />
                <MenuList>
                  <MenuItem
                    icon={<FiMail />}
                    onClick={() => window.location.href = `mailto:${member.email}`}
                  >
                    Envoyer un email
                  </MenuItem>
                  <MenuItem
                    icon={<FiTrash2 />}
                    color="red.500"
                    onClick={() => handleRemoveMember(member.id, member.username)}
                  >
                    Retirer du projet
                  </MenuItem>
                </MenuList>
              </Menu>
            )}
          </HStack>
        ))}
      </VStack>

      {/* Modal d'invitation */}
      <Modal isOpen={isOpen} onClose={onClose} size="lg">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Ajouter des membres</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack spacing={4}>
              <FormControl>
                <FormLabel>Rechercher par nom ou email</FormLabel>
                <Input
                  placeholder="Commencez à taper..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  autoFocus
                />
              </FormControl>

              {isSearching && <Spinner />}

              {searchResults.length > 0 && (
                <Box w="100%" maxH="300px" overflowY="auto">
                  <VStack spacing={2} align="stretch">
                    {searchResults.map((user) => (
                      <HStack
                        key={user.id}
                        justify="space-between"
                        p={3}
                        borderWidth="1px"
                        borderRadius="md"
                        _hover={{ bg: 'gray.50', cursor: 'pointer' }}
                        onClick={() => handleAddMember(user)}
                      >
                        <HStack spacing={3}>
                          <Avatar size="sm" name={user.username} />
                          <Box>
                            <Text fontWeight="500">{user.username}</Text>
                            <Text fontSize="sm" color="gray.500">{user.email}</Text>
                          </Box>
                        </HStack>
                        <Button size="xs" colorScheme="blue">
                          Ajouter
                        </Button>
                      </HStack>
                    ))}
                  </VStack>
                </Box>
              )}

              {searchTerm.length >= 2 && searchResults.length === 0 && !isSearching && (
                <Text color="gray.500">Aucun utilisateur trouvé</Text>
              )}
            </VStack>
          </ModalBody>

          <ModalFooter>
            <Button variant="ghost" onClick={onClose}>
              Fermer
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  );
};

export default ProjectMembers;
