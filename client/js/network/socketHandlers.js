import { Player } from '../classes/Player.js';

export function setupSocketHandlers(socket, state, ui, bloodParticles) {
    socket.on('connect', () => {
        console.log('[CLIENT] Connected to server');
        state.mySocketId = socket.id;
        document.getElementById('status').innerText = 'Подключено';
    });

    socket.on('player-connected', (playerData) => {
        if (playerData.id !== state.mySocketId) {
            console.log('[CLIENT] Новый игрок:', playerData.id);
            const newPlayer = new Player(playerData.id, playerData.x, playerData.z, 0x883333, state.scene);
            state.players.set(playerData.id, newPlayer);
        }
    });

    socket.on('player-moved', (data) => {
        const player = state.players.get(data.id);
        if (player) {
            player.setPosition(data.x, data.z);
        }
    });

    socket.on('current-players', (playersData) => {
        console.log('[CLIENT] Получены текущие игроки:', playersData);
        let foundSelf = false;
        
        playersData.forEach(p => {
            if (p.id !== state.mySocketId) {
                const newPlayer = new Player(p.id, p.x, p.z, 0x883333, state.scene);
                state.players.set(p.id, newPlayer);
            } else if (p.id === state.mySocketId && !state.myPlayer) {
                state.myPlayer = new Player(state.mySocketId, p.x, p.z, 0xcc4444, state.scene);
                document.getElementById('status').innerText = 'В игре';
                foundSelf = true;
            }
        });
        
        if (!foundSelf && state.mySocketId && !state.myPlayer) {
            console.log('[CLIENT] Свой игрок не найден в списке, создаём с 0,0');
            state.myPlayer = new Player(state.mySocketId, 0, 0, 0xcc4444, state.scene);
            document.getElementById('status').innerText = 'В игре';
            socket.emit('player-move', { x: 0, z: 0 });
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

    socket.on('player-hurt', (data) => {
        if (data.id === state.mySocketId) {
            state.myHp = data.hp;
            ui.updateHealth(state.myHp);
            
            document.body.style.animation = 'none';
            setTimeout(() => {
                document.body.style.animation = 'bloodFlash 0.3s ease-out';
            }, 10);
            
            if (state.myPlayer) {
                bloodParticles.burst(state.myPlayer.mesh.position, 15);
            }
            
            if (state.myHp <= 0) {
                document.getElementById('status').innerText = 'Мёртв...';
            }
        } else {
            const hurtPlayer = state.players.get(data.id);
            if (hurtPlayer && hurtPlayer.mesh.material.opacity !== 0.5) {
                hurtPlayer.mesh.material.emissiveIntensity = 0.8;
                setTimeout(() => {
                    if (hurtPlayer.mesh) hurtPlayer.mesh.material.emissiveIntensity = 0.1;
                }, 200);
                bloodParticles.burst(hurtPlayer.mesh.position, 15);
            }
        }
    });

    socket.on('essence-update', (data) => {
        if (data.id === state.mySocketId) {
            state.myEssence = data.essence;
            ui.updateEssence(state.myEssence);
        }
    });

    socket.on('player-died', (id) => {
        if (id === state.mySocketId) {
            console.log('[CLIENT] Вы погибли! Возрождение через 2 секунды...');
            document.getElementById('status').innerText = 'Погиб... возрождение...';
            
            if (state.moveInterval) {
                clearInterval(state.moveInterval);
                state.moveInterval = null;
            }
            
            if (state.myPlayer) {
                state.myPlayer.mesh.material.transparent = true;
                state.myPlayer.mesh.material.opacity = 0.4;
                state.myPlayer.mesh.material.color.setHex(0x331111);
                state.myPlayer.mesh.material.emissiveIntensity = 0.05;
            }
        } 
        
        if (id !== state.mySocketId) {
            const deadPlayer = state.players.get(id);
            if (deadPlayer) {
                deadPlayer.mesh.material.color.setHex(0x331111);
                deadPlayer.mesh.material.emissiveIntensity = 0.05;
                deadPlayer.mesh.material.transparent = true;
                deadPlayer.mesh.material.opacity = 0.5;
            }
        }
    });

    socket.on('player-respawn', (data) => {
        if (data.id === state.mySocketId) {
            state.myHp = data.hp;
            state.myEssence = data.essence;
            if (state.myPlayer) {
                state.myPlayer.setPosition(data.x, data.z);
                state.myPlayer.mesh.material.transparent = false;
                state.myPlayer.mesh.material.opacity = 1;
                state.myPlayer.mesh.material.color.setHex(0xcc4444);
                state.myPlayer.mesh.material.emissiveIntensity = 0.1;
            }
            ui.updateHealth(state.myHp);
            ui.updateEssence(state.myEssence);
            document.getElementById('status').innerText = 'В игре';
        }
        
        if (data.id !== state.mySocketId) {
            const respawned = state.players.get(data.id);
            if (respawned) {
                respawned.setPosition(data.x, data.z);
                respawned.mesh.material.color.setHex(0x883333);
                respawned.mesh.material.emissiveIntensity = 0.1;
                respawned.mesh.material.transparent = false;
                respawned.mesh.material.opacity = 1;
            }
        }
    });
}