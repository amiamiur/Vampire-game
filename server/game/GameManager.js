//GameManager
const Duel = require("./Duel");


class GameManager {


constructor(io){
    this.io = io;
    this.waiting = [];
    this.duels = [];
}

    join(player){
        this.waiting.push(player);
        console.log("[MATCH] Waiting:", this.waiting.length);

        if(this.waiting.length >= 2){
            const p1 = this.waiting.shift();
            const p2 = this.waiting.shift();
            const duel = new Duel(p1, p2, this.io);

            this.duels.push(duel);
            duel.start();
        }
    }

    findDuel(playerId){
        return this.duels.find(
            duel =>
            duel.players.some(p=>p.id===playerId)
        );
    }

    remove(playerId){
    this.waiting = this.waiting.filter(p=>p.id!==playerId);
    this.duels = this.duels.filter(duel => !duel.players.some(p=>p.id===playerId));
    }
}
module.exports = GameManager;