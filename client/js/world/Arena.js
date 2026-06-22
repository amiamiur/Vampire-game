import * as THREE from 'three';

export class Arena {

    constructor(scene, textures) {
        this.scene = scene;
        this.textures = textures;

        this.bounds = 9;

        this.obstacles = [];
        this.torches = [];

        this.createArena();
    }


    createArena() {

        const scene = this.scene;
        const obstacles = this.obstacles;
        const torches = this.torches;

        const floorMaterial = this.textures.loadFloorMaterial();
        const wallMaterial = this.textures.loadWallMaterial();
        const rockMaterial = this.textures.loadRockMaterial();
        const towerMaterial = this.textures.loadWallMaterial();

        // Пол
        const arenaFloor = new THREE.Mesh(
            new THREE.PlaneGeometry(20,20),
            floorMaterial
        );
        arenaFloor.geometry.setAttribute(
            'uv2',
            new THREE.BufferAttribute(
                arenaFloor.geometry.attributes.uv.array,
                2
            )
        );
        arenaFloor.rotation.x = -Math.PI/2;
        arenaFloor.receiveShadow = true;

        scene.add(arenaFloor);

        // Башни
        function createTower(x,z){
            const tower = new THREE.Mesh(
                new THREE.CylinderGeometry(
                    1.2,
                    1.4,
                    6,
                    24
                ),
                towerMaterial
            );
            tower.geometry.setAttribute(
                'uv2',
                new THREE.BufferAttribute(
                    tower.geometry.attributes.uv.array,
                    2
                )
            );
            tower.position.set(
                x,
                3,
                z
            );
            scene.add(tower);

            obstacles.push({
                mesh:tower,
                radius:1.6
            });
        }

        createTower(9,9);
        createTower(-9,9);
        createTower(9,-9);
        createTower(-9,-9);

        // Стены
        function createCastleWall(x,z,rotationY){
            const wall = new THREE.Mesh(
                new THREE.BoxGeometry(16,4,0.8),
                    wallMaterial
            );

            wall.geometry.setAttribute(
                'uv2',
                new THREE.BufferAttribute(
                    wall.geometry.attributes.uv.array,
                    2
                )
            );
            wall.position.set(x,2,z);
            wall.rotation.y = rotationY;

            wall.castShadow = true;
            wall.receiveShadow = true;

            scene.add(wall);
        }
        createCastleWall(0,10,0);
        createCastleWall(0,-10,0);
        createCastleWall(10,0,Math.PI/2);
        createCastleWall(10,0,Math.PI/2);

        // Факелы
        function createTorch(x,y,z){
            const light = new THREE.PointLight(
                0xff8844,
                2.5,
                8
            );
            light.position.set(
                x,
                y,
                z
            );
            scene.add(light);
            return light;
        }

        torches.push(createTorch(5,2.5,9.4));
        torches.push(createTorch(-5,2.5,9.4));
        torches.push(createTorch(5,2.5,-9.4));
        torches.push(createTorch(-5,2.5,-9.4));
        torches.push(createTorch(9.4,2.5,5));
        torches.push(createTorch(9.4,2.5,-5));
        torches.push(createTorch(-9.4,2.5,5));
        torches.push(createTorch(-9.4,2.5,-5));

        // Маленькие колонны
        function createBrokenColumn(x,z){

            const column = new THREE.Mesh(
                new THREE.CylinderGeometry(0.3,0.35,2.5,12),
                    wallMaterial
            );

            column.position.set(x,1.2,z);

            column.rotation.z = (Math.random()-0.5)*0.3;

            scene.add(column);

            obstacles.push({
                mesh:column,
                radius:0.5
            });
        }
        createBrokenColumn(2,4);
        createBrokenColumn(6,2);
        createBrokenColumn(-3,-1);
        createBrokenColumn(3,7);
        createBrokenColumn(1,8);
        createBrokenColumn(-1,5);
        createBrokenColumn(1,-4);
        createBrokenColumn(-6,-2);
        createBrokenColumn(-8,-1);
    }

    getObstacles(){
        return this.obstacles;
    }

    getTorches(){
        return this.torches;
    }

    getRadius(){
        return this.bounds;
    }


    checkCollision(
        x,
        z,
        playerRadius=0.7
    ){
        // границы арены
        if(
            Math.abs(x) > this.bounds ||
            Math.abs(z) > this.bounds
        ){
            return true;
        }

        // объекты
        for(const obstacle of this.obstacles){

            const dx =
                x - obstacle.mesh.position.x;

            const dz =
                z - obstacle.mesh.position.z;

            const distance =
                Math.sqrt(
                    dx*dx +
                    dz*dz
                );
            if(
                distance <
                obstacle.radius +
                playerRadius
            ){
                return true;
            }
        }
        return false;
    }

    update(delta){
        const time =
            performance.now()*0.003;
        this.torches.forEach(
            (torch,index)=>{
                torch.intensity =
                    2.5 +
                    Math.sin(
                        time*5 + index
                    )*0.8;
            }
        );
    }
}