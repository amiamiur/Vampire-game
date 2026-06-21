//Player
class Player {
    constructor(id, socket){
        this.id = id;
        this.socket = socket;

        this.dbId=null;

        this.hp = 100;
        this.essence = 0;

        this.x = 0;
        this.z = 0;
        this.rotation = 0;

        this.isAlive=true;
        this.roundKills = 0;

        //Для базы данных
        this.kills = 0;
        this.deaths = 0;
        this.wins = 0;
        this.losses = 0;
    }
    reset() {
        this.hp = 100;
        this.isAlive = true;

        if (this.spawnIndex === 0) {
            this.x = -8;
            this.z = 0;
        } else {
            this.x = 8;
            this.z = 0;
        }
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