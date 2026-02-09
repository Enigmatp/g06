// Main Game Engine
class Game {
    constructor() {
        this.canvas = document.getElementById('game-canvas');
        this.ctx = this.canvas.getContext('2d');

        // Game state
        this.isRunning = false;
        this.lastTime = 0;
        this.pets = [];
        this.waterwheel = null;
        this.resources = 0;

        // Drag state
        this.draggedPet = null;
        this.dragOffsetX = 0;
        this.dragOffsetY = 0;
        this.isDragging = false;

        // UI state
        this.hoveredPet = null;
        this.messageQueue = [];

        // Settings
        this.petIdCounter = 0;

        this.init();
    }

    init() {
        // Set canvas size
        this.resizeCanvas();
        window.addEventListener('resize', () => this.resizeCanvas());

        // Create waterwheel
        this.waterwheel = new Waterwheel(this.canvas.width - 150, this.canvas.height / 2);

        // Create initial pets
        for (let i = 0; i < 5; i++) {
            this.addPet();
        }

        // Setup input handlers
        this.setupInputHandlers();

        // Start game loop
        this.isRunning = true;
        this.lastTime = performance.now();
        this.gameLoop();
    }

    resizeCanvas() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
    }

    setupInputHandlers() {
        // Mouse events
        this.canvas.addEventListener('mousedown', (e) => this.handlePointerDown(e.clientX, e.clientY));
        this.canvas.addEventListener('mousemove', (e) => this.handlePointerMove(e.clientX, e.clientY));
        this.canvas.addEventListener('mouseup', (e) => this.handlePointerUp(e.clientX, e.clientY));

        // Touch events
        this.canvas.addEventListener('touchstart', (e) => {
            e.preventDefault();
            const touch = e.touches[0];
            this.handlePointerDown(touch.clientX, touch.clientY);
        });
        this.canvas.addEventListener('touchmove', (e) => {
            e.preventDefault();
            const touch = e.touches[0];
            this.handlePointerMove(touch.clientX, touch.clientY);
        });
        this.canvas.addEventListener('touchend', (e) => {
            e.preventDefault();
            if (e.changedTouches.length > 0) {
                const touch = e.changedTouches[0];
                this.handlePointerUp(touch.clientX, touch.clientY);
            }
        });

        // Add pet button
        document.getElementById('add-pet-btn').addEventListener('click', () => this.addPet());
    }

    handlePointerDown(x, y) {
        // Find pet under pointer
        for (let i = this.pets.length - 1; i >= 0; i--) {
            const pet = this.pets[i];
            if (pet.contains(x, y) && pet.isDraggable) {
                this.draggedPet = pet;
                this.dragOffsetX = x - pet.x;
                this.dragOffsetY = y - pet.y;
                this.isDragging = true;
                pet.isBeingDragged = true;
                break;
            }
        }
    }

    handlePointerMove(x, y) {
        if (this.isDragging && this.draggedPet) {
            this.draggedPet.x = x - this.dragOffsetX;
            this.draggedPet.y = y - this.dragOffsetY;
        } else {
            // Update hovered pet
            this.hoveredPet = null;
            for (let i = this.pets.length - 1; i >= 0; i--) {
                if (this.pets[i].contains(x, y)) {
                    this.hoveredPet = this.pets[i];
                    break;
                }
            }
        }
    }

    handlePointerUp(x, y) {
        if (!this.isDragging || !this.draggedPet) return;

        const pet = this.draggedPet;
        pet.isBeingDragged = false;

        // Check if dropped on waterwheel
        if (this.waterwheel.contains(x, y)) {
            const success = this.waterwheel.addWorker(pet);
            if (!success) {
                this.showMessage('水车已满或宠物能量不足！');
            }
        } else {
            // Check if dropped on another pet
            let targetPet = null;
            for (let i = this.pets.length - 1; i >= 0; i--) {
                const otherPet = this.pets[i];
                if (otherPet !== pet && otherPet.contains(x, y) && otherPet.state !== 'working') {
                    targetPet = otherPet;
                    break;
                }
            }

            if (targetPet) {
                const result = pet.interact(targetPet);
                if (result) {
                    this.showMessage(result.message);
                    this.createInteractionEffect(pet, targetPet, result.type);
                }
            }
        }

        this.isDragging = false;
        this.draggedPet = null;
    }

    addPet() {
        const margin = 100;
        const x = margin + Math.random() * (this.canvas.width - margin * 2 - 200); // Avoid waterwheel area
        const y = margin + Math.random() * (this.canvas.height - margin * 2);

        const pet = new Pet(this.petIdCounter++, x, y);
        this.pets.push(pet);

        this.updatePetCount();
    }

    showMessage(text) {
        this.messageQueue.push({
            text: text,
            time: 3000,
            alpha: 1
        });
    }

    createInteractionEffect(pet1, pet2, type) {
        // Visual effect between two pets
        const midX = (pet1.x + pet2.x) / 2;
        const midY = (pet1.y + pet2.y) / 2;

        // Create particles based on interaction type
        // This could be expanded with a particle system
    }

    update(deltaTime) {
        // Update waterwheel
        this.waterwheel.update(deltaTime);

        // Check for finished work
        this.waterwheel.workSlots.forEach(slot => {
            if (slot.worker && slot.worker.state !== 'working') {
                this.waterwheel.removeWorker(slot.worker);
                this.resources = this.waterwheel.resources;
                this.updateResourceDisplay();
            }
        });

        // Update pets
        this.pets.forEach(pet => {
            pet.update(deltaTime, this.canvas.width, this.canvas.height);
        });

        // Update messages
        this.messageQueue = this.messageQueue.filter(msg => {
            msg.time -= deltaTime;
            if (msg.time < 1000) {
                msg.alpha = msg.time / 1000;
            }
            return msg.time > 0;
        });
    }

    render() {
        // Clear canvas
        this.ctx.fillStyle = '#87CEEB'; // Sky blue
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // Draw grass
        this.drawGrass();

        // Draw waterwheel
        this.waterwheel.render(this.ctx);

        // Draw pets
        this.pets.forEach(pet => {
            pet.render(this.ctx);
        });

        // Draw hovered pet info
        if (this.hoveredPet && !this.isDragging) {
            this.drawPetInfo(this.hoveredPet);
        }

        // Draw messages
        this.drawMessages();

        // Draw drag indicator
        if (this.isDragging && this.draggedPet) {
            this.drawDragIndicator();
        }
    }

    drawGrass() {
        // Simple grass background
        const gradient = this.ctx.createLinearGradient(0, this.canvas.height * 0.3, 0, this.canvas.height);
        gradient.addColorStop(0, '#87CEEB');
        gradient.addColorStop(0.3, '#90EE90');
        gradient.addColorStop(1, '#228B22');

        this.ctx.fillStyle = gradient;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // Grass texture
        this.ctx.fillStyle = 'rgba(34, 139, 34, 0.3)';
        for (let i = 0; i < 100; i++) {
            const x = Math.random() * this.canvas.width;
            const y = this.canvas.height * 0.4 + Math.random() * this.canvas.height * 0.6;
            const width = 2 + Math.random() * 3;
            const height = 10 + Math.random() * 20;
            this.ctx.fillRect(x, y, width, height);
        }
    }

    drawPetInfo(pet) {
        const infoX = pet.x + 50;
        const infoY = pet.y - 50;
        const padding = 10;
        const width = 150;
        const height = 80;

        // Background
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        this.ctx.fillRect(infoX, infoY, width, height);

        // Border
        this.ctx.strokeStyle = '#fff';
        this.ctx.lineWidth = 2;
        this.ctx.strokeRect(infoX, infoY, width, height);

        // Text
        this.ctx.fillStyle = '#fff';
        this.ctx.font = '12px Arial';
        this.ctx.textAlign = 'left';

        this.ctx.fillText(`宠物 #${pet.id}`, infoX + padding, infoY + padding + 12);
        this.ctx.fillText(`友好度: ${Math.floor(pet.friendship)}`, infoX + padding, infoY + padding + 28);
        this.ctx.fillText(`能量: ${Math.floor(pet.energy)}`, infoX + padding, infoY + padding + 44);
        this.ctx.fillText(`心情: ${pet.mood === 'happy' ? '开心' : pet.mood === 'sad' ? '难过' : '普通'}`,
            infoX + padding, infoY + padding + 60);
    }

    drawMessages() {
        let yOffset = 100;
        this.messageQueue.forEach(msg => {
            this.ctx.save();
            this.ctx.globalAlpha = msg.alpha;

            const textWidth = this.ctx.measureText(msg.text).width;
            const x = this.canvas.width / 2 - textWidth / 2 - 20;
            const y = yOffset;

            // Background
            this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
            this.ctx.fillRect(x, y, textWidth + 40, 40);

            // Text
            this.ctx.fillStyle = '#fff';
            this.ctx.font = 'bold 16px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.fillText(msg.text, this.canvas.width / 2, y + 25);

            this.ctx.restore();
            yOffset += 50;
        });
    }

    drawDragIndicator() {
        // Draw line from dragged pet to cursor or target
        // Could add visual feedback here
    }

    updatePetCount() {
        document.getElementById('pet-count').textContent = this.pets.length;
    }

    updateResourceDisplay() {
        document.getElementById('resource-count').textContent = this.resources;
    }

    gameLoop() {
        if (!this.isRunning) return;

        const currentTime = performance.now();
        const deltaTime = currentTime - this.lastTime;
        this.lastTime = currentTime;

        this.update(deltaTime);
        this.render();

        requestAnimationFrame(() => this.gameLoop());
    }
}

// Initialize game when called from loading screen
let game = null;

function initGame() {
    game = new Game();
}
