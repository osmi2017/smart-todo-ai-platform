import React, { useState, useRef } from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  Avatar,
  Button,
  Textarea,
  IconButton,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  useToast,
  Spinner,
  Divider,
  Badge,
  Tooltip,
  Collapse,
  Input,
  FormControl,
} from '@chakra-ui/react';
import {
  FiMoreVertical,
  FiEdit2,
  FiTrash2,
  FiMessageSquare,
  FiCornerDownRight,
  FiAtSign,
  FiSend,
  FiPaperclip,
} from 'react-icons/fi';
import { formatDistance } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { useCommentService } from '../services/commentService';
import { useAuth } from '../context/AuthContext';

const TaskComments = ({ taskId }) => {
  const [newComment, setNewComment] = useState('');
  const [replyingTo, setReplyingTo] = useState(null);
  const [replyContent, setReplyContent] = useState('');
  const [editingComment, setEditingComment] = useState(null);
  const [editContent, setEditContent] = useState('');
  const [mentionSearch, setMentionSearch] = useState('');
  const [showMentions, setShowMentions] = useState(false);
  
  const toast = useToast();
  const queryClient = useQueryClient();
  const commentService = useCommentService();
  const { user } = useAuth();
  const replyInputRef = useRef(null);

  // Charger les commentaires
  const { data: comments, isLoading } = useQuery(
    ['comments', taskId],
    () => commentService.getTaskComments(taskId),
    {
      enabled: !!taskId,
    }
  );

  // Mutation pour ajouter un commentaire
  const addMutation = useMutation(
    (content) => commentService.addComment(taskId, content),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['comments', taskId]);
        setNewComment('');
        toast({
          title: 'Commentaire ajouté',
          status: 'success',
          duration: 2000,
        });
      },
    }
  );

  // Mutation pour répondre
  const replyMutation = useMutation(
    ({ parentId, content }) => commentService.replyToComment(parentId, content),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['comments', taskId]);
        setReplyingTo(null);
        setReplyContent('');
        toast({
          title: 'Réponse ajoutée',
          status: 'success',
          duration: 2000,
        });
      },
    }
  );

  // Mutation pour modifier
  const editMutation = useMutation(
    ({ id, content }) => commentService.updateComment(id, content),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['comments', taskId]);
        setEditingComment(null);
        toast({
          title: 'Commentaire modifié',
          status: 'success',
          duration: 2000,
        });
      },
    }
  );

  // Mutation pour supprimer
  const deleteMutation = useMutation(
    (id) => commentService.deleteComment(id),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['comments', taskId]);
        toast({
          title: 'Commentaire supprimé',
          status: 'info',
          duration: 2000,
        });
      },
    }
  );

  const handleAddComment = () => {
    if (newComment.trim()) {
      addMutation.mutate(newComment);
    }
  };

  const handleReply = (parentId) => {
    if (replyContent.trim()) {
      replyMutation.mutate({ parentId, content: replyContent });
    }
  };

  const handleEdit = (comment) => {
    if (editContent.trim() && editContent !== comment.content) {
      editMutation.mutate({ id: comment.id, content: editContent });
    } else {
      setEditingComment(null);
    }
  };

  const handleKeyPress = (e, action) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      action();
    }
  };

  // Organiser les commentaires (parents et réponses)
  const parentComments = comments?.filter(c => !c.parent) || [];
  const replies = comments?.filter(c => c.parent) || [];

  if (isLoading) {
    return <Spinner />;
  }

  return (
    <Box>
      <VStack spacing={4} align="stretch">
        {/* Formulaire de nouveau commentaire */}
        <Box>
          <HStack align="flex-start" spacing={3}>
            <Avatar size="sm" name={user?.username} />
            <Box flex={1}>
              <Textarea
                placeholder="Ajouter un commentaire... (Utilisez @ pour mentionner)"
                value={newComment}
                onChange={(e) => {
                  setNewComment(e.target.value);
                  // Détection de mention
                  const lastWord = e.target.value.split(' ').pop();
                  if (lastWord.startsWith('@') && lastWord.length > 1) {
                    setMentionSearch(lastWord.slice(1));
                    setShowMentions(true);
                  } else {
                    setShowMentions(false);
                  }
                }}
                onKeyPress={(e) => handleKeyPress(e, handleAddComment)}
                size="sm"
                rows={2}
              />
              <HStack justify="space-between" mt={2}>
                <HStack spacing={2}>
                  <IconButton
                    icon={<FiPaperclip />}
                    size="sm"
                    variant="ghost"
                    aria-label="Joindre un fichier"
                  />
                  <IconButton
                    icon={<FiAtSign />}
                    size="sm"
                    variant="ghost"
                    aria-label="Mentionner"
                  />
                </HStack>
                <Button
                  size="sm"
                  colorScheme="blue"
                  leftIcon={<FiSend />}
                  onClick={handleAddComment}
                  isLoading={addMutation.isLoading}
                  isDisabled={!newComment.trim()}
                >
                  Commenter
                </Button>
              </HStack>
            </Box>
          </HStack>
        </Box>

        <Divider />

        {/* Liste des commentaires */}
        {parentComments.length === 0 ? (
          <Text color="gray.500" textAlign="center" py={4}>
            Aucun commentaire pour le moment
          </Text>
        ) : (
          <VStack spacing={4} align="stretch">
            {parentComments.map((comment) => (
              <Box key={comment.id}>
                {/* Commentaire parent */}
                <HStack align="flex-start" spacing={3}>
                  <Avatar size="sm" name={comment.author_name} />
                  <Box flex={1}>
                    <HStack justify="space-between">
                      <HStack spacing={2}>
                        <Text fontWeight="600" fontSize="sm">
                          {comment.author_name}
                        </Text>
                        <Text fontSize="xs" color="gray.500">
                          {comment.time_ago}
                        </Text>
                        {comment.edited && (
                          <Badge size="xs" colorScheme="gray">
                            modifié
                          </Badge>
                        )}
                      </HStack>
                      
                      {comment.author === user?.id && (
                        <Menu>
                          <MenuButton
                            as={IconButton}
                            icon={<FiMoreVertical />}
                            variant="ghost"
                            size="xs"
                          />
                          <MenuList>
                            <MenuItem
                              icon={<FiEdit2 />}
                              onClick={() => {
                                setEditingComment(comment.id);
                                setEditContent(comment.content);
                              }}
                            >
                              Modifier
                            </MenuItem>
                            <MenuItem
                              icon={<FiTrash2 />}
                              color="red.500"
                              onClick={() => {
                                if (window.confirm('Supprimer ce commentaire ?')) {
                                  deleteMutation.mutate(comment.id);
                                }
                              }}
                            >
                              Supprimer
                            </MenuItem>
                          </MenuList>
                        </Menu>
                      )}
                    </HStack>

                    {editingComment === comment.id ? (
                      <Box mt={2}>
                        <Textarea
                          value={editContent}
                          onChange={(e) => setEditContent(e.target.value)}
                          size="sm"
                          rows={2}
                          autoFocus
                        />
                        <HStack justify="flex-end" mt={2} spacing={2}>
                          <Button
                            size="xs"
                            variant="ghost"
                            onClick={() => setEditingComment(null)}
                          >
                            Annuler
                          </Button>
                          <Button
                            size="xs"
                            colorScheme="blue"
                            onClick={() => handleEdit(comment)}
                            isLoading={editMutation.isLoading}
                          >
                            Enregistrer
                          </Button>
                        </HStack>
                      </Box>
                    ) : (
                      <Text fontSize="sm" mt={1} whiteSpace="pre-wrap">
                        {comment.content}
                      </Text>
                    )}

                    {/* Bouton répondre */}
                    <Button
                      size="xs"
                      variant="ghost"
                      leftIcon={<FiCornerDownRight />}
                      mt={2}
                      onClick={() => {
                        setReplyingTo(replyingTo === comment.id ? null : comment.id);
                        setTimeout(() => replyInputRef.current?.focus(), 100);
                      }}
                    >
                      Répondre
                    </Button>

                    {/* Formulaire de réponse */}
                    {replyingTo === comment.id && (
                      <Box mt={2} ml={6}>
                        <HStack align="flex-start">
                          <Avatar size="xs" name={user?.username} />
                          <Box flex={1}>
                            <Textarea
                              ref={replyInputRef}
                              placeholder="Votre réponse..."
                              value={replyContent}
                              onChange={(e) => setReplyContent(e.target.value)}
                              size="sm"
                              rows={2}
                            />
                            <HStack justify="flex-end" mt={2} spacing={2}>
                              <Button
                                size="xs"
                                variant="ghost"
                                onClick={() => {
                                  setReplyingTo(null);
                                  setReplyContent('');
                                }}
                              >
                                Annuler
                              </Button>
                              <Button
                                size="xs"
                                colorScheme="blue"
                                onClick={() => handleReply(comment.id)}
                                isLoading={replyMutation.isLoading}
                                isDisabled={!replyContent.trim()}
                              >
                                Répondre
                              </Button>
                            </HStack>
                          </Box>
                        </HStack>
                      </Box>
                    )}

                    {/* Réponses */}
                    {replies
                      .filter(r => r.parent === comment.id)
                      .map((reply) => (
                        <Box key={reply.id} mt={3} ml={8} borderLeft="2px" borderColor="gray.200" pl={3}>
                          <HStack align="flex-start" spacing={2}>
                            <Avatar size="xs" name={reply.author_name} />
                            <Box flex={1}>
                              <HStack justify="space-between">
                                <HStack spacing={2}>
                                  <Text fontWeight="600" fontSize="sm">
                                    {reply.author_name}
                                  </Text>
                                  <Text fontSize="xs" color="gray.500">
                                    {reply.time_ago}
                                  </Text>
                                </HStack>
                                
                                {reply.author === user?.id && (
                                  <Menu>
                                    <MenuButton
                                      as={IconButton}
                                      icon={<FiMoreVertical />}
                                      variant="ghost"
                                      size="xs"
                                    />
                                    <MenuList>
                                      <MenuItem
                                        icon={<FiEdit2 />}
                                        onClick={() => {
                                          setEditingComment(reply.id);
                                          setEditContent(reply.content);
                                        }}
                                      >
                                        Modifier
                                      </MenuItem>
                                      <MenuItem
                                        icon={<FiTrash2 />}
                                        color="red.500"
                                        onClick={() => {
                                          if (window.confirm('Supprimer cette réponse ?')) {
                                            deleteMutation.mutate(reply.id);
                                          }
                                        }}
                                      >
                                        Supprimer
                                      </MenuItem>
                                    </MenuList>
                                  </Menu>
                                )}
                              </HStack>

                              {editingComment === reply.id ? (
                                <Box mt={1}>
                                  <Textarea
                                    value={editContent}
                                    onChange={(e) => setEditContent(e.target.value)}
                                    size="xs"
                                    rows={2}
                                  />
                                  <HStack justify="flex-end" mt={1} spacing={2}>
                                    <Button
                                      size="xs"
                                      variant="ghost"
                                      onClick={() => setEditingComment(null)}
                                    >
                                      Annuler
                                    </Button>
                                    <Button
                                      size="xs"
                                      colorScheme="blue"
                                      onClick={() => handleEdit(reply)}
                                      isLoading={editMutation.isLoading}
                                    >
                                      Enregistrer
                                    </Button>
                                  </HStack>
                                </Box>
                              ) : (
                                <Text fontSize="sm" mt={1}>
                                  {reply.content}
                                </Text>
                              )}
                            </Box>
                          </HStack>
                        </Box>
                      ))}
                  </Box>
                </HStack>
              </Box>
            ))}
          </VStack>
        )}
      </VStack>
    </Box>
  );
};

export default TaskComments;
