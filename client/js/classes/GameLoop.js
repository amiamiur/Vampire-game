export class GameLoop {

    constructor({
        renderer,
        scene,
        camera,
        controls,
        state,
        bloodParticles,
        footsteps,
        arena,
        ui,
        socket
    }) {

        this.renderer = renderer;
        this.scene = scene;
        this.camera = camera;
        this.controls = controls;
        this.state = state;
        this.bloodParticles = bloodParticles;
        this.footsteps = footsteps;
        this.arena = arena;
        this.ui = ui;
        this.socket = socket;
        this.lastFrame = performance.now();
        this.animate = this.animate.bind(this);
        this.start();
    }

    start(){
        this.animate();
    }

    animate(){
        requestAnimationFrame(this.animate);

        const now = performance.now();

        const delta = Math.min(
            0.033,
            (now - this.lastFrame) / 1000
        );
        this.lastFrame = now;

        this.bloodParticles.update(delta);
        this.footsteps.update(delta);
        this.arena.update(delta);

        const battleTargets = new Map(this.state.players);
        if(this.state.myPlayer){
            battleTargets.set(this.state.myPlayer.id, this.state.myPlayer);
        }

        this.state.players.forEach(player => {
            if(player.update){
                player.update(delta);
            }

            if(player.updateProjectiles){
                player.updateProjectiles(delta);
            }

            if(player.checkProjectileCollisions){
                player.checkProjectileCollisions(
                    battleTargets,
                    this.socket
                );
            }
        });

        const me = this.state.myPlayer;

        if(me){

            me.update(delta);
            me.updateUltimate(delta);
            me.updateProjectiles(delta);
            me.checkProjectileCollisions(
                battleTargets,
                this.socket
            );

            this.ui.updateUltimate(
                me.ultimateCharge,
                me.maxUltimateCharge
            );

            this.controls.target.set(
                me.mesh.position.x,
                me.mesh.position.y + 0.5,
                me.mesh.position.z
            );
        }

        this.controls.update();

        this.renderer.render(
            this.scene,
            this.camera
        );
    }
}