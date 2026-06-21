import * as THREE from 'three';
import { io } from 'https://cdn.socket.io/4.6.1/socket.io.esm.min.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { VampirePlayer } from './classes/VampirePlayer.js';
import { BloodParticleSystem } from './classes/BloodParticles.js';
import { UI } from './ui/UI.js';
import { setupSocketHandlers } from './network/socketHandlers.js';
import { TextureManager } from './loaders/TextureManager.js';
import { Arena } from './world/Arena.js';
import { BloodFootsteps } from './classes/BloodFootSteps.js';
import { Lighting } from './classes/Lighting.js';
import { PlayerController } from './classes/PlayerController.js';
import { GameLoop } from './classes/GameLoop.js';
import { InputManager } from './classes/InputManager.js';
import { CombatController } from './classes/CombatController.js';

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
scene.fog = new THREE.FogExp2(
    0x120010,
    0.04
);
state.scene = scene;

const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(10, 8, 12);
state.camera = camera;

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
document.body.appendChild(renderer.domElement);
state.renderer = renderer;

// Рендер для текстур
const textures = new TextureManager(renderer);
const arena = new Arena(scene, textures);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.zoomSpeed = 1.2;
controls.rotateSpeed = 1.0;
controls.enableZoom = true;
controls.zoomSpeed = 1.0;
controls.target.set(0, 1, 0);
state.controls = controls;

new Lighting(scene);

// Инициализация User interface
const ui = new UI();

//Кровавые эффекты
const bloodParticles = new BloodParticleSystem(scene);

const socket = io(window.location.origin);

setupSocketHandlers(socket, state, ui, bloodParticles);

// Эффекты шагов
const footsteps = new BloodFootsteps(scene);

// Управление и движение игрока
const controller = new PlayerController({

    camera,
    arena,
    getPlayer:()=>state.myPlayer,
    socket,
    footsteps,
    keyState: state.keyState

});

// Ультимейт на (E)
new InputManager(
    state.keyState,
    ()=>state.myPlayer,
    socket
);
// Атака
new CombatController({
    camera,
    renderer,
    state,
    socket
});

// Анимация и обновление всех существующих объектов
new GameLoop({
    renderer,
    scene,
    camera,
    controls,
    state,
    bloodParticles,
    footsteps,
    arena,
    ui,
    socket
});

// Масштабирование окна
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

console.log('[CLIENT] Bloodline Duel клиент запущен');