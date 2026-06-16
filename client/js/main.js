import * as THREE from 'three';
import { io } from 'https://cdn.socket.io/4.6.1/socket.io.esm.min.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { Player } from './classes/Player.js';
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
gridHelper.position.y = -0.5;
scene.add(gridHelper);

const groundPlane = new THREE.Mesh(
    new THREE.PlaneGeometry(20, 20),
    new THREE.MeshStandardMaterial({ color: 0x1a0a0a, roughness: 0.8 })
);
groundPlane.rotation.x = -Math.PI / 2;
groundPlane.position.y = -0.6;
groundPlane.receiveShadow = true;
scene.add(groundPlane);

// Свечи (декоративные)
const candlePositions = [[-7, -0.3, -7], [7, -0.3, -7], [-7, -0.3, 7], [7, -0.3, 7], [0, -0.3, -8], [0, -0.3, 8]];
candlePositions.forEach(pos => {
    const candleLight = new THREE.PointLight(0xff6633, 0.5, 10);
    candleLight.position.set(pos[0], pos[1], pos[2]);
    scene.add(candleLight);
    
    const candleGeo = new THREE.CylinderGeometry(0.15, 0.2, 0.4, 6);
    const candleMat = new THREE.MeshStandardMaterial({ color: 0xccaa88 });
    const candleMesh = new THREE.Mesh(candleGeo, candleMat);
    candleMesh.position.set(pos[0], pos[1] + 0.2, pos[2]);
    candleMesh.castShadow = true;
    scene.add(candleMesh);
});

// --- ИНИЦИАЛИЗАЦИЯ ---
const ui = new UI();
const bloodParticles = new BloodParticleSystem(scene);
const socket = io(window.location.origin);

setupSocketHandlers(socket, state, ui, bloodParticles);

// --- УПРАВЛЕНИЕ ---
const MOVE_SPEED = 5;
const BOUNDS = 9;

function startMoving() {
    if (state.moveInterval) return;
    
    let lastTime = performance.now();
    
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
        
        if (deltaX !== 0 || deltaZ !== 0) {
            const newX = Math.min(BOUNDS, Math.max(-BOUNDS, state.myPlayer.mesh.position.x + deltaX));
            const newZ = Math.min(BOUNDS, Math.max(-BOUNDS, state.myPlayer.mesh.position.z + deltaZ));
            state.myPlayer.setPosition(newX, newZ);
            socket.emit('player-move', { x: newX, z: newZ });
        }
    }, 1000 / 30);
}

window.addEventListener('keydown', (e) => {
    const key = e.key.toLowerCase();
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
    
    if (!state.keyState.w && !state.keyState.s && !state.keyState.a && !state.keyState.d) {
        if (state.moveInterval) {
            clearInterval(state.moveInterval);
            state.moveInterval = null;
        }
    }
});

// --- АТАКА ---
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

window.addEventListener('click', (event) => {
    if (!state.myPlayer || state.myHp <= 0) return;
    
    mouse.x = (event.clientX / renderer.domElement.clientWidth) * 2 - 1;
    mouse.y = -(event.clientY / renderer.domElement.clientHeight) * 2 + 1;
    
    raycaster.setFromCamera(mouse, camera);
    
    const alivePlayers = Array.from(state.players.values())
        .filter(p => p.mesh.material.opacity !== 0.5)
        .map(p => p.mesh);
    
    const intersects = raycaster.intersectObjects(alivePlayers);
    
    if (intersects.length > 0) {
        const hitMesh = intersects[0].object;
        for (let [id, player] of state.players.entries()) {
            if (player.mesh === hitMesh) {
                console.log(`[CLIENT] Атака игрока ${id}`);
                socket.emit('player-attack', id);
                break;
            }
        }
    }
});

// --- АНИМАЦИЯ ---
function animate() {
    requestAnimationFrame(animate);
    
    const now = performance.now();
    const delta = Math.min(0.033, (now - (window._lastFrame || now)) / 1000);
    window._lastFrame = now;

    bloodParticles.update(delta);

    if (state.myPlayer) {
        controls.target.set(
            state.myPlayer.mesh.position.x,
            state.myPlayer.mesh.position.y + 0.5,
            state.myPlayer.mesh.position.z
        );
    }
    
    controls.update();
    
    let time = Date.now() * 0.003;
    scene.children.forEach(child => {
        if (child instanceof THREE.PointLight && child.intensity < 1.0) {
            child.intensity = 0.4 + Math.sin(time + child.position.x) * 0.2;
        }
    });
    
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