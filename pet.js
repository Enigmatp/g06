// Pet Class - Egg Shell Pets
class Pet {
    constructor(id, x, y) {
        this.id = id;
        this.x = x;
        this.y = y;

        // Visual properties
        this.color = this.randomColor();
        this.size = 40;
        this.rotation = 0;

        // Stats
        this.friendship = 50 + Math.random() * 20; // 50-70
        this.energy = 100;
        this.mood = 'neutral'; // happy, neutral, sad

        // State
        this.state = 'idle'; // idle, walking, working, interacting
        this.isBeingDragged = false;
        this.isDraggable = true;

        // Movement
        this.speed = 0.5 + Math.random() * 0.5;
        this.targetX = x;
        this.targetY = y;
        this.walkTimer = 0;
        this.walkInterval = 2000 + Math.random() * 3000; // 2-5 seconds

        // Work
        this.workTimer = 0;
        this.workDuration = 10000; // 10 seconds
        this.workSlot = null;

        // Animation
        this.bobOffset = Math.random() * Math.PI * 2;
        this.bobSpeed = 0.05;

        // Interaction
        this.interactionCooldown = 0;
        this.interactionPartner = null;
    }

    randomColor() {
        const colors = [
            '#FFB6C1', // Light pink
            '#87CEEB', // Sky blue
            '#98FB98', // Pale green
            '#FFD700', // Gold
            '#DDA0DD', // Plum
            '#F0E68C', // Khaki
            '#FFA07A', // Light salmon
            '#B0E0E6', // Powder blue
        ];
        return colors[Math.floor(Math.random() * colors.length)];
    }

    update(deltaTime, canvasWidth, canvasHeight) {
        // Update cooldowns
        if (this.interactionCooldown > 0) {
            this.interactionCooldown -= deltaTime;
        }

        // Update based on state
        switch (this.state) {
            case 'idle':
            case 'walking':
                this.updateWalking(deltaTime, canvasWidth, canvasHeight);
                break;
            case 'working':
                this.updateWorking(deltaTime);
                break;
            case 'interacting':
                this.updateInteracting(deltaTime);
                break;
        }

        // Update animation
        this.bobOffset += this.bobSpeed;
    }

