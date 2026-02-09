// Card Class - Stacklands Style Card System
class Card {
    constructor(id, x, y, genes = null) {
        this.id = id;
        this.x = x;
        this.y = y;

        // Genes/DNA
        this.genes = genes || new Genes();

        // Card properties
        this.width = 120;
        this.height = 160;

        // Drag state
        this.isBeingDragged = false;
        this.dragOffsetX = 0;
        this.dragOffsetY = 0;

        // Breeding state
        this.canBreed = true;
        this.breedingCooldown = 0;

        // Animation
        this.hoverScale = 1;
        this.targetScale = 1;
        this.rotation = 0;
        this.bobOffset = Math.random() * Math.PI * 2;

        // Visual effects
        this.glowPulse = 0;
        this.particles = [];
    }

    update(deltaTime) {
        // Smooth scale animation
        this.hoverScale += (this.targetScale - this.hoverScale) * 0.1;

        // Bob animation when not dragged
        if (!this.isBeingDragged) {
            this.bobOffset += 0.02;
        }

        // Glow pulse for rare cards
        this.glowPulse += 0.05;

        // Update particles
        this.particles = this.particles.filter(p => {
            p.life -= deltaTime;
            p.y -= p.speed;
            p.x += p.vx;
            p.alpha = p.life / p.maxLife;
            return p.life > 0;
        });

        // Breeding cooldown
        if (this.breedingCooldown > 0) {
            this.breedingCooldown -= deltaTime;
            if (this.breedingCooldown <= 0) {
                this.canBreed = true;
            }
        }
    }

    render(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);

        // Bob animation
        if (!this.isBeingDragged) {
            const bob = Math.sin(this.bobOffset) * 3;
            ctx.translate(0, bob);
        }

        // Scale
        ctx.scale(this.hoverScale, this.hoverScale);

        // Rotation when dragged
        if (this.isBeingDragged) {
            ctx.rotate(this.rotation);
        }

        // Glow effect for rare cards
        if (this.genes.rarity >= 3) {
            this.drawGlow(ctx);
        }

        // Card shadow
        ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        ctx.fillRect(-this.width / 2 + 5, -this.height / 2 + 5, this.width, this.height);

        // Card background
        this.drawCardBackground(ctx);

        // Card border
        this.drawCardBorder(ctx);

        // Pet illustration
        this.drawPet(ctx);

        // Card info
        this.drawCardInfo(ctx);

        // Breeding cooldown overlay
        if (!this.canBreed) {
            this.drawCooldownOverlay(ctx);
        }

        // Particles
        this.drawParticles(ctx);

