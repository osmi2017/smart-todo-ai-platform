import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { io } from 'socket.io-client';
import {
  mediaDevices,
  RTCPeerConnection,
  RTCSessionDescription,
  RTCIceCandidate,
  RTCView,
} from 'react-native-webrtc';
import { meetingService } from '../../api/services';
import { useAuth } from '../../context/AuthContext';
import { CONFIG } from '../../config';
import { THEME } from '../../theme';

const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ],
};

const PEER_AVATAR_COLORS = ['#7c3aed', '#2563eb', '#059669', '#d97706', '#dc2626'];

function MediaView({ stream, mirror }) {
  return (
    <View style={styles.tile}>
      <RTCView style={styles.video} streamURL={stream?.toURL() || ''} objectFit="cover" mirror={!!mirror} zOrder={0} />
    </View>
  );
}

export default function VideoMeeting({ route, navigation }) {
  const { id: meetingId } = route.params;
  const { user } = useAuth();

  const [title, setTitle] = useState('Réunion');
  const [isConnected, setIsConnected] = useState(false);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [videoEnabled, setVideoEnabled] = useState(true);
  const [localStream, setLocalStream] = useState(null);
  const [peers, setPeers] = useState([]);
  const [starting, setStarting] = useState(true);
  const [fatalError, setFatalError] = useState(null);
  const [chatOpen, setChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');

  const socketRef = useRef(null);
  const localStreamRef = useRef(null);
  const peerConnectionsRef = useRef(new Map());
  const peerIdRef = useRef(`peer-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`);
  const mountedRef = useRef(true);

  const removePeer = useCallback((peerId) => {
    const entry = peerConnectionsRef.current.get(peerId);
    if (entry) {
      entry.pc.close();
      peerConnectionsRef.current.delete(peerId);
    }
    setPeers((prev) => prev.filter((p) => p.peerId !== peerId));
  }, []);

  const createPeerConnection = useCallback((remotePeerId, remoteUsername) => {
    if (peerConnectionsRef.current.has(remotePeerId)) {
      return peerConnectionsRef.current.get(remotePeerId).pc;
    }

    const pc = new RTCPeerConnection(ICE_SERVERS);

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => {
        pc.addTrack(track, localStreamRef.current);
      });
    }

    pc.onicecandidate = (event) => {
      if (event.candidate && socketRef.current) {
        socketRef.current.emit('ice-candidate', { to: remotePeerId, candidate: event.candidate });
      }
    };

    pc.ontrack = (event) => {
      const stream = event.streams?.[0] || null;
      setPeers((prev) => {
        const existing = prev.find((p) => p.peerId === remotePeerId);
        if (existing) {
          return prev.map((p) => (p.peerId === remotePeerId ? { ...p, stream } : p));
        }
        return [...prev, { peerId: remotePeerId, username: remoteUsername || 'Invité', stream, isAudioEnabled: true, isVideoEnabled: true }];
      });
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'failed' || pc.connectionState === 'disconnected') {
        removePeer(remotePeerId);
      }
    };

    peerConnectionsRef.current.set(remotePeerId, { pc, username: remoteUsername });
    return pc;
  }, [removePeer]);

  const cleanup = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.emit('leave-room');
      socketRef.current.disconnect();
      socketRef.current = null;
    }
    peerConnectionsRef.current.forEach((entry) => entry.pc.close());
    peerConnectionsRef.current.clear();
    setPeers([]);
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((t) => t.stop());
      localStreamRef.current = null;
      setLocalStream(null);
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;

    const setup = async () => {
      let meetingTitle = title;
      try {
        const meeting = await meetingService.get(meetingId);
        meetingTitle = meeting.title;
        if (mountedRef.current) setTitle(meeting.title);
      } catch {
        // non-critical
      }

      try {
        const constraints = {
          audio: { echoCancellation: true, noiseSuppression: true },
          video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' },
        };
        const stream = await mediaDevices.getUserMedia(constraints);
        localStreamRef.current = stream;
        if (mountedRef.current) setLocalStream(stream);
      } catch {
        try {
          const stream = await mediaDevices.getUserMedia({ audio: true });
          localStreamRef.current = stream;
          if (mountedRef.current) {
            setLocalStream(stream);
            setVideoEnabled(false);
          }
        } catch {
          Alert.alert('Permissions', 'Caméra et micro indisponibles. Vous pourrez quand même suivre la réunion.');
        }
      }

      let roomOk = true;
      try {
        await fetch(`${CONFIG.MEETING_SERVICE_URL}/rooms`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            meetingId,
            title: meetingTitle,
            createdBy: user?.username || 'unknown',
          }),
        });
      } catch {
        roomOk = false;
      }
      if (!roomOk) {
        if (mountedRef.current) {
          setStarting(false);
          setFatalError('Serveur de réunion inaccessible. Vérifiez que le meeting-service est démarré.');
        }
        return;
      }

      const socket = io(CONFIG.MEETING_SERVICE_URL, { transports: ['websocket'] });
      socketRef.current = socket;

      socket.on('connect', () => {
        if (!mountedRef.current) return;
        setIsConnected(true);
        socket.emit('join-room', {
          roomId: `meeting-${meetingId}`,
          peerId: peerIdRef.current,
          username: user?.username || 'Invité',
          email: user?.email || '',
        });
        meetingService.update(meetingId, { status: 'in_progress' }).catch(() => {});
      });

      socket.on('room-participants', async ({ participants }) => {
        if (!mountedRef.current) return;
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
            console.error('Erreur offre WebRTC:', err);
          }
        }
      });

      socket.on('user-joined', ({ peerId, username }) => {
        if (!mountedRef.current) return;
        createPeerConnection(peerId, username);
        setPeers((prev) => {
          if (prev.find((p) => p.peerId === peerId)) return prev;
          return [...prev, { peerId, username, stream: null, isAudioEnabled: true, isVideoEnabled: true }];
        });
      });

      socket.on('offer', async ({ from, offer }) => {
        if (!mountedRef.current) return;
        const pc = createPeerConnection(from, 'Participant');
        try {
          await pc.setRemoteDescription(new RTCSessionDescription(offer));
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          socket.emit('answer', { to: from, answer });
        } catch (err) {
          console.error('Erreur réponse WebRTC:', err);
        }
      });

      socket.on('answer', async ({ from, answer }) => {
        const entry = peerConnectionsRef.current.get(from);
        if (entry) {
          try {
            await entry.pc.setRemoteDescription(new RTCSessionDescription(answer));
          } catch (err) {
            console.error('Erreur setRemoteDescription:', err);
          }
        }
      });

      socket.on('ice-candidate', async ({ from, candidate }) => {
        const entry = peerConnectionsRef.current.get(from);
        if (entry) {
          try {
            await entry.pc.addIceCandidate(new RTCIceCandidate(candidate));
          } catch (err) {
            console.error('Erreur addIceCandidate:', err);
          }
        }
      });

      socket.on('user-left', ({ peerId }) => removePeer(peerId));

      socket.on('peer-media-toggle', ({ peerId, kind, enabled }) => {
        setPeers((prev) =>
          prev.map((p) =>
            p.peerId === peerId ? { ...p, [kind === 'audio' ? 'isAudioEnabled' : 'isVideoEnabled']: enabled } : p
          )
        );
      });

      socket.on('chat-message', ({ from, username, message, created_at }) => {
        if (!mountedRef.current) return;
        setChatMessages((prev) => {
          if (prev.some((m) => m.clientId === `${from}-${created_at}`)) return prev;
          return [...prev, {
            clientId: `${from}-${created_at}`,
            mine: false,
            username,
            message: message || '',
            time: created_at || new Date().toISOString(),
          }];
        });
      });

      socket.on('disconnect', () => {
        if (mountedRef.current) setIsConnected(false);
      });

      socket.on('error', ({ message }) => {
        if (mountedRef.current) {
          setStarting(false);
          setFatalError(message || 'Erreur de connexion à la réunion.');
        }
      });

      if (mountedRef.current) setStarting(false);
    };

    setup();

    return () => {
      mountedRef.current = false;
      cleanup();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [meetingId, user?.id, user?.username, user?.email, cleanup, createPeerConnection, removePeer]);

  const loadChatHistory = useCallback(async () => {
    try {
      const history = await meetingService.chatMessages(meetingId);
      const messages = Array.isArray(history) ? history : history.results || [];
      setChatMessages((prev) => {
        const merged = [...messages.map((m) => ({
          clientId: `api-${m.id}`,
          mine: m.username === user?.username,
          username: m.username,
          message: m.message || '',
          time: m.created_at,
        })), ...prev];
        return merged;
      });
    } catch {
      // l'historique est optionnel
    }
  }, [meetingId, user?.username]);

  useEffect(() => {
    loadChatHistory();
    const timer = setInterval(loadChatHistory, 3000);
    return () => clearInterval(timer);
  }, [loadChatHistory]);

  const toggleAudio = () => {
    const track = localStreamRef.current?.getAudioTracks()[0];
    if (track) {
      track.enabled = !track.enabled;
      const enabled = track.enabled;
      setAudioEnabled(enabled);
      socketRef.current?.emit('toggle-audio', { enabled });
    }
  };

  const toggleVideo = () => {
    const track = localStreamRef.current?.getVideoTracks()[0];
    if (track) {
      track.enabled = !track.enabled;
      const enabled = track.enabled;
      setVideoEnabled(enabled);
      socketRef.current?.emit('toggle-video', { enabled });
    }
  };

  const leaveMeeting = () => {
    cleanup();
    navigation.goBack();
  };

  const confirmLeave = () => {
    Alert.alert('Quitter la réunion', 'Voulez-vous quitter cette réunion ?', [
      { text: 'Rester', style: 'cancel' },
      { text: 'Quitter', style: 'destructive', onPress: leaveMeeting },
    ]);
  };

  const sendChat = () => {
    const text = chatInput.trim();
    if (!text || !socketRef.current) return;
    setChatInput('');
    const now = new Date().toISOString();
    const local = {
      clientId: `${peerIdRef.current}-${Date.now()}`,
      mine: true,
      username: user?.username || 'Vous',
      message: text,
      time: now,
    };
    setChatMessages((prev) => [...prev, local]);
    socketRef.current.emit('chat-message', { message: text, id: null, created_at: now });
    meetingService.sendChat(meetingId, text).catch(() => {});
  };

  const ChatModal = (
    <Modal visible={chatOpen} animationType="slide" transparent>
      <View style={styles.chatOverlay}>
        <View style={styles.chatPanel}>
          <View style={styles.chatHeader}>
            <Text style={styles.chatTitle}>Messages</Text>
            <Pressable onPress={() => setChatOpen(false)} hitSlop={10}>
              <Ionicons name="close" size={24} color="#fff" />
            </Pressable>
          </View>
          <ScrollView style={styles.chatList} contentContainerStyle={styles.chatListContent}>
            {chatMessages.length === 0 ? (
              <Text style={styles.chatEmpty}>Aucun message. Lancez la conversation !</Text>
            ) : (
              chatMessages.map((m, i) => (
                <View key={m.clientId || i} style={[styles.chatBubble, m.mine ? styles.chatBubbleMine : styles.chatBubbleOther]}>
                  {!m.mine ? <Text style={styles.chatAuthor}>{m.username}</Text> : null}
                  <Text style={styles.chatBody}>{m.message}</Text>
                </View>
              ))
            )}
          </ScrollView>
          <View style={styles.chatInputRow}>
            <TextInput
              style={styles.chatInput}
              value={chatInput}
              onChangeText={setChatInput}
              placeholder="Écrire un message…"
              placeholderTextColor="#9ca3af"
              onSubmitEditing={sendChat}
            />
            <Pressable onPress={sendChat} disabled={!chatInput.trim()} style={styles.chatSend}>
              <Ionicons name="send" size={18} color="#fff" />
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );

  if (starting && !fatalError) {
    return (
      <SafeAreaView style={styles.screen}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={THEME.colors.brand[500]} />
          <Text style={styles.joiningText}>Connexion à la réunion…</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (fatalError) {
    return (
      <SafeAreaView style={styles.screen}>
        <View style={styles.centered}>
          <Ionicons name="cloud-offline-outline" size={48} color={THEME.colors.danger} />
          <Text style={styles.fatalTitle}>Réunion indisponible</Text>
          <Text style={styles.fatalText}>{fatalError}</Text>
          <View style={styles.fatalBtnRow}>
            <Pressable style={styles.fatalBtn} onPress={() => { setFatalError(null); setStarting(true); }}>
              <Text style={styles.fatalBtnText}>Réessayer</Text>
            </Pressable>
            <Pressable style={[styles.fatalBtn, styles.fatalBtnGhost]} onPress={() => navigation.goBack()}>
              <Text style={styles.fatalBtnText}>Retour</Text>
            </Pressable>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  const activePeers = peers.filter((p) => p.stream);

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text numberOfLines={1} style={styles.headerTitle}>{title}</Text>
          <View style={[styles.dot, { backgroundColor: isConnected ? '#22c55e' : '#ef4444' }]} />
        </View>
        <Text style={styles.participantCount}>{peers.length + 1} participant(s)</Text>
      </View>

      <ScrollView style={styles.videoScroll} contentContainerStyle={styles.videoGrid}>
        {activePeers.map((p) => (
          <View key={p.peerId} style={styles.tileWrap}>
            {p.stream && p.isVideoEnabled ? (
              <MediaView stream={p.stream} />
            ) : (
              <View style={styles.avatarTile}>
                <View style={[styles.avatarCircle, { backgroundColor: PEER_AVATAR_COLORS[p.peerId.length % PEER_AVATAR_COLORS.length] }]}>
                  <Text style={styles.avatarText}>{(p.username || '?')[0].toUpperCase()}</Text>
                </View>
              </View>
            )}
            <View style={styles.tileBadge}>
              {!p.isAudioEnabled ? <Ionicons name="mic-off" size={12} color="#fff" /> : null}
              <Text style={styles.tileName}>{p.username}</Text>
            </View>
          </View>
        ))}
        {activePeers.length === 0 ? (
          <View style={styles.waiting}>
            <Ionicons name="people-outline" size={40} color="#64748b" />
            <Text style={styles.waitingText}>En attente d'autres participants…</Text>
          </View>
        ) : null}
      </ScrollView>

      <View style={styles.localPip}>
        {localStream && videoEnabled ? (
          <RTCView style={styles.localVideo} streamURL={localStream.toURL()} objectFit="cover" mirror zOrder={1} />
        ) : (
          <View style={styles.localAvatar}>
            <Text style={styles.localAvatarText}>{(user?.username || 'Vous')[0].toUpperCase()}</Text>
          </View>
        )}
        <View style={styles.localBadge}>
          <Text style={styles.localName}>{user?.username || 'Vous'}</Text>
          {!audioEnabled ? <Ionicons name="mic-off" size={12} color="#fff" /> : null}
        </View>
      </View>

      <View style={styles.controls}>
        <Pressable onPress={toggleAudio} style={[styles.ctrlBtn, !audioEnabled && styles.ctrlBtnOff]}>
          <Ionicons name={audioEnabled ? 'mic' : 'mic-off'} size={22} color="#fff" />
        </Pressable>
        <Pressable onPress={toggleVideo} style={[styles.ctrlBtn, !videoEnabled && styles.ctrlBtnOff]}>
          <Ionicons name={videoEnabled ? 'videocam' : 'videocam-off'} size={22} color="#fff" />
        </Pressable>
        <Pressable onPress={() => setChatOpen((o) => !o)} style={styles.ctrlBtn}>
          <Ionicons name="chatbubbles" size={22} color="#fff" />
        </Pressable>
        <Pressable onPress={confirmLeave} style={[styles.ctrlBtn, styles.ctrlBtnLeave]}>
          <Ionicons name="call" size={22} color="#fff" />
        </Pressable>
      </View>

      {ChatModal}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#0f172a' },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 12 },
  joiningText: { color: '#cbd5e1', fontSize: THEME.text.md, marginTop: 8 },
  fatalTitle: { color: '#fff', fontSize: THEME.text.lg, fontWeight: '700', marginTop: 12 },
  fatalText: { color: '#94a3b8', fontSize: THEME.text.sm, textAlign: 'center' },
  fatalBtnRow: { flexDirection: 'row', gap: 10, marginTop: 12 },
  fatalBtn: { backgroundColor: THEME.colors.brand[600], paddingHorizontal: 20, paddingVertical: 10, borderRadius: THEME.radii.lg },
  fatalBtnGhost: { backgroundColor: 'transparent', borderWidth: 1, borderColor: '#475569' },
  fatalBtnText: { color: '#fff', fontWeight: '700' },

  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#1e293b' },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 },
  headerTitle: { color: '#fff', fontSize: THEME.text.md, fontWeight: '700', flexShrink: 1 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  participantCount: { color: '#94a3b8', fontSize: THEME.text.xs },

  videoScroll: { flex: 1 },
  videoGrid: { padding: 12, gap: 10, flexGrow: 1 },
  tileWrap: { width: '100%', aspectRatio: 4 / 3, borderRadius: THEME.radii.md, overflow: 'hidden', backgroundColor: '#1e293b' },
  tile: { flex: 1 },
  video: { flex: 1, backgroundColor: '#1e293b' },
  avatarTile: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  avatarCircle: { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#fff', fontSize: 28, fontWeight: '800' },
  tileBadge: { position: 'absolute', bottom: 8, left: 8, flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(0,0,0,0.6)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999 },
  tileName: { color: '#fff', fontSize: THEME.text.xs, fontWeight: '600' },

  waiting: { flex: 1, minHeight: 220, alignItems: 'center', justifyContent: 'center', gap: 10 },
  waitingText: { color: '#64748b', fontSize: THEME.text.md },

  localPip: { position: 'absolute', top: 70, right: 12, width: 110, height: 150, borderRadius: THEME.radii.md, overflow: 'hidden', borderWidth: 2, borderColor: THEME.colors.brand[500], backgroundColor: '#1e293b', zIndex: 10 },
  localVideo: { flex: 1, backgroundColor: '#1e293b' },
  localAvatar: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: THEME.colors.brand[600] },
  localAvatarText: { color: '#fff', fontSize: 32, fontWeight: '800' },
  localBadge: { position: 'absolute', bottom: 4, left: 4, flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(0,0,0,0.6)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 999 },
  localName: { color: '#fff', fontSize: 10, fontWeight: '600' },

  controls: { flexDirection: 'row', justifyContent: 'center', gap: 18, paddingVertical: 18, borderTopWidth: 1, borderTopColor: '#1e293b' },
  ctrlBtn: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', backgroundColor: '#334155' },
  ctrlBtnOff: { backgroundColor: '#dc2626' },
  ctrlBtnLeave: { backgroundColor: '#dc2626' },

  chatOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  chatPanel: { height: '75%', backgroundColor: '#1e293b', borderTopLeftRadius: 20, borderTopRightRadius: 20, overflow: 'hidden' },
  chatHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#334155' },
  chatTitle: { color: '#fff', fontSize: THEME.text.lg, fontWeight: '700' },
  chatList: { flex: 1 },
  chatListContent: { padding: 16, gap: 8 },
  chatEmpty: { color: '#64748b', textAlign: 'center', marginTop: 24 },
  chatBubble: { maxWidth: '80%', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12 },
  chatBubbleMine: { alignSelf: 'flex-end', backgroundColor: THEME.colors.brand[600] },
  chatBubbleOther: { alignSelf: 'flex-start', backgroundColor: '#334155' },
  chatAuthor: { color: '#93c5fd', fontSize: 11, fontWeight: '700', marginBottom: 2 },
  chatBody: { color: '#fff', fontSize: THEME.text.sm },
  chatInputRow: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, borderTopWidth: 1, borderTopColor: '#334155' },
  chatInput: { flex: 1, backgroundColor: '#0f172a', color: '#fff', borderRadius: 999, paddingHorizontal: 16, paddingVertical: 10, fontSize: THEME.text.sm },
  chatSend: { width: 40, height: 40, borderRadius: 20, backgroundColor: THEME.colors.brand[600], alignItems: 'center', justifyContent: 'center' },
});