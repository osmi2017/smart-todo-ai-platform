import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box, Flex, Grid, GridItem, IconButton, Text, HStack, VStack,
  Avatar, Badge, Tooltip, Input, Button,
  useToast, useColorModeValue,
  Drawer, DrawerOverlay, DrawerContent, DrawerHeader, DrawerBody,
  DrawerCloseButton, useDisclosure, Spinner,
} from '@chakra-ui/react';
import {
  FiMic, FiMicOff, FiVideo, FiVideoOff, FiMonitor,
  FiPhoneOff, FiMessageSquare, FiUsers, FiSend, FiPaperclip,
  FiFile, FiDownload,
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

const formatFileSize = (bytes) => {
  if (!bytes) return '';
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  return `${(kb / 1024).toFixed(1)} MB`;
};

// Merge a message into the chat list. Identity is the clientId while a
// message is optimistic (id null), then the persisted id once known.
const mergeMessage = (prev, msg) => {
  if (msg.status === 'removed') {
    return prev.filter((m) => m.clientId && m.clientId === msg.clientId);
  }
  if (msg.clientId) {
    const idx = prev.findIndex((m) => m.clientId === msg.clientId);
    if (idx !== -1) {
      return [
        ...prev.slice(0, idx),
        { ...prev[idx], ...msg },
        ...prev.slice(idx + 1).filter((m) => !(msg.id && m.id === msg.id)),
      ];
    }
  }
  if (msg.id) {
    const idx = prev.findIndex((m) => m.id === msg.id);
    if (idx !== -1) {
      const next = [...prev];
      next[idx] = { ...next[idx], ...msg };
      return next;
    }
  }
  return [...prev, msg];
};

const toChatMessage = (m, myUsername) => ({
  id: m.id,
  from: `user-${m.user}`,
  username: m.username,
  message: m.message,
  timestamp: m.created_at,
  isMine: (m.username || '') === (myUsername || ''),
  file_id: m.file,
  file_name: m.file_name,
  file_size: m.file_size,
  file_mime_type: m.file_mime_type,
});

const VideoMeeting = () => {
  const { id: meetingId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { getMeeting, updateMeeting, getChatMessages, createChatMessage, uploadChatFile, downloadChatFile } = useMeetingService();
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
  const fileInputRef = useRef(null);

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

      socket.on('chat-message', ({ from, username, message, created_at, id, file_id, file_name, file_size, file_mime_type, clientId, status }) => {
        if (!mounted) return;
        setChatMessages((prev) =>
          mergeMessage(prev, {
            id: id || null,
            clientId: clientId || null,
            from,
            username: username || 'Guest',
            message: message || '',
            timestamp: created_at || new Date().toISOString(),
            isMine: false,
            file_id: file_id || null,
            file_name: file_name || null,
            file_size: file_size || null,
            file_mime_type: file_mime_type || null,
            status: status || null,
          })
        );
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

  // Load persisted chat history and keep polling so messages still appear
  // even if the socket connection is down/unreachable for this client.
  useEffect(() => {
    let mounted = true;
    const poll = async () => {
      try {
        const history = await getChatMessages(meetingId);
        if (!mounted) return;
        const messages = Array.isArray(history) ? history : history.results || [];
        setChatMessages((prev) =>
          messages.reduce(
            (acc, m) => mergeMessage(acc, toChatMessage(m, user?.username)),
            prev
          )
        );
      } catch {
        // History unavailable - live chat still works
      }
    };
    poll();
    const timer = setInterval(poll, 3000);
    return () => { mounted = false; clearInterval(timer); };
  }, [meetingId, user?.username]);

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

  const upsertLocal = (msg) => {
    setChatMessages((prev) => mergeMessage(prev, msg));
  };

  const emitChat = (payload) => {
    socketRef.current?.emit('chat-message', payload);
  };

  const sendChatMessage = async () => {
    const text = chatInput.trim();
    if (!text || !socketRef.current) return;
    setChatInput('');

    const clientId = `${peerIdRef.current}-${Date.now()}`;
    const now = new Date().toISOString();

    // Show + broadcast immediately, persist in the background
    upsertLocal({
      clientId,
      id: null,
      from: peerIdRef.current,
      username: user?.username || 'You',
      message: text,
      timestamp: now,
      isMine: true,
    });
    emitChat({ clientId, message: text, id: null, created_at: now });

    try {
      const persisted = await createChatMessage(meetingId, text);
      const update = { clientId, id: persisted.id, timestamp: persisted.created_at };
      upsertLocal(update);
      emitChat({ clientId, message: text, id: persisted.id, created_at: persisted.created_at });
    } catch {
      // Persistence failed - optimistic message stays
    }
  };

  const handleChatFileSelect = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    const clientId = `${peerIdRef.current}-${Date.now()}`;
    const now = new Date().toISOString();

    // Show an "uploading" bubble immediately so the file send feels instant
    const uploading = {
      clientId,
      id: null,
      from: peerIdRef.current,
      username: user?.username || 'You',
      message: '',
      timestamp: now,
      isMine: true,
      file_id: null,
      file_name: file.name,
      file_size: file.size,
      file_mime_type: file.type,
      status: 'uploading',
    };
    upsertLocal(uploading);
    emitChat({
      clientId,
      message: '',
      id: null,
      created_at: now,
      file_id: null,
      file_name: file.name,
      file_size: file.size,
      file_mime_type: file.type,
      status: 'uploading',
    });

    try {
      const uploaded = await uploadChatFile(meetingId, file);
      const persisted = await createChatMessage(meetingId, '', uploaded.id);
      const ready = {
        clientId,
        id: persisted.id,
        timestamp: persisted.created_at,
        isMine: true,
        file_id: persisted.file,
        file_name: persisted.file_name,
        file_size: persisted.file_size,
        file_mime_type: persisted.file_mime_type,
        status: 'ready',
      };
      upsertLocal(ready);
      emitChat({
        clientId,
        id: persisted.id,
        created_at: persisted.created_at,
        file_id: persisted.file,
        file_name: persisted.file_name,
        file_size: persisted.file_size,
        file_mime_type: persisted.file_mime_type,
        status: 'ready',
      });
    } catch (err) {
      upsertLocal({ clientId, status: 'removed' });
      emitChat({ clientId, status: 'removed' });
      toast({
        title: 'Error uploading file',
        description: err.response?.data?.error || 'Unknown error',
        status: 'error',
        duration: 3000,
      });
    }
  };

  const handleDownloadChatFile = async (msg) => {
    if (!msg.file_id) return;
    try {
      const blob = await downloadChatFile(msg.file_id);
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = msg.file_name || 'file';
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch {
      toast({ title: 'Error downloading file', status: 'error', duration: 3000 });
    }
  };

  const handleChatKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendChatMessage();
    }
  };

  // Compute grid layout (remote peers only; local video is a small overlay)
  const totalParticipants = peers.length + 1; // +1 for self
  const gridCols = peers.length === 0 ? 1 : peers.length === 1 ? 1 : peers.length <= 3 ? 2 : peers.length <= 8 ? 3 : 4;

  return (
    <Box bg={bgColor} minH="100vh" color="white" position="fixed" top={0} left={0} right={0} bottom={0} zIndex={1000}>
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
      <Box p={4} h="calc(100vh - 140px)" overflow="auto" position="relative">
        <Grid
          templateColumns={`repeat(${gridCols}, 1fr)`}
          gap={3}
          h="full"
          maxW="1400px"
          mx="auto"
        >
          {/* Remote peers (big) */}
          {peers.length === 0 ? (
            <GridItem colSpan={gridCols}>
              <Flex
                align="center"
                justify="center"
                direction="column"
                h="full"
                minH="300px"
                bg="gray.800"
                borderRadius="xl"
                borderWidth="1px"
                borderStyle="dashed"
                borderColor="whiteAlpha.300"
              >
                <Avatar size="2xl" name={user?.username || 'You'} bg="blue.500" mb={4} />
                <Text color="gray.400">Waiting for others to join...</Text>
              </Flex>
            </GridItem>
          ) : (
            peers.map((peer) => (
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
            ))
          )}
        </Grid>

        {/* Local video (small, picture-in-picture overlay) */}
        <Box
          position="fixed"
          bottom="90px"
          right={4}
          w="220px"
          h="150px"
          bg="gray.800"
          borderRadius="xl"
          overflow="hidden"
          border="2px solid"
          borderColor="blue.500"
          shadow="2xl"
          zIndex={5}
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
              <Avatar size="md" name={user?.username || 'You'} bg="blue.500" />
            </Flex>
          )}
          <Box
            position="absolute"
            bottom={1}
            left={1}
            bg="blackAlpha.700"
            px={2}
            py={0.5}
            borderRadius="md"
          >
            <HStack spacing={1}>
              <Text fontSize="xs" fontWeight="500">{user?.username || 'You'} (You)</Text>
              {!isAudioEnabled && <FiMicOff size={12} color="#FC8181" />}
            </HStack>
          </Box>
        </Box>
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
                  key={msg.clientId || msg.id || i}
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
                    <VStack spacing={2} align="stretch">
                      {msg.message && <Text fontSize="sm">{msg.message}</Text>}
                      {msg.status === 'uploading' && (
                        <HStack spacing={2} color="whiteAlpha.900">
                          <Spinner size="sm" />
                          <Text fontSize="xs">Uploading {msg.file_name}...</Text>
                        </HStack>
                      )}
                      {msg.file_id && (
                        <Box
                          display="flex"
                          alignItems="center"
                          gap={2}
                          bg={msg.isMine ? 'blackAlpha.300' : 'whiteAlpha.200'}
                          borderRadius="md"
                          px={2}
                          py={1.5}
                          cursor="pointer"
                          onClick={() => handleDownloadChatFile(msg)}
                          _hover={{ bg: msg.isMine ? 'blackAlpha.400' : 'whiteAlpha.300' }}
                        >
                          <FiFile size={16} />
                          <Box flex={1} minW={0}>
                            <Text fontSize="xs" fontWeight="600" isTruncated>{msg.file_name}</Text>
                            <Text fontSize="10px" opacity={0.8}>{formatFileSize(msg.file_size)}</Text>
                          </Box>
                          <FiDownload size={14} />
                        </Box>
                      )}
                    </VStack>
                  </Box>
                  <Text fontSize="xs" color="gray.500" mt={1}>
                    {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </Text>
                </Box>
              ))}
              <div ref={chatEndRef} />
            </VStack>
            <HStack p={4} borderTop="1px solid" borderColor="whiteAlpha.200">
              <input ref={fileInputRef} type="file" hidden onChange={handleChatFileSelect} />
              <Tooltip label="Attach a file">
                <IconButton
                  icon={<FiPaperclip />}
                  onClick={() => fileInputRef.current?.click()}
                  aria-label="Attach a file"
                  variant="ghost"
                  color="gray.300"
                  _hover={{ bg: 'whiteAlpha.200' }}
                />
              </Tooltip>
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
