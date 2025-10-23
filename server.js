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

wss.on('connection', (ws, req) => {
  ws.id = uuidv4();
  ws.room = null;

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
      return;
    }

    // Broadcast draw events to others in same room and save to history
    if (ws.room) {
      const payload = Object.assign({}, data, { from: ws.id, ts: Date.now() });
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
    // noop for now
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`fliwr server listening on http://localhost:${PORT}`);
});
