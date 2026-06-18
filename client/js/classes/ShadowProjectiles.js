import * as THREE from 'three';

export class ShadowProjectile {
    constructor(scene, startPos, direction, speed = 5) {
        this.scene = scene;
        this.speed = speed;
        this.direction = direction.clone().normalize();
        this.damage = 40;
        this.active = true;
        this.distanceTraveled = 0;
        this.maxDistance = 10;
        this.radius = 0.5;
        
        // Создаём сферу
        const geometry = new THREE.SphereGeometry(this.radius, 8, 8);
        const material = new THREE.MeshStandardMaterial({
            color: 0x000000,
            emissive: 0x440000,
            emissiveIntensity: 0.8,
            transparent: true,
            opacity: 0.85,
            roughness: 0.3,
            metalness: 0.1
        });
        this.mesh = new THREE.Mesh(geometry, material);
        this.mesh.position.copy(startPos);
        this.mesh.position.y = 0.3; // поднимаем над землёй
        this.scene.add(this.mesh);
        
        // Добавляем свечение вокруг
        const glowGeo = new THREE.SphereGeometry(this.radius * 1.5, 8, 8);
        const glowMat = new THREE.MeshBasicMaterial({
            color: 0x880000,
            transparent: true,
            opacity: 0.3
        });
        this.glow = new THREE.Mesh(glowGeo, glowMat);
        this.mesh.add(this.glow);
        
        // Тень на земле
        const shadowGeo = new THREE.CircleGeometry(this.radius * 2, 8);
        const shadowMat = new THREE.MeshBasicMaterial({
            color: 0x000000,
            transparent: true,
            opacity: 0.6,
            depthWrite: false,
            side: THREE.DoubleSide
        });
        this.shadow = new THREE.Mesh(shadowGeo, shadowMat);
        this.shadow.rotation.x = -Math.PI / 2;
        this.shadow.position.y = -0.2;
        this.mesh.add(this.shadow);
    }
    
    update(delta) {
        if (!this.active) return;
        
        // Движение
        const moveVec = this.direction.clone().multiplyScalar(this.speed * delta);
        this.mesh.position.add(moveVec);
        this.distanceTraveled += moveVec.length();
        
        // Вращение для эффекта
        this.mesh.rotation.x += delta * 2;
        this.mesh.rotation.z += delta * 1.5;
        
        // Пульсация размера
        const pulse = 1 + Math.sin(Date.now() * 0.005) * 0.1;
        this.mesh.scale.set(pulse, pulse, pulse);
        
        // Проверка дальности
        if (this.distanceTraveled > this.maxDistance) {
            this.deactivate();
        }
    }
    
    deactivate() {
        this.active = false;
        this.scene.remove(this.mesh);
    }
    
    checkCollision(position) {
        if (!this.active) return false;
        const distance = this.mesh.position.distanceTo(position);
        return distance < this.radius + 0.5;
    }
}