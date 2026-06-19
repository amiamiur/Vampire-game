import * as THREE from 'three';

export class CombatController {

    constructor({
        camera,
        renderer,
        state,
        socket
    }) {
        this.camera = camera;
        this.renderer = renderer;
        this.state = state;
        this.socket = socket;
        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();

        this.bind();
    }

    bind(){
        window.addEventListener(
            'click',
            (event)=>this.attack(event)
        );
    }
    attack(event){
        const {
            myPlayer,
            myHp,
            players,
            mySocketId
        } = this.state;

        if(
            !myPlayer ||
            myHp <= 0
        ) return;

        this.mouse.x = (event.clientX / this.renderer.domElement.clientWidth) * 2 - 1;

        this.mouse.y = -(event.clientY / this.renderer.domElement.clientHeight) * 2 + 1;

        this.raycaster.setFromCamera(
            this.mouse,
            this.camera
        );

        const targets = Array.from(players.values())
            .filter(
                p => p.isAlive && p.id !== mySocketId
            )
            .map(p=>p.mesh);

        const hits =
            this.raycaster.intersectObjects(targets, true);

        if(!hits.length) return;

        const hitMesh = hits[0].object;

        for(const [id, player] of players.entries()
        ){
            if(
                player.id === mySocketId
            )
                continue;
            if(
                this.isInsidePlayer(
                    player.mesh,
                    hitMesh
                )
            ){
                if(
                    myPlayer.isAlive
                ){
                    myPlayer.attack();
                }
                this.socket.emit(
                    'player-attack',
                    id
                );
                break;
            }
        }
    }

    isInsidePlayer(
        root,
        target
    ){
        if(root === target)
            return true;

        if(!root.children)
            return false;

        return root.children.some(
            child =>
                child === target ||
                this.isInsidePlayer(
                    child,
                    target
                )
        );
    }
}