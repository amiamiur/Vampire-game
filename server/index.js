const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const Player = require("./game/Player.js");
const GameManager = require("./game/GameManager.js");

const app = express();

const server = http.createServer(app);

const io = new Server(server, {
  cors: { origin: '*' }
});

const game = new GameManager(io);
const players = new Map();

app.use(express.static(path.join(__dirname, '../client')));

io.on('connection', (socket) => {
  console.log(`[SERVER] Player connected: ${socket.id}`);

  const player =
    new Player(
    socket.id,
    socket
    );
    game.join(player);  

  socket.on(
      "join-duel",
      ()=>{

          duelManager.join(socket);

      }
  );

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
        player.rotation = data.rotation;

        socket.broadcast.emit('player-moved', {
            id: socket.id,
            x: data.x,
            z: data.z,
            dx: data.dx || 0,
            dz: data.dz || 0,
            isMoving: data.isMoving || false,
            rotation: data.rotation
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
          
          if (distance < 2.0) {
              const damage = 15;
              target.hp = Math.max(0, target.hp - damage);
              attacker.bloodEssence += 10;
              
              io.emit('player-hurt', { id: targetId, hp: target.hp });
              io.emit('essence-update', { id: socket.id, essence: attacker.bloodEssence });
              
              // Отправляем анимацию атаки для всех
              io.emit('player-attack-animation', { id: socket.id });
              
              if (target.hp <= 0) {
                  target.isAlive=false;
                  io.emit('player-died',targetId);
                  duelManager.playerKilled(targetId);
              }
          }
      }
  });

  socket.on('player-ultimate-hit', (data) => {
    const attacker = players.get(socket.id);
    const target = players.get(data.targetId);
    if (attacker && target && attacker.id !== target.id && attacker.isAlive && target.isAlive) {
      const damage = data.damage || 25;
      target.hp = Math.max(0, target.hp - damage);
      console.log(`[SERVER] Ульта от ${attacker.id} попала в ${target.id}, урон ${damage}, HP ${target.hp}`);

      io.emit('player-hurt', { id: target.id, hp: target.hp });

      if (target.hp <= 0) {
        target.isAlive = false;
        io.emit('player-died', target.id);
        setTimeout(() => {
          if (players.has(target.id)) {
            const respawned = players.get(target.id);
            respawned.hp = 100;
            respawned.x = (Math.random() - 0.5) * 16;
            respawned.z = (Math.random() - 0.5) * 16;
            respawned.bloodEssence = Math.max(0, respawned.bloodEssence - 20);
            respawned.isAlive = true;
            io.emit('player-respawn', {
              id: target.id,
              x: respawned.x,
              z: respawned.z,
              hp: respawned.hp,
              essence: respawned.bloodEssence
            });
          }
        }, 2000);
      }
    }
  });

  socket.on('player-ultimate-cast', (data) => {
      io.emit('player-ultimate-cast', {
          id: socket.id,
          position: data.position,
          direction: data.direction,
          rotation: data.rotation,
          count: 3,
          spreadAngle: Math.PI / 3,
          speed: 4
      });

      io.emit('player-ultimate-animation', {
          id: socket.id
      });
  });

  socket.on('disconnect', () => {
    console.log(`[SERVER] Player disconnected: ${socket.id}`);
    players.delete(socket.id);

    game.remove?.(socket.id);
    
    io.emit('player-disconnected', socket.id);
    
    console.log(`[SERVER] Total players: ${players.size}`);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});