const express = require('express');
const cors = require('cors');
const http = require('http');
const WebSocket = require('ws');
require('dotenv').config();

const authRoutes = require('./routes/auth');
const roomRoutes = require('./routes/rooms');
const gameRoutes = require('./routes/game');
const leaderboardRoutes = require('./routes/leaderboard');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

app.use(cors());
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/rooms', roomRoutes);
app.use('/api', gameRoutes);
app.use('/api', leaderboardRoutes);

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

const clients = new Map();

wss.on('connection', (ws) => {
  console.log('New WebSocket connection');

  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);

      if (data.type === 'authenticate') {
        clients.set(data.userId, ws);
        ws.userId = data.userId;
        console.log(`User ${data.userId} authenticated`);
      } else if (data.type === 'join_room') {
        ws.roomId = data.roomId;
        broadcastToRoom(data.roomId, {
          type: 'room_updated',
          message: 'A user joined the room',
        });
      } else if (data.type === 'leave_room') {
        broadcastToRoom(ws.roomId, {
          type: 'room_updated',
          message: 'A user left the room',
        });
        ws.roomId = null;
      }
    } catch (error) {
      console.error('WebSocket message error:', error);
    }
  });

  ws.on('close', () => {
    if (ws.userId) {
      clients.delete(ws.userId);
      console.log(`User ${ws.userId} disconnected`);
    }
    if (ws.roomId) {
      broadcastToRoom(ws.roomId, {
        type: 'room_updated',
        message: 'A user disconnected',
      });
    }
  });

  ws.on('error', (error) => {
    console.error('WebSocket error:', error);
  });
});

function broadcastToRoom(roomId, message) {
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN && client.roomId === roomId) {
      client.send(JSON.stringify(message));
    }
  });
}

function notifyUser(userId, message) {
  const client = clients.get(userId);
  if (client && client.readyState === WebSocket.OPEN) {
    client.send(JSON.stringify(message));
  }
}

app.locals.broadcastToRoom = broadcastToRoom;
app.locals.notifyUser = notifyUser;

const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

module.exports = { app, server, wss };
