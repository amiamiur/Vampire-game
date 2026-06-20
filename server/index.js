//index
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const Player = require("./game/Player.js");
const GameManager = require("./game/GameManager.js");

const db = require("./database.js");
const app = express();

const server = http.createServer(app);

const io = new Server(server, {
  cors: { origin: '*' }
});

const game = new GameManager(io);

db.query("SELECT * FROM players")
.then(result=>{
    console.log("DB PLAYERS:", result.rows);
})
.catch(err=>{
    console.log("DB ERROR:", err);
});
const players = new Map();

app.use(express.static(path.join(__dirname, '../client')));

io.on('connection', async (socket) => {
  console.log(`[SERVER] Player connected: ${socket.id}`);

  const player = new Player(socket.id, socket);

    await db.query(
    `
    INSERT INTO players(nickname)
    VALUES($1)
    RETURNING id
    `,
    ["Vampire_" + socket.id.slice(0,5)]
    )
    .then(result=>{
        player.dbId = result.rows[0].id;

        console.log(
            "[DB] Player created:",
            player.dbId
        );
    })

    players.set(socket.id, player);

    socket.emit(
        'current-players',
        Array.from(players.values()).map(p => ({
            id:p.id,
            x:p.x,
            z:p.z,
            rotation:p.rotation,
            hp:p.hp,
            essence:p.essence,
            isAlive:p.isAlive
        }))
    );

    game.join(player);    


    socket.broadcast.emit('player-connected',{
        id:player.id,
        x:player.x,
        z:player.z,
        rotation:player.rotation,
        hp:player.hp,
        essence:player.essence,
        isAlive:player.isAlive
    });

  console.log(`[SERVER] Total players: ${players.size}`);
  socket.on('player-move', (data) => {
    const player = players.get(socket.id);

    if(player && player.isAlive){
    let x = data.x;
    let z = data.z;
    
    // границы арены
    const SIZE = 10;

    x=Math.max(
        -SIZE,
        Math.min(SIZE,x)
    );

    z=Math.max(
        -SIZE,
        Math.min(SIZE,z)
    );

    player.x=x;
    player.z=z;
    player.rotation=data.rotation;

    socket.broadcast.emit('player-moved',
    {
    id:socket.id,
    x,
    z,
    rotation:data.rotation,
    isMoving:data.isMoving
        }
        );
    }
  });

  socket.on(
    'player-attack',(targetId)=>{
      const duel =game.findDuel(socket.id);

    if(!duel)
      return;

    duel.attack(socket.id,targetId);
});

    socket.on('player-ultimate-hit',(data)=>{
      const duel = game.findDuel(socket.id);
      if(!duel)
          return;
      console.log("[SERVER] Ultimate hit",
          socket.id,"->",data.targetId
      );
      duel.attack(socket.id,data.targetId);
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

  socket.on('disconnect', async () => {
        console.log(`[SERVER] Player disconnected: ${socket.id}`);

        const player = players.get(socket.id);

        if(player?.dbId){
            await db.query(
            `
            UPDATE players
            SET last_seen = NOW()
            WHERE id=$1
            `,
            [player.dbId]);
        }

        players.delete(socket.id);

        game.remove?.(socket.id);
        io.emit(
            'player-disconnected',
            socket.id
        );
        console.log(`[SERVER] Total players: ${players.size}`);
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});