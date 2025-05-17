function enemyIdleMovement() {
    setInterval(() => {
        for (const enemy of Object.values(enemies)) {
            // 50% chans att inte röra sig alls
            if (Math.random() < 0.5) continue;

            const dx = Math.floor(Math.random() * 3) - 1; // -1, 0 eller +1
            const dy = Math.floor(Math.random() * 3) - 1;

            const newX = enemy.x + dx;
            const newY = enemy.y + dy;

            // Se till att nya positionen är tillåten (inget träd/sten eller annan fiende)
            if (!isBlockedTile(newX, newY) && !isEnemyAt(newX, newY)) {
                enemy.x = newX;
                enemy.y = newY;

                // Skicka uppdatering till alla klienter
                io.emit('enemyMoved', {
                    id: enemy.id,
                    x: enemy.x,
                    y: enemy.y
                });
            }
        }
    }, 2000); // kör var 2 sekunder
}