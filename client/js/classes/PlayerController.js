import * as THREE from 'three';

export class PlayerController {

    constructor({
        camera,
        arena,
        getPlayer,
        socket,
        footsteps,
        keyState
    }) {
        this.camera = camera;
        this.arena = arena;
        this.getPlayer = getPlayer;
        this.socket = socket;
        this.footsteps = footsteps;
        this.keyState = keyState;
        this.speed = 5;
        this.timer = 0;
        this.moveInterval = null;
        this.start();
    }

    start() {
        if (this.moveInterval) return;

        let lastTime = performance.now();
        let isMoving = false;

        this.moveInterval = setInterval(() => {
            const player = this.getPlayer();
            if(!player) return;

            const now = performance.now();
            const delta = Math.min(
                0.033,
                (now - lastTime) / 1000
            );
            lastTime = now;

            const moving =
                this.keyState.w ||
                this.keyState.s ||
                this.keyState.a ||
                this.keyState.d;

            if (!moving) {
                if (isMoving) {
                    this.socket.emit(
                        'player-move',
                        {
                            x:player.mesh.position.x,
                            z:player.mesh.position.z,
                            dx:0,
                            dz:0,
                            isMoving:false,
                            rotation:player.mesh.rotation.y
                        }
                    );
                }
                player.playAnimation('idle');
                isMoving = false;
                return;
            }

            const direction = new THREE.Vector3();
            if(this.keyState.w)
                direction.z += 1;
            if(this.keyState.s)
                direction.z -= 1;
            if(this.keyState.a)
                direction.x -= 1;
            if(this.keyState.d)
                direction.x += 1;
            direction.normalize();

            const cameraDir =
                this.camera
                .getWorldDirection(
                    new THREE.Vector3()
                );

            const forward =
                new THREE.Vector3(
                    cameraDir.x,
                    0,
                    cameraDir.z
                ).normalize();

            const right =
                new THREE.Vector3()
                .crossVectors(
                    forward,
                    new THREE.Vector3(0,1,0)
                )
                .normalize();

            const dx =
                (
                    right.x * direction.x +
                    forward.x * direction.z
                )
                *
                this.speed *
                delta;

            const dz =
                (
                    right.z * direction.x +
                    forward.z * direction.z
                )
                *
                this.speed *
                delta;

            const x =
                player.mesh.position.x + dx;
            const z =
                player.mesh.position.z + dz;

            if(!this.arena.checkCollision(x,z)){

                player.setPosition(
                    x,
                    z
                );
            }

            this.timer += delta;

            if(this.timer > 0.25){
                this.footsteps.spawn(
                    player.mesh.position.clone()
                );
                this.timer = 0;
            }

            player.mesh.rotation.y =
                Math.atan2(dx,dz);

            player.playAnimation('run');

            this.socket.emit(
                'player-move',
                {
                    x,
                    z,
                    dx,
                    dz,
                    isMoving:true,
                    rotation:player.mesh.rotation.y
                }
            );
            isMoving = true;
        },1000/30);
    }
}