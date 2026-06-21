import * as THREE from 'three';
import { VampirePlayer } from '../classes/VampirePlayer.js';
import { BatProjectile } from '../classes/BatProjectile.js'; // добавлен импорт

export function setupSocketHandlers(socket, state, ui, bloodParticles) {
    socket.on('connect', () => {
        console.log('[CLIENT] Connected to server');
        state.mySocketId = socket.id;
        document.getElementById('status').innerText = 'Подключено';
    });

    socket.on('player-connected', (playerData)=>{
        if(!playerData) 
            return;
        if(playerData.id !== state.mySocketId){
            console.log('[CLIENT] Новый игрок:', playerData.id);
            const newPlayer = new VampirePlayer(
                playerData.id,
                playerData.x,
                playerData.z,
                state.scene,
                '/assets/models/Vampire.fbx',
                '/assets/textures/Texture.png'
            );
            state.players.set(playerData.id, newPlayer);
        }
    });

    const leaderboard = document.getElementById("leaderboard");
    const leaderboardBtn = document.getElementById("leaderboardBtn");

    leaderboardBtn.onclick = () => {
        if(leaderboard.style.display === "block"){
            leaderboard.style.display = "none";
            return;
        }
        leaderboard.style.display = "block";
        socket.emit("get-leaderboard");
    };
    socket.on("leaderboard", (players)=>{
        leaderboard.innerHTML = `
            <h3>Топ игроков</h3>
        `;
        players.forEach((p,index)=>{
            leaderboard.innerHTML += `
                <div class="entry">
                    ${index+1}. ${p.nickname}<br>
                    🏆 Победы: ${p.wins}<br>
                    ⚔ Убийства: ${p.kills}<br>
                    💀 Смерти: ${p.deaths}
                </div>
            `;
        });
    });

    socket.on('round-start',(data)=>{

    console.log("Раунд",data.round);

    if(state.myPlayer){
        state.myPlayer.respawn(
        data.x,
        data.z
        );
    }
    document.getElementById('status').innerText=`Раунд ${data.round}`;
    });

    socket.on('round-end', (data) => {
        console.log('[CLIENT] Раунд завершён:', data);
        document.getElementById('status').innerText = 'Раунд завершён';
    });

    socket.on('duel-start', (data) => {
        console.log('[CLIENT] Дуэль началась:', data);
        document.getElementById('status').innerText = `Дуэль началась`;
    });

    socket.on('duel-finished', (data) => {
        console.log('[CLIENT] Дуэль завершена:', data);
        document.getElementById('status').innerText = 'Дуэль завершена';
    });

    socket.on('player-moved', (data) => {
        const player = state.players.get(data.id);
        if (player) {
            player.setPosition(data.x, data.z);

            // Устанавливаем поворот, если он передан
            if (data.rotation !== undefined) {
                player.mesh.rotation.y = data.rotation;
            } else {
                // fallback – вычисляем из направления только если есть движение
                if (data.dx !== undefined && data.dz !== undefined && (data.dx !== 0 || data.dz !== 0)) {
                    const angle = Math.atan2(data.dx, data.dz);
                    player.mesh.rotation.y = angle;
                }
            }

            if (player.isAlive) {
                if (data.isMoving) {
                    player.playAnimation('run');
                } else {
                    player.playAnimation('idle');
                }
            }
        }
    });

    socket.on('current-players', (playersData) => {
        console.log('[CLIENT] Получены текущие игроки:', playersData);
        let foundSelf = false;

        playersData.forEach(p => {
            if (p.id !== state.mySocketId) {
                const newPlayer = new VampirePlayer(
                    p.id,
                    p.x,
                    p.z,
                    state.scene,
                    '/assets/models/Vampire.fbx',
                    '/assets/textures/Texture.png'
                );
                state.players.set(p.id, newPlayer);
            } else if (p.id === state.mySocketId && !state.myPlayer) {
                console.log('[CLIENT] Создаём вампира для себя');
                state.myPlayer = new VampirePlayer(
                    state.mySocketId,
                    p.x,
                    p.z,
                    state.scene,
                    '/assets/models/Vampire.fbx',
                    '/assets/textures/Texture.png'
                );

                state.myPlayer.onHealthChange = (hp, maxHp) => {
                    ui.updateHealth(hp);
                    if (hp <= 0) {
                        document.getElementById('status').innerText = 'Мёртв...';
                    }
                };
                state.myPlayer.onEssenceChange = (essence) => {
                    ui.updateEssence(essence);
                };
                state.myPlayer.onDeath = (id) => {
                    document.getElementById('status').innerText = 'Погиб... возрождение...';
                };

                document.getElementById('status').innerText = 'В игре';
                foundSelf = true;
            }
        });

        if (!foundSelf && state.mySocketId && !state.myPlayer) {
            console.log('[CLIENT] Свой игрок не найден в списке, создаём с 0,0');
            state.myPlayer = new VampirePlayer(
                state.mySocketId,
                0,
                0,
                state.scene,
                '/assets/models/Vampire.fbx',
                '/assets/textures/Texture.png'
            );

            state.myPlayer.onHealthChange = (hp, maxHp) => {
                ui.updateHealth(hp);
                if (hp <= 0) {
                    document.getElementById('status').innerText = 'Мёртв...';
                }
            };
            state.myPlayer.onEssenceChange = (essence) => {
                ui.updateEssence(essence);
            };
            state.myPlayer.onDeath = (id) => {
                document.getElementById('status').innerText = 'Погиб... возрождение...';
            };

            document.getElementById('status').innerText = 'В игре';
            socket.emit('player-move', { x: 0, z: 0, rotation: 0, isMoving: false });
        }
    });

    socket.on('player-hurt', (data) => {
        if (data.id === state.mySocketId) {
            if (state.myPlayer) {
                state.myPlayer.takeDamage(15);
                bloodParticles.burst(state.myPlayer.mesh.position, 15);
            }
            document.body.style.animation = 'none';
            setTimeout(() => {
                document.body.style.animation = 'bloodFlash 0.3s ease-out';
            }, 10);
        } else {
            const hurtPlayer = state.players.get(data.id);
            if (hurtPlayer && hurtPlayer.isAlive) {
                hurtPlayer.takeDamage(15);
                bloodParticles.burst(hurtPlayer.mesh.position, 15);
            }
        }
    });

    socket.on('essence-update', (data) => {
        if (data.id === state.mySocketId && state.myPlayer) {
            state.myPlayer.bloodEssence = data.essence;
            if (state.myPlayer.onEssenceChange) {
                state.myPlayer.onEssenceChange(data.essence);
            }
        }
    });

    socket.on('player-attack-animation', (data) => {
        const player = state.players.get(data.id);
        if (player && player.isAlive) {
            player.playAnimation('attack', false);
            setTimeout(() => {
                if (player.isAlive) {
                    player.playAnimation('idle');
                }
            }, 500);
        }
    });

    socket.on('player-ultimate-animation', (data) => {
        const player = state.players.get(data.id);
        if (player && player.isAlive) {
            player.playAnimation('attack', false);
            setTimeout(() => {
                if (player.isAlive) player.playAnimation('idle');
            }, 500);
        }
    });

    // СИНХРОНИЗАЦИЯ МЫШЕЙ ДЛЯ ДРУГИХ ИГРОКОВ
    socket.on('player-ultimate-cast', (data) => {
        const player =
            data.id === state.mySocketId
                ? state.myPlayer
                : state.players.get(data.id);

        if (!player || !player.isAlive) return;

        if (player.clearProjectiles) {
            player.clearProjectiles();
        }

        const count = data.count || 3;
        const spreadAngle = data.spreadAngle || Math.PI / 3;
        const startPos = new THREE.Vector3(
            data.position.x,
            data.position.y,
            data.position.z
        );
        const forward = new THREE.Vector3(
            data.direction.x,
            data.direction.y,
            data.direction.z
        );
        const speed = data.speed || 5;

        const projectiles = [];
        for (let i = 0; i < count; i++) {
            const angle = -spreadAngle / 2 + (i / (count - 1)) * spreadAngle;
            const dir = forward.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), angle);

            const bat = new BatProjectile(
                state.scene,
                startPos,
                dir,
                speed,
                '/assets/models/Bat.fbx'
            );
            projectiles.push(bat);
        }
        player.shadowProjectiles = projectiles;
    });

    socket.on('player-died', (id) => {
        if (id === state.mySocketId) {
            console.log('[CLIENT] Вы погибли! Возрождение через 2 секунды...');
            if (state.myPlayer) {
                state.myPlayer.die();
            }
        } else {
            const deadPlayer = state.players.get(id);
            if (deadPlayer) {
                deadPlayer.die();
            }
        }
    });

    socket.on('player-respawn', (data) => {
        if (data.id === state.mySocketId) {
            if (state.myPlayer) {
                state.myPlayer.respawn(data.x, data.z);
                ui.updateHealth(data.hp);
                ui.updateEssence(data.essence);
                document.getElementById('status').innerText = 'В игре';
            }
        } else {
            const respawned = state.players.get(data.id);
            if (respawned) {
                respawned.respawn(data.x, data.z);
            }
        }
    });

    socket.on('player-disconnected', (id) => {
        console.log('[CLIENT] Игрок отключился:', id);
        const player = state.players.get(id);
        if (player) {
            player.remove();
            state.players.delete(id);
        }
    });

    
}