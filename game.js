// Main Game Engine - Stacklands Style Breeding Game
class Game {
    constructor() {
        this.canvas = document.getElementById('game-canvas');
        this.ctx = this.canvas.getContext('2d');

        // Game state
        this.isRunning = false;
        this.lastTime = 0;

        // Cards
        this.cards = [];
        this.cardIdCounter = 0;

        // Drag state
        this.draggedCard = null;
        this.isDragging = false;

        // Stats
        this.coins = 100;
        this.totalBred = 0;

        // UI state
        this.hoveredCard = null;
        this.showCollection = false;
        this.messages = [];

        this.init();
    }

    init() {
        // Set canvas size
        this.resizeCanvas();
        window.addEventListener('resize', () => this.resizeCanvas());

        // Create starting cards
        this.createStartingCards();

        // Setup input handlers
        this.setupInputHandlers();

        // Start game loop
        this.isRunning = true;
        this.lastTime = performance.now();
        this.gameLoop();

        // Update UI
        this.updateUI();
    }

    resizeCanvas() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
    }

    createStartingCards() {
        // Create 3 random base species cards
        const species = ['wolf', 'duck', 'cat'];
        const positions = [
            { x: this.canvas.width * 0.3, y: this.canvas.height * 0.5 },
            { x: this.canvas.width * 0.5, y: this.canvas.height * 0.5 },
            { x: this.canvas.width * 0.7, y: this.canvas.height * 0.5 }
        ];

        species.forEach((sp, i) => {
            const genes = createBasePet(sp);
            const card = new Card(this.cardIdCounter++, positions[i].x, positions[i].y, genes);
            this.cards.push(card);
        });
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

        // UI buttons
        document.getElementById('collection-btn').addEventListener('click', () => this.toggleCollection());
        document.getElementById('new-card-btn').addEventListener('click', () => this.buyNewCard());
    }

    handlePointerDown(x, y) {
        // Find topmost card at position (reverse order for top card)
        for (let i = this.cards.length - 1; i >= 0; i--) {
            const card = this.cards[i];
            if (card.contains(x, y)) {
                this.draggedCard = card;
                this.isDragging = true;
                card.startDrag(x, y);

                // Move to top
                this.cards.splice(i, 1);
                this.cards.push(card);
                break;
            }
        }
    }

    handlePointerMove(x, y) {
        if (this.isDragging && this.draggedCard) {
            this.draggedCard.drag(x, y);
        } else {
            // Update hovered card
            this.hoveredCard = null;
            for (let i = this.cards.length - 1; i >= 0; i--) {
                if (this.cards[i].contains(x, y)) {
                    this.hoveredCard = this.cards[i];
                    break;
                }
            }
        }
    }

    handlePointerUp(x, y) {
        if (!this.isDragging || !this.draggedCard) return;

        const draggedCard = this.draggedCard;
        draggedCard.endDrag();

        // Check for breeding
        let breedingPartner = null;
        for (let i = 0; i < this.cards.length; i++) {
            const card = this.cards[i];
            if (card !== draggedCard && draggedCard.overlaps(card)) {
                breedingPartner = card;
                break;
            }
        }

        if (breedingPartner) {
            this.attemptBreeding(draggedCard, breedingPartner);
        }

        this.isDragging = false;
        this.draggedCard = null;
    }

    attemptBreeding(card1, card2) {
        // Check if both can breed
        if (!card1.canBreed || !card2.canBreed) {
            this.showMessage('宠物正在冷却中！');
            return;
        }

        // Breed!
        this.breedCards(card1, card2);
    }

    breedCards(card1, card2) {
        // Create breeding animation
        card1.addBreedingParticles();
        card2.addBreedingParticles();

        // Calculate offspring position (between parents)
        const x = (card1.x + card2.x) / 2;
        const y = (card1.y + card2.y) / 2 - 100;

        // Breed genes
        const offspringGenes = breedPets(card1.genes, card2.genes);

        // Create new card
        setTimeout(() => {
            const offspring = new Card(this.cardIdCounter++, x, y, offspringGenes);
            this.cards.push(offspring);

            // Show message
            const parent1Name = card1.genes.getSpeciesName();
            const parent2Name = card2.genes.getSpeciesName();
            const offspringName = offspringGenes.getSpeciesName();

            this.showMessage(`${parent1Name} + ${parent2Name} = ${offspringName}!`);

            if (offspringGenes.rarity >= 3) {
                this.showMessage(`${offspringGenes.getRarityName()}品质！`);
            }

            // Stats
            this.totalBred++;
            this.coins += offspringGenes.rarity * 10;

            // Set cooldown
            card1.startBreedingCooldown();
            card2.startBreedingCooldown();

            // Update UI
            this.updateUI();
        }, 500);
    }

    buyNewCard() {
        const cost = 50;
        if (this.coins < cost) {
            this.showMessage('金币不足！');
            return;
        }

        this.coins -= cost;

        // Random species
        const speciesKeys = Object.keys(SPECIES_DATA);
        const randomSpecies = speciesKeys[Math.floor(Math.random() * speciesKeys.length)];

        // Random position
        const x = 200 + Math.random() * (this.canvas.width - 400);
        const y = 200 + Math.random() * (this.canvas.height - 400);

        const genes = createBasePet(randomSpecies);
        const card = new Card(this.cardIdCounter++, x, y, genes);
        this.cards.push(card);

        this.showMessage(`获得蛋壳${genes.getSpeciesName()}！`);
        this.updateUI();
    }

    toggleCollection() {
        this.showCollection = !this.showCollection;
    }

    showMessage(text) {
        this.messages.push({
            text: text,
            life: 3000,
            alpha: 1
        });
    }

    updateUI() {
        document.getElementById('card-count').textContent = this.cards.length;
        document.getElementById('coin-count').textContent = this.coins;
        document.getElementById('bred-count').textContent = this.totalBred;
    }

    update(deltaTime) {
        // Update cards
        this.cards.forEach(card => card.update(deltaTime));

        // Update messages
        this.messages = this.messages.filter(msg => {
            msg.life -= deltaTime;
            msg.alpha = Math.min(1, msg.life / 1000);
            return msg.life > 0;
        });
    }

    render() {
        // Clear canvas with gradient background
        const gradient = this.ctx.createLinearGradient(0, 0, 0, this.canvas.height);
        gradient.addColorStop(0, '#E8F5E9');
        gradient.addColorStop(1, '#C8E6C9');
        this.ctx.fillStyle = gradient;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // Draw table texture
        this.drawTableTexture();

        if (this.showCollection) {
            this.renderCollection();
        } else {
            // Draw cards
            this.cards.forEach(card => {
                if (card !== this.draggedCard) {
                    card.render(this.ctx);
                }
            });

            // Draw dragged card last (on top)
            if (this.draggedCard) {
                this.draggedCard.render(this.ctx);
            }

            // Draw messages
            this.drawMessages();

            // Draw hint
            if (this.cards.length <= 3) {
                this.drawHint();
            }
        }
    }

    drawTableTexture() {
        // Wood grain effect
        this.ctx.strokeStyle = 'rgba(139, 69, 19, 0.1)';
        this.ctx.lineWidth = 2;
        for (let i = 0; i < 20; i++) {
            const y = (i / 20) * this.canvas.height;
            this.ctx.beginPath();
            this.ctx.moveTo(0, y);
            this.ctx.lineTo(this.canvas.width, y + Math.sin(i) * 10);
            this.ctx.stroke();
        }
    }

    drawMessages() {
        let y = this.canvas.height * 0.15;

        this.messages.forEach(msg => {
            this.ctx.save();
            this.ctx.globalAlpha = msg.alpha;

            // Background
            this.ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
            this.ctx.fillRect(this.canvas.width / 2 - 200, y - 20, 400, 50);

            // Text
            this.ctx.fillStyle = '#FFF';
            this.ctx.font = 'bold 20px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'middle';
            this.ctx.fillText(msg.text, this.canvas.width / 2, y);

            this.ctx.restore();

            y += 60;
        });
    }

    drawHint() {
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
        this.ctx.font = 'bold 24px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'top';
        this.ctx.fillText('💡 拖拽两张卡牌到一起进行繁殖！', this.canvas.width / 2, 50);
    }

    renderCollection() {
        // Collection UI
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        this.ctx.fillStyle = '#000';
        this.ctx.font = 'bold 32px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('蛋壳宠物图鉴', this.canvas.width / 2, 60);

        this.ctx.font = '20px Arial';
        this.ctx.fillText(`已繁殖: ${this.totalBred} 次`, this.canvas.width / 2, 100);
        this.ctx.fillText(`当前卡牌: ${this.cards.length} 张`, this.canvas.width / 2, 130);

        // TODO: Show collection grid
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
