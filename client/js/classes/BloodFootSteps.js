import * as THREE from 'three';

export class BloodFootsteps {

    constructor(scene) {
        this.scene = scene;
        this.footsteps = [];
    }
    spawn(position) {
        const particle = new THREE.Mesh(
            new THREE.PlaneGeometry(0.25, 0.25),
            new THREE.MeshBasicMaterial({
                color: 0x550000,
                transparent: true,
                opacity: 0.5
            })
        );
        particle.rotation.x = -Math.PI / 2;
        particle.position.set(
            position.x,
            0.02,
            position.z
        );
        this.scene.add(particle);
        this.footsteps.push({
            mesh: particle,
            life: 1
        });
    }
    update(delta) {
        this.footsteps = this.footsteps.filter(step => {
            step.life -= delta;
            step.mesh.material.opacity = step.life * 0.5;
            if (step.life <= 0) {
                this.scene.remove(step.mesh);
                return false;
            }
            return true;
        });
    }
}