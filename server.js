const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const { v4: uuidv4 } = require('uuid');
const path = require('path');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// Serve static frontend
app.use(express.static(path.join(__dirname, 'public')));

// Simple in-memory room strokes store (small, for prototypes only)
const rooms = new Map(); // roomId -> array of events

function broadcastUserList(room) {
  const clients = [];
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN && client.room === room) {
      clients.push({ id: client.id, username: client.username || 'anonymous' });
    }
  });
  const payload = JSON.stringify({ type: 'users', users: clients });
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN && client.room === room) {
      client.send(payload);
    }
  });
}

wss.on('connection', (ws, req) => {
  ws.id = uuidv4();
  ws.room = null;
  ws.username = 'anonymous';

  ws.on('message', (message) => {
    let data;
    try {
      data = JSON.parse(message);
    } catch (err) {
      console.warn('Invalid JSON', err);
      return;
    }

    // Join room
    if (data.type === 'join') {
      const room = data.room || 'default';
      ws.room = room;
      if (!rooms.has(room)) rooms.set(room, []);
      // Send existing history to the new client
      const history = rooms.get(room);
      ws.send(JSON.stringify({ type: 'history', events: history }));
      // optionally set username if provided
      if (data.username) ws.username = data.username;
      // broadcast updated user list
      broadcastUserList(room);
      return;
    }

    // Set or update username
    if (data.type === 'set_username') {
      ws.username = data.username || ws.username || 'anonymous';
      if (ws.room) broadcastUserList(ws.room);
      return;
    }

    // Broadcast draw events to others in same room and save to history
    if (ws.room) {
      const payload = Object.assign({}, data, { from: ws.id, fromUsername: ws.username, ts: Date.now() });
      // Persist some event types
      if (data.type === 'draw' || data.type === 'clear') {
        rooms.get(ws.room).push(payload);
        // cap history size
        if (rooms.get(ws.room).length > 2000) rooms.get(ws.room).shift();
      }
      // Broadcast
      wss.clients.forEach((client) => {
        if (client !== ws && client.readyState === WebSocket.OPEN && client.room === ws.room) {
          client.send(JSON.stringify(payload));
        }
      });
    }
  });

  ws.on('close', () => {
    if (ws.room) {
      // notify remaining clients
      broadcastUserList(ws.room);
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`fliwr server listening on http://localhost:${PORT}`);
});
