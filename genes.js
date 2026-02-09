// Species Definitions - Fixed 10 Types
const SPECIES_DATA = {
    // Base 8
    wolf: { name: '狼', emoji: '🐺', rarity: 1 },
    duck: { name: '鸭', emoji: '🦆', rarity: 1 },
    cat: { name: '猫', emoji: '🐱', rarity: 1 },
    rabbit: { name: '兔', emoji: '🐰', rarity: 1 },
    dragon: { name: '龙', emoji: '🐉', rarity: 2 },
    bird: { name: '鸟', emoji: '🐦', rarity: 1 },
    bear: { name: '熊', emoji: '🐻', rarity: 1 },
    fox: { name: '狐', emoji: '🦊', rarity: 1 },

    // Hybrids 2 (Special Fixed Combinations)
    wolf_duck: { name: '狼鸭', emoji: '🐺🦆', rarity: 3 },
    dragon_bird: { name: '龙鸟', emoji: '🐉🐦', rarity: 4 }
};

// Genes Class - Closed System
class Genes {
    constructor(parent1 = null, parent2 = null) {
        if (parent1 && parent2) {
            // Inherit from parents (Closed System)
            this.inheritFromParents(parent1, parent2);
        } else {
            // Create base species
            this.createBase();
        }
    }

    createBase(speciesKey = null) {
        const keys = Object.keys(SPECIES_DATA);

        // Random base if not specified (exclude special hybrids mostly)
        if (!speciesKey) {
            // 80% chance for base 8, 20% for any
            if (Math.random() < 0.8) {
                const baseKeys = ['wolf', 'duck', 'cat', 'rabbit', 'bird', 'bear', 'fox'];
                speciesKey = baseKeys[Math.floor(Math.random() * baseKeys.length)];
            } else {
                speciesKey = keys[Math.floor(Math.random() * keys.length)];
            }
        }

        this.speciesKey = speciesKey;
        this.data = SPECIES_DATA[speciesKey];
        this.species = [speciesKey]; // Keep array format for compatibility
        this.rarity = this.data.rarity;

        // Mock properties for compatibility with Card class
        this.bodyColor = '#FFFFFF';
        this.size = 1.0;
        this.pattern = 'solid';
        this.accessories = [];
        this.traits = {};
    }

    inheritFromParents(parent1, parent2) {
        const p1 = parent1.speciesKey;
        const p2 = parent2.speciesKey;

        // Logic for closed system breeding:
        // 1. Specific combinations -> Fixed Hybrids
        // 2. Same species -> Same species
        // 3. Random mixture -> One of the parents (50/50)

        // Check for Wolf + Duck -> WolfDuck
        if ((p1 === 'wolf' && p2 === 'duck') || (p1 === 'duck' && p2 === 'wolf')) {
            this.createBase('wolf_duck');
            return;
        }

        // Check for Dragon + Bird -> DragonBird
        if ((p1 === 'dragon' && p2 === 'bird') || (p1 === 'bird' && p2 === 'dragon')) {
            this.createBase('dragon_bird');
            return;
        }

        // Inheritance Logic
        const roll = Math.random();

        if (p1 === p2) {
            // Same species breeds same
            this.createBase(p1);
        } else {
            // Different species
            if (roll < 0.45) {
                this.createBase(p1);
            } else if (roll < 0.90) {
                this.createBase(p2);
            } else {
                // 10% Mutation to a random other species!
                this.createBase(); // Random
            }
        }

        // Rarity bump chance
        if (Math.random() < 0.1) {
            this.rarity = Math.min(5, this.rarity + 1);
        }
    }

    getSpeciesName() {
        return this.data.name;
    }

    getSpeciesEmoji() {
        return this.data.emoji;
    }

    getRarityName() {
        const names = ['', '普通', '稀有', '史诗', '传说', '神话'];
        return names[Math.min(5, this.rarity)] || '普通';
    }

    getRarityColor() {
        const colors = ['', '#FFFFFF', '#00FF00', '#9C27B0', '#FF9800', '#FFD700'];
        return colors[Math.min(5, this.rarity)] || '#FFFFFF';
    }

    // Legacy methods kept for compatibility but unused
    inheritTraits() { return {}; }
    mixColors() { return '#FFF'; }
    mutatePattern() { return 'solid'; }
    getMutatedTrait() { return true; }
    getRandomAccessory() { return ''; }
    calculateRarity() { return 1; }
}

// Helper function to create a base pet with specific species
function createBasePet(speciesKey) {
    const genes = new Genes();
    genes.createBase(speciesKey);
    return genes;
}

// Helper function to breed two pets
function breedPets(genes1, genes2) {
    return new Genes(genes1, genes2);
}
