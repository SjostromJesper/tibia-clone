export const CHUNK_SIZE = 16;
const VIEW_DISTANCE = 2; // laddar 2 chunkar åt varje håll (5x5 chunks totalt)

export const chunks = new Map();

export function chunkKey(x, y) {
    return `${x},${y}`;
}

export function generateChunk(chunkX, chunkY) {
    const chunk = [];

    // Initiera med gräs
    for (let y = 0; y < CHUNK_SIZE; y++) {
        const row = Array(CHUNK_SIZE).fill(0);
        chunk.push(row);
    }

    // Vanlig spridning av träd/stenar
    for (let y = 0; y < CHUNK_SIZE; y++) {
        for (let x = 0; x < CHUNK_SIZE; x++) {
            const r = Math.random();

            if (r < 0.1) {
                chunk[y][x] = 1; // träd
            } else if (r < 0.2) {
                chunk[y][x] = 2; // sten
            }
        }
    }

    // --- KLUSTERGENERERING ---

    const clusterCount = Math.floor(Math.random() * 2); // 0 eller 1 kluster
    for (let i = 0; i < clusterCount; i++) {
        const type = Math.random() < 0.5 ? 1 : 2; // träd eller sten
        const clusterX = Math.floor(Math.random() * CHUNK_SIZE);
        const clusterY = Math.floor(Math.random() * CHUNK_SIZE);
        const radius = 2 + Math.floor(Math.random() * 2); // 2–3 radier

        for (let dy = -radius; dy <= radius; dy++) {
            for (let dx = -radius; dx <= radius; dx++) {
                const x = clusterX + dx;
                const y = clusterY + dy;

                if (
                    x >= 0 &&
                    y >= 0 &&
                    x < CHUNK_SIZE &&
                    y < CHUNK_SIZE &&
                    Math.random() < 0.75 // lite variation i kanterna
                ) {
                    chunk[y][x] = type;
                }
            }
        }
    }

    const key = chunkKey(chunkX, chunkY);
    chunks.set(key, chunk);
    return chunk;
}



export function getChunk(chunkX, chunkY) {
    const key = chunkKey(chunkX, chunkY);
    if (!chunks.has(key)) {
        return generateChunk(chunkX, chunkY);
    }
    return chunks.get(key);
}

export function getChunksAround(tileX, tileY) {
    const chunkX = Math.floor(tileX / CHUNK_SIZE);
    const chunkY = Math.floor(tileY / CHUNK_SIZE);

    const nearbyChunks = [];

    for (let y = -VIEW_DISTANCE; y <= VIEW_DISTANCE; y++) {
        for (let x = -VIEW_DISTANCE; x <= VIEW_DISTANCE; x++) {
            const cx = chunkX + x;
            const cy = chunkY + y;
            const chunk = getChunk(cx, cy); // genererar om det behövs
            nearbyChunks.push({
                chunkX: cx,
                chunkY: cy,
                tiles: chunk
            });
        }
    }

    return nearbyChunks;
}