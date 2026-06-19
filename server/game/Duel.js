class Duel {

    constructor(player1, player2, io){
        this.io = io;
        this.players = [player1,player2];

        this.round = 1;
        this.score = {[player1.id]:0, [player2.id]:0};

        this.maxRounds = 5;
    }

    start(){

        console.log("[DUEL] старт",this.players.map(p=>p.id));

        this.resetRound();

        this.io.to(this.players[0].socket.id).emit("duel-start",{enemy:this.players[1].id,round:this.round});

        this.io.to(this.players[1].socket.id).emit("duel-start",{enemy:this.players[0].id,round:this.round});}

    resetRound(){
        this.players.forEach(p=>p.reset());

        this.io.emit("round-start",{round:this.round});
    }
    playerDeath(deadId){
        const winner = this.players.find(p=>p.id!==deadId);

        this.score[winner.id]++;

        this.io.emit(
        "round-end",
        {winner:winner.id,score:this.score});

        if(this.score[winner.id] >=3){
        this.finish(winner);

        return;}

        this.round++;

        setTimeout(()=>this.resetRound(),3000);
    }

    finish(player){
        this.io.emit(
        "duel-finished",
        {winner:player.id});

        console.log("[DUEL] победитель",player.id);
    }
}
module.exports=Duel;