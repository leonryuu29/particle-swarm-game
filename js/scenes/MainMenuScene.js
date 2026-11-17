export default class MainMenuScene extends Phaser.Scene {
    constructor() {
        super({ key: 'MainMenuScene' });
    }

    preload() {
        if (!this.textures.exists('particle')) {
            this.make.graphics({ x: 0, y: 0, add: false }).fillStyle(0xffffff).fillCircle(2, 2, 2).generateTexture('particle', 4, 4);
        }

        if (!this.textures.exists('starfield')) {
            const starfieldGraphics = this.make.graphics({x: 0, y: 0, add: false});
            starfieldGraphics.fillStyle(0xffffff, 0.8);
            for (let i = 0; i < 1000; i++) {
                const x = Phaser.Math.Between(0, this.game.config.width);
                const y = Phaser.Math.Between(0, this.game.config.height);
                const radius = Phaser.Math.FloatBetween(0.3, 1.2);
                starfieldGraphics.fillCircle(x, y, radius);
            }
            starfieldGraphics.generateTexture('starfield', this.game.config.width, this.game.config.height);
        }
    }

    create() {
    this.background = this.add.tileSprite(
            this.game.config.width / 2,
            this.game.config.height / 2,
            this.game.config.width,
            this.game.config.height,
            'starfield'
        );
        this.background.setDepth(0);

        const meteorParticles = this.add.particles('particle');
        this.meteorEmitter = meteorParticles.createEmitter({
            x: { min: -100, max: this.game.config.width + 100 },
            y: -100,
            lifespan: 2000,
            speedY: { min: 200, max: 400 },
            speedX: { min: -200, max: -400 },
            angle: 0,
            gravityY: 0,
            scale: { start: 0.4, end: 0 },
            blendMode: 'ADD',
            frequency: 500,
            on: true
        });
        meteorParticles.setDepth(1);

        const title = this.add.text(this.cameras.main.width / 2, this.cameras.main.height / 2 - 100, 'Particle Swarm', { font: '50px Arial', fill: '#ffffff' }).setOrigin(0.5);
        title.setDepth(2);

        const highScore = localStorage.getItem('particleSwarmHighScore') || 0;
        const highScoreText = this.add.text(this.cameras.main.width / 2, this.cameras.main.height / 2 - 40, `High Score: ${highScore}`, { font: '24px Arial', fill: '#ffff00' }).setOrigin(0.5);
        highScoreText.setDepth(2);


       const startButton = this.add.text(this.cameras.main.width / 2, this.cameras.main.height / 2 + 20, 'Start Game', { font: '32px Arial', fill: '#00ff00' }).setOrigin(0.5);
        startButton.setInteractive({ useHandCursor: true });
          startButton.on('pointerover', () => startButton.setStyle({ fill: '#88ff88' }));
       startButton.on('pointerout', () => startButton.setStyle({ fill: '#00ff00' }));
       startButton.on('pointerdown', () => {
            this.scene.start('GameScene');
       });
       startButton.setDepth(2);

        const producerText = this.add.text(this.cameras.main.width / 2, this.cameras.main.height / 2 + 70, 'Producer: Yu Zhaoze', { font: '20px Arial', fill: '#c8c8d8' }).setOrigin(0.5);
        producerText.setDepth(2);
    }
    shutdown() {
        if (this.meteorEmitter) {
            this.meteorEmitter.manager.destroy();
            this.meteorEmitter = null;
        }
    }
     update(time, delta) {
        this.background.tilePositionX += 0.2;
        this.background.tilePositionY -= 0.1;
    }
}
