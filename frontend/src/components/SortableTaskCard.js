import React from 'react';
import {
  Box,
  Card,
  CardBody,
  Text,
  Badge,
  HStack,
  VStack,
  Avatar,
  Tag,
  TagLabel,
  TagLeftIcon,
  Tooltip,
  Icon,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  IconButton,
  useColorModeValue,
} from '@chakra-ui/react';
import {
  FiClock,
  FiMessageSquare,
  FiFlag,
  FiUser,
  FiMoreVertical,
  FiAlertCircle,
  FiCpu,
} from 'react-icons/fi';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Link as RouterLink } from 'react-router-dom';
import { format, isAfter, isBefore } from 'date-fns';
import { fr } from 'date-fns/locale';

const SortableTaskCard = ({ task, columnId }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task?.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    cursor: isDragging ? 'grabbing' : 'grab',
  };

  const cardBg = useColorModeValue('white', 'gray.700');
  const borderColor = useColorModeValue('gray.200', 'gray.600');

  // Sécurité : si task n'existe pas, ne rien afficher
  if (!task) {
    return null;
  }

  // Vérifier si la tâche est en retard
  const isDelayed = task.deadline && 
    task.status !== 'completed' && 
    isAfter(new Date(), new Date(task.deadline));

  // Obtenir la couleur de priorité
  const getPriorityColor = (priority) => {
    const colors = { 1: 'gray', 2: 'blue', 3: 'orange', 4: 'red' };
    return colors[priority] || 'gray';
  };

  // Formater la date de manière sécurisée
  const formatDate = (dateString) => {
    try {
      if (!dateString) return '';
      return format(new Date(dateString), 'dd/MM');
    } catch (error) {
      console.error('Erreur formatage date:', error);
      return '';
    }
  };

  const formatDateTooltip = (dateString) => {
    try {
      if (!dateString) return '';
      return format(new Date(dateString), 'dd MMM', { locale: fr });
    } catch (error) {
      console.error('Erreur formatage date tooltip:', error);
      return '';
    }
  };

  // Valeurs par défaut sécurisées
  const priority = task.priority || 2;
  const title = task.title || 'Sans titre';
  const projectName = task.project_name || '';
  const tags = Array.isArray(task.tags) ? task.tags : [];
  const delayProbability = task.delay_probability || 0;
  const assignedToName = task.assigned_to_name || '';
  
  // Gestion sécurisée de comments_count
  const commentsCount = typeof task.comments_count === 'number' ? task.comments_count : 0;

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <Card
        bg={cardBg}
        borderWidth="1px"
        borderColor={borderColor}
        boxShadow={isDragging ? 'lg' : 'sm'}
        _hover={{ shadow: 'md', borderColor: 'blue.200' }}
        transition="all 0.2s"
        position="relative"
        cursor="grab"
      >
        <CardBody p={3}>
          <VStack align="stretch" spacing={2}>
            {/* En-tête de la carte */}
            <HStack justify="space-between">
              <HStack spacing={1}>
                <Badge
                  colorScheme={getPriorityColor(priority)}
                  variant="subtle"
                  fontSize="xs"
                >
                  P{priority}
                </Badge>
                {isDelayed && (
                  <Tooltip label="Tâche en retard">
                    <Icon as={FiAlertCircle} color="red.500" />
                  </Tooltip>
                )}
                {delayProbability > 0.7 && (
                  <Tooltip label={`Risque de retard: ${Math.round(delayProbability * 100)}%`}>
                    <Icon as={FiCpu} color="orange.500" />
                  </Tooltip>
                )}
              </HStack>
              <Menu>
                <MenuButton
                  as={IconButton}
                  icon={<FiMoreVertical />}
                  variant="ghost"
                  size="xs"
                  onClick={(e) => e.stopPropagation()}
                />
                <MenuList onClick={(e) => e.stopPropagation()}>
                  <MenuItem as={RouterLink} to={`/tasks/${task.id}`}>
                    Voir détails
                  </MenuItem>
                  <MenuItem>Modifier</MenuItem>
                  <MenuItem color="red.500">Supprimer</MenuItem>
                </MenuList>
              </Menu>
            </HStack>

            {/* Titre */}
            <Text
              fontWeight="500"
              fontSize="sm"
              noOfLines={2}
              as={RouterLink}
              to={`/tasks/${task.id}`}
              _hover={{ textDecoration: 'underline', color: 'blue.500' }}
              onClick={(e) => e.stopPropagation()}
            >
              {title}
            </Text>

            {/* Projet et tags */}
            {projectName && (
              <Badge colorScheme="purple" variant="outline" fontSize="xs" alignSelf="flex-start">
                {projectName}
              </Badge>
            )}

            {/* Tags */}
            {tags.length > 0 && (
              <HStack spacing={1} flexWrap="wrap">
                {tags.slice(0, 2).map((tag, index) => (
                  <Tag key={index} size="sm" colorScheme="blue" variant="subtle">
                    <TagLabel>{String(tag)}</TagLabel>
                  </Tag>
                ))}
                {tags.length > 2 && (
                  <Tag size="sm" variant="subtle">
                    <TagLabel>+{String(tags.length - 2)}</TagLabel>
                  </Tag>
                )}
              </HStack>
            )}

            {/* Pied de carte */}
            <HStack justify="space-between" fontSize="xs" color="gray.500">
              <HStack spacing={3}>
                {task.deadline && (
                  <Tooltip label={`Échéance: ${formatDateTooltip(task.deadline)}`}>
                    <HStack spacing={1}>
                      <FiClock size={12} />
                      <Text>{formatDate(task.deadline)}</Text>
                    </HStack>
                  </Tooltip>
                )}
                
                {/* CORRECTION: Vérification sécurisée pour comments_count */}
                {commentsCount > 0 && (
                  <HStack spacing={1}>
                    <FiMessageSquare size={12} />
                    <Text>{String(commentsCount)}</Text>
                  </HStack>
                )}
              </HStack>

              {assignedToName && (
                <Tooltip label={assignedToName}>
                  <Avatar size="xs" name={assignedToName} />
                </Tooltip>
              )}
            </HStack>

            {/* Indicateur de prédiction ML */}
            {delayProbability > 0.5 && (
              <Box
                position="absolute"
                bottom="0"
                left="0"
                right="0"
                height="3px"
                borderBottomRadius="md"
                bg={delayProbability > 0.7 ? 'red.400' : 'orange.400'}
                opacity={0.6}
              />
            )}
          </VStack>
        </CardBody>
      </Card>
    </div>
  );
};

export default SortableTaskCard;
