// Waterwheel Class - Work Station
class Waterwheel {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.radius = 60;
        this.rotation = 0;
        this.rotationSpeed = 0.02;

        // Work slots around the waterwheel
        this.workSlots = [
            { angle: 0, worker: null, x: 0, y: 0 },
            { angle: Math.PI / 2, worker: null, x: 0, y: 0 },
            { angle: Math.PI, worker: null, x: 0, y: 0 },
            { angle: Math.PI * 1.5, worker: null, x: 0, y: 0 }
        ];

        this.updateSlotPositions();

        // Resources
        this.resources = 0;
        this.resourcesPerWork = 10;
    }

    update(deltaTime) {
        // Rotate waterwheel
        const activeWorkers = this.workSlots.filter(slot => slot.worker !== null).length;
        if (activeWorkers > 0) {
            this.rotation += this.rotationSpeed * activeWorkers;
        } else {
            this.rotation += this.rotationSpeed * 0.3; // Slow rotation when idle
        }

        this.updateSlotPositions();

        // Update worker positions
        this.workSlots.forEach(slot => {
            if (slot.worker) {
                slot.worker.x = slot.x;
                slot.worker.y = slot.y;
            }
        });
    }

    updateSlotPositions() {
        const slotDistance = this.radius + 40;
        this.workSlots.forEach(slot => {
            slot.x = this.x + Math.cos(slot.angle) * slotDistance;
            slot.y = this.y + Math.sin(slot.angle) * slotDistance;
        });
    }

    addWorker(pet) {
        // Find empty slot
        const emptySlot = this.workSlots.find(slot => slot.worker === null);
        if (!emptySlot) {
            return false; // No empty slots
        }

        if (pet.energy < 20) {
            return false; // Not enough energy
        }

        // Assign pet to slot
        emptySlot.worker = pet;
        pet.startWork(emptySlot);
        pet.x = emptySlot.x;
        pet.y = emptySlot.y;

        return true;
    }

    removeWorker(pet) {
        const slot = this.workSlots.find(s => s.worker === pet);
        if (slot) {
            slot.worker = null;
            this.resources += this.resourcesPerWork;
        }
    }

    contains(x, y) {
        const dx = x - this.x;
        const dy = y - this.y;
        return Math.sqrt(dx * dx + dy * dy) < this.radius + 50;
    }

    render(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);

        // Base/platform
        ctx.fillStyle = '#8B4513';
        ctx.fillRect(-this.radius - 10, this.radius - 10, (this.radius + 10) * 2, 20);

        // Waterwheel
        ctx.rotate(this.rotation);

        // Wheel spokes
        ctx.strokeStyle = '#654321';
        ctx.lineWidth = 4;
        for (let i = 0; i < 8; i++) {
            const angle = (Math.PI * 2 / 8) * i;
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(Math.cos(angle) * this.radius, Math.sin(angle) * this.radius);
            ctx.stroke();
        }

        // Outer wheel
        ctx.strokeStyle = '#8B4513';
        ctx.lineWidth = 8;
        ctx.beginPath();
        ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
        ctx.stroke();

        // Water buckets
        ctx.fillStyle = '#A0522D';
        for (let i = 0; i < 8; i++) {
            const angle = (Math.PI * 2 / 8) * i;
            const bucketX = Math.cos(angle) * this.radius;
            const bucketY = Math.sin(angle) * this.radius;

            ctx.save();
            ctx.translate(bucketX, bucketY);
            ctx.rotate(angle + Math.PI / 2);
            ctx.fillRect(-8, 0, 16, 12);
            ctx.restore();
        }

        // Center hub
        ctx.fillStyle = '#654321';
        ctx.beginPath();
        ctx.arc(0, 0, 15, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();

        // Work slot indicators
        this.workSlots.forEach(slot => {
            if (!slot.worker) {
                ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
                ctx.lineWidth = 2;
                ctx.setLineDash([5, 5]);
                ctx.beginPath();
                ctx.arc(slot.x, slot.y, 25, 0, Math.PI * 2);
                ctx.stroke();
                ctx.setLineDash([]);
            }
        });

        // Label
        ctx.fillStyle = '#333';
        ctx.font = 'bold 14px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('水车', this.x, this.y - this.radius - 20);
    }
}
