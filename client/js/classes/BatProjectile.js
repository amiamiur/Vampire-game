import * as THREE from 'three';
import { FBXLoader } from 'three/addons/loaders/FBXLoader.js';

export class BatProjectile {
    constructor(scene, startPos, direction, speed = 6, modelPath = '/assets/models/Bat.fbx') {
        this.scene = scene;
        this.speed = speed;
        this.direction = direction.clone().normalize();
        this.damage = 40;
        this.active = true;
        this.lifeTime = 0;
        this.maxLifeTime = 1.5;
        this.loaded = false;
        
        // Создаём группу
        this.group = new THREE.Group();
        this.group.position.copy(startPos);
        this.group.position.y = 0.5;
        this.scene.add(this.group);
        
        // Временная заглушка (сфера), пока модель грузится
        this.createPlaceholder();
        
        // Загружаем модель
        this.loadModel(modelPath);
    }
    
    createPlaceholder() {
        const geometry = new THREE.SphereGeometry(0.3, 8, 8);
        const material = new THREE.MeshStandardMaterial({
            color: 0x440000,
            emissive: 0x880000,
            emissiveIntensity: 0.5,
            transparent: true,
            opacity: 0.7
        });
        this.placeholder = new THREE.Mesh(geometry, material);
        this.group.add(this.placeholder);
    }
    
    loadModel(modelPath) {
        const loader = new FBXLoader();
        loader.load(
            modelPath,
            (fbx) => {
                if (this.placeholder) {
                    this.group.remove(this.placeholder);
                    this.placeholder = null;
                }
                
                // Масштабируем модель
                fbx.scale.set(0.05, 0.05, 0.05);    
                fbx.position.set(0, 0, 0);
                
                // Направляем модель в сторону движения
                const quat = new THREE.Quaternion();
                quat.setFromUnitVectors(
                    new THREE.Vector3(0, 0, 1),
                    this.direction
                );
                fbx.quaternion.copy(quat);
                
                this.group.add(fbx);
                this.model = fbx;
                this.loaded = true;
                
                console.log('[BatProjectile] Модель летучей мыши загружена');
            },
            (xhr) => {
                // Прогресс загрузки
            },
            (error) => {
                console.warn('[BatProjectile] Не удалось загрузить модель, оставляем заглушку', error);
                // Оставляем заглушку
                if (this.placeholder) {
                    this.placeholder.material.color.setHex(0x880000);
                    this.placeholder.material.opacity = 0.9;
                }
            }
        );
    }
    
    update(delta) {
        if (!this.active) return;
        
        this.lifeTime += delta;
        
        // Проверяем время жизни
        if (this.lifeTime > this.maxLifeTime) {
            this.deactivate();
            return;
        }
        
        // Движение
        const moveVec = this.direction.clone().multiplyScalar(this.speed * delta);
        this.group.position.add(moveVec);
        
        // Анимация покачивания (если модель загружена)
        if (this.loaded && this.model) {
            // Небольшое покачивание в полёте
            this.model.rotation.z = Math.sin(this.lifeTime * 8) * 0.05;
            this.model.rotation.x = Math.sin(this.lifeTime * 6 + 1) * 0.03;
        } else if (this.placeholder) {
            // Анимация заглушки
            this.placeholder.scale.setScalar(1 + Math.sin(this.lifeTime * 10) * 0.1);
            this.placeholder.material.opacity = 0.5 + Math.sin(this.lifeTime * 8) * 0.2;
        }
        
        // Уменьшаем размер к концу жизни
        const lifeRatio = 1 - (this.lifeTime / this.maxLifeTime);
        const scale = 0.3 + lifeRatio * 0.7;
        if (this.model) {
            this.model.scale.set(
                0.02 * scale,
                0.02 * scale,
                0.02 * scale
            );
        } else if (this.placeholder) {
            this.placeholder.scale.set(scale, scale, scale);
        }
    }
    
    deactivate() {
        this.active = false;
        this.scene.remove(this.group);
    }
    
    checkCollision(position) {
        if (!this.active) return false;
        const distance = this.group.position.distanceTo(position);
        return distance < 1.2;
    }
}