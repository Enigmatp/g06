/**
 * Event type definitions and weighted random table
 */

export const EventType = {
    EMPTY: 'empty',
    GRASS: 'grass',
    FOREST: 'forest',
    TREASURE: 'treasure',
    ENEMY: 'enemy',
    NPC: 'npc',
    RUINS: 'ruins',
    SHRINE: 'shrine',
    BOSS: 'boss',
    START: 'start',
};

// Visual config for each event type
export const EVENT_CONFIG = {
    [EventType.EMPTY]: { color: 0x4a6741, label: '', icon: '' },
    [EventType.GRASS]: { color: 0x5b8c4a, label: '', icon: '' },
    [EventType.FOREST]: { color: 0x2d5a27, label: '🌲', icon: '🌲' },
    [EventType.TREASURE]: { color: 0xd4a843, label: '💰', icon: '📦' },
    [EventType.ENEMY]: { color: 0x8b3a3a, label: '⚔️', icon: '👹' },
    [EventType.NPC]: { color: 0x4a7a8b, label: '🧙', icon: '🧙' },
    [EventType.RUINS]: { color: 0x7a6b5a, label: '🏛️', icon: '🏛️' },
    [EventType.SHRINE]: { color: 0x8b6aad, label: '⛩️', icon: '⛩️' },
    [EventType.BOSS]: { color: 0xcc2222, label: '💀', icon: '💀' },
    [EventType.START]: { color: 0x3a7a3a, label: '🏠', icon: '🏠' },
};

// Weighted random event table
const EVENT_WEIGHTS = [
    { type: EventType.GRASS, weight: 30 },
    { type: EventType.EMPTY, weight: 20 },
    { type: EventType.FOREST, weight: 15 },
    { type: EventType.TREASURE, weight: 10 },
    { type: EventType.ENEMY, weight: 12 },
    { type: EventType.NPC, weight: 5 },
    { type: EventType.RUINS, weight: 5 },
    { type: EventType.SHRINE, weight: 3 },
];

const TOTAL_WEIGHT = EVENT_WEIGHTS.reduce((sum, e) => sum + e.weight, 0);

/**
 * Pick a random event type based on weights
 */
export function rollEventType(distance = 0) {
    // At greater distances, increase chance of combat/treasure
    let roll = Math.random() * TOTAL_WEIGHT;
    for (const entry of EVENT_WEIGHTS) {
        roll -= entry.weight;
        if (roll <= 0) return entry.type;
    }
    return EventType.GRASS;
}
