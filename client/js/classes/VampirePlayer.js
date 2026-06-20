//VampirePlayer
import * as THREE from 'three';
import { FBXLoader } from 'three/addons/loaders/FBXLoader.js';
import { BatProjectile } from './BatProjectile.js';

export class VampirePlayer {
    constructor(id, x, z, scene, modelPath = '/assets/models/Vampire.fbx', texturePath = '/assets/textures/Texture.png') {
        this.id = id;
        this.scene = scene;
        this.mesh = null;
        this.mixer = null;
        this.isLoaded = false;
        this.loading = true;
        this.isAlive = true;
        this.hp = 100;
        this.maxHp = 100;
        this.bloodEssence = 0;
        this.isAttacking = false;
        this.ultimateCharge = 0;
        this.maxUltimateCharge = 100;
        this.isUltimateReady = false;
        this.shadowProjectiles = [];
        this.onUltimateReady = null;
        
        this.animations = {};
        this.currentAction = null;
        this.ready = false;
        this.pendingAnimations = [];
        
        this.onHealthChange = null;
        this.onEssenceChange = null;
        this.onDeath = null;
        
        console.log(`[VampirePlayer] Создаём игрока ${id}`);
        
        this.createPlaceholder(x, z);
        this.loadModel(modelPath, texturePath, x, z);
        this.loadAnimations();
    }
    
    createPlaceholder(x, z) {
        const geometry = new THREE.BoxGeometry(0.8, 1.2, 0.6);
        const material = new THREE.MeshStandardMaterial({ 
            color: 0x662222, 
            emissive: 0x331111,
            transparent: true,
            opacity: 0.6
        });
        this.mesh = new THREE.Mesh(geometry, material);
        this.mesh.castShadow = true;
        this.mesh.position.set(x, 0.6, z);
        this.scene.add(this.mesh);
    }
    
    loadModel(modelPath, texturePath, x, z) {
        const loader = new FBXLoader();
        const textureLoader = new THREE.TextureLoader();
        let texture = null;
        
        textureLoader.load(texturePath, (tex) => { texture = tex; }, undefined, () => {});
        
        loader.load(
            modelPath,
            (fbx) => {
                console.log(`[VampirePlayer] Модель загружена для ${this.id}`);
                if (texture) {
                    fbx.traverse(child => {
                        if (child.isMesh) {
                            child.material.map = texture;
                            child.material.needsUpdate = true;
                        }
                    });
                }
                fbx.scale.set(0.01, 0.01, 0.01);
                fbx.position.set(x, 0, z);
                fbx.castShadow = true;
                
                this.model = fbx;
                this.scene.remove(this.mesh);
                this.scene.add(fbx);
                this.mesh = fbx;
                this.isLoaded = true;
                this.loading = false;
                this.checkReady();
            },
            (xhr) => {},
            (error) => {
                console.error('[VampirePlayer] Ошибка загрузки модели:', error);
                this.mesh.material.color.setHex(0x884444);
                this.mesh.material.opacity = 1;
                this.mesh.material.transparent = false;
                this.loading = false;
            }
        );
    }
    
    loadAnimations() {
        const animLoader = new FBXLoader();
        const animPaths = {
            idle: '/assets/animations/Vampire_Idle.fbx',
            run: '/assets/animations/Vampire_Run.fbx',
            attack: '/assets/animations/Vampire_Attack.fbx',
            death: '/assets/animations/Vampire_Death.fbx'
        };
        const total = Object.keys(animPaths).length;
        let loaded = 0;
        
        Object.entries(animPaths).forEach(([name, path]) => {
            animLoader.load(
                path,
                (fbx) => {
                    if (fbx.animations && fbx.animations.length > 0) {
                        const clip = fbx.animations[0];
                        clip.name = name;
                        this.animations[name] = clip;
                        console.log(`[VampirePlayer] Анимация ${name} загружена`);
                    }
                    loaded++;
                    if (loaded === total) this.checkReady();
                },
                undefined,
                (error) => {
                    console.warn(`[VampirePlayer] Анимация ${name} не загружена:`, error);
                    loaded++;
                    if (loaded === total) this.checkReady();
                }
            );
        });
    }
    
