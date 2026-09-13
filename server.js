const path = require('path');
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Serve static files from the project root (index.html, games, assets)
app.use(express.static(__dirname));

// ------ In-memory game state (simple & volatile) ------
// Map of socket.id -> player state
//   { username, x, y, radius, color }
const players = {};

const BAD_WORDS = ['fuck', 'shit', 'bitch', 'cunt', 'dick', 'piss', 'whore', 'asshole', 'nigger', 'fag'];
const bannedIps = new Set();
function containsBadWord(name = '') {
  const lower = name.toLowerCase();
  return BAD_WORDS.some(w => lower.includes(w));
}

io.on('connection', (socket) => {
  const ip = socket.handshake.address;
  if (bannedIps.has(ip)) {
    console.log('Rejected banned IP:', ip);
    socket.disconnect(true);
    return;
  }
  console.log('Player connected:', socket.id);

  // When the client sends their username & preferred blob color
  socket.on('register', (data) => {
    if (containsBadWord(data.username)) {
      socket.emit('usernameRejected', 'Inappropriate username. You have been banned.');
      bannedIps.add(ip);
      socket.disconnect(true);
      return;
    }
    players[socket.id] = {
      username: data.username || 'Anon',
      x: 0,
      y: 0,
      radius: 24,
      color: data.color || '#4cf',
    };

    // Send the complete player list to the newcomer
    socket.emit('currentPlayers', players);

    // Notify everybody else about the new player
    socket.broadcast.emit('newPlayer', { id: socket.id, ...players[socket.id] });
  });

  // Receive periodic position / size updates from this player
  socket.on('update', (data) => {
    if (!players[socket.id]) return; // not yet registered
    players[socket.id].x = data.x;
    players[socket.id].y = data.y;
    players[socket.id].radius = data.radius;

    // Relay this update to all other clients (excluding sender)
    socket.broadcast.emit('playerMoved', {
      id: socket.id,
      x: data.x,
      y: data.y,
      radius: data.radius,
      color: players[socket.id].color,
      username: players[socket.id].username,
    });
  });

  socket.on('disconnect', () => {
    console.log('Player disconnected:', socket.id);
    delete players[socket.id];
    io.emit('playerDisconnect', socket.id);
  });
});

const PORT = process.env.PORT || 3000;

// ================= BLADE ARENA 2 — online multiplayer room =================
// Server-simulated arena: players + bots + shards. Tick 30Hz, snapshots 20Hz.
const ARENA2 = {
  WORLD: 3600,
  players: new Map(), // socket.id -> player
  bots: [],
  shards: [],
};
const A2R = (a, b) => a + Math.random() * (b - a);
function a2Bot() {
  const a = Math.random() * 6.283, r = A2R(500, 1800);
  return { x: Math.cos(a) * r, y: Math.sin(a) * r, r: 19, blades: Math.floor(A2R(2, 7)), rot: A2R(0, 6.283), vx: 0, vy: 0, phase: A2R(0, 6.283), speed: A2R(180, 260) };
}
function a2Shard() {
  const a = Math.random() * 6.283, r = A2R(350, ARENA2.WORLD * 0.9);
  return { x: Math.cos(a) * r, y: Math.sin(a) * r, r: 8, coin: Math.random() < 0.12, seed: A2R(0, 6.28) };
}
function a2Bp(o, i) {
  const n = Math.max(1, o.blades), a = o.rot + (i * 6.283) / n, rr = o.r + 31;
  return { x: o.x + Math.cos(a) * rr, y: o.y + Math.sin(a) * rr };
}
function a2Dist(a, b) { return Math.hypot(a.x - b.x, a.y - b.y); }
for (let i = 0; i < 12; i++) ARENA2.bots.push(a2Bot());
for (let i = 0; i < 45; i++) ARENA2.shards.push(a2Shard());

function a2NearestPlayer(x, y) {
  let best = null, bd = Infinity;
  for (const p of ARENA2.players.values()) {
    if (!p.alive) continue;
    const d = (p.x - x) ** 2 + (p.y - y) ** 2;
    if (d < bd) { bd = d; best = p; }
  }
  return best;
}

