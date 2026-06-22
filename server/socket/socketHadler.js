const crypto = require("crypto");
const Player = require("../game/Player.js");
const db = require("../database.js");

function hashPassword(password){
    const salt = crypto.randomBytes(16).toString("hex");
    const hash = crypto.scryptSync(password, salt, 64).toString("hex");
    return `${salt}:${hash}`;
}

function verifyPassword(password, storedHash){
    if(!storedHash || storedHash.indexOf(":") === -1)
        return false;

    const parts = storedHash.split(":");
    const salt = parts[0];
    const hash = parts[1];
    const nextHash = crypto.scryptSync(password, salt, 64).toString("hex");

    return hash === nextHash;
}

function publicPlayer(player){
    return {
        id: player.id,
        nickname: player.nickname,
        wins: player.wins,
        losses: player.losses,
        kills: player.kills,
        deaths: player.deaths,
        essence: player.essence
    };
}

async function savePlayer(player){
    if(!player || !player.dbId)
        return;

    await db.query(
        `
        UPDATE players
        SET
        nickname = $2,
        password_hash = $3,
        wins = $4,
        losses = $5,
        kills = $6,
        deaths = $7,
        last_seen = NOW()
        WHERE id = $1
        `,
        [
            player.dbId,
            player.nickname || "",
            player.passwordHash || null,
            player.wins || 0,
            player.losses || 0,
            player.kills || 0,
            player.deaths || 0
        ]
    );
}