    checkReady() {
        if (!this.isLoaded) return;
        if (Object.keys(this.animations).length < 4) return;
        
        console.log('[VampirePlayer] Все ресурсы загружены, инициализируем миксер');
        this.mixer = new THREE.AnimationMixer(this.mesh);
        
        for (const [name, clip] of Object.entries(this.animations)) {
            if (clip) this.mixer.clipAction(clip);
        }
        
        this.ready = true;
        this.playAnimation('idle');
        while (this.pendingAnimations.length > 0) {
            const args = this.pendingAnimations.shift();
            this.playAnimation(...args);
        }
    }
    
    stopAllAnimations() {
        if (!this.mixer) return;
        console.log('[VampirePlayer] stopAllAnimations вызван');
        // Пытаемся использовать встроенный метод
        if (typeof this.mixer.stopAllActions === 'function') {
            this.mixer.stopAllActions();
            console.log('[VampirePlayer] Остановлено через stopAllActions');
        } else {
            // Fallback: перебираем все действия и останавливаем
            if (this.mixer._actions) {
                for (const key in this.mixer._actions) {
                    const action = this.mixer._actions[key];
                    if (action && typeof action.stop === 'function') {
                        action.stop();
                    }
                }
                console.log('[VampirePlayer] Остановлено через _actions');
            } else {
                // Если ничего не помогло, останавливаем только текущее
                if (this.currentAction) {
                    this.currentAction.stop();
                    console.log('[VampirePlayer] Остановлено только текущее действие');
                }
            }
        }
        this.currentAction = null;
    }

    playAnimation(name, loop = true) {

    if (this.isAttacking && name !== 'attack') {
        return;
    }
        if (!this.ready) {
            this.pendingAnimations.push([name, loop]);
            return;
        }
        if (!this.mixer) {
            console.warn('[VampirePlayer] Нет миксера');
            return;
        }
        const clip = this.animations[name];
        if (!clip) {
            console.warn(`[VampirePlayer] Анимация ${name} не найдена`);
            return;
        }
        
        // Если текущая анимация совпадает — не переключаем
        if (this.currentAction && this.currentAction.getClip() === clip) {
            return;
        }

        
        
        // Принудительно останавливаем всё
        this.stopAllAnimations();
        
        const action = this.mixer.clipAction(clip);
        action.setLoop(loop ? THREE.LoopRepeat : THREE.LoopOnce);
        action.clampWhenFinished = true;
        action.play();
        this.currentAction = action;
}
    
    update(delta) {
        if (this.mixer) this.mixer.update(delta);
    }
    
    setPosition(x, z) {
        if (this.mesh) this.mesh.position.set(x, 0, z);
    }
    
    attack() {
        if (!this.isAlive || this.isAttacking) return false;
        this.isAttacking = true;
        this.playAnimation('attack', false);
        setTimeout(() => {
            this.isAttacking = false;
            if (this.isAlive) {
                this.playAnimation('idle');
            }
        }, 500);
        return true;
    }
    
    takeDamage(damage) {
        if (!this.isAlive) return false;
        this.hp = Math.max(0, this.hp - damage);
        if (this.mesh) {
            this.mesh.traverse(child => {
                if (child.isMesh) {
                    child.material.emissive = new THREE.Color(0xff0000);
                    child.material.emissiveIntensity = 2.0;
                    setTimeout(() => {
                        if (child.material) {
                            child.material.emissive = new THREE.Color(0x220000);
                            child.material.emissiveIntensity = 0.1;
                            child.material.needsUpdate = true;
                        }
                    }, 300);
                }
            });
        }
        if (this.onHealthChange) this.onHealthChange(this.hp, this.maxHp);
        if (this.hp <= 0) this.die();
        return true;
    }
    
    die() {
        if (!this.isAlive) return;
        this.isAlive = false;
        this.playAnimation('death', false);
        if (this.mesh) {
            this.mesh.traverse(child => {
                if (child.isMesh) {
                    child.material.emissive = new THREE.Color(0x000000);
                    child.material.emissiveIntensity = 0;
                    child.material.transparent = true;
                    child.material.opacity = 0.4;
                }
            });
        }
        if (this.onDeath) this.onDeath(this.id);
    }
    
