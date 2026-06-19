
export class InputManager {
    constructor(keyState, player, socket) {
        this.keyState = keyState;
        this.player = player;
        this.socket = socket;
        this.bind();
    }

    bind(){
        window.addEventListener(
            'keydown',
            e=>this.keyDown(e)
        );
        window.addEventListener(
            'keyup',
            e=>this.keyUp(e)
        );
    }

    keyDown(e){
        const key =
            e.key.toLowerCase();
        // ульта
        if(key === 'e'){
            const player = this.player();

            if(
                player &&
                player.isAlive
            ){
                player.useUltimate(
                    this.socket
                );
                this.socket.emit(
                    'player-ultimate-animation'
                );
            }
            return;
        }
        if(this.keyState[key] !== undefined)
        {
            this.keyState[key] = true;
        }
    }
    keyUp(e){
        const key =
            e.key.toLowerCase();

        if(this.keyState[key] !== undefined)
        {
            this.keyState[key] = false;
        }
    }
}