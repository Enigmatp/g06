// Duck Class - Strange Duck Style
class Duck {
    constructor(id, x, y, genes = null) {
        this.id = id;
        this.x = x;
        this.y = y;

        // Generate genes (mutations)
        this.genes = genes || this.generateGenes();

        // Visual properties
        this.size = this.genes.size;
        this.baseSize = 50;
        this.rotation = 0;

        // Animation
        this.bobOffset = Math.random() * Math.PI * 2;
        this.bobSpeed = 0.03;
        this.walkCycle = 0;

        // Movement
        this.speed = 0.3 + Math.random() * 0.3;
        this.targetX = x;
        this.targetY = y;
        this.walkTimer = 0;
        this.walkInterval = 3000 + Math.random() * 2000;

        // State
        this.isWalking = false;
        this.facingRight = true;

        // Quack animation
        this.quackTimer = 0;
        this.isQuacking = false;
    }

    generateGenes() {
        const rarity = this.determineRarity();

        return {
            // Body parts
            headType: this.mutateHead(rarity),
            wingType: this.mutateWing(rarity),
            tailType: this.mutateTail(rarity),
            feetType: this.mutateFeet(rarity),

            // Appearance
            bodyColor: this.mutateColor(rarity),
            size: this.mutateSize(rarity),

            // Metadata
            rarity: rarity,
            rarityName: this.getRarityName(rarity)
        };
    }

    determineRarity() {
        const rand = Math.random() * 100;
        if (rand < 1) return 5;      // Mythic 1%
        if (rand < 5) return 4;      // Legendary 4%
        if (rand < 15) return 3;     // Epic 10%
        if (rand < 40) return 2;     // Rare 25%
        return 1;                     // Common 60%
    }

    getRarityName(rarity) {
        const names = ['', '普通', '稀有', '史诗', '传说', '神话'];
        return names[rarity];
    }

    mutateHead(rarity) {
        const heads = [
            'normal',      // 普通头
            'big',         // 大头
            'small',       // 小头
            'crown',       // 皇冠
            'hat',         // 帽子
            'unicorn'      // 独角兽
        ];

        if (rarity >= 3) {
            return heads[Math.floor(Math.random() * heads.length)];
        } else if (rarity >= 2) {
            return heads[Math.floor(Math.random() * 4)];
        }
        return heads[0];
    }

    mutateWing(rarity) {
        const wings = [
            'normal',      // 普通翅膀
            'angel',       // 天使翅膀
            'bat',         // 蝙蝠翅膀
            'rainbow',     // 彩虹翅膀
            'none',        // 无翅膀
            'huge'         // 巨大翅膀
        ];

        if (rarity >= 3) {
            return wings[Math.floor(Math.random() * wings.length)];
        } else if (rarity >= 2) {
            return wings[Math.floor(Math.random() * 3)];
        }
        return wings[0];
    }

    mutateTail(rarity) {
        const tails = [
            'short',       // 短尾巴
            'long',        // 长尾巴
            'peacock',     // 孔雀尾巴
            'flame',       // 火焰尾巴
            'none'         // 无尾巴
        ];

        if (rarity >= 3) {
            return tails[Math.floor(Math.random() * tails.length)];
        }
        return tails[Math.floor(Math.random() * 2)];
    }

    mutateFeet(rarity) {
        const feet = [
            'normal',      // 普通脚
            'big',         // 大脚
            'thin',        // 细脚
            'claw',        // 爪子
            'wheel'        // 轮子
        ];

        if (rarity >= 4) {
            return feet[Math.floor(Math.random() * feet.length)];
        }
        return feet[0];
    }

    mutateColor(rarity) {
        const colors = [
            '#FFD700',     // 黄色（普通）
            '#FFB6C1',     // 粉色
            '#87CEEB',     // 蓝色
            '#90EE90',     // 绿色
            '#DDA0DD',     // 紫色
            '#FFD700',     // 金色
            'rainbow'      // 彩虹色
        ];

        if (rarity >= 5) return 'rainbow';
        if (rarity >= 4) return colors[5]; // Gold
        if (rarity >= 2) return colors[Math.floor(Math.random() * 5)];
        return colors[0];
    }

