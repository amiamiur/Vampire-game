function publicPlayer(p){
    return {
        id: p.id,
        nickname: p.nickname,
        x: p.x,
        z: p.z,
        rotation: p.rotation,
        hp: p.hp,
        essence: p.essence,
        kills: p.kills,
        deaths: p.deaths,
        wins: p.wins,
        losses: p.losses,
        isAlive: p.isAlive
    };
}

class Duel {
    constructor(player1, player2, io, game) {
        this.io = io;
        this.game = game;
        this.players = [player1, player2];

        this.round = 1;
        this.maxRounds = 5;
        this.maxWins = 3;
        this.active = false;

        this.score = {
            [player1.id]: 0,
            [player2.id]: 0
        };
    }

    getOpponent(playerId){
        return this.players.find(p => p.id !== playerId);
    }

    sendToBoth(event, data){
        this.players.forEach(p => {
            this.io.to(p.socket.id).emit(event, data);
        });
    }

    sendToOpponent(playerId, event, data){
        const target = this.getOpponent(playerId);
        if(target){
            this.io.to(target.socket.id).emit(event, data);
        }
    }

    start() {
        console.log("[DUEL] старт", this.players.map(p => p.id));
        this.active = true;

        this.players.forEach(p => {
            const enemy = this.getOpponent(p.id);

            this.io.to(p.socket.id).emit("duel-start", {
                round: this.round,
                maxRounds: this.maxRounds,
                maxWins: this.maxWins,
                score: this.score,
                me: publicPlayer(p),
                enemy: publicPlayer(enemy)
            });
        });

        this.resetRound();
    }

    resetRound() {
        this.players.forEach(p => p.reset());

        this.players.forEach(p => {
            const enemy = this.getOpponent(p.id);

            this.io.to(p.socket.id).emit("player-respawn", {
                id: p.id,
                x: p.x,
                z: p.z,
                hp: p.hp,
                essence: p.essence
            });

            this.io.to(p.socket.id).emit("round-start", {
                round: this.round,
                maxRounds: this.maxRounds,
                maxWins: this.maxWins,
                score: this.score,
                me: publicPlayer(p),
                enemy: publicPlayer(enemy)
            });
        });

        this.active = true;
    }

    playerDeath(deadId) {
        this.active = false;

        const winner = this.getOpponent(deadId);
        const loser = this.players.find(p => p.id === deadId);

        if (!winner || !loser)
            return;

        winner.kills = (winner.kills || 0) + 1;

        this.score[winner.id]++;

        loser.deaths = (loser.deaths || 0) + 1;

        this.sendToBoth("round-end", {
            round: this.round,
            winner: winner.id,
            score: this.score,
            maxRounds: this.maxRounds,
            maxWins: this.maxWins
        });

        if (this.score[winner.id] >= this.maxWins || this.round >= this.maxRounds) {
            this.finish();
            return;
        }

        setTimeout(() => {
            this.round += 1;
            this.resetRound();
        }, 2500);
    }

    finish() {
        const [p1, p2] = this.players;

        let winner = null;
        if (this.score[p1.id] > this.score[p2.id]) winner = p1;
        if (this.score[p2.id] > this.score[p1.id]) winner = p2;

        if (winner) {
            winner.wins += 1;
            const loser = this.getOpponent(winner.id);
            if (loser) loser.losses += 1;
        }

        this.players.forEach(p => {
            p.inMatch = false;
            p.inQueue = false;
        });

        this.sendToBoth("duel-finished", {
            winner: winner ? publicPlayer(winner) : null,
            score: this.score,
            reason: "normal"
        });

        if (this.game) {
            this.game.remove(this.players[0].id, true);
            this.game.remove(this.players[1].id, true);
            this.io.emit("lobby-state", this.game.getLobbyState());
        }

        this.active = false;
        console.log("[DUEL] победитель", winner ? winner.id : null);
    }

    forceFinish(loserId) {
        const winner = this.getOpponent(loserId);

        if (winner) {
            winner.wins += 1;
            const loser = this.players.find(p => p.id === loserId);
            if (loser) loser.losses += 1;
        }

        this.players.forEach(p => {
            p.inMatch = false;
            p.inQueue = false;
        });

        this.sendToBoth("duel-finished", {
            winner: winner ? publicPlayer(winner) : null,
            score: this.score,
            reason: "disconnect"
        });

        this.active = false;
    }

    attack(attackerId, targetId) {
        if (!this.active) return;

        const attacker = this.players.find(p => p.id === attackerId);
        const target = this.players.find(p => p.id === targetId);

        if (!attacker || !target) return;
        if (!attacker.isAlive || !target.isAlive) return;

        const dx = attacker.x - target.x;
        const dz = attacker.z - target.z;
        const distance = Math.sqrt(dx * dx + dz * dz);

        if (distance > 2) return;

        const damage = 15;
        target.damage(damage);
        attacker.essence += 10;

        this.sendToBoth("player-hurt", {
            id: target.id,
            hp: target.hp,
            damage: damage
        });

        this.io.to(attacker.socket.id).emit("essence-update", {
            id: attacker.id,
            essence: attacker.essence
        });

        this.sendToBoth("player-attack-animation", {
            id: attacker.id
        });

        if (target.hp <= 0) {
            this.sendToBoth("player-died", target.id);
            this.playerDeath(target.id);
        }
    }

    ultimateHit(attackerId, targetId, damage = 40) {
        if (!this.active) return;

        const attacker = this.players.find(p => p.id === attackerId);
        const target = this.players.find(p => p.id === targetId);

        if (!attacker || !target) return;
        if (!attacker.isAlive || !target.isAlive) return;

        const dx = attacker.x - target.x;
        const dz = attacker.z - target.z;
        const distance = Math.sqrt(dx * dx + dz * dz);

        if (distance > 2.5) return;

        target.damage(damage);

        this.sendToBoth("player-hurt", {
            id: target.id,
            hp: target.hp,
            damage: damage
        });

        if (target.hp <= 0) {
            this.sendToBoth("player-died", target.id);
            this.playerDeath(target.id);
        }
    }
}

module.exports = Duel;