        ctx.restore();
    }

    drawGlow(ctx) {
        const glowSize = Math.max(this.width, this.height) * (1 + Math.sin(this.glowPulse) * 0.1);
        const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, glowSize / 2);
        const glowColor = this.genes.getRarityColor();
        gradient.addColorStop(0, glowColor + '40');
        gradient.addColorStop(1, glowColor + '00');
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(0, 0, glowSize / 2, 0, Math.PI * 2);
        ctx.fill();
    }

    drawCardBackground(ctx) {
        // Check if game has asset for this species
        // We access the game instance globally since it's defined in game.js
        if (window.game && window.game.assets && this.genes.species.length === 1) {
            const species = this.genes.species[0];
            const img = window.game.assets[species];

            if (img && img.complete) {
                // Draw image background
                ctx.save();

                // Clip to card shape
                ctx.beginPath();
                ctx.roundRect(-this.width / 2, -this.height / 2, this.width, this.height, 10);
                ctx.clip();

                // Draw image
                ctx.drawImage(img, -this.width / 2, -this.height / 2, this.width, this.height);

                // Add overlay gradient for text readability at bottom
                const gradient = ctx.createLinearGradient(0, 0, 0, this.height / 2);
                gradient.addColorStop(0, 'rgba(0,0,0,0)');
                gradient.addColorStop(1, 'rgba(0,0,0,0.6)');
                ctx.fillStyle = gradient;
                ctx.fillRect(-this.width / 2, 0, this.width, this.height / 2);

                ctx.restore();
                return;
            }
        }

        // Fallback: Gradient background
        const gradient = ctx.createLinearGradient(0, -this.height / 2, 0, this.height / 2);
        gradient.addColorStop(0, '#FFFFFF');
        gradient.addColorStop(1, '#F0F0F0');

        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.roundRect(-this.width / 2, -this.height / 2, this.width, this.height, 10);
        ctx.fill();
    }

    drawCardBorder(ctx) {
        const borderColor = this.canBreed ? this.genes.getRarityColor() : '#999999';
        ctx.strokeStyle = borderColor;
        ctx.lineWidth = this.isBeingDragged ? 4 : 3;
        ctx.beginPath();
        ctx.roundRect(-this.width / 2, -this.height / 2, this.width, this.height, 10);
        ctx.stroke();
    }

    drawPet(ctx) {
        // If we're drawing an image background, we don't need the vector pet
        if (window.game && window.game.assets && this.genes.species.length === 1) {
            const species = this.genes.species[0];
            const img = window.game.assets[species];

            if (img && img.complete) {
                // Image handles the visual, so skip vector drawing
                // Maybe draw accessories on top later?
                return;
            }
        }

        // Vector illustration fallback
        const petY = -this.height / 2 + 60;

        ctx.save();
        ctx.translate(0, petY);

        // Draw egg shell body (scaled based on genes.size)
        const scale = this.genes.size * 0.6;
        ctx.scale(scale, scale);

        // Body
        ctx.fillStyle = this.genes.bodyColor;
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.ellipse(0, 0, 30, 40, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Pattern
        this.drawPattern(ctx);

        // Traits
        this.drawTraits(ctx);

        // Accessories
        this.drawAccessories(ctx);

        ctx.restore();
    }

    drawPattern(ctx) {
        ctx.save();
        ctx.globalAlpha = 0.3;

        switch (this.genes.pattern) {
            case 'spots':
                ctx.fillStyle = '#000';
                for (let i = 0; i < 5; i++) {
                    const angle = (i / 5) * Math.PI * 2;
                    const x = Math.cos(angle) * 15;
                    const y = Math.sin(angle) * 20;
                    ctx.beginPath();
                    ctx.arc(x, y, 5, 0, Math.PI * 2);
                    ctx.fill();
                }
                break;
            case 'stripes':
                ctx.strokeStyle = '#000';
                ctx.lineWidth = 3;
                for (let i = -2; i <= 2; i++) {
                    ctx.beginPath();
                    ctx.moveTo(-25, i * 10);
                    ctx.lineTo(25, i * 10);
                    ctx.stroke();
                }
                break;
            case 'gradient':
                const gradient = ctx.createLinearGradient(0, -40, 0, 40);
                gradient.addColorStop(0, '#FFFFFF');
                gradient.addColorStop(1, this.genes.bodyColor);
                ctx.fillStyle = gradient;
                ctx.beginPath();
                ctx.ellipse(0, 0, 28, 38, 0, 0, Math.PI * 2);
                ctx.fill();
                break;
            case 'sparkle':
                ctx.fillStyle = '#FFD700';
                for (let i = 0; i < 8; i++) {
                    const angle = (i / 8) * Math.PI * 2;
                    const x = Math.cos(angle) * 20;
                    const y = Math.sin(angle) * 25;
                    this.drawStar(ctx, x, y, 3, 5);
                }
                break;
        }

        ctx.restore();
    }

    drawStar(ctx, x, y, innerRadius, outerRadius) {
        ctx.save();
        ctx.translate(x, y);
        ctx.beginPath();
        for (let i = 0; i < 10; i++) {
            const radius = i % 2 === 0 ? outerRadius : innerRadius;
            const angle = (i / 10) * Math.PI * 2 - Math.PI / 2;
            const px = Math.cos(angle) * radius;
            const py = Math.sin(angle) * radius;
            if (i === 0) {
                ctx.moveTo(px, py);
            } else {
                ctx.lineTo(px, py);
            }
        }
        ctx.closePath();
        ctx.fill();
        ctx.restore();
    }

    drawTraits(ctx) {
        // Draw species-specific traits
        const traits = this.genes.traits;

        // Ears
        if (traits.ears === 'pointed') {
            // Wolf/Fox ears
            ctx.fillStyle = this.genes.bodyColor;
            ctx.strokeStyle = '#000';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(-15, -35);
            ctx.lineTo(-20, -45);
            ctx.lineTo(-10, -35);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();

            ctx.beginPath();
            ctx.moveTo(15, -35);
            ctx.lineTo(20, -45);
            ctx.lineTo(10, -35);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
        } else if (traits.ears === 'cat') {
            // Cat ears
            ctx.fillStyle = this.genes.bodyColor;
            ctx.strokeStyle = '#000';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(-12, -35);
            ctx.lineTo(-18, -42);
            ctx.lineTo(-8, -38);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();

            ctx.beginPath();
            ctx.moveTo(12, -35);
            ctx.lineTo(18, -42);
            ctx.lineTo(8, -38);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
        } else if (traits.ears === 'long') {
            // Rabbit ears
            ctx.fillStyle = this.genes.bodyColor;
            ctx.strokeStyle = '#000';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.ellipse(-10, -40, 5, 20, -0.3, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();

            ctx.beginPath();
            ctx.ellipse(10, -40, 5, 20, 0.3, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
        } else if (traits.ears === 'round') {
            // Bear ears
            ctx.fillStyle = this.genes.bodyColor;
            ctx.strokeStyle = '#000';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.arc(-15, -35, 8, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();

            ctx.beginPath();
            ctx.arc(15, -35, 8, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
        }

        // Wings
        if (traits.wings) {
            ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
            ctx.strokeStyle = '#000';
            ctx.lineWidth = 1;

            // Left wing
            ctx.beginPath();
            ctx.ellipse(-25, 0, 15, 20, -0.5, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();

            // Right wing
            ctx.beginPath();
            ctx.ellipse(25, 0, 15, 20, 0.5, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
        }

        // Horns
        if (traits.horns) {
            ctx.strokeStyle = '#8B4513';
            ctx.lineWidth = 3;
            ctx.lineCap = 'round';

            ctx.beginPath();
            ctx.moveTo(-10, -35);
            ctx.lineTo(-15, -50);
            ctx.stroke();

            ctx.beginPath();
            ctx.moveTo(10, -35);
            ctx.lineTo(15, -50);
            ctx.stroke();
        }

        // Tail (simplified, shown as icon)
        if (traits.tail === 'bushy') {
            ctx.fillStyle = this.genes.bodyColor;
            ctx.beginPath();
            ctx.arc(-30, 20, 8, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    drawAccessories(ctx) {
        this.genes.accessories.forEach(accessory => {
            switch (accessory) {
                case 'crown':
                    ctx.fillStyle = '#FFD700';
                    ctx.strokeStyle = '#000';
                    ctx.lineWidth = 1;
                    for (let i = 0; i < 5; i++) {
                        const x = (i - 2) * 8;
                        ctx.beginPath();
                        ctx.moveTo(x, -42);
                        ctx.lineTo(x - 4, -38);
                        ctx.lineTo(x + 4, -38);
                        ctx.closePath();
                        ctx.fill();
                        ctx.stroke();
                    }
                    break;
                case 'bow':
                    ctx.fillStyle = '#FF69B4';
                    ctx.beginPath();
                    ctx.arc(-8, -40, 5, 0, Math.PI * 2);
                    ctx.arc(8, -40, 5, 0, Math.PI * 2);
                    ctx.fill();
                    break;
                case 'glasses':
                    ctx.strokeStyle = '#000';
                    ctx.lineWidth = 2;
                    ctx.beginPath();
                    ctx.arc(-8, -10, 6, 0, Math.PI * 2);
                    ctx.moveTo(-2, -10);
                    ctx.lineTo(2, -10);
                    ctx.moveTo(14, -10);
                    ctx.arc(8, -10, 6, 0, Math.PI * 2);
                    ctx.stroke();
                    break;
            }
        });
    }

    drawCardInfo(ctx) {
        // Determine text color based on background
        let textColor = '#000';
        let strokeColor = 'rgba(255,255,255,0.8)';

        if (window.game && window.game.assets && this.genes.species.length === 1) {
            const species = this.genes.species[0];
            const img = window.game.assets[species];
            if (img && img.complete) {
                textColor = '#FFF'; // White text on image
                strokeColor = '#000'; // Black outline
            }
        }

        // Species name
        ctx.fillStyle = textColor;
        ctx.strokeStyle = strokeColor;
        ctx.lineWidth = 3;

        ctx.font = 'bold 14px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';

        const name = `蛋壳${this.genes.getSpeciesName()}`;

        // Stroke text for readability
        ctx.strokeText(name, 0, this.height / 2 - 50);
        ctx.fillText(name, 0, this.height / 2 - 50);

        // Emoji
        ctx.font = '20px Arial';
        ctx.strokeText(this.genes.getSpeciesEmoji(), 0, this.height / 2 - 30);
        ctx.fillText(this.genes.getSpeciesEmoji(), 0, this.height / 2 - 30);

        // Rarity stars
        this.drawRarityStars(ctx);
    }

    drawRarityStars(ctx) {
        const starY = this.height / 2 - 15;
        const starSize = 8;
        const starSpacing = 12;
        const totalWidth = (this.genes.rarity - 1) * starSpacing;

        ctx.fillStyle = this.genes.getRarityColor();

        for (let i = 0; i < this.genes.rarity; i++) {
            const x = -totalWidth / 2 + i * starSpacing;
            this.drawStar(ctx, x, starY, starSize * 0.4, starSize);
        }
    }

    drawCooldownOverlay(ctx) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.fillRect(-this.width / 2, -this.height / 2, this.width, this.height);

        ctx.fillStyle = '#FFF';
        ctx.font = 'bold 16px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('冷却中...', 0, 0);
    }

    drawParticles(ctx) {
        this.particles.forEach(p => {
            ctx.save();
            ctx.globalAlpha = p.alpha;
            ctx.fillStyle = p.color;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        });
    }

    addBreedingParticles() {
        for (let i = 0; i < 10; i++) {
            this.particles.push({
                x: (Math.random() - 0.5) * this.width,
                y: (Math.random() - 0.5) * this.height,
                vx: (Math.random() - 0.5) * 2,
                speed: 1 + Math.random() * 2,
                size: 3 + Math.random() * 3,
                color: '#FF69B4',
                life: 1000,
                maxLife: 1000,
                alpha: 1
            });
        }
    }

    contains(x, y) {
        const dx = x - this.x;
        const dy = y - this.y;
        return Math.abs(dx) < this.width / 2 && Math.abs(dy) < this.height / 2;
    }

    overlaps(other) {
        const dx = this.x - other.x;
        const dy = this.y - other.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const minDistance = (this.width + other.width) / 3;
        return distance < minDistance;
    }

    startDrag(mouseX, mouseY) {
        this.isBeingDragged = true;
        this.dragOffsetX = mouseX - this.x;
        this.dragOffsetY = mouseY - this.y;
        this.targetScale = 1.1;
        this.rotation = 0.1;
    }

    drag(mouseX, mouseY) {
        this.x = mouseX - this.dragOffsetX;
        this.y = mouseY - this.dragOffsetY;
    }

    endDrag() {
        this.isBeingDragged = false;
        this.targetScale = 1;
        this.rotation = 0;
    }

    startBreedingCooldown(duration = 3000) {
        this.canBreed = false;
        this.breedingCooldown = duration;
    }
}