function a2Tick() {
  const dt = 1 / 30, WORLD = ARENA2.WORLD;
  // players
  for (const p of ARENA2.players.values()) {
    if (!p.alive) {
      p.respawn -= dt;
      if (p.respawn <= 0) {
        const a = Math.random() * 6.283, r = A2R(500, 1500);
        p.x = Math.cos(a) * r; p.y = Math.sin(a) * r;
        p.vx = p.vy = 0; p.blades = 3; p.rot = 0; p.dash = 0; p.cd = 0; p.shield = 2; p.alive = true;
      }
      continue;
    }
    // dash queued from client
    if (p.dashQueued) {
      p.dashQueued = false;
      if (p.cd <= 0) {
        let dx = p.dashDX, dy = p.dashDY;
        const L = Math.hypot(dx, dy) || 1; dx /= L; dy /= L;
        p.vx = dx * 1700; p.vy = dy * 1700;
        p.x += dx * 110; p.y += dy * 110;
        p.dash = 0.2; p.cd = 0.65; p.shield = 0.3;
      }
    }
    const ix = p.input.x || 0, iy = p.input.y || 0;
    const mag = Math.min(1, Math.hypot(ix, iy));
    let nx = 0, ny = 0;
    if (mag > 0.12) { nx = ix / (Math.hypot(ix, iy) || 1); ny = iy / (Math.hypot(ix, iy) || 1); }
    const sp = (p.dash > 0 ? 1700 : 800) * (mag > 0.12 ? Math.max(.35, mag) : 1);
    const k = 1 - Math.exp(-dt * 30);
    if (mag > 0.12) { p.vx += (nx * sp - p.vx) * k; p.vy += (ny * sp - p.vy) * k; }
    else { p.vx *= 0.9; p.vy *= 0.9; }
    p.x += p.vx * dt; p.y += p.vy * dt; p.rot += dt * 7;
    p.dash = Math.max(0, p.dash - dt); p.cd = Math.max(0, p.cd - dt); p.shield = Math.max(0, p.shield - dt);
    const rr = Math.hypot(p.x, p.y);
    if (rr > WORLD) { const a = Math.atan2(p.y, p.x); p.x = Math.cos(a) * WORLD; p.y = Math.sin(a) * WORLD; }
  }
  // bots (target nearest player)
  for (const b of ARENA2.bots) {
    b.rot += dt * 4.2; b.phase += dt;
    const tgt = a2NearestPlayer(b.x, b.y);
    let tx, ty;
    if (tgt) {
      const dx = tgt.x - b.x, dy = tgt.y - b.y, d = Math.hypot(dx, dy) || 1;
      if (d < 1100) {
        const s = Math.sin(b.phase) > 0 ? 1 : -1;
        tx = (dx / d) * 0.4 - (dy / d) * s; ty = (dy / d) * 0.4 + (dx / d) * s;
        if (d < 330) { tx = -dx / d; ty = -dy / d; }
      } else { tx = Math.cos(b.phase); ty = Math.sin(b.phase); }
    } else { tx = Math.cos(b.phase); ty = Math.sin(b.phase); }
    const q = Math.hypot(tx, ty) || 1; tx /= q; ty /= q;
    b.vx += (tx * b.speed - b.vx) * Math.min(1, dt * 5);
    b.vy += (ty * b.speed - b.vy) * Math.min(1, dt * 5);
    b.x += b.vx * dt; b.y += b.vy * dt;
  }
  // pickups
  for (const p of ARENA2.players.values()) {
    if (!p.alive) continue;
    for (let i = ARENA2.shards.length - 1; i >= 0; i--) {
      const s = ARENA2.shards[i];
      if (Math.hypot(p.x - s.x, p.y - s.y) < p.r + 18) {
        if (s.coin) p.coins += 8; else p.blades++;
        ARENA2.shards.splice(i, 1); ARENA2.shards.push(a2Shard());
      }
    }
  }
  // combat: players vs bots
  for (const p of ARENA2.players.values()) {
    if (!p.alive) continue;
    for (let bi = ARENA2.bots.length - 1; bi >= 0; bi--) {
      const b = ARENA2.bots[bi];
      for (let i = 0; i < p.blades; i++) {
        if (a2Dist(a2Bp(p, i), b) < b.r + 10) {
          b.blades--;
          if (b.blades <= 0) { ARENA2.bots.splice(bi, 1); ARENA2.bots.push(a2Bot()); p.kills++; p.coins += 10; }
          break;
        }
      }
    }
  }
  // combat: players vs players + bots vs players
  const alive = [...ARENA2.players.values()].filter(p => p.alive);
  for (const p of alive) {
    // bot blades hit player
    if (p.shield <= 0) {
      for (const b of ARENA2.bots) {
        for (let i = 0; i < b.blades; i++) {
          if (a2Dist(a2Bp(b, i), p) < p.r + 10) { killPlayer(p, null); break; }
        }
        if (!p.alive) break;
      }
    }
    if (!p.alive) continue;
    // enemy player blades hit player
    for (const q of alive) {
      if (q === p || !q.alive || q.shield > 0 && false) continue;
      if (p.shield > 0) continue;
      for (let i = 0; i < q.blades; i++) {
        if (a2Dist(a2Bp(q, i), p) < p.r + 10) { killPlayer(p, q); break; }
      }
      if (!p.alive) break;
    }
  }
}
function killPlayer(victim, killer) {
  if (!victim.alive) return;
  victim.alive = false; victim.respawn = 3; victim.vx = victim.vy = 0;
  if (killer) { killer.kills++; killer.coins += 15; }
  for (let i = 0; i < 10; i++) ARENA2.shards.push(a2Shard());
  while (ARENA2.shards.length > 70) ARENA2.shards.shift();
}
setInterval(() => { try { a2Tick(); } catch (e) { console.error('arena2 tick', e); } }, 1000 / 30);
setInterval(() => {
  const players = [...ARENA2.players.values()].map(p => ({
    id: p.id, name: p.name, x: Math.round(p.x), y: Math.round(p.y),
    vx: Math.round(p.vx), vy: Math.round(p.vy), r: p.r, blades: p.blades,
    rot: +p.rot.toFixed(2), alive: p.alive, kills: p.kills, coins: p.coins, shield: +p.shield.toFixed(2),
  }));
  io.to('arena2').emit('arena2-snap', { t: Date.now(), players, bots: ARENA2.bots, shards: ARENA2.shards });
}, 1000 / 20);

