import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import path from 'path';
import { fileURLToPath } from 'url';
import Player from './Player.js';
import { CHUNK_SIZE, getChunk, getChunksAround } from "./handlers/chunkHandler.js";
import { tiles } from './Tile.js';
import { getTileAt } from './helpers/tileUtils.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);
const io = new Server(server);
const PORT = 3000;

// ====== DATA STRUCTURES ======
let players = {};

let enemies = {};
const ACTIVE_RADIUS = 10;

// Skapa 5 fiender med UUID som nyckel
for (let i = 1; i <= 5; i++) {
    const id = crypto.randomUUID();
    enemies[id] = {
        id: id,
        name: "Råtta",
        x: 5 + Math.floor(Math.random() * 10),
        y: 5 + Math.floor(Math.random() * 10),
        health: 5,
        maxHealth: 5,
        active: false
    };
}

// const corpseId = crypto.randomUUID();
// const corpses = {}
// corpses[corpseId] = {
//     id: corpseId,
//     x: target.x,
//     y: target.y,
//     loot: [
//         { id: 'item_meat', name: 'Raw Meat', icon: '🥩', quantity: 1 }
//     ]
// };

// ====== GAME LOOP ======
setInterval(() => {
    // 1. Aktivera/deaktivera fiender
    for (const enemy of Object.values(enemies)) {
        const shouldBeActive = isPlayerNear(enemy.x, enemy.y);
        enemy.active = shouldBeActive;
    }

    // 2. Flytta aktiva fiender
    for (const enemy of Object.values(enemies)) {
        if (!enemy.active) continue;
        if (Math.random() < 0.5) continue;

        const directions = [
            { dx: 1, dy: 0 },
            { dx: -1, dy: 0 },
            { dx: 0, dy: 1 },
            { dx: 0, dy: -1 }
        ];

        const dir = directions[Math.floor(Math.random() * directions.length)];
        const newX = enemy.x + dir.dx;
        const newY = enemy.y + dir.dy;

        if (isWalkable(newX, newY) && !isOccupied(newX, newY) && !hasEntity(newX, newY)) {
            enemy.x = newX;
            enemy.y = newY;
        }
    }

    // 3. Uppdatera klienterna
    io.emit('enemyMoved', Object.values(enemies).map(({ id, x, y, health, maxHealth, name }) => ({ id, x, y, health, maxHealth, name })));

}, 1000); // 1s per tick

// ====== HELPERS ======
function isWalkable(x, y) {
    const tileInfo = getTileAt(x, y);
    if (!tileInfo) return false;
    const tile = tiles.get(tileInfo.tileId);
    return tile?.isWalkable ?? false;
}

function isOccupied(x, y) {
    return Object.values(players).some(p => p.posX === x && p.posY === y);
}

function hasEntity(x, y) {
    return Object.values(enemies).some(e => e.x === x && e.y === y);
}

function getEntityAt(x, y) {
    return Object.values(enemies).find(e => e.x === x && e.y === y);
}

function isPlayerNear(x, y) {
    for (const player of Object.values(players)) {
        const dx = Math.abs(player.posX - x);
        const dy = Math.abs(player.posY - y);
        if (dx <= ACTIVE_RADIUS && dy <= ACTIVE_RADIUS) return true;
    }
    return false;
}

function sendChunkUpdateToSocket(socket, x, y) {
    const visibleChunks = getChunksAround(x, y);
    socket.emit('mapData', visibleChunks);
}

