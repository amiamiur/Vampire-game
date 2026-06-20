//Player
class Player {
    constructor(id, socket){
        this.id = id;
        this.socket = socket;

        this.hp = 100;
        this.essence = 0;

        this.x = 0;
        this.z = 0;
        this.rotation = 0;

        this.isAlive=true;
        this.roundKills = 0;
    }
    reset(){
        this.hp = 100;
        this.isAlive = true;

        this.x =
        (Math.random()-0.5)*10;
        this.z =
        (Math.random()-0.5)*10;
    }
    damage(amount){
        this.hp -= amount;
        if(this.hp <= 0){

            this.hp = 0;
            this.isAlive = false;
        }
    }

    setPosition(x,z){
        this.x = x;
        this.z = z;
    }
}
module.exports = Player;