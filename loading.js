// Loading Screen Controller
class LoadingScreen {
    constructor() {
        this.loadingScreen = document.getElementById('loading-screen');
        this.loadingBarFill = document.getElementById('loading-bar-fill');
        this.loadingPercentage = document.getElementById('loading-percentage');
        this.loadingText = document.getElementById('loading-text');
        this.gameContainer = document.getElementById('game-container');
        
        this.currentProgress = 0;
        this.targetProgress = 0;
        this.isComplete = false;
        
        // Loading stages with Chinese text
        this.loadingStages = [
            { progress: 0, text: '正在初始化...' },
            { progress: 15, text: '加载资源文件...' },
            { progress: 30, text: '加载游戏引擎...' },
            { progress: 50, text: '加载音频资源...' },
            { progress: 70, text: '加载图形资源...' },
            { progress: 85, text: '初始化游戏场景...' },
            { progress: 95, text: '准备就绪...' },
            { progress: 100, text: '加载完成！' }
        ];
        
        this.currentStageIndex = 0;
        
        // Loading tips
        this.tips = [
            '提示：使用键盘方向键控制移动',
            '提示：收集道具可以获得额外分数',
            '提示：注意躲避障碍物',
            '提示：保持专注，挑战高分！',
            '提示：游戏支持触摸屏操作'
        ];
        
        this.init();
    }
    
    init() {
        // Start loading simulation
        this.simulateLoading();
        
        // Rotate tips every 3 seconds
        this.rotateTips();
    }
    
    simulateLoading() {
        // Simulate realistic loading with varying speeds
        const loadNextStage = () => {
            if (this.currentStageIndex < this.loadingStages.length) {
                const stage = this.loadingStages[this.currentStageIndex];
                this.targetProgress = stage.progress;
                this.loadingText.textContent = stage.text;
                
                // Animate progress
                this.animateProgress();
                
                this.currentStageIndex++;
                
                // Random delay between stages (500ms - 1500ms)
                const delay = Math.random() * 1000 + 500;
                setTimeout(loadNextStage, delay);
            } else {
                // Loading complete
                setTimeout(() => this.completeLoading(), 500);
            }
        };
        
        // Start loading after a short delay
        setTimeout(loadNextStage, 300);
    }
    
    animateProgress() {
        const animate = () => {
            if (this.currentProgress < this.targetProgress) {
                // Smooth increment
                const increment = (this.targetProgress - this.currentProgress) * 0.1;
                this.currentProgress += Math.max(increment, 0.5);
                
                if (this.currentProgress > this.targetProgress) {
                    this.currentProgress = this.targetProgress;
                }
                
                this.updateProgressBar();
                requestAnimationFrame(animate);
            }
        };
        
        animate();
    }
    
    updateProgressBar() {
        const percentage = Math.floor(this.currentProgress);
        this.loadingBarFill.style.width = percentage + '%';
        this.loadingPercentage.textContent = percentage + '%';
    }
    
    rotateTips() {
        const tipsElement = document.getElementById('loading-tips');
        let currentTipIndex = 0;
        
        setInterval(() => {
            // Fade out
            tipsElement.style.opacity = '0';
            
            setTimeout(() => {
                // Change tip
                currentTipIndex = (currentTipIndex + 1) % this.tips.length;
                tipsElement.querySelector('.tip-text').textContent = this.tips[currentTipIndex];
                
                // Fade in
                tipsElement.style.opacity = '1';
            }, 300);
        }, 4000);
    }
    
    completeLoading() {
        if (this.isComplete) return;
        this.isComplete = true;
        
        // Add completion effects
        this.loadingText.textContent = '加载完成！';
        this.loadingText.style.color = '#00ff00';
        this.loadingText.style.textShadow = '0 0 20px rgba(0, 255, 0, 0.8)';
        
        // Wait a moment, then transition to game
        setTimeout(() => {
            this.transitionToGame();
        }, 1000);
    }
    
    transitionToGame() {
        // Fade out loading screen
        this.loadingScreen.classList.add('fade-out');
        
        // Show game container after fade
        setTimeout(() => {
            this.gameContainer.classList.remove('hidden');
            
            // Initialize game here
            this.initGame();
        }, 800);
    }
    
    initGame() {
        // This is where you would initialize your actual game
        console.log('Game initialized!');
        
        // Example: You can add your game logic here
        // For now, just show a message
        this.gameContainer.innerHTML = `
            <div style="text-align: center;">
                <h1 style="font-family: 'Orbitron', sans-serif; font-size: 3rem; 
                           background: linear-gradient(90deg, #00f0ff 0%, #ff00ff 100%);
                           -webkit-background-clip: text; -webkit-text-fill-color: transparent;
                           margin-bottom: 20px;">
                    游戏已准备就绪
                </h1>
                <p style="font-size: 1.2rem; color: rgba(255, 255, 255, 0.8);">
                    这里是游戏主界面
                </p>
                <p style="font-size: 1rem; color: rgba(255, 255, 255, 0.6); margin-top: 20px;">
                    您可以在这里添加游戏内容
                </p>
            </div>
        `;
    }
}

// Initialize loading screen when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    const loadingScreen = new LoadingScreen();
});

// Optional: Preload assets
function preloadAssets() {
    // Add your asset preloading logic here
    // For example:
    // - Images
    // - Audio files
    // - Game data
    // - Fonts
    
    return new Promise((resolve) => {
        // Simulate asset loading
        setTimeout(resolve, 100);
    });
}
