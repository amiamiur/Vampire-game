import * as THREE from 'three';
import { io } from 'https://cdn.socket.io/4.6.1/socket.io.esm.min.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { VampirePlayer } from './classes/VampirePlayer.js';
import { BloodParticleSystem } from './classes/BloodParticles.js';
import { UI } from './ui/UI.js';
import { setupSocketHandlers } from './network/socketHandlers.js';

// --- СОСТОЯНИЕ ---
const state = {
    scene: null,
    camera: null,
    renderer: null,
    controls: null,
    players: new Map(),
    mySocketId: null,
    myPlayer: null,
    myHp: 100,
    myEssence: 0,
    moveInterval: null,
    keyState: { w: false, s: false, a: false, d: false }
};

// Препятсвия
const obstacles = [];

// --- ИНИЦИАЛИЗАЦИЯ СЦЕНЫ ---
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0a0a2a);
scene.fog = new THREE.FogExp2(0x0a0a2a, 0.03);
state.scene = scene;

const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(10, 8, 12);
state.camera = camera;

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
document.body.appendChild(renderer.domElement);
state.renderer = renderer;

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.zoomSpeed = 1.2;
controls.rotateSpeed = 1.0;
controls.enableZoom = true;
controls.zoomSpeed = 1.0;
controls.target.set(0, 1, 0);
state.controls = controls;

// --- ОСВЕЩЕНИЕ ---
const ambientLight = new THREE.AmbientLight(0x331133);
scene.add(ambientLight);

const dirLight = new THREE.DirectionalLight(0xccaa88, 1);
dirLight.position.set(5, 10, 3);
dirLight.castShadow = true;
scene.add(dirLight);

const fillLight = new THREE.PointLight(0x552222, 0.5);
fillLight.position.set(0, 2, 0);
scene.add(fillLight);

// --- ПОЛ ---
const gridHelper = new THREE.GridHelper(22, 20, 0xaa5555, 0x442222);
gridHelper.position.y = -0.2;
scene.add(gridHelper);

const arenaFloor = new THREE.Mesh(
    new THREE.CircleGeometry(12, 64),
    new THREE.MeshStandardMaterial({
        color: 0x2a2a2a,
        roughness: 0.9
    })
);

arenaFloor.rotation.x = -Math.PI / 2;
arenaFloor.receiveShadow = true;
scene.add(arenaFloor);

function createCastleWall(x, z, rotationY) {
    const wallGroup = new THREE.Group();

    const wall = new THREE.Mesh(
        new THREE.BoxGeometry(16, 4, 0.8),
        new THREE.MeshStandardMaterial({
            color: 0x555555
        })
    );

    wallGroup.add(wall);

    for (let i = -7; i <= 7; i += 2) {
        const battlement = new THREE.Mesh(
            new THREE.BoxGeometry(1, 0.8, 0.8),
            new THREE.MeshStandardMaterial({
                color: 0x666666
            })
        );

        battlement.position.set(i, 2.4, 0);

        wallGroup.add(battlement);
    }

    wallGroup.position.set(x, 2, z);
    wallGroup.rotation.y = rotationY;

    scene.add(wallGroup);
}

createCastleWall(0, 10, 0);
createCastleWall(0, -10, 0);

createCastleWall(10, 0, Math.PI / 2);
createCastleWall(-10, 0, Math.PI / 2);

function createTower(x, z) {
    const tower = new THREE.Mesh(
        new THREE.CylinderGeometry(1.2, 1.4, 6, 8),
        new THREE.MeshStandardMaterial({
            color: 0x666666
        })
    );

    tower.position.set(x, 3, z);

    scene.add(tower);
}

createTower(9, 9);
createTower(-9, 9);
createTower(9, -9);
createTower(-9, -9);

function createRock(x, z, scale = 1) {
    const rock = new THREE.Mesh(
        new THREE.DodecahedronGeometry(scale),
        new THREE.MeshStandardMaterial({
            color: 0x444444
        })
    );

    rock.position.set(x, scale * 0.8, z);

    rock.rotation.set(
        Math.random(),
        Math.random(),
        Math.random()
    );

    scene.add(rock);

    obstacles.push({
        mesh: rock,
        radius: scale * 1.0
    });
}

