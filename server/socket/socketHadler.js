const Player = require("../game/Player.js");
const db = require("../database.js");


function setupSocket(io, game){

const players = new Map();

io.on('connection', async (socket) => {
  console.log(`[SERVER] Player connected: ${socket.id}`);

    socket.on("get-leaderboard", async()=>{
        const result = await db.query(
        `
        SELECT 
            nickname,
            wins,
            kills,
            deaths
        FROM players
        ORDER BY wins DESC, kills DESC
        LIMIT 10
        `
        );
        socket.emit("leaderboard",result.rows);
    });

    const nickname = "Vampire_" + socket.id.slice(0,5);

    let result = await db.query(
    `
    SELECT * FROM players
    WHERE nickname=$1
    `,
    [nickname]);

    if(result.rows.length === 0){

        result = await db.query(
        `
        INSERT INTO players(nickname, last_seen)
        VALUES($1, NOW())
        RETURNING *
        `,
        [nickname]
        );
    }
    else{
        await db.query(
        `
        UPDATE players
        SET last_seen = NOW()
        WHERE id=$1
        `,
        [result.rows[0].id]
        );
    }
    const player = new Player(socket.id, socket);
    
    const dbPlayer = result.rows[0];
    player.dbId = dbPlayer.id;
    player.nickname = dbPlayer.nickname;

    player.kills = dbPlayer.kills;
    player.deaths = dbPlayer.deaths;
    player.wins = dbPlayer.wins;
    player.losses = dbPlayer.losses;

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

    socket.on('get-leaderboard', async () => {
        const result = await db.query(`
            SELECT nickname, wins, kills, deaths
            FROM players
            ORDER BY wins DESC, kills DESC
            LIMIT 10
        `);

        socket.emit('leaderboard', result.rows);
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
        SET 
        last_seen = NOW(),
        kills = kills + $2,
        deaths = deaths + $3,
        wins = wins + $4,
        losses = losses + $5
        WHERE id=$1
        `,
        [
            player.dbId,
            player.kills || 0,
            player.deaths || 0,
            player.wins || 0,
            player.losses || 0
        ]);
    }
    players.delete(socket.id);
    game.remove?.(socket.id);
    io.emit(
        'player-disconnected',
        socket.id);
    console.log(`[SERVER] Total players: ${players.size}`);
    });
});

}

module.exports=setupSocket;