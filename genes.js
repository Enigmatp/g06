// Species Definitions - Base Species and Traits
const SPECIES_DATA = {
    wolf: {
        name: '狼',
        emoji: '🐺',
        baseColor: '#808080',
        traits: {
            ears: 'pointed',
            tail: 'bushy',
            snout: 'long',
            feet: 'paws'
        },
        personality: 'fierce'
    },
    duck: {
        name: '鸭',
        emoji: '🦆',
        baseColor: '#FFD700',
        traits: {
            beak: 'flat',
            feet: 'webbed',
            tail: 'short',
            feathers: true
        },
        personality: 'cute'
    },
    cat: {
        name: '猫',
        emoji: '🐱',
        baseColor: '#FFA500',
        traits: {
            ears: 'cat',
            tail: 'long',
            whiskers: true,
            feet: 'paws'
        },
        personality: 'elegant'
    },
    rabbit: {
        name: '兔',
        emoji: '🐰',
        baseColor: '#FFFFFF',
        traits: {
            ears: 'long',
            tail: 'fluffy',
            teeth: 'buck',
            feet: 'hoppers'
        },
        personality: 'gentle'
    },
    dragon: {
        name: '龙',
        emoji: '🐉',
        baseColor: '#FF0000',
        traits: {
            horns: true,
            wings: 'dragon',
            scales: true,
            tail: 'spiky'
        },
        personality: 'majestic'
    },
    bird: {
        name: '鸟',
        emoji: '🐦',
        baseColor: '#87CEEB',
        traits: {
            wings: 'feathered',
            beak: 'small',
            feathers: true,
            feet: 'talons'
        },
        personality: 'agile'
    },
    bear: {
        name: '熊',
        emoji: '🐻',
        baseColor: '#8B4513',
        traits: {
            ears: 'round',
            claws: true,
            fur: 'thick',
            size: 'large'
        },
        personality: 'strong'
    },
    fox: {
        name: '狐',
        emoji: '🦊',
        baseColor: '#FF6347',
        traits: {
            ears: 'pointed',
            tail: 'bushy',
            snout: 'pointed',
            fur: 'fluffy'
        },
        personality: 'clever'
    }
};

// Genes Class - DNA System
class Genes {
    constructor(parent1 = null, parent2 = null) {
        if (parent1 && parent2) {
            // Inherit from parents
            this.inheritFromParents(parent1, parent2);
        } else {
            // Create base species
            this.createBase();
        }
    }

    createBase(speciesKey = null) {
        // Random base species if not specified
        if (!speciesKey) {
            const keys = Object.keys(SPECIES_DATA);
            speciesKey = keys[Math.floor(Math.random() * keys.length)];
        }

        const species = SPECIES_DATA[speciesKey];

        this.species = [speciesKey];
        this.bodyColor = species.baseColor;
        this.eyeColor = '#000000';
        this.size = 1.0;
        this.traits = { ...species.traits };
        this.pattern = 'solid';
        this.accessories = [];
        this.rarity = 1; // Common
    }

    inheritFromParents(parent1, parent2) {
        // Species inheritance - combine both
        this.species = [...new Set([...parent1.species, ...parent2.species])];

        // Limit to 3 species max
        if (this.species.length > 3) {
            this.species = this.species.slice(0, 3);
        }

        // Color inheritance: 30% parent1, 30% parent2, 40% merged
        const colorRoll = Math.random();
        if (colorRoll < 0.3) {
            // 30% - Inherit from parent1 (father)
            this.bodyColor = parent1.bodyColor;
        } else if (colorRoll < 0.6) {
            // 30% - Inherit from parent2 (mother)
            this.bodyColor = parent2.bodyColor;
        } else {
            // 40% - Merge colors
            this.bodyColor = this.mixColors(parent1.bodyColor, parent2.bodyColor);
        }

        // Eye color: same distribution
        const eyeRoll = Math.random();
        if (eyeRoll < 0.3) {
            this.eyeColor = parent1.eyeColor;
        } else if (eyeRoll < 0.6) {
            this.eyeColor = parent2.eyeColor;
        } else {
            this.eyeColor = this.mixColors(parent1.eyeColor, parent2.eyeColor);
        }

        // Size inheritance: 30% parent1, 30% parent2, 40% average
        const sizeRoll = Math.random();
        if (sizeRoll < 0.3) {
            this.size = parent1.size * (0.9 + Math.random() * 0.2); // ±10%
        } else if (sizeRoll < 0.6) {
            this.size = parent2.size * (0.9 + Math.random() * 0.2);
        } else {
            const avgSize = (parent1.size + parent2.size) / 2;
            this.size = avgSize * (0.9 + Math.random() * 0.2);
        }

        // Traits inheritance with merge logic
        this.traits = this.inheritTraits(parent1.traits, parent2.traits);

        // Pattern inheritance: 30% parent1, 30% parent2, 40% new/merged
        const patternRoll = Math.random();
        if (patternRoll < 0.3) {
            this.pattern = parent1.pattern;
        } else if (patternRoll < 0.6) {
            this.pattern = parent2.pattern;
        } else {
            // 40% - New pattern or keep one
            if (Math.random() < 0.5) {
                this.pattern = this.mutatePattern();
            } else {
                this.pattern = Math.random() < 0.5 ? parent1.pattern : parent2.pattern;
            }
        }

        // Accessories: merge both parents + chance for new
        this.accessories = [...new Set([...parent1.accessories, ...parent2.accessories])];

        // 10% chance for new accessory when merging
        if (Math.random() < 0.1) {
            this.accessories.push(this.getRandomAccessory());
        }

        // Rarity calculation
        this.rarity = this.calculateRarity();
    }