function setupSocket(io, game){

    const players = new Map();

    io.on('connection', async (socket) => {
        console.log(`[SERVER] Player connected: ${socket.id}`);

        socket.data.authenticated = false;
        socket.data.playerId = null;

        socket.emit("lobby-state", game.getLobbyState());

        socket.on("register", async (data) => {
            try {
                const nickname = String(data?.nickname || "").trim();
                const password = String(data?.password || "").trim();

                if(!nickname || !password){
                    socket.emit("auth-error", { message: "Введите ник и пароль" });
                    return;
                }

                const exists = await db.query(
                    `
                    SELECT id
                    FROM players
                    WHERE nickname = $1
                    LIMIT 1
                    `,
                    [nickname]
                );

                if(exists.rows.length > 0){
                    socket.emit("auth-error", { message: "Такой ник уже занят" });
                    return;
                }

                const passwordHash = hashPassword(password);

                const insert = await db.query(
                    `
                    INSERT INTO players(
                        nickname,
                        password_hash,
                        wins,
                        losses,
                        kills,
                        deaths,
                        last_seen
                    )
                    VALUES($1,$2,0,0,0,0,NOW())
                    RETURNING *
                    `,
                    [nickname, passwordHash]
                );

                const dbPlayer = insert.rows[0];
                const player = new Player(socket.id, socket);

                player.dbId = dbPlayer.id;
                player.nickname = dbPlayer.nickname;
                player.passwordHash = dbPlayer.password_hash;
                player.wins = dbPlayer.wins || 0;
                player.losses = dbPlayer.losses || 0;
                player.kills = dbPlayer.kills || 0;
                player.deaths = dbPlayer.deaths || 0;
                player.authenticated = true;

                players.set(socket.id, player);
                socket.data.authenticated = true;
                socket.data.playerId = player.id;

                socket.emit("auth-success", {
                    player: publicPlayer(player)
                });

                io.emit("lobby-state", game.getLobbyState());
            } catch (err) {
                console.log("[DB] REGISTER ERROR:", err);
                socket.emit("auth-error", { message: "Ошибка регистрации" });
            }
        });

        socket.on("login", async (data) => {
            try {
                const nickname = String(data?.nickname || "").trim();
                const password = String(data?.password || "").trim();

                if(!nickname || !password){
                    socket.emit("auth-error", { message: "Введите ник и пароль" });
                    return;
                }

                const result = await db.query(
                    `
                    SELECT *
                    FROM players
                    WHERE nickname = $1
                    LIMIT 1
                    `,
                    [nickname]
                );

                if(result.rows.length === 0){
                    socket.emit("auth-error", { message: "Игрок не найден" });
                    return;
                }

                const dbPlayer = result.rows[0];

                if(!verifyPassword(password, dbPlayer.password_hash)){
                    socket.emit("auth-error", { message: "Неверный пароль" });
                    return;
                }

                const player = new Player(socket.id, socket);

                player.dbId = dbPlayer.id;
                player.nickname = dbPlayer.nickname;
                player.passwordHash = dbPlayer.password_hash;
                player.wins = dbPlayer.wins || 0;
                player.losses = dbPlayer.losses || 0;
                player.kills = dbPlayer.kills || 0;
                player.deaths = dbPlayer.deaths || 0;
                player.authenticated = true;

                players.set(socket.id, player);
                socket.data.authenticated = true;
                socket.data.playerId = player.id;

                socket.emit("auth-success", {
                    player: publicPlayer(player)
                });

                io.emit("lobby-state", game.getLobbyState());
            } catch (err) {
                console.log("[DB] LOGIN ERROR:", err);
                socket.emit("auth-error", { message: "Ошибка входа" });
            }
        });

        socket.on("get-lobby-state", () => {
            socket.emit("lobby-state", game.getLobbyState());
        });

        socket.on("queue-join", () => {
            const player = players.get(socket.id);
            if(!player || !player.authenticated) return;

            game.join(player);
            io.emit("lobby-state", game.getLobbyState());
        });

        socket.on("queue-leave", () => {
            const player = players.get(socket.id);
            if(!player) return;

            game.leave(player);
            io.emit("lobby-state", game.getLobbyState());
        });

        socket.on("play-again", () => {
            const player = players.get(socket.id);
            if(!player || !player.authenticated) return;

            game.join(player);
            io.emit("lobby-state", game.getLobbyState());
        });

        socket.on("exit-to-menu", () => {
            const player = players.get(socket.id);
            if(!player) return;

            game.leave(player);
            io.emit("lobby-state", game.getLobbyState());
        });

        socket.on("get-leaderboard", async () => {
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

            socket.emit("leaderboard", result.rows);
        });

        socket.on('player-move', (data) => {
            const player = players.get(socket.id);
            if(!player || !player.isAlive) return;

            const duel = game.findDuel(socket.id);
            if(!duel) return;

            let x = data.x;
            let z = data.z;

            const SIZE = 10;

            x = Math.max(-SIZE, Math.min(SIZE, x));
            z = Math.max(-SIZE, Math.min(SIZE, z));

            player.x = x;
            player.z = z;
            player.rotation = data.rotation;

            duel.sendToOpponent(socket.id, 'player-moved', {
                id: socket.id,
                x,
                z,
                rotation: data.rotation,
                isMoving: data.isMoving
            });
        });

        socket.on('player-attack', (targetId) => {
            const duel = game.findDuel(socket.id);
            if(!duel)
                return;

            duel.attack(socket.id, targetId);
        });

        socket.on('player-ultimate-hit', (data) => {
            const duel = game.findDuel(socket.id);
            if(!duel)
                return;

            console.log("[SERVER] Ultimate hit", socket.id, "->", data.targetId);
            duel.ultimateHit(socket.id, data.targetId, data.damage || 40);
        });

        socket.on('player-ultimate-cast', (data) => {
            const duel = game.findDuel(socket.id);
            if(!duel)
                return;

            duel.sendToBoth('player-ultimate-cast', {
                id: socket.id,
                position: data.position,
                direction: data.direction,
                rotation: data.rotation,
                count: 3,
                spreadAngle: Math.PI / 3,
                speed: 4
            });

            duel.sendToBoth('player-ultimate-animation', {
                id: socket.id
            });
        });

        socket.on('disconnect', async () => {
            console.log(`[SERVER] Player disconnected: ${socket.id}`);

            const player = players.get(socket.id);

            try {
                if(player?.dbId){
                    await savePlayer(player);
                }
            } catch (err) {
                console.log("[DB] DISCONNECT SAVE ERROR:", err);
            }

            game.remove(socket.id);
            players.delete(socket.id);

            io.emit('lobby-state', game.getLobbyState());

            console.log(`[SERVER] Total players: ${players.size}`);
        });
    });
}

module.exports = setupSocket;