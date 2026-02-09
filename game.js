// Main Game Engine - Egg Shell Pet Hatching Game
class Game {
    constructor() {
        this.canvas = document.getElementById('game-canvas');
        this.ctx = this.canvas.getContext('2d');

        // Game state
        this.isRunning = false;
        this.lastTime = 0;

        // Collections
        this.pets = [];  // Hatched egg shell pets
        this.currentEgg = null;

        // Stats
        this.totalHatched = 0;
        this.coins = 100;
        this.petIdCounter = 0;

        // Upgrades
        this.autoHatchSpeed = 0;
        this.hatchSpeedMultiplier = 1;
        this.rarityBonus = 0;

        // UI state
        this.showCollection = false;
        this.selectedPet = null;

        this.init();
    }

    init() {
        // Set canvas size
        this.resizeCanvas();
        window.addEventListener('resize', () => this.resizeCanvas());

        // Create first egg
        this.spawnEgg();

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

    setupInputHandlers() {
        // Click/Touch handlers
        this.canvas.addEventListener('mousedown', (e) => this.handleClick(e.clientX, e.clientY));
        this.canvas.addEventListener('touchstart', (e) => {
            e.preventDefault();
            const touch = e.touches[0];
            this.handleClick(touch.clientX, touch.clientY);
        });

        // UI buttons
        document.getElementById('collection-btn').addEventListener('click', () => this.toggleCollection());
        document.getElementById('new-egg-btn').addEventListener('click', () => this.buyNewEgg());
    }

    handleClick(x, y) {
        if (this.showCollection) {
            // Handle collection UI clicks
            return;
        }

        // Click on egg to hatch
        if (this.currentEgg && this.currentEgg.contains(x, y)) {
            this.currentEgg.click();
        }

        // Click on pets
        this.pets.forEach(pet => {
            if (pet.contains(x, y)) {
                this.selectedPet = pet;
                this.showPetInfo(pet);
            }
        });
    }

    spawnEgg() {
        const x = this.canvas.width / 2;
        const y = this.canvas.height * 0.35;
        this.currentEgg = new Egg(x, y);
        this.currentEgg.autoHatchSpeed = this.autoHatchSpeed;
    }

    update(deltaTime) {
        // Update current egg
        if (this.currentEgg) {
            this.currentEgg.update(deltaTime);

            // Check if hatching is complete
            if (this.currentEgg.isComplete) {
                this.hatchPet();
            }
        }

        // Update pets
        this.pets.forEach(pet => {
            pet.update(deltaTime, this.canvas.width, this.canvas.height);
        });

        // Limit pet count on screen
        if (this.pets.length > 10) {
            this.pets.shift(); // Remove oldest pet
        }
    }

    hatchPet() {
        // Create new pet from egg
        const x = this.currentEgg.x;
        const y = this.currentEgg.y + 100;

        // Use duck.js as Pet class (it's actually egg shell pets)
        const pet = new Duck(this.petIdCounter++, x, y);
        this.pets.push(pet);

        // Award coins based on rarity
        const coinReward = this.getRewardForRarity(pet.genes.rarity);
        this.coins += coinReward;

        // Show reward message
        this.showMessage(`孵化成功！获得 ${coinReward} 金币`);
        this.showMessage(`${pet.genes.rarityName} 蛋壳宠物！`);

        // Stats
        this.totalHatched++;

        // Spawn new egg
        this.currentEgg = null;
        setTimeout(() => this.spawnEgg(), 1000);

        // Update UI
        this.updateUI();
    }

    getRewardForRarity(rarity) {
        const rewards = [0, 10, 50, 200, 1000, 5000];
        return rewards[rarity] || 10;
    }

    showMessage(text) {
        // Create floating message
        const messageEl = document.createElement('div');
        messageEl.className = 'floating-message';
        messageEl.textContent = text;
        document.body.appendChild(messageEl);

        setTimeout(() => {
            messageEl.classList.add('fade-out');
            setTimeout(() => messageEl.remove(), 1000);
        }, 2000);
    }

    showPetInfo(pet) {
        const infoEl = document.getElementById('pet-info');
        infoEl.innerHTML = `
            <h3>蛋壳宠物 #${pet.id}</h3>
            <p>稀有度: ${pet.genes.rarityName}</p>
            <p>大小: ${(pet.genes.size * 100).toFixed(0)}%</p>
            <p>头部: ${this.getPartName('head', pet.genes.headType)}</p>
            <p>翅膀: ${this.getPartName('wing', pet.genes.wingType)}</p>
            <p>尾巴: ${this.getPartName('tail', pet.genes.tailType)}</p>
            <p>脚: ${this.getPartName('feet', pet.genes.feetType)}</p>
        `;
        infoEl.style.display = 'block';

        setTimeout(() => {
            infoEl.style.display = 'none';
        }, 5000);
    }

    getPartName(type, value) {
        const names = {
            head: { normal: '普通', big: '大头', small: '小头', crown: '皇冠', hat: '帽子', unicorn: '独角兽' },
            wing: { normal: '普通', angel: '天使', bat: '蝙蝠', rainbow: '彩虹', none: '无', huge: '巨大' },
            tail: { short: '短', long: '长', peacock: '孔雀', flame: '火焰', none: '无' },
            feet: { normal: '普通', big: '大脚', thin: '细脚', claw: '爪子', wheel: '轮子' }
        };
        return names[type][value] || value;
    }

    toggleCollection() {
        this.showCollection = !this.showCollection;
    }

    buyNewEgg() {
        const cost = 50;
        if (this.coins >= cost && !this.currentEgg) {
            this.coins -= cost;
            this.spawnEgg();
            this.updateUI();
        }
    }

    updateUI() {
        document.getElementById('pet-count').textContent = this.totalHatched;
        document.getElementById('coin-count').textContent = this.coins;
    }

    render() {
        // Clear canvas with gradient background
        const gradient = this.ctx.createLinearGradient(0, 0, 0, this.canvas.height);
        gradient.addColorStop(0, '#87CEEB');  // Sky blue
        gradient.addColorStop(0.4, '#E0F6FF');
        gradient.addColorStop(1, '#90EE90');  // Grass green
        this.ctx.fillStyle = gradient;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // Draw grass texture
        this.drawGrass();

        // Draw clouds
        this.drawClouds();

        if (this.showCollection) {
            this.renderCollection();
        } else {
            // Draw pets
            this.pets.forEach(pet => pet.render(this.ctx));

            // Draw current egg
            if (this.currentEgg) {
                this.currentEgg.render(this.ctx);

                // Draw "点击孵化" hint
                if (this.currentEgg.progress < 10) {
                    this.ctx.fillStyle = '#000';
                    this.ctx.font = 'bold 24px Arial';
                    this.ctx.textAlign = 'center';
                    this.ctx.fillText('点击蛋壳孵化！', this.canvas.width / 2, this.canvas.height * 0.2);
                }
            }
        }
    }

    drawGrass() {
        // Simple grass texture
        this.ctx.fillStyle = 'rgba(34, 139, 34, 0.2)';
        for (let i = 0; i < 50; i++) {
            const x = Math.random() * this.canvas.width;
            const y = this.canvas.height * 0.6 + Math.random() * this.canvas.height * 0.4;
            const width = 2 + Math.random() * 2;
            const height = 10 + Math.random() * 15;
            this.ctx.fillRect(x, y, width, height);
        }
    }

    drawClouds() {
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';

        const drawCloud = (x, y, scale) => {
            this.ctx.save();
            this.ctx.translate(x, y);
            this.ctx.scale(scale, scale);

            this.ctx.beginPath();
            this.ctx.arc(-20, 0, 20, 0, Math.PI * 2);
            this.ctx.arc(0, -5, 25, 0, Math.PI * 2);
            this.ctx.arc(20, 0, 20, 0, Math.PI * 2);
            this.ctx.fill();

            this.ctx.restore();
        };

        drawCloud(this.canvas.width * 0.2, this.canvas.height * 0.15, 1);
        drawCloud(this.canvas.width * 0.7, this.canvas.height * 0.1, 0.8);
        drawCloud(this.canvas.width * 0.5, this.canvas.height * 0.08, 1.2);
    }

    renderCollection() {
        // Collection UI
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        this.ctx.fillStyle = '#fff';
        this.ctx.font = 'bold 32px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('蛋壳宠物图鉴', this.canvas.width / 2, 60);

        this.ctx.font = '20px Arial';
        this.ctx.fillText(`已收集: ${this.totalHatched} 只`, this.canvas.width / 2, 100);

        // TODO: Render collection grid
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
