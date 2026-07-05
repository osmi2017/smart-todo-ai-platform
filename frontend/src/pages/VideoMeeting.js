import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box, Flex, Grid, GridItem, IconButton, Text, HStack, VStack,
  Avatar, Badge, Tooltip, Input, Button,
  useToast, useColorModeValue,
  Drawer, DrawerOverlay, DrawerContent, DrawerHeader, DrawerBody,
  DrawerCloseButton, useDisclosure,
} from '@chakra-ui/react';
import {
  FiMic, FiMicOff, FiVideo, FiVideoOff, FiMonitor,
  FiPhoneOff, FiMessageSquare, FiUsers, FiSend,
} from 'react-icons/fi';
import { io } from 'socket.io-client';
import { useAuth } from '../context/AuthContext';
import { useMeetingService } from '../services/meetingService';

const MEETING_SERVICE_URL = process.env.REACT_APP_MEETING_SERVICE_URL || 'http://localhost:4000';

const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ],
};

const VideoMeeting = () => {
  const { id: meetingId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { getMeeting, updateMeeting } = useMeetingService();
  const toast = useToast();

  const bgColor = useColorModeValue('gray.900', 'gray.900');
  const controlBg = useColorModeValue('gray.800', 'gray.800');

  const [meetingTitle, setMeetingTitle] = useState('Meeting');
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [peers, setPeers] = useState([]);
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [isConnected, setIsConnected] = useState(false);

  const { isOpen: isChatOpen, onOpen: onChatOpen, onClose: onChatClose } = useDisclosure();
  const { isOpen: isParticipantsOpen, onOpen: onParticipantsOpen, onClose: onParticipantsClose } = useDisclosure();

  const localVideoRef = useRef(null);
  const localStreamRef = useRef(null);
  const screenStreamRef = useRef(null);
  const socketRef = useRef(null);
  const peerConnectionsRef = useRef(new Map());
  const peerIdRef = useRef(`peer-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`);
  const chatEndRef = useRef(null);

  const createPeerConnection = useCallback((remotePeerId, remoteUsername) => {
    if (peerConnectionsRef.current.has(remotePeerId)) {
      return peerConnectionsRef.current.get(remotePeerId).pc;
    }

    const pc = new RTCPeerConnection(ICE_SERVERS);

    // Add local tracks
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => {
        pc.addTrack(track, localStreamRef.current);
      });
    }

    pc.onicecandidate = (event) => {
      if (event.candidate && socketRef.current) {
        socketRef.current.emit('ice-candidate', {
          to: remotePeerId,
          candidate: event.candidate,
        });
      }
    };

    pc.ontrack = (event) => {
      setPeers((prev) => {
        const existing = prev.find((p) => p.peerId === remotePeerId);
        if (existing) {
          return prev.map((p) =>
            p.peerId === remotePeerId ? { ...p, stream: event.streams[0] } : p
          );
        }
        return [
          ...prev,
          {
            peerId: remotePeerId,
            username: remoteUsername || 'Guest',
            stream: event.streams[0],
            isAudioEnabled: true,
            isVideoEnabled: true,
          },
        ];
      });
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
        removePeer(remotePeerId);
      }
    };

    peerConnectionsRef.current.set(remotePeerId, { pc, username: remoteUsername });
    return pc;
  }, []);

  const removePeer = useCallback((peerId) => {
    const entry = peerConnectionsRef.current.get(peerId);
    if (entry) {
      entry.pc.close();
      peerConnectionsRef.current.delete(peerId);
    }
    setPeers((prev) => prev.filter((p) => p.peerId !== peerId));
  }, []);

  // Initialize media and socket connection
  useEffect(() => {
    let mounted = true;

    const init = async () => {
      // Load meeting info
      try {
        const meeting = await getMeeting(meetingId);
        if (mounted) setMeetingTitle(meeting.title);
      } catch {
        // non-critical
      }

      // Get local media
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true,
        });
        localStreamRef.current = stream;
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }
      } catch (err) {
        toast({
          title: 'Camera/Mic access denied',
          description: 'Please allow camera and microphone access to join the meeting.',
          status: 'warning',
          duration: 5000,
        });
        // Try audio-only
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          localStreamRef.current = stream;
          if (mounted) setIsVideoEnabled(false);
        } catch {
          // proceed without media
        }
      }

      // Create room via REST
      try {
        await fetch(`${MEETING_SERVICE_URL}/rooms`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            meetingId,
            title: meetingTitle,
            createdBy: user?.username || 'unknown',
          }),
        });
      } catch (err) {
        toast({
          title: 'Cannot reach meeting server',
          status: 'error',
          duration: 5000,
        });
        return;
      }

      // Connect via Socket.IO
      const socket = io(MEETING_SERVICE_URL, { transports: ['websocket', 'polling'] });
      socketRef.current = socket;

      socket.on('connect', () => {
        if (!mounted) return;
        setIsConnected(true);
        socket.emit('join-room', {
          roomId: `meeting-${meetingId}`,
          peerId: peerIdRef.current,
          username: user?.username || 'Guest',
          email: user?.email || '',
        });

        // Mark meeting as in_progress
        updateMeeting(meetingId, { status: 'in_progress' }).catch(() => {});
      });

      socket.on('room-participants', async ({ participants }) => {
        if (!mounted) return;
        // Initiate calls to existing participants
        for (const p of participants) {
          const pc = createPeerConnection(p.peerId, p.username);
          setPeers((prev) => {
            if (prev.find((x) => x.peerId === p.peerId)) return prev;
            return [...prev, { peerId: p.peerId, username: p.username, stream: null, isAudioEnabled: p.isAudioEnabled, isVideoEnabled: p.isVideoEnabled }];
          });
          try {
            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);
            socket.emit('offer', { to: p.peerId, offer });
          } catch (err) {
            console.error('Error creating offer:', err);
          }
        }
      });

      socket.on('user-joined', ({ peerId, username }) => {
        if (!mounted) return;
        createPeerConnection(peerId, username);
        setPeers((prev) => {
          if (prev.find((p) => p.peerId === peerId)) return prev;
          return [...prev, { peerId, username, stream: null, isAudioEnabled: true, isVideoEnabled: true }];
        });
        toast({
          title: `${username} joined the meeting`,
          status: 'info',
          duration: 3000,
          position: 'top-right',
        });
      });

      socket.on('offer', async ({ from, offer }) => {
        if (!mounted) return;
        const entry = peerConnectionsRef.current.get(from);
        const pc = entry ? entry.pc : createPeerConnection(from, 'Peer');
        try {
          await pc.setRemoteDescription(new RTCSessionDescription(offer));
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          socket.emit('answer', { to: from, answer });
        } catch (err) {
          console.error('Error handling offer:', err);
        }
      });

      socket.on('answer', async ({ from, answer }) => {
        if (!mounted) return;
        const entry = peerConnectionsRef.current.get(from);
        if (entry) {
          try {
            await entry.pc.setRemoteDescription(new RTCSessionDescription(answer));
          } catch (err) {
            console.error('Error handling answer:', err);
          }
        }
      });

      socket.on('ice-candidate', async ({ from, candidate }) => {
        if (!mounted) return;
        const entry = peerConnectionsRef.current.get(from);
        if (entry) {
          try {
            await entry.pc.addIceCandidate(new RTCIceCandidate(candidate));
          } catch (err) {
            console.error('Error adding ICE candidate:', err);
          }
        }
      });

      socket.on('user-left', ({ peerId }) => {
        if (!mounted) return;
        const entry = peerConnectionsRef.current.get(peerId);
        const username = entry?.username || 'Participant';
        removePeer(peerId);
        toast({
          title: `${username} left the meeting`,
          status: 'info',
          duration: 3000,
          position: 'top-right',
        });
      });

      socket.on('peer-media-toggle', ({ peerId, kind, enabled }) => {
        if (!mounted) return;
        setPeers((prev) =>
          prev.map((p) =>
            p.peerId === peerId
              ? { ...p, [kind === 'audio' ? 'isAudioEnabled' : 'isVideoEnabled']: enabled }
              : p
          )
        );
      });

      socket.on('chat-message', ({ from, username, message, timestamp }) => {
        if (!mounted) return;
        setChatMessages((prev) => [...prev, { from, username, message, timestamp, isMine: false }]);
      });

      socket.on('disconnect', () => {
        if (mounted) setIsConnected(false);
      });
    };

    init();

    return () => {
      mounted = false;
      // Cleanup
      if (socketRef.current) {
        socketRef.current.emit('leave-room');
        socketRef.current.disconnect();
      }
      peerConnectionsRef.current.forEach((entry) => entry.pc.close());
      peerConnectionsRef.current.clear();
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((t) => t.stop());
      }
      if (screenStreamRef.current) {
        screenStreamRef.current.getTracks().forEach((t) => t.stop());
      }
    };
  }, [meetingId]);

  // Scroll chat to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  const toggleAudio = () => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsAudioEnabled(audioTrack.enabled);
        socketRef.current?.emit('toggle-audio', { enabled: audioTrack.enabled });
      }
    }
  };

  const toggleVideo = () => {
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoEnabled(videoTrack.enabled);
        socketRef.current?.emit('toggle-video', { enabled: videoTrack.enabled });
      }
    }
  };

  const toggleScreenShare = async () => {
    if (isScreenSharing) {
      // Stop screen share
      if (screenStreamRef.current) {
        screenStreamRef.current.getTracks().forEach((t) => t.stop());
        screenStreamRef.current = null;
      }
      // Restore camera track
      if (localStreamRef.current) {
        const videoTrack = localStreamRef.current.getVideoTracks()[0];
        if (videoTrack) {
          peerConnectionsRef.current.forEach((entry) => {
            const sender = entry.pc.getSenders().find((s) => s.track?.kind === 'video');
            if (sender) sender.replaceTrack(videoTrack);
          });
        }
      }
      setIsScreenSharing(false);
      socketRef.current?.emit('screen-share-stopped');
    } else {
      try {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
        screenStreamRef.current = screenStream;
        const screenTrack = screenStream.getVideoTracks()[0];

        peerConnectionsRef.current.forEach((entry) => {
          const sender = entry.pc.getSenders().find((s) => s.track?.kind === 'video');
          if (sender) sender.replaceTrack(screenTrack);
        });

        screenTrack.onended = () => {
          toggleScreenShare();
        };

        setIsScreenSharing(true);
        socketRef.current?.emit('screen-share-started');
      } catch {
        toast({ title: 'Screen sharing cancelled', status: 'info', duration: 2000 });
      }
    }
  };

  const leaveMeeting = () => {
    if (socketRef.current) {
      socketRef.current.emit('leave-room');
      socketRef.current.disconnect();
    }
    peerConnectionsRef.current.forEach((entry) => entry.pc.close());
    peerConnectionsRef.current.clear();
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((t) => t.stop());
    }
    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach((t) => t.stop());
    }
    navigate(`/meetings/${meetingId}`);
  };

  const sendChatMessage = () => {
    if (!chatInput.trim() || !socketRef.current) return;
    socketRef.current.emit('chat-message', { message: chatInput.trim() });
    setChatMessages((prev) => [
      ...prev,
      {
        from: peerIdRef.current,
        username: user?.username || 'You',
        message: chatInput.trim(),
        timestamp: new Date().toISOString(),
        isMine: true,
      },
    ]);
    setChatInput('');
  };

  const handleChatKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendChatMessage();
    }
  };

  // Compute grid layout
  const totalParticipants = peers.length + 1; // +1 for self
  const gridCols = totalParticipants <= 1 ? 1 : totalParticipants <= 4 ? 2 : totalParticipants <= 9 ? 3 : 4;

  return (
    <Box bg={bgColor} minH="100vh" color="white" position="fixed" top={0} left={0} right={0} bottom={0} zIndex={1500}>
      {/* Header bar */}
      <Flex
        bg="blackAlpha.600"
        px={6}
        py={3}
        align="center"
        justify="space-between"
        borderBottom="1px solid"
        borderColor="whiteAlpha.200"
      >
        <HStack spacing={3}>
          <Text fontWeight="bold" fontSize="lg">{meetingTitle}</Text>
          <Badge colorScheme={isConnected ? 'green' : 'red'} variant="subtle">
            {isConnected ? 'Connected' : 'Connecting...'}
          </Badge>
        </HStack>
        <HStack spacing={2}>
          <Badge variant="outline" colorScheme="gray">
            <HStack spacing={1}>
              <FiUsers />
              <Text>{totalParticipants}</Text>
            </HStack>
          </Badge>
        </HStack>
      </Flex>

      {/* Video grid */}
      <Box p={4} h="calc(100vh - 140px)" overflow="auto">
        <Grid
          templateColumns={`repeat(${gridCols}, 1fr)`}
          gap={3}
          h="full"
          maxW="1400px"
          mx="auto"
        >
          {/* Local video */}
          <GridItem>
            <Box
              position="relative"
              bg="gray.800"
              borderRadius="xl"
              overflow="hidden"
              h="full"
              minH="200px"
              border="2px solid"
              borderColor="blue.500"
            >
              <video
                ref={localVideoRef}
                autoPlay
                muted
                playsInline
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  transform: 'scaleX(-1)',
                  display: isVideoEnabled ? 'block' : 'none',
                }}
              />
              {!isVideoEnabled && (
                <Flex align="center" justify="center" h="full">
                  <Avatar size="2xl" name={user?.username || 'You'} bg="blue.500" />
                </Flex>
              )}
              <Box
                position="absolute"
                bottom={2}
                left={2}
                bg="blackAlpha.700"
                px={3}
                py={1}
                borderRadius="md"
              >
                <HStack spacing={2}>
                  <Text fontSize="sm" fontWeight="500">{user?.username || 'You'} (You)</Text>
                  {!isAudioEnabled && <FiMicOff size={14} color="#FC8181" />}
                </HStack>
              </Box>
            </Box>
          </GridItem>

          {/* Remote peers */}
          {peers.map((peer) => (
            <GridItem key={peer.peerId}>
              <Box
                position="relative"
                bg="gray.800"
                borderRadius="xl"
                overflow="hidden"
                h="full"
                minH="200px"
                border="2px solid"
                borderColor="whiteAlpha.200"
              >
                {peer.stream && peer.isVideoEnabled ? (
                  <PeerVideo stream={peer.stream} />
                ) : (
                  <Flex align="center" justify="center" h="full">
                    <Avatar size="2xl" name={peer.username} bg="purple.500" />
                  </Flex>
                )}
                <Box
                  position="absolute"
                  bottom={2}
                  left={2}
                  bg="blackAlpha.700"
                  px={3}
                  py={1}
                  borderRadius="md"
                >
                  <HStack spacing={2}>
                    <Text fontSize="sm" fontWeight="500">{peer.username}</Text>
                    {!peer.isAudioEnabled && <FiMicOff size={14} color="#FC8181" />}
                  </HStack>
                </Box>
              </Box>
            </GridItem>
          ))}
        </Grid>
      </Box>

      {/* Control bar */}
      <Flex
        position="absolute"
        bottom={0}
        left={0}
        right={0}
        bg={controlBg}
        px={6}
        py={4}
        justify="center"
        align="center"
        borderTop="1px solid"
        borderColor="whiteAlpha.200"
      >
        <HStack spacing={4}>
          <Tooltip label={isAudioEnabled ? 'Mute' : 'Unmute'}>
            <IconButton
              icon={isAudioEnabled ? <FiMic /> : <FiMicOff />}
              onClick={toggleAudio}
              borderRadius="full"
              size="lg"
              bg={isAudioEnabled ? 'whiteAlpha.200' : 'red.500'}
              color="white"
              _hover={{ bg: isAudioEnabled ? 'whiteAlpha.300' : 'red.600' }}
              aria-label={isAudioEnabled ? 'Mute microphone' : 'Unmute microphone'}
            />
          </Tooltip>

          <Tooltip label={isVideoEnabled ? 'Turn off camera' : 'Turn on camera'}>
            <IconButton
              icon={isVideoEnabled ? <FiVideo /> : <FiVideoOff />}
              onClick={toggleVideo}
              borderRadius="full"
              size="lg"
              bg={isVideoEnabled ? 'whiteAlpha.200' : 'red.500'}
              color="white"
              _hover={{ bg: isVideoEnabled ? 'whiteAlpha.300' : 'red.600' }}
              aria-label={isVideoEnabled ? 'Turn off camera' : 'Turn on camera'}
            />
          </Tooltip>

          <Tooltip label={isScreenSharing ? 'Stop sharing' : 'Share screen'}>
            <IconButton
              icon={<FiMonitor />}
              onClick={toggleScreenShare}
              borderRadius="full"
              size="lg"
              bg={isScreenSharing ? 'blue.500' : 'whiteAlpha.200'}
              color="white"
              _hover={{ bg: isScreenSharing ? 'blue.600' : 'whiteAlpha.300' }}
              aria-label={isScreenSharing ? 'Stop sharing screen' : 'Share screen'}
            />
          </Tooltip>

          <Tooltip label="Chat">
            <IconButton
              icon={<FiMessageSquare />}
              onClick={onChatOpen}
              borderRadius="full"
              size="lg"
              bg="whiteAlpha.200"
              color="white"
              _hover={{ bg: 'whiteAlpha.300' }}
              aria-label="Open chat"
            />
          </Tooltip>

          <Tooltip label="Participants">
            <IconButton
              icon={<FiUsers />}
              onClick={onParticipantsOpen}
              borderRadius="full"
              size="lg"
              bg="whiteAlpha.200"
              color="white"
              _hover={{ bg: 'whiteAlpha.300' }}
              aria-label="View participants"
            />
          </Tooltip>

          <Tooltip label="Leave meeting">
            <IconButton
              icon={<FiPhoneOff />}
              onClick={leaveMeeting}
              borderRadius="full"
              size="lg"
              bg="red.500"
              color="white"
              _hover={{ bg: 'red.600' }}
              aria-label="Leave meeting"
            />
          </Tooltip>
        </HStack>
      </Flex>

      {/* Chat drawer */}
      <Drawer isOpen={isChatOpen} placement="right" onClose={onChatClose} size="sm">
        <DrawerOverlay />
        <DrawerContent bg="gray.800" color="white">
          <DrawerCloseButton />
          <DrawerHeader borderBottomWidth="1px" borderColor="whiteAlpha.200">
            Meeting Chat
          </DrawerHeader>
          <DrawerBody display="flex" flexDirection="column" p={0}>
            <VStack
              flex={1}
              overflow="auto"
              spacing={3}
              p={4}
              align="stretch"
            >
              {chatMessages.length === 0 && (
                <Text color="gray.500" textAlign="center" mt={8}>
                  No messages yet. Start the conversation!
                </Text>
              )}
              {chatMessages.map((msg, i) => (
                <Box
                  key={i}
                  alignSelf={msg.isMine ? 'flex-end' : 'flex-start'}
                  maxW="80%"
                >
                  {!msg.isMine && (
                    <Text fontSize="xs" color="gray.400" mb={1}>
                      {msg.username}
                    </Text>
                  )}
                  <Box
                    bg={msg.isMine ? 'blue.500' : 'whiteAlpha.200'}
                    px={3}
                    py={2}
                    borderRadius="lg"
                  >
                    <Text fontSize="sm">{msg.message}</Text>
                  </Box>
                  <Text fontSize="xs" color="gray.500" mt={1}>
                    {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </Text>
                </Box>
              ))}
              <div ref={chatEndRef} />
            </VStack>
            <HStack p={4} borderTop="1px solid" borderColor="whiteAlpha.200">
              <Input
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={handleChatKeyDown}
                placeholder="Type a message..."
                bg="whiteAlpha.100"
                border="none"
                _focus={{ bg: 'whiteAlpha.200' }}
              />
              <IconButton
                icon={<FiSend />}
                onClick={sendChatMessage}
                colorScheme="blue"
                aria-label="Send message"
                isDisabled={!chatInput.trim()}
              />
            </HStack>
          </DrawerBody>
        </DrawerContent>
      </Drawer>

      {/* Participants drawer */}
      <Drawer isOpen={isParticipantsOpen} placement="right" onClose={onParticipantsClose} size="sm">
        <DrawerOverlay />
        <DrawerContent bg="gray.800" color="white">
          <DrawerCloseButton />
          <DrawerHeader borderBottomWidth="1px" borderColor="whiteAlpha.200">
            Participants ({totalParticipants})
          </DrawerHeader>
          <DrawerBody>
            <VStack spacing={3} align="stretch">
              {/* Self */}
              <HStack p={3} bg="whiteAlpha.100" borderRadius="lg">
                <Avatar size="sm" name={user?.username || 'You'} bg="blue.500" />
                <Box flex={1}>
                  <Text fontSize="sm" fontWeight="500">
                    {user?.username || 'You'} (You)
                  </Text>
                  <Text fontSize="xs" color="gray.400">{user?.email}</Text>
                </Box>
                <HStack spacing={1}>
                  {!isAudioEnabled && <FiMicOff size={14} color="#FC8181" />}
                  {!isVideoEnabled && <FiVideoOff size={14} color="#FC8181" />}
                </HStack>
              </HStack>
              {/* Remote peers */}
              {peers.map((peer) => (
                <HStack key={peer.peerId} p={3} bg="whiteAlpha.50" borderRadius="lg">
                  <Avatar size="sm" name={peer.username} bg="purple.500" />
                  <Box flex={1}>
                    <Text fontSize="sm" fontWeight="500">{peer.username}</Text>
                  </Box>
                  <HStack spacing={1}>
                    {!peer.isAudioEnabled && <FiMicOff size={14} color="#FC8181" />}
                    {!peer.isVideoEnabled && <FiVideoOff size={14} color="#FC8181" />}
                  </HStack>
                </HStack>
              ))}
            </VStack>
          </DrawerBody>
        </DrawerContent>
      </Drawer>
    </Box>
  );
};

// Isolated component to render a remote peer's video without re-rendering the parent
const PeerVideo = ({ stream }) => {
  const videoRef = useRef(null);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  return (
    <video
      ref={videoRef}
      autoPlay
      playsInline
      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
    />
  );
};

export default VideoMeeting;
