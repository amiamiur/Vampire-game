import * as THREE from 'three';

export class Lighting {

    constructor(scene) {
        this.scene = scene;

        this.createLights();
    }
    createLights() {
        const ambientLight = new THREE.AmbientLight(
            0x331133
        );
        this.scene.add(ambientLight);

        const dirLight = new THREE.DirectionalLight(
            0xccaa88,
            1
        );
        dirLight.position.set(
            5,
            10,
            3
        );
        dirLight.castShadow = true;

        this.scene.add(dirLight);
        const fillLight = new THREE.PointLight(
            0x552222,
            0.5
        );
        fillLight.position.set(
            0,
            2,
            0
        );
        this.scene.add(fillLight);
    }
}