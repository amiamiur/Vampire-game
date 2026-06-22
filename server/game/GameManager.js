const Duel = require("./Duel.js");

class GameManager {

    constructor(io){
        this.io = io;
        this.waiting = [];
        this.duels = [];
    }

    join(player){
        if(!player || player.inQueue || player.inMatch)
            return;

        this.waiting.push(player);
        player.inQueue = true;

        console.log("[MATCH] Waiting:", this.waiting.length);

        if(this.waiting.length >= 2){
            const p1 = this.waiting.shift();
            const p2 = this.waiting.shift();

            p1.inQueue = false;
            p2.inQueue = false;
            p1.inMatch = true;
            p2.inMatch = true;

            p1.spawnIndex = 0;
            p2.spawnIndex = 1;

            const duel = new Duel(p1, p2, this.io, this);
            this.duels.push(duel);
            duel.start();
        }
    }

    leave(playerOrId){
        const id = typeof playerOrId === 'object' ? playerOrId.id : playerOrId;
        this.waiting = this.waiting.filter(p => p.id !== id);

        if(typeof playerOrId === 'object'){
            playerOrId.inQueue = false;
        }
    }

    findDuel(playerId){
        return this.duels.find(
            duel => duel.players.some(p => p.id === playerId)
        );
    }

    remove(playerId, fromDuel = false){
        this.waiting = this.waiting.filter(p => p.id !== playerId);

        if(!fromDuel){
            const duel = this.duels.find(
                d => d.players.some(p => p.id === playerId) && d.active
            );

            if(duel){
                duel.forceFinish(playerId);
                this.duels = this.duels.filter(d => d !== duel);
                return;
            }
        }

        this.duels = this.duels.filter(
            duel => !duel.players.some(p => p.id === playerId)
        );
    }

    getLobbyState(){
        return {
            count: this.waiting.length,
            waiting: this.waiting.map(p => ({
                id: p.id,
                nickname: p.nickname,
                wins: p.wins,
                losses: p.losses,
                kills: p.kills,
                deaths: p.deaths
            }))
        };
    }
}

module.exports = GameManager;