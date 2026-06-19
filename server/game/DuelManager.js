class DuelManager {
    constructor(io, players){
        this.io = io;
        this.players = players;

        this.queue = [];
        this.matches = new Map();
    }

    join(socket){

        console.log(
            "[DUEL] player queue",
            socket.id
        );

        this.queue.push(socket.id);

        if(this.queue.length >= 2){
            const p1 =
            this.queue.shift();
            const p2 =
            this.queue.shift();

            const match = {
                players:[
                    p1,
                    p2
                ],
                round:1,
                score:{
                    [p1]:0,
                    [p2]:0
                },
                maxRounds:3,
                status:"running"
            };

            this.matches.set(
                p1,
                match
            );
            this.matches.set(
                p2,
                match
            );
            this.io.to(p1)
            .emit(
                "duel-start",
                {
                    enemy:p2
                }
            );
            this.io.to(p2)
            .emit(
                "duel-start",
                {
                    enemy:p1
                }
            );
            this.resetRound(match);
        }
    }

    getMatch(id){
        return this.matches.get(id);
    }

    playerKilled(playerId){

        const match =
        this.getMatch(playerId);

        if(!match)
            return;

        const winner =
        match.players.find(
            id=>id!==playerId
        );

        match.score[winner]++;

        this.io.emit(
            "round-end",
            {
                winner,
                score:match.score
            }
        );

        if(
            match.score[winner]
            >=
            match.maxRounds
        ){
            this.finish(match,winner);
        }
        else{
            match.round++;
            setTimeout(()=>{
                this.resetRound(match);
            },3000);
        }
    }

    resetRound(match){

        this.io.emit(
            "round-start",
            {
                round:match.round
            }
        );

        for(const id of match.players){
            const player =
            this.players.get(id);

            if(player){
                player.hp=100;
                player.isAlive=true;

                player.x =
                (Math.random()-0.5)*10;

                player.z =
                (Math.random()-0.5)*10;

                this.io.emit(
                    "player-respawn",
                    {
                        id,
                        x:player.x,
                        z:player.z,
                        hp:100
                    }
                );
            }
        }
    }
    finish(match,winner){
        this.io.emit(
            "duel-end", {winner}
        );

        for(const id of match.players){
            this.matches.delete(id);
        }
    }
}

module.exports = DuelManager;