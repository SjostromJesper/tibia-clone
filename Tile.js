class Tile {
    constructor(id, name, isWalkable) {
        this.id = id;
        this.name = name;
        this.isWalkable = isWalkable;
    }
}

export const tiles = new Map([
    [0, { name: 'grass', isWalkable: true, isInteractable: false }],
    [1, { name: 'tree', isWalkable: false, isInteractable: true, requiresMelee: true }],
    [2, { name: 'rock', isWalkable: false, isInteractable: true, requiresMelee: true }]
]);
