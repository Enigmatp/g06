/**
 * Hex grid utilities — flat-top hex math
 * Axial coordinate system (q, r)
 */

// Flat-top hex dimensions
export const HEX_SIZE = 36; // radius (center to vertex)
export const HEX_WIDTH = HEX_SIZE * 2;
export const HEX_HEIGHT = Math.sqrt(3) * HEX_SIZE;

/**
 * Convert axial (q, r) to pixel (x, y) — flat-top layout
 */
export function hexToPixel(q, r) {
    const x = HEX_SIZE * (3 / 2 * q);
    const y = HEX_SIZE * (Math.sqrt(3) / 2 * q + Math.sqrt(3) * r);
    return { x, y };
}

/**
 * Get the 6 neighbors of a hex in axial coords
 */
const AXIAL_DIRECTIONS = [
    { q: +1, r: 0 }, { q: +1, r: -1 }, { q: 0, r: -1 },
    { q: -1, r: 0 }, { q: -1, r: +1 }, { q: 0, r: +1 },
];

export function getNeighbors(q, r) {
    return AXIAL_DIRECTIONS.map(d => ({ q: q + d.q, r: r + d.r }));
}

/**
 * Generate a hex key string for map lookups
 */
export function hexKey(q, r) {
    return `${q},${r}`;
}

/**
 * Get flat-top hex polygon points (for drawing)
 */
export function getHexPoints(cx, cy, size) {
    const points = [];
    for (let i = 0; i < 6; i++) {
        const angleDeg = 60 * i;
        const angleRad = (Math.PI / 180) * angleDeg;
        points.push({
            x: cx + size * Math.cos(angleRad),
            y: cy + size * Math.sin(angleRad),
        });
    }
    return points;
}

/**
 * Generate a hex map in a rough diamond/hex shape
 * Returns array of {q, r} coords
 */
export function generateHexMap(radius) {
    const coords = [];
    for (let q = -radius; q <= radius; q++) {
        const r1 = Math.max(-radius, -q - radius);
        const r2 = Math.min(radius, -q + radius);
        for (let r = r1; r <= r2; r++) {
            coords.push({ q, r });
        }
    }
    return coords;
}

/**
 * Axial distance between two hexes
 */
export function hexDistance(q1, r1, q2, r2) {
    return (Math.abs(q1 - q2) + Math.abs(q1 + r1 - q2 - r2) + Math.abs(r1 - r2)) / 2;
}
