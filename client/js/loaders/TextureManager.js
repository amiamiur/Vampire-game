import * as THREE from 'three';

export class TextureManager {
    constructor(renderer) {
        this.loader = new THREE.TextureLoader();
        this.maxAnisotropy =
            renderer.capabilities.getMaxAnisotropy();
    }

    loadTexture(path, isColor = false) {
        const texture = this.loader.load(path);

        texture.anisotropy = this.maxAnisotropy;

        if (isColor) {
            texture.colorSpace = THREE.SRGBColorSpace;
        }

        return texture;
    }

    configureRepeat(texture, repeatX, repeatY) {
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;

        texture.repeat.set(repeatX, repeatY);

        return texture;
    }

    loadWallMaterial() {
        const albedo =
            this.loadTexture(
                '/assets/textures/wall/sloppy-mortar-stone-wall_albedo.png',
                true
            );

        const ao =
            this.loadTexture(
                '/assets/textures/wall/sloppy-mortar-stone-wall_ao.png'
            );

        const height =
            this.loadTexture(
                '/assets/textures/wall/sloppy-mortar-stone-wall_height.png'
            );

        const metallic =
            this.loadTexture(
                '/assets/textures/wall/sloppy-mortar-stone-wall_metallic.png'
            );

        const normal =
            this.loadTexture(
                '/assets/textures/wall/sloppy-mortar-stone-wall_normal-ogl.png'
            );

        const roughness =
            this.loadTexture(
                '/assets/textures/wall/sloppy-mortar-stone-wall_roughness.png'
            );

        normal.flipY = false;

        this.configureRepeat(albedo, 4, 1);
        this.configureRepeat(ao, 4, 1);
        this.configureRepeat(height, 4, 1);
        this.configureRepeat(metallic, 4, 1);
        this.configureRepeat(normal, 4, 1);
        this.configureRepeat(roughness, 4, 1);

        return new THREE.MeshStandardMaterial({
            map: albedo,
            aoMap: ao,
            displacementMap: new THREE.BoxGeometry(
                16,
                4,
                0.8,
                50,
                20,
                4
            ),
            displacementScale: 0.03,
            metalnessMap: metallic,
            roughnessMap: roughness,
            normalMap: normal
        });
    }

    loadFloorMaterial() {
        const baseColor =
            this.loadTexture(
                '/assets/textures/floor/tiledstone1_basecolor.png',
                true
            );

        const ao =
            this.loadTexture(
                '/assets/textures/floor/tiledstone1_AO.png'
            );

        const metallic =
            this.loadTexture(
                '/assets/textures/floor/tiledstone1_metallic.png'
            );

        const normal =
            this.loadTexture(
                '/assets/textures/floor/tiledstone1_normal-ogl.png'
            );

        const roughness =
            this.loadTexture(
                '/assets/textures/floor/tiledstone1_roughness.png'
            );

        normal.flipY = false;

        this.configureRepeat(baseColor, 4, 4);
        this.configureRepeat(ao, 4, 4);
        this.configureRepeat(metallic, 4, 4);
        this.configureRepeat(normal, 4, 4);
        this.configureRepeat(roughness, 4, 4);

        return new THREE.MeshStandardMaterial({
            map: baseColor,
            aoMap: ao,
            metalnessMap: metallic,
            roughnessMap: roughness,
            normalMap: normal
        });
    }

    loadRockMaterial() {
        const albedo =
            this.loadTexture(
                '/assets/textures/rock/slate2-tiled-albedo2.png',
                true
            );

        const ao =
            this.loadTexture(
                '/assets/textures/rock/slate2-tiled-ao.png'
            );

        const height =
            this.loadTexture(
                '/assets/textures/rock/slate2-tiled-height.png'
            );

        const metalness =
            this.loadTexture(
                '/assets/textures/rock/slate2-tiled-metalness.png'
            );

        const normal =
            this.loadTexture(
                '/assets/textures/rock/slate2-tiled-ogl.png'
            );

        const roughness =
            this.loadTexture(
                '/assets/textures/rock/slate2-tiled-rough.png'
            );

        normal.flipY = false;

        return new THREE.MeshStandardMaterial({
            map: albedo,
            aoMap: ao,
            displacementMap: height,
            displacementScale: 0.02,
            metalnessMap: metalness,
            roughnessMap: roughness,
            normalMap: normal
        });
    }
}