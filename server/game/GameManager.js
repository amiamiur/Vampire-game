const Duel = require("./Duel.js");

class GameManager {

    constructor(io){
    this.io=io;
    this.waiting=[];
    this.duels=[];
}
    join(player){
        this.waiting.push(player);
        if(this.waiting.length>=2){

        const p1=this.waiting.shift();
        const p2=this.waiting.shift();

        const duel =
        new Duel(
        p1,
        p2,
        this.io);
        this.duels.push(duel);
        duel.start();
        }
    }
}
module.exports=GameManager;