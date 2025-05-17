//const map = require('map')

import {map} from '../map.js'

// Kolla om position på tilemap är walkable
export function isWalkable(x, y) {
    return map[y] === undefined || map[y][x] === undefined || map[y][x] === 1;
}

export function isOccupied(x, y) {

}