    inheritTraits(traits1, traits2) {
        const inherited = {};
        const allKeys = new Set([...Object.keys(traits1), ...Object.keys(traits2)]);

        allKeys.forEach(key => {
            const has1 = traits1[key] !== undefined;
            const has2 = traits2[key] !== undefined;

            if (has1 && has2) {
                // Both have - 100% inherit, choose one
                inherited[key] = Math.random() < 0.5 ? traits1[key] : traits2[key];
            } else if (has1 || has2) {
                // Only one has - 50% inherit
                if (Math.random() < 0.5) {
                    inherited[key] = has1 ? traits1[key] : traits2[key];
                }
            } else {
                // Neither has - 5% mutation
                if (Math.random() < 0.05) {
                    inherited[key] = this.getMutatedTrait(key);
                }
            }
        });

        return inherited;
    }

    mutateColor(color1, color2) {
        // Mix colors or create new
        if (Math.random() < 0.3) {
            // Mix parent colors
            return this.mixColors(color1, color2);
        } else {
            // Random new color
            const colors = ['#FF69B4', '#9370DB', '#00CED1', '#FFD700', '#FF6347', '#32CD32'];
            return colors[Math.floor(Math.random() * colors.length)];
        }
    }

    mixColors(color1, color2) {
        // Simple color mixing
        const r1 = parseInt(color1.slice(1, 3), 16);
        const g1 = parseInt(color1.slice(3, 5), 16);
        const b1 = parseInt(color1.slice(5, 7), 16);

        const r2 = parseInt(color2.slice(1, 3), 16);
        const g2 = parseInt(color2.slice(3, 5), 16);
        const b2 = parseInt(color2.slice(5, 7), 16);

        const r = Math.floor((r1 + r2) / 2);
        const g = Math.floor((g1 + g2) / 2);
        const b = Math.floor((b1 + b2) / 2);

        return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
    }

    mutatePattern() {
        const patterns = ['solid', 'spots', 'stripes', 'gradient', 'sparkle'];
        return patterns[Math.floor(Math.random() * patterns.length)];
    }

    getMutatedTrait(key) {
        const mutations = {
            horns: true,
            wings: 'mutated',
            scales: true,
            glow: true,
            extra_tail: true
        };
        return mutations[key] || true;
    }

    getRandomAccessory() {
        const accessories = ['crown', 'bow', 'glasses', 'hat', 'scarf', 'collar'];
        return accessories[Math.floor(Math.random() * accessories.length)];
    }

    calculateRarity() {
        let score = 0;

        // Multi-species bonus
        score += (this.species.length - 1) * 2;

        // Mutation traits
        const mutationTraits = ['horns', 'wings', 'scales', 'glow'];
        mutationTraits.forEach(trait => {
            if (this.traits[trait]) score += 1;
        });

        // Accessories
        score += this.accessories.length;

        // Special patterns
        if (this.pattern === 'sparkle' || this.pattern === 'gradient') score += 1;

        // Size extremes
        if (this.size < 0.7 || this.size > 1.5) score += 1;

        // Determine rarity
        if (score >= 8) return 5; // Mythic
        if (score >= 6) return 4; // Legendary
        if (score >= 4) return 3; // Epic
        if (score >= 2) return 2; // Rare
        return 1; // Common
    }

    getSpeciesName() {
        if (this.species.length === 1) {
            return SPECIES_DATA[this.species[0]].name;
        } else {
            return this.species.map(s => SPECIES_DATA[s].name).join('');
        }
    }

    getSpeciesEmoji() {
        return this.species.map(s => SPECIES_DATA[s].emoji).join('');
    }

    getRarityName() {
        const names = ['', '普通', '稀有', '史诗', '传说', '神话'];
        return names[this.rarity];
    }

    getRarityColor() {
        const colors = ['', '#FFFFFF', '#00FF00', '#9C27B0', '#FF9800', '#FFD700'];
        return colors[this.rarity];
    }
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
