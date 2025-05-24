const path = require('path');
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Serve static files (the client) from the "public" directory
app.use(express.static(path.join(__dirname, 'public')));

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
server.listen(PORT, () => {
  console.log(`Blob-Eater server listening on http://localhost:${PORT}`);
}); 