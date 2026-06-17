import { VampirePlayer } from '../classes/VampirePlayer.js';

export function setupSocketHandlers(socket, state, ui, bloodParticles) {
    socket.on('connect', () => {
        console.log('[CLIENT] Connected to server');
        state.mySocketId = socket.id;
        document.getElementById('status').innerText = 'Подключено';
    });

    socket.on('player-connected', (playerData) => {
        if (playerData.id !== state.mySocketId) {
            console.log('[CLIENT] Новый игрок:', playerData.id);
            const newPlayer = new VampirePlayer(
                playerData.id, 
                playerData.x, 
                playerData.z, 
                state.scene,
                '/assets/models/Vampire.fbx',
                '/assets/textures/Texture.png'
            );
            
            // Подключаем колбэки для UI других игроков (опционально)
            state.players.set(playerData.id, newPlayer);
        }
    });

    socket.on('player-moved', (data) => {
        const player = state.players.get(data.id);
        if (player) {
            player.setPosition(data.x, data.z);
            if (data.dx !== undefined && data.dz !== undefined) {
                const angle = Math.atan2(data.dx, data.dz);
                player.mesh.rotation.y = angle;
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
                
                // Подключаем UI для своего игрока
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
            socket.emit('player-move', { x: 0, z: 0 });
        }
    });

    socket.on('player-hurt', (data) => {
        if (data.id === state.mySocketId) {
            // Урон по своему игроку
            if (state.myPlayer) {
                state.myPlayer.takeDamage(15);
                
                // Кровавые частицы
                bloodParticles.burst(state.myPlayer.mesh.position, 15);
            }
            
            document.body.style.animation = 'none';
            setTimeout(() => {
                document.body.style.animation = 'bloodFlash 0.3s ease-out';
            }, 10);
        } else {
            // Урон по другому игроку
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