// ====== SOCKET.IO ======
io.on('connection', (socket) => {
    console.log(`🔌 Connected: ${socket.id}`);

    const startTileX = 5;
    const startTileY = 5;
    const newPlayer = new Player(`Player-${socket.id.slice(0, 4)}`);
    newPlayer.posX = startTileX;
    newPlayer.posY = startTileY;
    players[socket.id] = newPlayer;

    sendChunkUpdateToSocket(socket, startTileX, startTileY);
    socket.emit('enemyList', Object.values(enemies));
    socket.emit('currentPlayers', players);

    socket.broadcast.emit('newPlayer', {
        id: socket.id,
        player: newPlayer
    });

    socket.on('move', (direction) => {
        const player = players[socket.id];
        if (!player) return;

        let [newX, newY] = [player.posX, player.posY];
        if (direction === 'ArrowUp') newY--;
        else if (direction === 'ArrowDown') newY++;
        else if (direction === 'ArrowLeft') newX--;
        else if (direction === 'ArrowRight') newX++;

        if (isOccupied(newX, newY) || !isWalkable(newX, newY) || hasEntity(newX, newY)) {
            socket.emit('moveDenied');
            return;
        }

        const oldChunks = getChunksAround(player.posX, player.posY);
        const newChunks = getChunksAround(newX, newY);
        const oldKeys = new Set(oldChunks.map(c => `${c.chunkX},${c.chunkY}`));
        const toSend = newChunks.filter(c => !oldKeys.has(`${c.chunkX},${c.chunkY}`));

        player.posX = newX;
        player.posY = newY;

        if (toSend.length > 0) {
            socket.emit('mapData', toSend);
        }

        io.emit('playerMoved', {
            id: socket.id,
            x: newX,
            y: newY,
            speed: player.speed,
            timestamp: Date.now()
        });
    });

    socket.on('targetTile', ({ x, y }) => {
        const player = players[socket.id];
        if (!player) return;

        const enemy = Object.values(enemies).find(e => e.x === x && e.y === y);
        if (enemy) {
            player.targetEnemyId = enemy.id;
            socket.emit('enemyTargeted', { enemyId: enemy.id });
        } else {
            player.targetEnemyId = null;
            const tileInfo = getTileAt(x, y);
            const tileId = tileInfo?.tileId;

            if (tileId === 1 || tileId === 2) {
                socket.emit('tileTargeted', { x, y, type: tileId === 1 ? 'tree' : 'rock' });
            } else {
                socket.emit('targetInvalid');
            }
        }
    });

    socket.on('targetAtPosition', ({ x, y }) => {
        const player = players[socket.id];
        if (!player) return;

        player.currentTarget = null;
        player.targetId = null;

        const tileInfo = getTileAt(x, y);
        const dx = Math.abs(player.posX - x);
        const dy = Math.abs(player.posY - y);
        const inRange = dx <= 1 && dy <= 1;


        const entity = getEntityAt(x, y);
        if (entity) {
            console.log("enemy was targeted")

            player.currentTarget = entity;
            player.targetId = entity.id;
            socket.emit('enemyTargeted', entity);
            return;
        }

        const tile = tiles.get(tileInfo.tileId);
        if (tile?.isInteractable) {
            console.log("tile was targeted")

            socket.emit('tileTargeted', tile);
        }
    });

    socket.on('interactWithTile', ({ x, y }) => {
        const player = players[socket.id];
        if (!player) return;

        const dx = Math.abs(player.posX - x);
        const dy = Math.abs(player.posY - y);
        const inRange = dx <= 1 && dy <= 1;

        const tileInfo = getTileAt(x, y);
        if (!tileInfo) {
            socket.emit('actionDenied', { reason: 'notInteractable' });
            return;
        }

        const { chunk, chunkX, chunkY, localX, localY, tileId } = tileInfo;
        const tileType = tiles.get(tileId);

        if (!tileType?.isInteractable) {
            socket.emit('actionDenied', { reason: 'notInteractable' });
            return;
        }

        if (tileType.requiresMelee && !inRange) {
            socket.emit('actionDenied', { reason: 'tooFarAway' });
            return;
        }

        chunk[localY][localX] = 0;

        io.emit('tileUpdated', {
            chunkX,
            chunkY,
            x: localX,
            y: localY,
            value: 0
        });

        sendChunkUpdateToSocket(socket, x, y);
        console.log(`${player.name} interagerade med tile (${x}, ${y})`);
    });

    socket.on('getPlayerData', () => {
        socket.emit('playerData', players[socket.id]);
    });

    socket.on('disconnect', () => {
        console.log(`❌ Disconnected: ${socket.id}`);
        delete players[socket.id];
        io.emit('playerDisconnected', socket.id);
    });
});

const ATTACK_COOLDOWN = 1500;

setInterval(() => {
    const now = Date.now();

    // === COMBAT LOGIK ===
    for (const player of Object.values(players)) {
        if (!player.targetId) continue;

        const target = Object.values(enemies).find(e => e.id === player.targetId);
        if (!target) {
            player.targetId = null; // korrekt nyckel
            continue;
        }

        const dx = Math.abs(player.posX - target.x);
        const dy = Math.abs(player.posY - target.y);
        const inRange = dx <= 1 && dy <= 1;

        if (!inRange) continue;

        if (now - player.lastAttackTime >= ATTACK_COOLDOWN) {
            player.lastAttackTime = now;

            // Gör attack
            target.health -= 3;

            io.emit('entityAttacked', {
                attackerId: player.id,
                targetId: target.id,
                newHealth: target.health
            });

            // Om död
            if (target.health <= 0) {
                io.emit('entityDied', {
                    id: target.id
                });
                player.experience += 5;
                player.targetId = null;
                delete enemies[target.id];
            }
        }
    }

    // === RESTEN AV FIENDE-LOOPEN ===
    // (fiender kan också ha liknande system senare)

}, 1000); // varje 100 ms

// ====== START SERVER ======
server.listen(PORT, () => {
    console.log(`🌐 Server running on http://localhost:${PORT}`);
});