createRock(6, 2, 1.2);
createRock(-4, 7, 1);
createRock(6, -5, 1.4);
createRock(-3, -1, 0.8);

const crystal = new THREE.Mesh(
    new THREE.OctahedronGeometry(0.6),
    new THREE.MeshStandardMaterial({
        color: 0xaa0000,
        emissive: 0x550000
    })
)

const light = new THREE.PointLight(
    0xaa0000,
    1.5,
    6
);


// --- ИНИЦИАЛИЗАЦИЯ ---
const ui = new UI();
const bloodParticles = new BloodParticleSystem(scene);
const socket = io(window.location.origin);

setupSocketHandlers(socket, state, ui, bloodParticles);

// --- УПРАВЛЕНИЕ ---
const MOVE_SPEED = 5;
const BOUNDS = 9;

function collidesWithObstacle(x, z) {
    for (const obstacle of obstacles) {
        const dx = x - obstacle.mesh.position.x;
        const dz = z - obstacle.mesh.position.z;

        const distance = Math.sqrt(dx * dx + dz * dz);

        if (distance < obstacle.radius + 0.7) {
            return true;
        }
    }

    return false;
}

function startMoving() {
    if (state.moveInterval) return;
    
    let lastTime = performance.now();
    let isMoving = false;
    
    state.moveInterval = setInterval(() => {
        if (!state.myPlayer) return;
        
        const now = performance.now();
        let delta = Math.min(0.033, (now - lastTime) / 1000);
        lastTime = now;

        const cameraDirection = camera.getWorldDirection(new THREE.Vector3());
        const cameraRight = new THREE.Vector3().crossVectors(cameraDirection, new THREE.Vector3(0, 1, 0));
        
        let moveDirection = new THREE.Vector3(0, 0, 0);
        
        if (state.keyState.w) moveDirection.z += 1;
        if (state.keyState.s) moveDirection.z -= 1;
        if (state.keyState.a) moveDirection.x -= 1;
        if (state.keyState.d) moveDirection.x += 1;
        
        if (moveDirection.length() > 0) moveDirection.normalize();
        
        const forward = new THREE.Vector3(cameraDirection.x, 0, cameraDirection.z).normalize();
        const right = new THREE.Vector3(cameraRight.x, 0, cameraRight.z).normalize();
        
        const deltaX = (moveDirection.x * right.x + moveDirection.z * forward.x) * MOVE_SPEED * delta;
        const deltaZ = (moveDirection.x * right.z + moveDirection.z * forward.z) * MOVE_SPEED * delta;
        
        // Проверяем, нажата ли хотя бы одна клавиша движения
        const isKeyDown = state.keyState.w || state.keyState.s || state.keyState.a || state.keyState.d;
        
        if (isKeyDown) {
            // Движение
            const newX = Math.min(
                BOUNDS,
                Math.max(
                    -BOUNDS,
                    state.myPlayer.mesh.position.x + deltaX
                )
            );

            const newZ = Math.min(
                BOUNDS,
                Math.max(
                    -BOUNDS,
                    state.myPlayer.mesh.position.z + deltaZ
                )
            );

            if (!collidesWithObstacle(newX, newZ)) {
                state.myPlayer.setPosition(newX, newZ);
            }
                        
            // Отправляем движение
            socket.emit('player-move', { 
                x: newX, 
                z: newZ,
                dx: deltaX,
                dz: deltaZ,
                isMoving: true,
                rotation: state.myPlayer.mesh.rotation.y
            });
            
            // Поворачиваем модель
            const angle = Math.atan2(deltaX, deltaZ);
            state.myPlayer.mesh.rotation.y = angle;
            
            // Включаем анимацию бега
            if (state.myPlayer.isAlive) {
                state.myPlayer.playAnimation('run');
            }
            isMoving = true;
        } else {
            // Остановка
            if (isMoving) {
            socket.emit('player-move', { 
                x: state.myPlayer.mesh.position.x, 
                z: state.myPlayer.mesh.position.z,
                dx: 0,
                dz: 0,
                isMoving: false,
                rotation: state.myPlayer.mesh.rotation.y
            });
            isMoving = false;
            }
            if (state.myPlayer.isAlive) {
                state.myPlayer.playAnimation('idle');
            }
        }
    }, 1000 / 30);
}

