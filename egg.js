// Egg Class - Click to Hatch
class Egg {
    constructor(x, y, rarity = null) {
        this.x = x;
        this.y = y;

        // Hatching progress
        this.progress = 0;
        this.maxProgress = 100;
        this.clickValue = 10; // Each click adds 10%
        this.autoHatchSpeed = 0; // Auto hatch per second

        // Rarity (determines what duck will hatch)
        this.predeterminedRarity = rarity;

        // Visual
        this.size = 80;
        this.wobble = 0;
        this.wobbleSpeed = 0;
        this.cracks = [];

        // Animation
        this.bobOffset = Math.random() * Math.PI * 2;
        this.bobSpeed = 0.02;
        this.glowPulse = 0;

        // State
        this.isHatching = false;
        this.hatchAnimation = 0;
        this.isComplete = false;

        // Egg color based on rarity
        this.eggColor = this.getEggColor();
    }

    getEggColor() {
        if (this.predeterminedRarity) {
            const colors = {
                1: '#F5DEB3',  // Common - Wheat
                2: '#87CEEB',  // Rare - Sky Blue
                3: '#9C27B0',  // Epic - Purple
                4: '#FF9800',  // Legendary - Orange
                5: '#FFD700'   // Mythic - Gold
            };
            return colors[this.predeterminedRarity];
        }
        return '#F5DEB3'; // Default
    }

    click() {
        if (this.isHatching || this.isComplete) return;

        this.progress += this.clickValue;

        // Wobble effect
        this.wobbleSpeed = 0.3;

        // Add cracks as progress increases
        if (this.progress >= 30 && this.cracks.length === 0) {
            this.addCrack();
        }
        if (this.progress >= 60 && this.cracks.length === 1) {
            this.addCrack();
        }
        if (this.progress >= 90 && this.cracks.length === 2) {
            this.addCrack();
        }

        // Start hatching
        if (this.progress >= this.maxProgress) {
            this.startHatching();
        }
    }

    addCrack() {
        const angle = Math.random() * Math.PI * 2;
        const length = 20 + Math.random() * 20;
        this.cracks.push({ angle, length });
    }

    update(deltaTime) {
        // Auto hatch
        if (this.autoHatchSpeed > 0 && !this.isHatching && !this.isComplete) {
            this.progress += (this.autoHatchSpeed * deltaTime) / 1000;

            if (this.progress >= this.maxProgress) {
                this.startHatching();
            }
        }

        // Wobble physics
        if (this.wobbleSpeed > 0) {
            this.wobble += this.wobbleSpeed;
            this.wobbleSpeed *= 0.95; // Damping

            if (Math.abs(this.wobbleSpeed) < 0.01) {
                this.wobbleSpeed = 0;
                this.wobble = 0;
            }
        }

        // Bob animation
        this.bobOffset += this.bobSpeed;
        this.glowPulse += 0.05;

        // Hatching animation
        if (this.isHatching) {
            this.hatchAnimation += deltaTime * 0.003;

            if (this.hatchAnimation >= 1) {
                this.isComplete = true;
            }
        }
    }

    startHatching() {
        this.isHatching = true;
        this.progress = this.maxProgress;
    }

    render(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);

        // Bob animation
        const bob = Math.sin(this.bobOffset) * 5;
        ctx.translate(0, bob);

        // Wobble
        ctx.rotate(Math.sin(this.wobble) * 0.2);

