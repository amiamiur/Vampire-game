import * as THREE from 'three';
import { VampirePlayer } from '../classes/VampirePlayer.js';
import { BatProjectile } from '../classes/BatProjectile.js';

export function setupSocketHandlers(socket, state, ui, bloodParticles) {

    const authScreen = document.getElementById('auth-screen');
    const menuScreen = document.getElementById('menu-screen');
    const resultScreen = document.getElementById('match-result-screen');
    const authMessage = document.getElementById('auth-message');
    const authNickname = document.getElementById('auth-nickname');
    const authPassword = document.getElementById('auth-password');
    const loginBtn = document.getElementById('loginBtn');
    const registerBtn = document.getElementById('registerBtn');
    const findLobbyBtn = document.getElementById('findLobbyBtn');
    const leaveLobbyBtn = document.getElementById('leaveLobbyBtn');
    const playAgainBtn = document.getElementById('playAgainBtn');
    const backToMenuBtn = document.getElementById('backToMenuBtn');
    const lobbyPlayers = document.getElementById('lobby-players');
    const lobbySummary = document.getElementById('lobby-summary');
    const menuPlayer = document.getElementById('menu-player');
    const menuStatus = document.getElementById('menu-status');
    const resultTitle = document.getElementById('result-title');
    const resultText = document.getElementById('result-text');

    function setHudVisible(visible){
        const ids = [
            'info',
            'health-bar-container',
            'essence-display',
            'controls-hint',
            'ultimate-container',
            'ultimate-hint'
        ];

        ids.forEach(id => {
            const el = document.getElementById(id);
            if(el){
                el.style.display = visible ? 'block' : 'none';
            }
        });
    }

    function showAuth(){
        authScreen.style.display = 'flex';
        menuScreen.style.display = 'none';
        resultScreen.style.display = 'none';
        setHudVisible(false);
        if(authMessage) authMessage.innerText = '';
        document.getElementById('status').innerText = 'Авторизация';
    }

    function showMenu(){
        authScreen.style.display = 'none';
        menuScreen.style.display = 'flex';
        resultScreen.style.display = 'none';
        setHudVisible(false);
    }

    function showBattleHud(){
        authScreen.style.display = 'none';
        menuScreen.style.display = 'none';
        resultScreen.style.display = 'none';
        setHudVisible(true);
    }

    function clearBattlefield(){
        if(state.myPlayer){
            state.myPlayer.clearProjectiles?.();
            state.myPlayer.remove();
            state.myPlayer = null;
        }

        state.players.forEach(player => {
            player.clearProjectiles?.();
            player.remove();
        });

        state.players.clear();
    }

    function setupSelfCallbacks(player){
        player.onHealthChange = (hp, maxHp) => {
            state.myHp = hp;
            ui.updateHealth(hp);

            if (hp <= 0) {
                document.getElementById('status').innerText = 'Мёртв...';
            }
        };

        player.onEssenceChange = (essence) => {
            state.myEssence = essence;
            ui.updateEssence(essence);
        };

        player.onDeath = () => {
            document.getElementById('status').innerText = 'Погиб...';
        };
    }

    function applyRoundData(data){
        showBattleHud();

        const me = data.me;
        const enemy = data.enemy;

        if(!state.myPlayer){
            state.myPlayer = new VampirePlayer(
                me.id,
                me.x,
                me.z,
                state.scene,
                '/assets/models/Vampire.fbx',
                '/assets/textures/Texture.png'
            );
            setupSelfCallbacks(state.myPlayer);
        }

        state.myPlayer.respawn(me.x, me.z);
        state.myPlayer.hp = me.hp;
        state.myPlayer.bloodEssence = me.essence || 0;
        state.myHp = me.hp;
        state.myEssence = me.essence || 0;
        ui.updateHealth(me.hp);
        ui.updateEssence(me.essence || 0);

        let enemyPlayer = state.players.get(enemy.id);

        if(!enemyPlayer){
            enemyPlayer = new VampirePlayer(
                enemy.id,
                enemy.x,
                enemy.z,
                state.scene,
                '/assets/models/Vampire.fbx',
                '/assets/textures/Texture.png'
            );
            state.players.set(enemy.id, enemyPlayer);
        }

        enemyPlayer.respawn(enemy.x, enemy.z);
        enemyPlayer.hp = enemy.hp;
        enemyPlayer.bloodEssence = enemy.essence || 0;
        enemyPlayer.isAlive = true;

        document.getElementById('status').innerText = `Раунд ${data.round}`;
    }

    function renderLobby(data){
        lobbySummary.innerText = `В очереди: ${data.count}`;

        if(!data.waiting || data.waiting.length === 0){
            lobbyPlayers.innerHTML = '<div class="entry">Пока никто не ждёт матч</div>';
            return;
        }

        lobbyPlayers.innerHTML = '';

        data.waiting.forEach((p, index) => {
            lobbyPlayers.innerHTML += `
                <div class="entry">
                    ${index + 1}. ${p.nickname}<br>
                    🏆 Победы: ${p.wins}<br>
                    ⚔ Убийства: ${p.kills}<br>
                    💀 Смерти: ${p.deaths}
                </div>
            `;
        });
    }

    function updateMenuProfile(player){
        menuPlayer.innerHTML = `
            Игрок: ${player.nickname}<br>
            🏆 Победы: ${player.wins}<br>
            ⚔ Убийства: ${player.kills}<br>
            💀 Смерти: ${player.deaths}
        `;
    }

    function emitAuth(type){
        const nickname = authNickname.value.trim();
        const password = authPassword.value.trim();

        if(!nickname || !password){
            authMessage.innerText = 'Введите никнейм и пароль';
            return;
        }

        authMessage.innerText = '...';

        socket.emit(type, {
            nickname,
            password
        });
    }

    socket.on('connect', () => {
        console.log('[CLIENT] Connected to server');
        state.mySocketId = socket.id;
        showAuth();
    });

    loginBtn.onclick = () => emitAuth('login');
    registerBtn.onclick = () => emitAuth('register');

    findLobbyBtn.onclick = () => {
        if(state.searching)
            return;

        state.searching = true;
        menuStatus.innerText = 'Поиск лобби...';
        socket.emit('queue-join');
    };

    leaveLobbyBtn.onclick = () => {
        state.searching = false;
        menuStatus.innerText = 'Очередь покинута';
        socket.emit('queue-leave');
    };

    playAgainBtn.onclick = () => {
        state.searching = true;
        socket.emit('play-again');
        showMenu();
        menuStatus.innerText = 'Поиск нового лобби...';
    };

    backToMenuBtn.onclick = () => {
        state.searching = false;
        socket.emit('queue-leave');
        showMenu();
        menuStatus.innerText = 'Готов к поиску матча';
    };

    socket.on('auth-error', (data) => {
        authMessage.innerText = data.message || 'Ошибка';
    });

    socket.on('auth-success', (data) => {
        state.profile = data.player;
        updateMenuProfile(data.player);
        authMessage.innerText = '';
        state.searching = false;
        menuStatus.innerText = 'Готов к поиску матча';
        showMenu();
        socket.emit('get-lobby-state');
    });

    socket.on('lobby-state', (data) => {
        renderLobby(data);

        if(state.profile){
            updateMenuProfile(state.profile);
        }
    });

    socket.on("leaderboard", (players) => {
        const leaderboard = document.getElementById("leaderboard");
        leaderboard.innerHTML = `<h3>Топ игроков</h3>`;

        players.forEach((p, index) => {
            leaderboard.innerHTML += `
                <div class="entry">
                    ${index + 1}. ${p.nickname}<br>
                    🏆 Победы: ${p.wins}<br>
                    ⚔ Убийства: ${p.kills}<br>
                    💀 Смерти: ${p.deaths}
                </div>
            `;
        });
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

    socket.on('duel-start', (data) => {
        console.log('[CLIENT] Дуэль началась:', data);
        state.searching = false;
        clearBattlefield();
        showBattleHud();
        document.getElementById('status').innerText = 'Матч найден';
    });

    socket.on('round-start', (data) => {
        console.log("Раунд", data.round);
        applyRoundData(data);
    });

    socket.on('round-end', (data) => {
        console.log('[CLIENT] Раунд завершён:', data);
        document.getElementById('status').innerText = 'Раунд завершён';
    });

    socket.on('player-moved', (data) => {
        const player = state.players.get(data.id);
        if (player) {
            player.setPosition(data.x, data.z);

            if (data.rotation !== undefined) {
                player.mesh.rotation.y = data.rotation;
            } else {
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

    socket.on('player-hurt', (data) => {
        const damage = data.damage || 15;

        if (data.id === state.mySocketId) {
            if (state.myPlayer) {
                state.myPlayer.takeDamage(damage);
                bloodParticles.burst(state.myPlayer.mesh.position, damage);
            }

            document.body.style.animation = 'none';
            setTimeout(() => {
                document.body.style.animation = 'bloodFlash 0.3s ease-out';
            }, 10);
        } else {
            const hurtPlayer = state.players.get(data.id);
            if (hurtPlayer && hurtPlayer.isAlive) {
                hurtPlayer.takeDamage(damage);
                bloodParticles.burst(hurtPlayer.mesh.position, damage);
            }
        }
    });

    socket.on('essence-update', (data) => {
        if (data.id === state.mySocketId && state.myPlayer) {
            state.myPlayer.bloodEssence = data.essence;
            state.myEssence = data.essence;

            if (state.myPlayer.onEssenceChange) {
                state.myPlayer.onEssenceChange(data.essence);
            }
        }
    });

    socket.on('player-attack-animation', (data) => {
        if (data.id === state.mySocketId) return;

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
        if (data.id === state.mySocketId) return;

        const player = state.players.get(data.id);
        if (player && player.isAlive) {
            player.playAnimation('attack', false);
            setTimeout(() => {
                if (player.isAlive) player.playAnimation('idle');
            }, 500);
        }
    });

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
            console.log('[CLIENT] Вы погибли!');
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
                state.myPlayer.hp = data.hp;
                state.myHp = data.hp;
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

    socket.on('duel-finished', (data) => {
        console.log('[CLIENT] Дуэль завершена:', data);

        if(state.myPlayer){
            updateMenuProfile(state.profile);
        }

        const isWin = data.winner && data.winner.id === state.mySocketId;
        const isDraw = !data.winner;

        if(isDraw){
            resultTitle.innerText = 'Ничья';
        } else if(isWin){
            resultTitle.innerText = 'Победа!';
        } else {
            resultTitle.innerText = 'Поражение';
        }

        const score = data.score || {};
        const myScore = score[state.mySocketId] || 0;

        resultText.innerText = `Счёт: ${myScore}. Причина: ${data.reason === 'disconnect' ? 'противник вышел' : 'матч завершён'}`;

        clearBattlefield();
        resultScreen.style.display = 'flex';
        menuScreen.style.display = 'none';
        authScreen.style.display = 'none';
        setHudVisible(false);
        state.searching = false;
        document.getElementById('status').innerText = 'Матч завершён';
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