    updateWalking(deltaTime, canvasWidth, canvasHeight) {
        if (this.isBeingDragged) return;

        // Random walk timer
        this.walkTimer += deltaTime;
        if (this.walkTimer >= this.walkInterval) {
            this.walkTimer = 0;
            this.walkInterval = 2000 + Math.random() * 3000;
            this.setRandomTarget(canvasWidth, canvasHeight);
        }

        // Move towards target
        const dx = this.targetX - this.x;
        const dy = this.targetY - this.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance > 2) {
            this.state = 'walking';
            const moveX = (dx / distance) * this.speed;
            const moveY = (dy / distance) * this.speed;
            this.x += moveX;
            this.y += moveY;

            // Slight rotation when walking
            this.rotation = Math.sin(this.bobOffset * 2) * 0.1;
        } else {
            this.state = 'idle';
            this.rotation = 0;
        }
    }

    setRandomTarget(canvasWidth, canvasHeight) {
        const margin = 50;
        this.targetX = margin + Math.random() * (canvasWidth - margin * 2);
        this.targetY = margin + Math.random() * (canvasHeight - margin * 2);
    }

    updateWorking(deltaTime) {
        this.workTimer += deltaTime;

        if (this.workTimer >= this.workDuration) {
            // Work complete
            this.finishWork();
        }

        // Bob up and down while working
        this.rotation = Math.sin(this.bobOffset * 4) * 0.15;
    }

    updateInteracting(deltaTime) {
        if (this.interactionCooldown <= 0) {
            this.state = 'idle';
            this.interactionPartner = null;
        }
    }

    startWork(slot) {
        this.state = 'working';
        this.workTimer = 0;
        this.workSlot = slot;
        this.isDraggable = false;
    }

    finishWork() {
        this.state = 'idle';
        this.energy = Math.max(0, this.energy - 20);
        this.isDraggable = true;

        if (this.workSlot) {
            this.workSlot.worker = null;
            this.workSlot = null;
        }

        // Return to random position
        this.walkTimer = this.walkInterval; // Trigger immediate walk
    }

    interact(otherPet) {
        if (this.interactionCooldown > 0 || otherPet.interactionCooldown > 0) {
            return null;
        }

        const avgFriendship = (this.friendship + otherPet.friendship) / 2;
        let result = {
            type: '',
            friendshipChange: 0,
            message: ''
        };

        if (avgFriendship >= 70) {
            // High friendship - Play together
            result.type = 'play';
            result.friendshipChange = 5;
            result.message = '玩耍！友好度+5';
            this.mood = 'happy';
            otherPet.mood = 'happy';
        } else if (avgFriendship >= 30) {
            // Medium friendship - Talk
            result.type = 'talk';
            result.friendshipChange = 2;
            result.message = '交流中...友好度+2';
            this.mood = 'neutral';
            otherPet.mood = 'neutral';
        } else {
            // Low friendship - Fight
            result.type = 'fight';
            result.friendshipChange = -3;
            result.message = '争吵了！友好度-3';
            this.mood = 'sad';
            otherPet.mood = 'sad';
        }

        // Apply friendship changes
        this.friendship = Math.max(0, Math.min(100, this.friendship + result.friendshipChange));
        otherPet.friendship = Math.max(0, Math.min(100, otherPet.friendship + result.friendshipChange));

        // Set interaction state
        this.state = 'interacting';
        otherPet.state = 'interacting';
        this.interactionCooldown = 2000;
        otherPet.interactionCooldown = 2000;
        this.interactionPartner = otherPet;
        otherPet.interactionPartner = this;

        return result;
    }

    render(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.rotation);

        // Bob animation
        const bob = Math.sin(this.bobOffset) * 3;
        ctx.translate(0, bob);

        // Shadow
        ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
        ctx.beginPath();
        ctx.ellipse(0, this.size * 0.6, this.size * 0.4, this.size * 0.15, 0, 0, Math.PI * 2);
        ctx.fill();

        // Egg shell body
        ctx.fillStyle = this.color;
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.ellipse(0, 0, this.size * 0.5, this.size * 0.65, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Highlight
        ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
        ctx.beginPath();
        ctx.ellipse(-this.size * 0.15, -this.size * 0.2, this.size * 0.2, this.size * 0.3, -0.3, 0, Math.PI * 2);
        ctx.fill();

        // Face based on mood
        this.renderFace(ctx);

        // Working indicator
        if (this.state === 'working') {
            this.renderWorkIndicator(ctx);
        }

        // Interaction effect
        if (this.state === 'interacting') {
            this.renderInteractionEffect(ctx);
        }

        ctx.restore();

        // Friendship bar (when hovered or interacting)
        if (this.state === 'interacting' || this.isBeingDragged) {
            this.renderFriendshipBar(ctx);
        }
    }

    renderFace(ctx) {
        ctx.fillStyle = '#333';

        if (this.mood === 'happy') {
            // Happy eyes ^_^
            ctx.beginPath();
            ctx.arc(-this.size * 0.15, -this.size * 0.1, 2, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.arc(this.size * 0.15, -this.size * 0.1, 2, 0, Math.PI * 2);
            ctx.fill();

            // Smile
            ctx.strokeStyle = '#333';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(0, 0.05 * this.size, this.size * 0.2, 0.2, Math.PI - 0.2);
            ctx.stroke();
        } else if (this.mood === 'sad') {
            // Sad eyes T_T
            ctx.font = '12px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('T', -this.size * 0.15, -this.size * 0.05);
            ctx.fillText('T', this.size * 0.15, -this.size * 0.05);

            // Frown
            ctx.strokeStyle = '#333';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(0, this.size * 0.2, this.size * 0.2, Math.PI + 0.2, -0.2);
            ctx.stroke();
        } else {
            // Neutral eyes -_-
            ctx.fillRect(-this.size * 0.2, -this.size * 0.1, this.size * 0.1, 2);
            ctx.fillRect(this.size * 0.1, -this.size * 0.1, this.size * 0.1, 2);

            // Neutral mouth
            ctx.fillRect(-this.size * 0.1, this.size * 0.1, this.size * 0.2, 2);
        }
    }

    renderWorkIndicator(ctx) {
        // Sweat drops
        const sweatX = this.size * 0.3;
        const sweatY = -this.size * 0.3 + Math.sin(this.bobOffset * 3) * 5;

        ctx.fillStyle = '#87CEEB';
        ctx.beginPath();
        ctx.arc(sweatX, sweatY, 3, 0, Math.PI * 2);
        ctx.fill();
    }

    renderInteractionEffect(ctx) {
        if (!this.interactionPartner) return;

        const result = this.mood;
        if (result === 'happy') {
            // Hearts
            ctx.fillStyle = '#FF69B4';
            const heartY = -this.size - 10 - Math.sin(this.bobOffset * 2) * 5;
            ctx.font = '20px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('♥', 0, heartY);
        } else if (result === 'sad') {
            // Lightning/anger
            ctx.strokeStyle = '#FF4500';
            ctx.lineWidth = 2;
            const offset = Math.sin(this.bobOffset * 4) * 3;
            ctx.beginPath();
            ctx.moveTo(-5 + offset, -this.size - 10);
            ctx.lineTo(0 + offset, -this.size - 5);
            ctx.lineTo(-3 + offset, -this.size - 5);
            ctx.lineTo(2 + offset, -this.size);
            ctx.stroke();
        }
    }

    renderFriendshipBar(ctx) {
        const barWidth = this.size;
        const barHeight = 4;
        const barX = this.x - barWidth / 2;
        const barY = this.y - this.size - 15;

        // Background
        ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        ctx.fillRect(barX, barY, barWidth, barHeight);

        // Friendship fill
        const fillWidth = (this.friendship / 100) * barWidth;
        const friendshipColor = this.friendship >= 70 ? '#4CAF50' :
            this.friendship >= 30 ? '#FFC107' : '#F44336';
        ctx.fillStyle = friendshipColor;
        ctx.fillRect(barX, barY, fillWidth, barHeight);

        // Border
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 1;
        ctx.strokeRect(barX, barY, barWidth, barHeight);
    }

    contains(x, y) {
        const dx = x - this.x;
        const dy = y - this.y;
        return Math.sqrt(dx * dx + dy * dy) < this.size * 0.65;
    }
}
