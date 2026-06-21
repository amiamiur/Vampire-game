require('dotenv').config();

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const Player = require("./game/Player.js");
const GameManager = require("./game/GameManager.js");
const setupSocket = require("./socket/socketHadler.js");

const db = require("./database.js");
const app = express();

const server = http.createServer(app);

const io = new Server(server, {
  cors: { origin: '*' }
});

const game = new GameManager(io);

app.use(express.static(path.join(__dirname, '../client')));

db.query("SELECT * FROM players")
.then(result=>{
    console.log("DB PLAYERS:", result.rows);
})

setupSocket(io,game);

const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});