const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config();

const app = express();
const server = http.createServer(app);

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';
const PORT = process.env.PORT || 4000;

const io = new Server(server, {
  cors: {
    origin: FRONTEND_URL,
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

app.use(cors({ origin: FRONTEND_URL, credentials: true }));
app.use(express.json());

// In-memory room state
const rooms = new Map();

// ---- REST endpoints ----

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.post('/rooms', (req, res) => {
  const { meetingId, title, createdBy } = req.body;
  if (!meetingId) {
    return res.status(400).json({ error: 'meetingId is required' });
  }

  const roomId = `meeting-${meetingId}`;
  if (!rooms.has(roomId)) {
    rooms.set(roomId, {
      roomId,
      meetingId,
      title: title || `Meeting ${meetingId}`,
      createdBy: createdBy || 'unknown',
      participants: new Map(),
      createdAt: new Date().toISOString(),
    });
  }

  const room = rooms.get(roomId);
  res.json({
    roomId: room.roomId,
    meetingId: room.meetingId,
    title: room.title,
    participantCount: room.participants.size,
    createdAt: room.createdAt,
  });
});

app.get('/rooms/:roomId', (req, res) => {
  const room = rooms.get(req.params.roomId);
  if (!room) {
    return res.status(404).json({ error: 'Room not found' });
  }

  const participants = [];
  for (const [, p] of room.participants) {
    participants.push({
      peerId: p.peerId,
      username: p.username,
      email: p.email,
      isAudioEnabled: p.isAudioEnabled,
      isVideoEnabled: p.isVideoEnabled,
    });
  }

  res.json({
    roomId: room.roomId,
    meetingId: room.meetingId,
    title: room.title,
    participants,
    createdAt: room.createdAt,
  });
});

app.get('/rooms/:roomId/active', (req, res) => {
  const room = rooms.get(req.params.roomId);
  res.json({ active: !!room && room.participants.size > 0 });
});

// ---- Socket.IO signaling ----

io.on('connection', (socket) => {
  let currentRoom = null;
  let currentPeerId = null;

  socket.on('join-room', ({ roomId, peerId, username, email }) => {
    if (!roomId || !peerId) return;

    const room = rooms.get(roomId);
    if (!room) {
      socket.emit('error', { message: 'Room does not exist. Create it first via POST /rooms.' });
      return;
    }

    currentRoom = roomId;
    currentPeerId = peerId;

    room.participants.set(peerId, {
      peerId,
      socketId: socket.id,
      username: username || 'Guest',
      email: email || '',
      isAudioEnabled: true,
      isVideoEnabled: true,
      joinedAt: new Date().toISOString(),
    });

    socket.join(roomId);

    // Tell existing participants about the newcomer
    socket.to(roomId).emit('user-joined', {
      peerId,
      username: username || 'Guest',
      email: email || '',
    });

    // Send the newcomer the list of current participants (excluding themselves)
    const existingPeers = [];
    for (const [id, p] of room.participants) {
      if (id !== peerId) {
        existingPeers.push({
          peerId: p.peerId,
          username: p.username,
          email: p.email,
          isAudioEnabled: p.isAudioEnabled,
          isVideoEnabled: p.isVideoEnabled,
        });
      }
    }
    socket.emit('room-participants', { participants: existingPeers });
  });

  // WebRTC signaling
  socket.on('offer', ({ to, offer }) => {
    const room = rooms.get(currentRoom);
    if (!room) return;
    const target = room.participants.get(to);
    if (target) {
      io.to(target.socketId).emit('offer', { from: currentPeerId, offer });
    }
  });

  socket.on('answer', ({ to, answer }) => {
    const room = rooms.get(currentRoom);
    if (!room) return;
    const target = room.participants.get(to);
    if (target) {
      io.to(target.socketId).emit('answer', { from: currentPeerId, answer });
    }
  });

  socket.on('ice-candidate', ({ to, candidate }) => {
    const room = rooms.get(currentRoom);
    if (!room) return;
    const target = room.participants.get(to);
    if (target) {
      io.to(target.socketId).emit('ice-candidate', { from: currentPeerId, candidate });
    }
  });

  // Media state toggling
  socket.on('toggle-audio', ({ enabled }) => {
    if (!currentRoom || !currentPeerId) return;
    const room = rooms.get(currentRoom);
    if (!room) return;
    const participant = room.participants.get(currentPeerId);
    if (participant) {
      participant.isAudioEnabled = enabled;
      socket.to(currentRoom).emit('peer-media-toggle', {
        peerId: currentPeerId,
        kind: 'audio',
        enabled,
      });
    }
  });

  socket.on('toggle-video', ({ enabled }) => {
    if (!currentRoom || !currentPeerId) return;
    const room = rooms.get(currentRoom);
    if (!room) return;
    const participant = room.participants.get(currentPeerId);
    if (participant) {
      participant.isVideoEnabled = enabled;
      socket.to(currentRoom).emit('peer-media-toggle', {
        peerId: currentPeerId,
        kind: 'video',
        enabled,
      });
    }
  });

  // Screen share notification
  socket.on('screen-share-started', () => {
    if (currentRoom) {
      socket.to(currentRoom).emit('peer-screen-share', {
        peerId: currentPeerId,
        sharing: true,
      });
    }
  });

  socket.on('screen-share-stopped', () => {
    if (currentRoom) {
      socket.to(currentRoom).emit('peer-screen-share', {
        peerId: currentPeerId,
        sharing: false,
      });
    }
  });

  // Chat message
  socket.on('chat-message', ({ message }) => {
    if (!currentRoom || !currentPeerId) return;
    const room = rooms.get(currentRoom);
    if (!room) return;
    const participant = room.participants.get(currentPeerId);
    socket.to(currentRoom).emit('chat-message', {
      from: currentPeerId,
      username: participant?.username || 'Guest',
      message,
      timestamp: new Date().toISOString(),
    });
  });

  // Leave room
  socket.on('leave-room', () => {
    handleLeave(socket);
  });

  socket.on('disconnect', () => {
    handleLeave(socket);
  });

  function handleLeave(sock) {
    if (!currentRoom || !currentPeerId) return;
    const room = rooms.get(currentRoom);
    if (room) {
      room.participants.delete(currentPeerId);
      sock.to(currentRoom).emit('user-left', { peerId: currentPeerId });

      // Clean up empty rooms after a delay
      if (room.participants.size === 0) {
        setTimeout(() => {
          const r = rooms.get(currentRoom);
          if (r && r.participants.size === 0) {
            rooms.delete(currentRoom);
          }
        }, 60000);
      }
    }
    sock.leave(currentRoom);
    currentRoom = null;
    currentPeerId = null;
  }
});

server.listen(PORT, () => {
  console.log(`Meeting service running on port ${PORT}`);
});
