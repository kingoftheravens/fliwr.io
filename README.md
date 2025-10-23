# fliwr — Minimal Florr-like realtime canvas

This is a tiny prototype for a Florr-like real-time collaborative canvas called "fliwr".

Features
- Real-time drawing synchronized over WebSocket.
- Rooms (join ?room=name) — simple in-memory history replay for new clients.
- Minimal frontend (no framework) so you can quickly iterate.

Quick start (local)
1. Install dependencies:
   ```
   npm install
   ```
2. Run:
   ```
   npm start
   ```
3. Open two browser windows at `http://localhost:3000/?room=test` and draw — strokes will sync.

Files
- server.js — Express static server + WebSocket server handling rooms and event broadcast.
- public/index.html — frontend UI and canvas.
- public/app.js — canvas interaction and WebSocket client.
- public/style.css — minimal styles.

Deployment notes
- You need to register `fliwr.io` (or any domain) with a domain registrar.
- For production, run behind a process manager (pm2 or systemd) and use HTTPS (nginx + certbot) or deploy to platforms like Render, Fly.io, Heroku, or Vercel (frontend + a separate WebSocket-capable backend).
- The server keeps in-memory history; for persistence and scale use Redis or a DB and scale WebSocket via sticky sessions or a pub/sub layer.

Extending
- Add authentication + identity/username per client.
- Add different tool types (line, brush, shapes, text, images).
- Implement undo/redo and per-client layers.
- Add rate-limiting and sanitization.
- Add user cursors and presence indicators.

License: MIT