    respawn(x, z) {
        this.isAlive = true;
        this.hp = this.maxHp;
        this.setPosition(x, z);
        if (this.mesh) {
            this.mesh.traverse(child => {
                if (child.isMesh) {
                    child.material.emissive = new THREE.Color(0x220000);
                    child.material.emissiveIntensity = 0.1;
                    child.material.transparent = false;
                    child.material.opacity = 1;
                }
            });
        }
        this.playAnimation('idle');
        if (this.onHealthChange) this.onHealthChange(this.hp, this.maxHp);
    }
    
    addEssence(amount) {
        this.bloodEssence += amount;
        if (this.onEssenceChange) this.onEssenceChange(this.bloodEssence);
    }
    
    remove() {
        if (this.mesh) this.scene.remove(this.mesh);
    }
    
    getMeshForRaycast() {
        return this.mesh;
    }
    
    setRotation(y) {
        if (this.mesh) this.mesh.rotation.y = y;
    }

    setRotationFromData(y) {
        if (this.mesh) {
            this.mesh.rotation.y = y;
        }
    }
    
    // --- СИСТЕМА УЛЬТЫ ---
    updateUltimate(delta) {
        if (!this.isAlive) return;
        if (this.ultimateCharge < this.maxUltimateCharge) {
            // this.ultimateCharge += delta * 3; // ~33 секунды до полной зарядки
            this.ultimateCharge += delta * 5;
            if (this.ultimateCharge >= this.maxUltimateCharge) {
                this.ultimateCharge = this.maxUltimateCharge;
                this.isUltimateReady = true;
                console.log('[VampirePlayer] Ульта готова!');
                if (this.onUltimateReady) this.onUltimateReady();
            }
        }
    }

    useUltimate(socket) {
        if (!this.isUltimateReady || !this.isAlive || this.isAttacking) return false;
        
        console.log('[VampirePlayer] Использована ульта!');
        this.isUltimateReady = false;
        this.ultimateCharge = 0;
        this.isAttacking = true;
        
        // Запускаем анимацию ульты (если есть)
        this.playAnimation('attack', false);
        
        const count = 3;
        const startPos = this.mesh.position.clone();
        startPos.y = 2.5;
        const spreadAngle = Math.PI / 3;    
        
        // Направление взгляда камеры (передаём из main.js)
        // Для простоты используем направление, куда смотрит персонаж
        const forward = new THREE.Vector3(0, 0, 1);
        forward.applyQuaternion(this.mesh.quaternion);
        forward.y = 0;
        forward.normalize();
        

        if(socket){
            socket.emit('player-ultimate-cast',{
                position:{
                    x:startPos.x,
                    y:startPos.y,
                    z:startPos.z
                },
                direction:{
                    x:forward.x,
                    y:forward.y,
                    z:forward.z
                }
            });

        }
            
        
        // Возвращаем idle через 500ms (как атака)
        setTimeout(() => {
            this.isAttacking = false;
            if (this.isAlive) {
                this.playAnimation('idle');
            }
        }, 500);
        
        return true;
    }

    updateProjectiles(delta) {
        for (const projectile of this.shadowProjectiles) {
            if (projectile.update) {
                projectile.update(delta);
            }
        }
        this.shadowProjectiles = this.shadowProjectiles.filter(p => p.active);
    }
    clearProjectiles() {
        if (this.shadowProjectiles) {
            this.shadowProjectiles.forEach(p => p.deactivate && p.deactivate());
            this.shadowProjectiles = [];
        }
    }

    checkProjectileCollisions(players, socket) {
        for (const projectile of this.shadowProjectiles) {
            if (!projectile.active) continue;
            for (const [id, player] of players) {
                if (player.id === this.id) continue;
                if (!player.isAlive) continue;
                const pos = player.mesh.position || player.mesh.position;
                if (projectile.checkCollision && projectile.checkCollision(pos)) {
                    if (socket) {
                        socket.emit('player-ultimate-hit', { 
                            targetId: id, 
                            damage: projectile.damage || 40
                        });
                    }
                    projectile.deactivate();
                    console.log(`[VampirePlayer] Летучая мышь ударила ${player.id}!`);
                    break; 
                }
            }
        }
    }
}