io.on('connection', (socket) => {
  // ---- Blade Arena 2 ----
  socket.on('arena2-join', (data = {}) => {
    let name = String(data.name || 'Player').slice(0, 14) || 'Player';
    if (containsBadWord(name)) name = 'Player';
    const a = Math.random() * 6.283, r = A2R(500, 1500);
    ARENA2.players.set(socket.id, {
      id: socket.id, name,
      x: Math.cos(a) * r, y: Math.sin(a) * r, vx: 0, vy: 0,
      r: 21, blades: 3, rot: 0, dash: 0, cd: 0, shield: 2,
      alive: true, respawn: 0, kills: 0, coins: 0,
      input: { x: 0, y: 0 }, dashQueued: false, dashDX: 1, dashDY: 0,
    });
    socket.join('arena2');
    socket.emit('arena2-init', { id: socket.id });
    console.log('arena2 join:', name, socket.id, 'total:', ARENA2.players.size);
  });
  socket.on('arena2-input', (d = {}) => {
    const p = ARENA2.players.get(socket.id);
    if (!p) return;
    const x = Math.max(-1, Math.min(1, +d.x || 0)), y = Math.max(-1, Math.min(1, +d.y || 0));
    p.input.x = x; p.input.y = y;
  });
  socket.on('arena2-dash', (d = {}) => {
    const p = ARENA2.players.get(socket.id);
    if (!p || !p.alive) return;
    let dx = +d.x, dy = +d.y;
    if (!isFinite(dx) || !isFinite(dy) || (dx === 0 && dy === 0)) {
      const m = Math.hypot(p.input.x, p.input.y);
      if (m > 0.15) { dx = p.input.x / m; dy = p.input.y / m; } else { dx = 1; dy = 0; }
    }
    p.dashDX = dx; p.dashDY = dy; p.dashQueued = true;
  });
  socket.on('arena2-leave', () => {
    socket.leave('arena2');
    ARENA2.players.delete(socket.id);
  });
  socket.on('disconnect', () => {
    if (ARENA2.players.delete(socket.id)) console.log('arena2 leave:', socket.id);
  });
});

server.listen(PORT, () => {
  console.log(`Games server listening on http://localhost:${PORT}`);
});