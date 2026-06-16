import * as THREE from 'three';

export class Player {
    constructor(id, x, z, color = 0xaa3333, scene) {
        this.id = id;
        this.scene = scene;
        const geometry = new THREE.BoxGeometry(0.8, 0.8, 0.8);
        const material = new THREE.MeshStandardMaterial({ 
            color: color, 
            emissive: 0x220000 
        });
        this.mesh = new THREE.Mesh(geometry, material);
        this.mesh.castShadow = true;
        this.mesh.position.set(x, 0, z);
        this.scene.add(this.mesh);
    }
    
    setPosition(x, z) {
        this.mesh.position.set(x, 0, z);
    }
    
    remove() {
        this.scene.remove(this.mesh);
    }
}