window.addEventListener('keydown', (e) => {
    const key = e.key.toLowerCase();
    if (key === 'e') {
        if (state.myPlayer && state.myPlayer.isAlive) {
            state.myPlayer.useUltimate(socket);
            socket.emit('player-ultimate-animation');
        }
        return;
    }   
    if (key === 'w') state.keyState.w = true;
    if (key === 's') state.keyState.s = true;
    if (key === 'a') state.keyState.a = true;
    if (key === 'd') state.keyState.d = true;
    if (!state.moveInterval) startMoving();
    
});

window.addEventListener('keyup', (e) => {
    const key = e.key.toLowerCase();
    if (key === 'w') state.keyState.w = false;
    if (key === 's') state.keyState.s = false;
    if (key === 'a') state.keyState.a = false;
    if (key === 'd') state.keyState.d = false;
    
    // if (!state.keyState.w && !state.keyState.s && !state.keyState.a && !state.keyState.d) {
    //     if (state.moveInterval) {
    //         clearInterval(state.moveInterval);
    //         state.moveInterval = null;
    //     }
    // }
});

// --- АТАКА ---
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

window.addEventListener('click', (event) => {
    if (!state.myPlayer || state.myHp <= 0) return;
    
    mouse.x = (event.clientX / renderer.domElement.clientWidth) * 2 - 1;
    mouse.y = -(event.clientY / renderer.domElement.clientHeight) * 2 + 1;
    
    raycaster.setFromCamera(mouse, camera);
    
    // Проверяем всех игроков 
    const alivePlayers = Array.from(state.players.values())
        .filter(p => p.isAlive && p.id !== state.mySocketId)
        .map(p => p.mesh);
    
    const intersects = raycaster.intersectObjects(alivePlayers, true); // true для поиска в дочерних объектах
    
    if (intersects.length > 0) {
        const hitMesh = intersects[0].object;
        for (let [id, player] of state.players.entries()) {
            if (player.id === state.mySocketId) continue;
            
            let isHit = false;
            if (player.mesh === hitMesh) {
                isHit = true;
            } else if (player.mesh && player.mesh.children) {
                player.mesh.children.forEach(child => {
                    if (child === hitMesh || child.children?.includes?.(hitMesh)) {
                        isHit = true;
                    }
                });
            }
            
            if (isHit) {
                console.log(`[CLIENT] Атака игрока ${id}`);
                
                if (state.myPlayer && state.myPlayer.isAlive) {
                    state.myPlayer.attack();
                }
                
                socket.emit('player-attack', id);
                break;
            }
        }
    }
});

// --- АНИМАЦИЯ ---
function animate() {
    requestAnimationFrame(animate);
    
    const delta = Math.min(0.033, (performance.now() - (window._lastFrame || performance.now())) / 1000);
    window._lastFrame = performance.now();

    bloodParticles.update(delta);
    
    // Обновляем анимации других игроков
    state.players.forEach(player => {
    if (player.update) player.update(delta);

        if (player.updateProjectiles) {
            player.updateProjectiles(delta);
        }
    });
    
    if (state.myPlayer) {
        state.myPlayer.update(delta);
        state.myPlayer.updateUltimate(delta);
        state.myPlayer.updateProjectiles(delta);
        state.myPlayer.checkProjectileCollisions(state.players, socket);
        ui.updateUltimate(state.myPlayer.ultimateCharge, state.myPlayer.maxUltimateCharge);
        
        controls.target.set(
            state.myPlayer.mesh.position.x,
            state.myPlayer.mesh.position.y + 0.5,
            state.myPlayer.mesh.position.z
        );
    }
    
    controls.update();
    renderer.render(scene, camera);
}
animate();

// --- РАЗМЕР ОКНА ---
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

console.log('[CLIENT] Bloodline Duel клиент запущен');