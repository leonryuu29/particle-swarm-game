export default class UIScene extends Phaser.Scene {
    constructor() {
        super({ key: 'UIScene' });
        this.gameScene = null;
        this.score = 0;
        this.shieldCountdown = null;
        this.speedBoostCountdown = null;
    }

    init(data) {
        this.score = data.score || 0;
    }

    create() {
        this.gameScene = this.scene.get('GameScene');

        this.add.rectangle(this.game.config.width / 2, 40, this.game.config.width, 80, 0x111111, 0.7);

        this.scoreText = this.add.text(20, 20, `Score: ${this.score}`, { font: '24px Arial', fill: '#00ffff' });

        const particleCount = this.gameScene ? this.gameScene.PARTICLE_COUNT || 0 : 0;
        this.particleText = this.add.text(20, 50, 'Particles: ' + particleCount, { font: '16px Arial', fill: '#ffffff' });

        this.shieldStatusText = this.add.text(this.game.config.width / 2 + 100, 20, 'Shield: OFF', { font: '18px Arial', fill: '#00ff00' });
        this.shieldTimerText = this.add.text(this.game.config.width / 2 + 100, 45, '', { font: '16px Arial', fill: '#00ff00' });

        this.speedBoostStatusText = this.add.text(this.game.config.width / 2 + 250, 20, 'Speed: NORMAL', { font: '18px Arial', fill: '#ffa500' });
        this.speedBoostTimerText = this.add.text(this.game.config.width / 2 + 250, 45, '', { font: '16px Arial', fill: '#ffa500' });

        const quitButton = this.add.text(this.game.config.width - 30, 30, 'Quit', { font: '20px Arial', fill: '#ffaaaa' }).setOrigin(1, 0);
        quitButton.setInteractive({ useHandCursor: true });

        quitButton.on('pointerdown', () => {
            const gameScene = this.scene.get('GameScene');

            gameScene.events.once('shutdown', () => {
                this.scene.start('MainMenuScene');
            });

            this.scene.stop('GameScene');
        });

        const clearButton = this.add.text(this.game.config.width / 2 - 150, 30, 'Clear Points', { font: '20px Arial', fill: '#00ff00' }).setOrigin(0.5, 0);
        clearButton.setInteractive({ useHandCursor: true });
        clearButton.on('pointerdown', () => {
            if (this.gameScene) {
                this.gameScene.influence_points = [];
                this.gameScene.influence_markers.clear(true, true);
            }
        });

        const pauseButton = this.add.text(this.game.config.width / 2, 30, 'Pause', { font: '20px Arial', fill: '#ff5555' }).setOrigin(0.5, 0);
        pauseButton.setInteractive({ useHandCursor: true });
        pauseButton.on('pointerdown', () => {
            const gameIsPaused = this.scene.isPaused('GameScene');
            if (gameIsPaused) {
                this.scene.resume('GameScene');
                pauseButton.setText('Pause');
            } else {
                this.scene.pause('GameScene');
                pauseButton.setText('Resume');
            }
        });

        this.add.text(15, this.game.config.height - 15, 'Left-click: Attractor | Right-click: Repulsor/Remove', { font: '16px Arial', fill: '#777' }).setOrigin(0, 1);

        if (this.gameScene) {
            this.gameScene.events.on('addScore', this.updateScore, this);
            this.gameScene.events.on('gameOver', this.showGameOverMenu, this);
            this.gameScene.events.on('particleCountChanged', this.updateParticleCount, this);
            this.gameScene.events.on('shieldActivated', this.activateShield, this);
            this.gameScene.events.on('shieldDeactivated', this.deactivateShield, this);
            this.gameScene.events.on('speedBoostActivated', this.activateSpeedBoost, this);
            this.gameScene.events.on('speedBoostDeactivated', this.deactivateSpeedBoost, this);
        }
    }

    shutdown() {
        if (this.gameScene && this.gameScene.events) {
            this.gameScene.events.off('addScore', this.updateScore, this);
            this.gameScene.events.off('gameOver', this.showGameOverMenu, this);
            this.gameScene.events.off('particleCountChanged', this.updateParticleCount, this);
            this.gameScene.events.off('shieldActivated', this.activateShield, this);
            this.gameScene.events.off('shieldDeactivated', this.deactivateShield, this);
            this.gameScene.events.off('speedBoostActivated', this.activateSpeedBoost, this);
            this.gameScene.events.off('speedBoostDeactivated', this.deactivateSpeedBoost, this);
        }
        if (this.shieldCountdown) {
            this.shieldCountdown.remove();
        }
        if (this.speedBoostCountdown) {
            this.speedBoostCountdown.remove();
        }
        this.gameScene = null;
    }

    updateScore(points) {
        this.score += points;
        this.scoreText.setText('Score: ' + this.score);
    }

    updateParticleCount(count) {
        this.particleText.setText('Particles: ' + count);
    }

    activateShield(duration) {
        this.shieldStatusText.setText('Shield: ON');
        this.shieldStatusText.setStyle({ fill: '#00ffff' });

        if (this.shieldCountdown) {
            this.shieldCountdown.remove();
        }

        let remainingTime = Math.ceil(duration / 1000);
        this.shieldTimerText.setText(`Time: ${remainingTime}s`);

        this.shieldCountdown = this.time.addEvent({
            delay: 1000,
            callback: () => {
                remainingTime--;
                this.shieldTimerText.setText(`Time: ${remainingTime}s`);
                if (remainingTime <= 0) {
                    this.shieldCountdown.remove();
                }
            },
            callbackScope: this,
            loop: true
        });
    }

    deactivateShield() {
        this.shieldStatusText.setText('Shield: OFF');
        this.shieldStatusText.setStyle({ fill: '#00ff00' });
        this.shieldTimerText.setText('');
        if (this.shieldCountdown) {
            this.shieldCountdown.remove();
        }
    }

    activateSpeedBoost(duration) {
        this.speedBoostStatusText.setText('Speed: BOOST');
        this.speedBoostStatusText.setStyle({ fill: '#ff4500' });

        if (this.speedBoostCountdown) {
            this.speedBoostCountdown.remove();
        }

        let remainingTime = Math.ceil(duration / 1000);
        this.speedBoostTimerText.setText(`Time: ${remainingTime}s`);

        this.speedBoostCountdown = this.time.addEvent({
            delay: 1000,
            callback: () => {
                remainingTime--;
                this.speedBoostTimerText.setText(`Time: ${remainingTime}s`);
                if (remainingTime <= 0) {
                    this.speedBoostCountdown.remove();
                }
            },
            callbackScope: this,
            loop: true
        });
    }

    deactivateSpeedBoost() {
        this.speedBoostStatusText.setText('Speed: NORMAL');
        this.speedBoostStatusText.setStyle({ fill: '#ffa500' });
        this.speedBoostTimerText.setText('');
        if (this.speedBoostCountdown) {
            this.speedBoostCountdown.remove();
        }
    }

    showGameOverMenu() {
        const centerX = this.game.config.width / 2;
        const centerY = this.game.config.height / 2;

        const oldHighScore = localStorage.getItem('particleSwarmHighScore') || 0;
        if (this.score > oldHighScore) {
            localStorage.setItem('particleSwarmHighScore', this.score);
        }
        const newHighScore = localStorage.getItem('particleSwarmHighScore') || 0;

        this.add.rectangle(centerX, centerY, 450, 300, 0x000000, 0.8).setStrokeStyle(2, 0x888888);
        this.add.text(centerX, centerY - 110, 'Game Over', { font: '40px Arial', fill: '#ff0000' }).setOrigin(0.5);
        this.add.text(centerX, centerY - 50, 'Final Score: ' + this.score, { font: '28px Arial', fill: '#ffffff' }).setOrigin(0.5);
        this.add.text(centerX, centerY - 10, `High Score: ${newHighScore}`, { font: '24px Arial', fill: '#ffff00' }).setOrigin(0.5);

        const restartButton = this.add.text(centerX, centerY + 50, 'Restart', { font: '28px Arial', fill: '#00ff00' }).setOrigin(0.5);
        restartButton.setInteractive({ useHandCursor: true });
        restartButton.on('pointerdown', () => {
            if (this.scene.get('GameScene')) {
                this.scene.get('GameScene').scene.restart();
            }
            this.scene.restart({ score: 0 });
        });

        const menuButton = this.add.text(centerX, centerY + 100, 'Main Menu', { font: '28px Arial', fill: '#ffff00' }).setOrigin(0.5);
        menuButton.setInteractive({ useHandCursor: true });
        menuButton.on('pointerdown', () => {
            this.scene.stop('GameScene');
            this.scene.stop('UIScene');
            this.scene.start('MainMenuScene');
        });
    }
}
