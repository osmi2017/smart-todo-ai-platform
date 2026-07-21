import React, { useState, useEffect } from 'react';
import {
  IconButton,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  Badge,
  Box,
  Text,
  VStack,
  HStack,
  Avatar,
  Divider,
  Button,
  useDisclosure,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalCloseButton,
} from '@chakra-ui/react';
import { FiBell, FiCheck, FiCheckCircle } from 'react-icons/fi';
import { useAuth } from '../context/AuthContext';
import { useNotificationService } from '../services/notificationService';
import { useWebSocket } from '../hooks/useWebSocket';
import { formatDistance } from 'date-fns';
import { fr } from 'date-fns/locale';

const NotificationBell = () => {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const { user, token } = useAuth();
  const { getNotifications, markAsRead, markAllAsRead, getUnreadCount } = useNotificationService();
  const { notifications: wsNotifications, markAsRead: wsMarkAsRead } = useWebSocket(user?.id, token);
  const { isOpen, onOpen, onClose } = useDisclosure();

  useEffect(() => {
    if (user) {
      loadNotifications();
      loadUnreadCount();
    }
  }, [user]);

  useEffect(() => {
    if (wsNotifications.length === 0) return;

    const latestNotification = wsNotifications[0];
    setNotifications(prev => {
      const alreadyLoaded = latestNotification.id &&
        prev.some(notification => notification.id === latestNotification.id);
      if (alreadyLoaded) return prev;
      if (!latestNotification.is_read) {
        setUnreadCount(count => count + 1);
      }
      return [latestNotification, ...prev];
    });
  }, [wsNotifications]);

  const loadNotifications = async () => {
    const data = await getNotifications({ limit: 20 });
    setNotifications(data);
  };

  const loadUnreadCount = async () => {
    const count = await getUnreadCount();
    setUnreadCount(count);
  };

  const handleMarkAsRead = async (id) => {
    await markAsRead(id);
    wsMarkAsRead(id);
    setNotifications(prev =>
      prev.map(n => n.id === id ? { ...n, is_read: true } : n)
    );
    setUnreadCount(prev => Math.max(0, prev - 1));
  };

  const handleMarkAllAsRead = async () => {
    await markAllAsRead();
    setNotifications(prev =>
      prev.map(n => ({ ...n, is_read: true }))
    );
    setUnreadCount(0);
  };

  const getNotificationIcon = (type) => {
    const icons = {
      task_assigned: '📋',
      task_completed: '✅',
      task_delayed: '⚠️',
      comment_added: '💬',
      member_added: '👥',
      milestone_due: '🎯',
    };
    return icons[type] || '🔔';
  };

  const getNotificationColor = (type) => {
    const colors = {
      task_assigned: 'blue',
      task_completed: 'green',
      task_delayed: 'red',
      comment_added: 'purple',
      member_added: 'teal',
      milestone_due: 'orange',
    };
    return colors[type] || 'gray';
  };

  return (
    <>
      <Menu>
        <MenuButton
          as={IconButton}
          icon={<FiBell />}
          variant="ghost"
          borderRadius="full"
          position="relative"
          aria-label="Notifications"
        >
          {unreadCount > 0 && (
            <Badge
              position="absolute"
              top="-2px"
              right="-2px"
              colorScheme="red"
              borderRadius="full"
              fontSize="xs"
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </Badge>
          )}
        </MenuButton>
        <MenuList width="380px" maxHeight="500px" overflowY="auto">
          <Box p={3} borderBottom="1px solid" borderColor="gray.200">
            <HStack justify="space-between">
              <Text fontWeight="bold">Notifications</Text>
              {unreadCount > 0 && (
                <Button size="xs" variant="ghost" onClick={handleMarkAllAsRead}>
                  Tout marquer comme lu
                </Button>
              )}
            </HStack>
          </Box>

          {notifications.length === 0 ? (
            <Box p={4} textAlign="center">
              <Text color="gray.500">Aucune notification</Text>
            </Box>
          ) : (
            notifications.map((notification) => (
              <MenuItem
                key={notification.id}
                onClick={() => handleMarkAsRead(notification.id)}
                bg={notification.is_read ? 'transparent' : 'blue.50'}
                _hover={{ bg: 'gray.100' }}
              >
                <HStack spacing={3} width="100%">
                  <Box fontSize="24px">{getNotificationIcon(notification.type)}</Box>
                  <Box flex={1}>
                    <Text fontWeight={notification.is_read ? 'normal' : 'bold'} fontSize="sm">
                      {notification.title}
                    </Text>
                    <Text fontSize="xs" color="gray.500" noOfLines={2}>
                      {notification.message}
                    </Text>
                    <Text fontSize="xs" color="gray.400" mt={1}>
                      {formatDistance(new Date(notification.created_at), new Date(), {
                        addSuffix: true,
                        locale: fr
                      })}
                    </Text>
                  </Box>
                  {!notification.is_read && (
                    <Box w="8px" h="8px" bg="blue.500" borderRadius="full" />
                  )}
                </HStack>
              </MenuItem>
            ))
          )}
        </MenuList>
      </Menu>

      {/* Modal pour la liste complète */}
      <Modal isOpen={isOpen} onClose={onClose} size="lg">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Notifications</ModalHeader>
          <ModalCloseButton />
          <ModalBody pb={6}>
            <VStack spacing={3} align="stretch">
              {notifications.map((notification) => (
                <Box
                  key={notification.id}
                  p={3}
                  bg={notification.is_read ? 'transparent' : 'blue.50'}
                  borderRadius="md"
                  cursor="pointer"
                  onClick={() => handleMarkAsRead(notification.id)}
                >
                  <HStack spacing={3}>
                    <Box fontSize="28px">{getNotificationIcon(notification.type)}</Box>
                    <Box flex={1}>
                      <Text fontWeight={notification.is_read ? 'normal' : 'bold'}>
                        {notification.title}
                      </Text>
                      <Text fontSize="sm" color="gray.600">
                        {notification.message}
                      </Text>
                      <Text fontSize="xs" color="gray.400" mt={1}>
                        {formatDistance(new Date(notification.created_at), new Date(), {
                          addSuffix: true,
                          locale: fr
                        })}
                      </Text>
                    </Box>
                  </HStack>
                </Box>
              ))}
            </VStack>
          </ModalBody>
        </ModalContent>
      </Modal>
    </>
  );
};

export default NotificationBell;
