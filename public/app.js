(() => {
  const canvas = document.getElementById('canvas');
  const clearBtn = document.getElementById('clearBtn');
  const roomLabel = document.getElementById('roomLabel');
  const ctx = canvas.getContext('2d');

  // Resize canvas to CSS size * devicePixelRatio
  function resize() {
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.round(rect.width * dpr);
    canvas.height = Math.round(rect.height * dpr);
    ctx.scale(dpr, dpr);
    // optional: redraw stored image if using an offscreen buffer
  }
  window.addEventListener('resize', resize);
  resize();

  // Simple drawing state
  let drawing = false;
  let last = null;
  const color = '#111';
  const width = 2;

  // Parse room from URL
  const params = new URLSearchParams(window.location.search);
  const room = params.get('room') || 'default';
  roomLabel.textContent = `room: ${room}`;

  // Setup WebSocket
  const wsProto = (location.protocol === 'https:') ? 'wss:' : 'ws:';
  const wsUrl = `${wsProto}//${location.host}`;
  const ws = new WebSocket(wsUrl);

  ws.addEventListener('open', () => {
    ws.send(JSON.stringify({ type: 'join', room }));
  });

  // Draw helper
  function drawLine(x1, y1, x2, y2, opts = {}) {
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = opts.color || color;
    ctx.lineWidth = opts.width || width;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
  }

  // Incoming messages
  ws.addEventListener('message', (ev) => {
    let data;
    try { data = JSON.parse(ev.data); } catch (e) { return; }
    if (data.type === 'history' && Array.isArray(data.events)) {
      // replay
      data.events.forEach(e => {
        if (e.type === 'draw') {
          for (let i = 1; i < e.points.length; i++) {
            const a = e.points[i - 1], b = e.points[i];
            drawLine(a.x, a.y, b.x, b.y, { color: e.color, width: e.width });
          }
        } else if (e.type === 'clear') {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
        }
      });
    } else if (data.type === 'draw' && data.points) {
      for (let i = 1; i < data.points.length; i++) {
        drawLine(data.points[i-1].x, data.points[i-1].y, data.points[i].x, data.points[i].y, { color: data.color, width: data.width });
      }
    } else if (data.type === 'clear') {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  });

  // Pointer handling
  function getPos(e) {
    const rect = canvas.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    return { x: clientX - rect.left, y: clientY - rect.top };
  }

  function start(e) {
    drawing = true;
    last = getPos(e);
    currentPoints = [last];
    e.preventDefault();
  }

  function move(e) {
    if (!drawing) return;
    const p = getPos(e);
    drawLine(last.x, last.y, p.x, p.y);
    last = p;
    currentPoints.push(p);
    // small throttle: send chunk every N points
    if (currentPoints.length >= 8) {
      sendDraw(currentPoints);
      currentPoints = [currentPoints[currentPoints.length - 1]];
    }
    e.preventDefault();
  }

  function end(e) {
    if (!drawing) return;
    drawing = false;
    if (currentPoints && currentPoints.length > 0) {
      sendDraw(currentPoints);
    }
    currentPoints = [];
    e.preventDefault();
  }

  let currentPoints = [];

  canvas.addEventListener('mousedown', start);
  canvas.addEventListener('mousemove', move);
  canvas.addEventListener('mouseup', end);
  canvas.addEventListener('mouseleave', end);

  canvas.addEventListener('touchstart', start, { passive: false });
  canvas.addEventListener('touchmove', move, { passive: false });
  canvas.addEventListener('touchend', end, { passive: false });

  function sendDraw(points) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: 'draw', points, color, width }));
    }
  }

  clearBtn.addEventListener('click', () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: 'clear' }));
    }
  });
})();
