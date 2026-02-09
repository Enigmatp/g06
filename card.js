// Card Class - Stacklands Style Card System (Image Only)
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

        // Card background (IMAGES ONLY)
        this.drawCardBackground(ctx);

        // Card border
        this.drawCardBorder(ctx);

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
        // ALWAYS use image background for the 10-card system
        if (window.game && window.game.assets) {
            const speciesKey = this.genes.speciesKey;
            const img = window.game.assets[speciesKey];

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

        // Fallback (Should not happen if assets are loaded)
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

    // No more drawPet() method - fully removed!

    drawCardInfo(ctx) {
        // Text is always white on image background
        const textColor = '#FFF';
        const strokeColor = '#000';

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
