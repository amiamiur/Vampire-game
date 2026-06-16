import * as THREE from 'three';

export class BloodParticleSystem {
    constructor(scene) {
        this.scene = scene;
        this.particles = [];
    }
    
    burst(position, count = 12) {
        for (let i = 0; i < count; i++) {
            const geometry = new THREE.SphereGeometry(0.06, 6, 6);
            const material = new THREE.MeshStandardMaterial({ 
                color: 0xcc2222, 
                emissive: 0x441111,
                emissiveIntensity: 0.5
            });
            const particle = new THREE.Mesh(geometry, material);
            
            particle.position.copy(position);
            particle.userData = {
                velocity: new THREE.Vector3(
                    (Math.random() - 0.5) * 4,
                    Math.random() * 4 + 1,
                    (Math.random() - 0.5) * 4
                ),
                life: 0.6,
                maxLife: 0.6
            };
            
            this.scene.add(particle);
            this.particles.push(particle);
        }
    }
    
    update(delta) {
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.userData.life -= delta;
            
            if (p.userData.life <= 0) {
                this.scene.remove(p);
                this.particles.splice(i, 1);
                continue;
            }
            
            p.position.x += p.userData.velocity.x * delta;
            p.position.y += p.userData.velocity.y * delta;
            p.position.z += p.userData.velocity.z * delta;
            p.userData.velocity.y -= 6 * delta;
            
            const opacity = p.userData.life / p.userData.maxLife;
            p.material.opacity = opacity;
            p.material.transparent = true;
            const scale = 0.3 + opacity * 0.5;
            p.scale.set(scale, scale, scale);
        }
    }
}