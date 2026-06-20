// Duel.js
class Duel {
    constructor(player1, player2, io) {
        this.io = io;
        this.players = [player1, player2];

        this.round = 1;
        this.maxRounds = 5;
        this.active = false;

        this.score = {
            [player1.id]: 0,
            [player2.id]: 0
        };
    }

    start() {
        console.log("[DUEL] старт", this.players.map(p => p.id));
        this.active = true;
        this.resetRound();

        this.io.to(this.players[0].socket.id).emit("duel-start", {
            enemy: this.players[1].id,
            round: this.round,
            score: this.score
        });

        this.io.to(this.players[1].socket.id).emit("duel-start", {
            enemy: this.players[0].id,
            round: this.round,
            score: this.score
        });
    }

    resetRound() {
        this.players.forEach(p => p.reset());

        this.players.forEach(p => {
            this.io.emit("player-respawn", {
                id: p.id,
                x: p.x,
                z: p.z,
                hp: p.hp,
                essence: p.essence
            });
        });

        this.io.emit("round-start", {
            round: this.round,
            score: this.score
        });

        this.active = true;
    }

    playerDeath(deadId) {
        this.active = false;

        const winner = this.players.find(p => p.id !== deadId);
        if (!winner) return;

        this.score[winner.id]++;

        this.io.emit("round-end", {
            round: this.round,
            winner: winner.id,
            score: this.score
        });

        if (this.round >= this.maxRounds) {
            this.finish();
            return;
        }

        setTimeout(() => {
            this.round += 1;
            this.resetRound();
        }, 10000);
    }

    finish() {
        const [p1, p2] = this.players;
        const winner =
            this.score[p1.id] > this.score[p2.id] ? p1.id :
            this.score[p2.id] > this.score[p1.id] ? p2.id :
            null;

        this.io.emit("duel-finished", {
            winner,
            score: this.score
        });

        this.active = false;
        console.log("[DUEL] победитель", winner);
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

        this.io.emit("player-hurt", {
            id: target.id,
            hp: target.hp
        });

        this.io.to(attacker.socket.id).emit("essence-update", {
            id: attacker.id,
            essence: attacker.essence
        });

        this.io.emit("player-attack-animation", {
            id: attacker.id
        });

        if (target.hp <= 0) {
            this.io.emit("player-died", target.id);
            this.playerDeath(target.id);
        }
    }
}

module.exports = Duel;