        // Glow effect for rare eggs
        if (this.predeterminedRarity && this.predeterminedRarity >= 3) {
            const glowSize = this.size * (1 + Math.sin(this.glowPulse) * 0.1);
            const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, glowSize);
            gradient.addColorStop(0, this.eggColor + '40');
            gradient.addColorStop(1, this.eggColor + '00');
            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.arc(0, 0, glowSize, 0, Math.PI * 2);
            ctx.fill();
        }

        if (!this.isHatching) {
            this.renderEgg(ctx);
        } else {
            this.renderHatchingAnimation(ctx);
        }

        ctx.restore();
    }

    renderEgg(ctx) {
        // Shadow
        ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
        ctx.beginPath();
        ctx.ellipse(0, this.size * 0.6, this.size * 0.5, this.size * 0.15, 0, 0, Math.PI * 2);
        ctx.fill();

        // Egg body
        ctx.fillStyle = this.eggColor;
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 3;

        ctx.beginPath();
        ctx.ellipse(0, 0, this.size * 0.5, this.size * 0.65, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Highlight
        ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
        ctx.beginPath();
        ctx.ellipse(-this.size * 0.15, -this.size * 0.25, this.size * 0.2, this.size * 0.3, -0.3, 0, Math.PI * 2);
        ctx.fill();

        // Spots/pattern
        this.renderEggPattern(ctx);

        // Cracks
        ctx.strokeStyle = '#8B4513';
        ctx.lineWidth = 2;
        ctx.lineCap = 'round';

        this.cracks.forEach(crack => {
            const startX = Math.cos(crack.angle) * this.size * 0.3;
            const startY = Math.sin(crack.angle) * this.size * 0.4;
            const endX = Math.cos(crack.angle) * (this.size * 0.3 + crack.length);
            const endY = Math.sin(crack.angle) * (this.size * 0.4 + crack.length * 0.8);

            ctx.beginPath();
            ctx.moveTo(startX, startY);
            ctx.lineTo(endX, endY);

            // Branch cracks
            const branchAngle = crack.angle + (Math.random() - 0.5) * 0.5;
            const branchX = endX + Math.cos(branchAngle) * 10;
            const branchY = endY + Math.sin(branchAngle) * 10;
            ctx.lineTo(branchX, branchY);

            ctx.stroke();
        });

        // Progress bar
        this.renderProgressBar(ctx);
    }

    renderEggPattern(ctx) {
        // Different patterns based on rarity
        if (!this.predeterminedRarity || this.predeterminedRarity === 1) {
            // Simple spots for common
            ctx.fillStyle = 'rgba(139, 69, 19, 0.3)';
            for (let i = 0; i < 5; i++) {
                const angle = (i / 5) * Math.PI * 2;
                const x = Math.cos(angle) * this.size * 0.25;
                const y = Math.sin(angle) * this.size * 0.35;
                ctx.beginPath();
                ctx.arc(x, y, this.size * 0.08, 0, Math.PI * 2);
                ctx.fill();
            }
        } else if (this.predeterminedRarity >= 2) {
            // Stripes or special patterns for rare+
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
            ctx.lineWidth = 3;
            for (let i = -2; i <= 2; i++) {
                ctx.beginPath();
                ctx.moveTo(-this.size * 0.4, i * this.size * 0.15);
                ctx.lineTo(this.size * 0.4, i * this.size * 0.15);
                ctx.stroke();
            }
        }
    }

    renderProgressBar(ctx) {
        const barWidth = this.size;
        const barHeight = 8;
        const barY = this.size * 0.8;

        // Background
        ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        ctx.fillRect(-barWidth / 2, barY, barWidth, barHeight);

        // Progress
        const progressWidth = (this.progress / this.maxProgress) * barWidth;
        const gradient = ctx.createLinearGradient(-barWidth / 2, 0, barWidth / 2, 0);
        gradient.addColorStop(0, '#4CAF50');
        gradient.addColorStop(1, '#8BC34A');
        ctx.fillStyle = gradient;
        ctx.fillRect(-barWidth / 2, barY, progressWidth, barHeight);

        // Border
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 1;
        ctx.strokeRect(-barWidth / 2, barY, barWidth, barHeight);

        // Percentage text
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 12px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.fillText(`${Math.floor(this.progress)}%`, 0, barY + barHeight + 5);
    }

    renderHatchingAnimation(ctx) {
        const t = this.hatchAnimation;

        // Shake effect
        const shake = Math.sin(t * 30) * 10 * (1 - t);
        ctx.translate(shake, 0);

        // Egg pieces flying apart
        if (t < 0.5) {
            // Top half
            ctx.save();
            ctx.translate(0, -t * 100);
            ctx.rotate(t * 2);
            this.renderEggPiece(ctx, true);
            ctx.restore();

            // Bottom half
            ctx.save();
            ctx.translate(0, t * 100);
            ctx.rotate(-t * 2);
            this.renderEggPiece(ctx, false);
            ctx.restore();
        }

        // Particles
        for (let i = 0; i < 10; i++) {
            const angle = (i / 10) * Math.PI * 2;
            const dist = t * 100;
            const x = Math.cos(angle) * dist;
            const y = Math.sin(angle) * dist;

            ctx.fillStyle = this.eggColor;
            ctx.globalAlpha = 1 - t;
            ctx.beginPath();
            ctx.arc(x, y, 5, 0, Math.PI * 2);
            ctx.fill();
            ctx.globalAlpha = 1;
        }
    }

    renderEggPiece(ctx, isTop) {
        ctx.fillStyle = this.eggColor;
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 3;

        ctx.beginPath();
        if (isTop) {
            ctx.ellipse(0, 0, this.size * 0.5, this.size * 0.35, 0, Math.PI, Math.PI * 2);
        } else {
            ctx.ellipse(0, 0, this.size * 0.5, this.size * 0.35, 0, 0, Math.PI);
        }
        ctx.fill();
        ctx.stroke();

        // Jagged edge
        ctx.strokeStyle = '#8B4513';
        ctx.lineWidth = 2;
        ctx.beginPath();
        for (let i = 0; i < 10; i++) {
            const x = (i / 10 - 0.5) * this.size;
            const y = (i % 2) * 5;
            if (i === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        }
        ctx.stroke();
    }

    contains(x, y) {
        const dx = x - this.x;
        const dy = y - this.y;
        return Math.sqrt(dx * dx + dy * dy) < this.size * 0.65;
    }
}
