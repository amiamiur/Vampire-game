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

    // константы для начального спавна
  const randomX = (Math.random() - 0.5) * 16;
  const randomZ = (Math.random() - 0.5) * 16;
  
  players.set(socket.id, {
    id: socket.id,
    x: randomX,
    z: randomZ,
    hp: 100,
    bloodEssence: 0,
    isAlive: true
  });

  socket.emit('player-hurt', { id: socket.id, hp: 100 });
  socket.emit('essence-update', { id: socket.id, essence: 0 });

  console.log(`[SERVER] Total players: ${players.size}`);
  socket.broadcast.emit('player-connected', players.get(socket.id));

  socket.emit('current-players', Array.from(players.values()));

  socket.on('player-move', (data) => {
    const player = players.get(socket.id);
    if (player && player.isAlive) {
        player.x = data.x;
        player.z = data.z;

        socket.broadcast.emit('player-moved', {
            id: socket.id,
            x: data.x,
            z: data.z,
            dx: data.dx || 0,
            dz: data.dz || 0,
            isMoving: data.isMoving || false
        });
      }
  });

  socket.on('player-attack', (targetId) => {
    const attacker = players.get(socket.id);
    const target = players.get(targetId);
    
    if (attacker && target && attacker.id !== target.id && attacker.isAlive && target.isAlive) {
      const dx = attacker.x - target.x;
      const dz = attacker.z - target.z;
      const distance = Math.sqrt(dx * dx + dz * dz);
      
      // Проверка дистанции
      if (distance < 2.0) {
        const damage = 15;
        target.hp = Math.max(0, target.hp - damage);
        attacker.bloodEssence += 10;
        
        console.log(`[SERVER] ${attacker.id} атаковал ${target.id}! HP: ${target.hp}, Кровь: ${attacker.bloodEssence}`);

        io.emit('player-hurt', { id: targetId, hp: target.hp });
        io.emit('essence-update', { id: socket.id, essence: attacker.bloodEssence });
        
        if (target.hp <= 0) {
          target.isAlive = false;
          io.emit('player-died', targetId);

          setTimeout(() => {
            if (players.has(targetId)) {
              const respawned = players.get(targetId);
              respawned.hp = 100;
              respawned.x = (Math.random() - 0.5) * 16;
              respawned.z = (Math.random() - 0.5) * 16;
              respawned.bloodEssence = Math.max(0, respawned.bloodEssence - 20);
              respawned.isAlive = true; 
              
              io.emit('player-respawn', {
                id: targetId,
                x: respawned.x,
                z: respawned.z,
                hp: respawned.hp,
                essence: respawned.bloodEssence
              });
            }
          }, 2000);
        }
      }
    }
  });

  socket.on('disconnect', () => {
    console.log(`[SERVER] Player disconnected: ${socket.id}`);
    players.delete(socket.id);
    
    io.emit('player-disconnected', socket.id);
    
    console.log(`[SERVER] Total players: ${players.size}`);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});