    mutateSize(rarity) {
        const sizes = [1, 0.7, 1.3, 1.8];
        if (rarity >= 3) {
            return sizes[Math.floor(Math.random() * sizes.length)];
        }
        return 1;
    }

    update(deltaTime, canvasWidth, canvasHeight) {
        // Walking behavior
        this.walkTimer += deltaTime;
        if (this.walkTimer >= this.walkInterval) {
            this.walkTimer = 0;
            this.walkInterval = 3000 + Math.random() * 2000;
            this.setRandomTarget(canvasWidth, canvasHeight);
        }

        // Move towards target
        const dx = this.targetX - this.x;
        const dy = this.targetY - this.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance > 5) {
            this.isWalking = true;
            const moveX = (dx / distance) * this.speed;
            const moveY = (dy / distance) * this.speed;
            this.x += moveX;
            this.y += moveY;

            // Update facing direction
            this.facingRight = dx > 0;

            // Walk cycle
            this.walkCycle += deltaTime * 0.01;
        } else {
            this.isWalking = false;
            this.walkCycle = 0;
        }

        // Bob animation
        this.bobOffset += this.bobSpeed;

        // Random quack
        if (Math.random() < 0.001) {
            this.startQuack();
        }

        if (this.isQuacking) {
            this.quackTimer -= deltaTime;
            if (this.quackTimer <= 0) {
                this.isQuacking = false;
            }
        }
    }

    setRandomTarget(canvasWidth, canvasHeight) {
        const margin = 100;
        this.targetX = margin + Math.random() * (canvasWidth - margin * 2);
        this.targetY = canvasHeight * 0.5 + Math.random() * (canvasHeight * 0.4);
    }

    startQuack() {
        this.isQuacking = true;
        this.quackTimer = 1000;
    }

    render(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);

        // Flip if facing left
        if (!this.facingRight) {
            ctx.scale(-1, 1);
        }

        const actualSize = this.baseSize * this.size;

        // Bob animation
        const bob = Math.sin(this.bobOffset) * 3;
        ctx.translate(0, bob);

        // Rarity glow effect
        if (this.genes.rarity >= 3) {
            this.drawGlowEffect(ctx, actualSize);
        }

        // Shadow
        ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
        ctx.beginPath();
        ctx.ellipse(0, actualSize * 0.8, actualSize * 0.4, actualSize * 0.15, 0, 0, Math.PI * 2);
        ctx.fill();

        // Draw duck parts
        this.drawFeet(ctx, actualSize);
        this.drawBody(ctx, actualSize);
        this.drawTail(ctx, actualSize);
        this.drawWings(ctx, actualSize);
        this.drawHead(ctx, actualSize);

        // Quack bubble
        if (this.isQuacking) {
            this.drawQuackBubble(ctx, actualSize);
        }

        ctx.restore();
    }

    drawGlowEffect(ctx, size) {
        const colors = {
            3: '#9C27B0',  // Epic - Purple
            4: '#FF9800',  // Legendary - Orange
            5: '#FFD700'   // Mythic - Gold
        };

        const glowColor = colors[this.genes.rarity] || '#9C27B0';
        const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, size * 1.2);
        gradient.addColorStop(0, glowColor + '00');
        gradient.addColorStop(0.5, glowColor + '40');
        gradient.addColorStop(1, glowColor + '00');

        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(0, 0, size * 1.2, 0, Math.PI * 2);
        ctx.fill();
    }

    drawBody(ctx, size) {
        // Body color
        if (this.genes.bodyColor === 'rainbow') {
            const gradient = ctx.createLinearGradient(-size * 0.3, 0, size * 0.3, 0);
            gradient.addColorStop(0, '#FF0000');
            gradient.addColorStop(0.2, '#FF7F00');
            gradient.addColorStop(0.4, '#FFFF00');
            gradient.addColorStop(0.6, '#00FF00');
            gradient.addColorStop(0.8, '#0000FF');
            gradient.addColorStop(1, '#8B00FF');
            ctx.fillStyle = gradient;
        } else {
            ctx.fillStyle = this.genes.bodyColor;
        }

        // Duck body (oval)
        ctx.beginPath();
        ctx.ellipse(0, 0, size * 0.4, size * 0.5, 0, 0, Math.PI * 2);
        ctx.fill();

        // Outline
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Belly (lighter)
        ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.beginPath();
        ctx.ellipse(0, size * 0.1, size * 0.25, size * 0.35, 0, 0, Math.PI * 2);
        ctx.fill();
    }

    drawHead(ctx, size) {
        ctx.save();
        ctx.translate(size * 0.3, -size * 0.3);

        // Head
        ctx.fillStyle = this.genes.bodyColor === 'rainbow' ? '#FFD700' : this.genes.bodyColor;
        ctx.beginPath();
        ctx.arc(0, 0, size * 0.25, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Beak
        ctx.fillStyle = '#FF8C00';
        ctx.beginPath();
        ctx.moveTo(size * 0.2, 0);
        ctx.lineTo(size * 0.35, -size * 0.05);
        ctx.lineTo(size * 0.35, size * 0.05);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Eye
        ctx.fillStyle = '#000';
        ctx.beginPath();
        ctx.arc(size * 0.08, -size * 0.08, size * 0.06, 0, Math.PI * 2);
        ctx.fill();

        // Eye shine
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(size * 0.1, -size * 0.1, size * 0.03, 0, Math.PI * 2);
        ctx.fill();

        // Head mutations
        this.drawHeadMutation(ctx, size);

        ctx.restore();
    }

    drawHeadMutation(ctx, size) {
        switch (this.genes.headType) {
            case 'crown':
                // Crown
                ctx.fillStyle = '#FFD700';
                ctx.strokeStyle = '#000';
                ctx.lineWidth = 1;
                for (let i = 0; i < 5; i++) {
                    const angle = (i / 5) * Math.PI - Math.PI / 2;
                    const x = Math.cos(angle) * size * 0.2;
                    const y = Math.sin(angle) * size * 0.2 - size * 0.25;
                    ctx.beginPath();
                    ctx.moveTo(x, y);
                    ctx.lineTo(x - size * 0.05, y + size * 0.1);
                    ctx.lineTo(x + size * 0.05, y + size * 0.1);
                    ctx.closePath();
                    ctx.fill();
                    ctx.stroke();
                }
                break;
            case 'hat':
                // Top hat
                ctx.fillStyle = '#000';
                ctx.fillRect(-size * 0.15, -size * 0.4, size * 0.3, size * 0.1);
                ctx.fillRect(-size * 0.1, -size * 0.5, size * 0.2, size * 0.1);
                break;
            case 'unicorn':
                // Horn
                ctx.fillStyle = '#FFB6C1';
                ctx.strokeStyle = '#000';
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.moveTo(0, -size * 0.25);
                ctx.lineTo(-size * 0.05, -size * 0.4);
                ctx.lineTo(size * 0.05, -size * 0.4);
                ctx.closePath();
                ctx.fill();
                ctx.stroke();
                break;
        }
    }

    drawWings(ctx, size) {
        if (this.genes.wingType === 'none') return;

        const wingBob = this.isWalking ? Math.sin(this.walkCycle) * 0.2 : 0;

        ctx.save();

        switch (this.genes.wingType) {
            case 'angel':
                // Angel wings (white, feathery)
                ctx.fillStyle = '#FFF';
                ctx.strokeStyle = '#DDD';
                ctx.lineWidth = 1;

                // Left wing
                ctx.beginPath();
                ctx.ellipse(-size * 0.3, 0, size * 0.3, size * 0.4, -0.3 + wingBob, 0, Math.PI * 2);
                ctx.fill();
                ctx.stroke();
                break;

            case 'bat':
                // Bat wings (dark, pointed)
                ctx.fillStyle = '#4B0082';
                ctx.strokeStyle = '#000';
                ctx.lineWidth = 1;

                ctx.beginPath();
                ctx.moveTo(-size * 0.2, 0);
                ctx.lineTo(-size * 0.5, -size * 0.2 + wingBob);
                ctx.lineTo(-size * 0.4, size * 0.1);
                ctx.closePath();
                ctx.fill();
                ctx.stroke();
                break;

            case 'rainbow':
                // Rainbow wings
                const gradient = ctx.createLinearGradient(-size * 0.5, 0, -size * 0.2, 0);
                gradient.addColorStop(0, '#FF0000');
                gradient.addColorStop(0.5, '#00FF00');
                gradient.addColorStop(1, '#0000FF');
                ctx.fillStyle = gradient;

                ctx.beginPath();
                ctx.ellipse(-size * 0.3, 0, size * 0.25, size * 0.35, -0.2 + wingBob, 0, Math.PI * 2);
                ctx.fill();
                ctx.strokeStyle = '#000';
                ctx.stroke();
                break;

            case 'huge':
                // Huge wings
                ctx.fillStyle = this.genes.bodyColor;
                ctx.strokeStyle = '#000';
                ctx.lineWidth = 2;

                ctx.beginPath();
                ctx.ellipse(-size * 0.4, 0, size * 0.5, size * 0.6, -0.3 + wingBob, 0, Math.PI * 2);
                ctx.fill();
                ctx.stroke();
                break;

            default:
                // Normal wing
                ctx.fillStyle = this.genes.bodyColor;
                ctx.strokeStyle = '#000';
                ctx.lineWidth = 1;

                ctx.beginPath();
                ctx.ellipse(-size * 0.25, 0, size * 0.2, size * 0.3, -0.2 + wingBob, 0, Math.PI * 2);
                ctx.fill();
                ctx.stroke();
        }

        ctx.restore();
    }

    drawTail(ctx, size) {
        if (this.genes.tailType === 'none') return;

        ctx.save();
        ctx.translate(-size * 0.4, 0);

        switch (this.genes.tailType) {
            case 'long':
                // Long tail
                ctx.strokeStyle = '#000';
                ctx.lineWidth = 3;
                ctx.lineCap = 'round';
                ctx.beginPath();
                ctx.moveTo(0, 0);
                ctx.quadraticCurveTo(-size * 0.2, -size * 0.1, -size * 0.3, 0);
                ctx.stroke();
                break;

            case 'peacock':
                // Peacock tail (fan)
                for (let i = 0; i < 5; i++) {
                    const angle = (i - 2) * 0.2;
                    ctx.save();
                    ctx.rotate(angle);

                    // Feather
                    const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, size * 0.3);
                    gradient.addColorStop(0, '#00CED1');
                    gradient.addColorStop(0.5, '#4169E1');
                    gradient.addColorStop(1, '#8A2BE2');
                    ctx.fillStyle = gradient;

                    ctx.beginPath();
                    ctx.ellipse(-size * 0.2, 0, size * 0.15, size * 0.25, 0, 0, Math.PI * 2);
                    ctx.fill();

                    // Eye spot
                    ctx.fillStyle = '#FFD700';
                    ctx.beginPath();
                    ctx.arc(-size * 0.2, 0, size * 0.05, 0, Math.PI * 2);
                    ctx.fill();

                    ctx.restore();
                }
                break;

            case 'flame':
                // Flame tail
                const flameGradient = ctx.createLinearGradient(0, 0, -size * 0.3, 0);
                flameGradient.addColorStop(0, '#FF4500');
                flameGradient.addColorStop(0.5, '#FF8C00');
                flameGradient.addColorStop(1, '#FFD700');
                ctx.fillStyle = flameGradient;

                ctx.beginPath();
                ctx.moveTo(0, 0);
                ctx.lineTo(-size * 0.3, -size * 0.15);
                ctx.lineTo(-size * 0.25, 0);
                ctx.lineTo(-size * 0.3, size * 0.15);
                ctx.closePath();
                ctx.fill();
                break;

            default:
                // Short tail
                ctx.fillStyle = this.genes.bodyColor;
                ctx.strokeStyle = '#000';
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.ellipse(-size * 0.1, 0, size * 0.1, size * 0.15, 0, 0, Math.PI * 2);
                ctx.fill();
                ctx.stroke();
        }

        ctx.restore();
    }

    drawFeet(ctx, size) {
        const walkOffset = this.isWalking ? Math.sin(this.walkCycle) * size * 0.1 : 0;

        ctx.save();
        ctx.translate(0, size * 0.5);

        const drawFoot = (x, offset) => {
            ctx.save();
            ctx.translate(x, offset);

            switch (this.genes.feetType) {
                case 'big':
                    // Big feet
                    ctx.fillStyle = '#FF8C00';
                    ctx.strokeStyle = '#000';
                    ctx.lineWidth = 1;
                    ctx.beginPath();
                    ctx.ellipse(0, 0, size * 0.15, size * 0.1, 0, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.stroke();
                    break;

                case 'thin':
                    // Thin feet
                    ctx.strokeStyle = '#FF8C00';
                    ctx.lineWidth = 2;
                    ctx.beginPath();
                    ctx.moveTo(0, -size * 0.1);
                    ctx.lineTo(0, 0);
                    ctx.stroke();
                    break;

                case 'claw':
                    // Claw feet
                    ctx.strokeStyle = '#000';
                    ctx.lineWidth = 2;
                    for (let i = -1; i <= 1; i++) {
                        ctx.beginPath();
                        ctx.moveTo(0, 0);
                        ctx.lineTo(i * size * 0.05, size * 0.08);
                        ctx.stroke();
                    }
                    break;

                case 'wheel':
                    // Wheel
                    ctx.strokeStyle = '#000';
                    ctx.lineWidth = 2;
                    ctx.beginPath();
                    ctx.arc(0, 0, size * 0.08, 0, Math.PI * 2);
                    ctx.stroke();
                    break;

                default:
                    // Normal webbed feet
                    ctx.fillStyle = '#FF8C00';
                    ctx.strokeStyle = '#000';
                    ctx.lineWidth = 1;

                    // Webbed foot
                    ctx.beginPath();
                    ctx.moveTo(0, 0);
                    ctx.lineTo(-size * 0.06, size * 0.08);
                    ctx.lineTo(0, size * 0.06);
                    ctx.lineTo(size * 0.06, size * 0.08);
                    ctx.closePath();
                    ctx.fill();
                    ctx.stroke();
            }

            ctx.restore();
        };

        // Left foot
        drawFoot(-size * 0.15, walkOffset);
        // Right foot
        drawFoot(size * 0.15, -walkOffset);

        ctx.restore();
    }

    drawQuackBubble(ctx, size) {
        ctx.save();
        ctx.translate(size * 0.5, -size * 0.5);

        // Speech bubble
        ctx.fillStyle = '#FFF';
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 2;

        ctx.beginPath();
        ctx.roundRect(-size * 0.3, -size * 0.2, size * 0.6, size * 0.3, size * 0.1);
        ctx.fill();
        ctx.stroke();

        // Text
        ctx.fillStyle = '#000';
        ctx.font = `bold ${size * 0.15}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('嘎!', 0, -size * 0.05);

        ctx.restore();
    }

    contains(x, y) {
        const dx = x - this.x;
        const dy = y - this.y;
        const actualSize = this.baseSize * this.size;
        return Math.sqrt(dx * dx + dy * dy) < actualSize * 0.5;
    }
}
