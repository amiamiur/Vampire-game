const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*' }
});

app.use(express.static(path.join(__dirname, '../client')));

// Хранилище игроков в памяти
const players = new Map();

io.on('connection', (socket) => {
  console.log(`[SERVER] Player connected: ${socket.id}`);
  players.set(socket.id, {
    id: socket.id,
    x: 0,
    z: 0,
    hp: 100,
    bloodEssence: 0
  });

  console.log(`[SERVER] Total players: ${players.size}`);

  // ОТПРАВЛЯЕМ НОВОМУ ИГРОКУ СПИСОК ВСЕХ СУЩЕСТВУЮЩИХ
  socket.emit('current-players', Array.from(players.values()));

  socket.on('disconnect', () => {
    console.log(`[SERVER] Player disconnected: ${socket.id}`);
    players.delete(socket.id);
    console.log(`[SERVER] Total players: ${players.size}`);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});