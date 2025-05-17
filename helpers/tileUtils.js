import { CHUNK_SIZE, getChunk } from "../handlers/chunkHandler.js";

export function getTileAt(x, y) {
    const chunkX = Math.floor(x / CHUNK_SIZE);
    const chunkY = Math.floor(y / CHUNK_SIZE);

    const localX = ((x % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE;
    const localY = ((y % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE;

    const chunk = getChunk(chunkX, chunkY);
    if (!chunk || !chunk[localY] || chunk[localY][localX] === undefined) return null;

    return {
        chunk,
        chunkX,
        chunkY,
        localX,
        localY,
        tileId: chunk[localY][localX]
    };
}