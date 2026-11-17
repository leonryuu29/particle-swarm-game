export default class GameScene extends Phaser.Scene {
    constructor() {
        super({ key: 'GameScene' });
    }

    preload() {
        // 注意：'particle' 和 'starfield' 的创建代码已被移除，因为它们已在 MainMenuScene 中创建
        this.make.graphics({ x: 0, y: 0, add: false }).fillStyle(0x00ffff).fillCircle(5, 5, 5).generateTexture('food', 10, 10);
        this.make.graphics({ x: 0, y: 0, add: false }).fillStyle(0xff4444).fillCircle(7, 7, 7).generateTexture('hazard', 14, 14);
        this.make.graphics({ x: 0, y: 0, add: false }).fillStyle(0xcc00ff).fillTriangle(0, 0, 16, 8, 0, 16).generateTexture('hunter', 16, 16);
        this.make.graphics({ x: 0, y: 0, add: false }).fillStyle(0xffff00).fillCircle(6, 6, 6).generateTexture('shield_powerup', 12, 12);
        this.make.graphics({ x: 0, y: 0, add: false }).fillStyle(0xff00ff).fillCircle(6, 6, 6).generateTexture('reinforcement_powerup', 12, 12);
        this.make.graphics({ x: 0, y: 0, add: false }).fillStyle(0xffa500).fillTriangle(0, 16, 8, 0, 16, 16).generateTexture('speed_boost_powerup', 16, 16);
    }

    create() {
        this.scene.launch('UIScene', { score: 0 });

        this.background = this.add.tileSprite(
            this.game.config.width / 2,
            this.game.config.height / 2,
            this.game.config.width,
            this.game.config.height,
            'starfield'
        );
        this.background.setDepth(-1);
        this.gameOver = false;
        this.shieldActive = false;
        this.shieldTimer = null;
        this.speedBoostActive = false;
        this.speedBoostTimer = null;

        this.foodExplosionEmitter = this.add.particles('food').createEmitter({
            speed: { min: -80, max: 80 },
            angle: { min: 0, max: 360 },
            scale: { start: 1, end: 0 },
            blendMode: 'SCREEN',
            lifespan: 250,
            quantity: 8,
            on: false
        });

        this.reinforcementExplosionEmitter = this.add.particles('particle').createEmitter({
            speed: { min: -150, max: 150 },
            angle: { min: 0, max: 360 },
            scale: { start: 1, end: 0 },
            blendMode: 'ADD',
            lifespan: 500,
            quantity: 30,
            on: false
        });

        this.hazardExplosionEmitter = this.add.particles('particle').createEmitter({
            speed: { min: -150, max: 150 },
            angle: { min: 0, max: 360 },
            scale: { start: 1, end: 0 },
            blendMode: 'ADD',
            lifespan: 400,
            quantity: 15,
            on: false
        });

        this.PARTICLE_COUNT = 2145;

        this.influence_points = [];
        this.influence_markers = this.add.group();

        this.particles = this.physics.add.group();
        for (let i = 0; i < this.PARTICLE_COUNT; i++) {
            const x = Phaser.Math.Between(0, this.game.config.width);
            const y = Phaser.Math.Between(0, this.game.config.height);
            this.createParticle(x, y);
        }

        this.trailEmitter = this.add.particles('particle').createEmitter({
            speed: 0,
            scale: { start: 0.6, end: 0 },
            alpha: { start: 0.5, end: 0 },
            lifespan: 600,
            blendMode: 'ADD',
            on: false
        });

        this.foodGroup = this.physics.add.group();
        this.spawnFoodPattern();

        this.hazardGroup = this.physics.add.group();
        for (let i = 0; i < 5; i++) {
            this.spawnHazard();
        }

        this.hunterGroup = this.physics.add.group();
        this.time.addEvent({
            delay: 8000,
            callback: this.spawnHunter,
            callbackScope: this,
            loop: true
        });

        this.powerUpGroup = this.physics.add.group();
        this.time.addEvent({
            delay: Phaser.Math.Between(12000, 20000),
            callback: this.spawnPowerUp,
            callbackScope: this,
            loop: true
        });

        this.physics.add.overlap(this.particles, this.foodGroup, this.collectFood, null, this);
        this.physics.add.overlap(this.particles, this.hazardGroup, this.hitHazard, null, this);
        this.physics.add.overlap(this.particles, this.hunterGroup, this.hitHunter, null, this);
        this.physics.add.overlap(this.particles, this.powerUpGroup, this.collectPowerUp, null, this);

        this.input.on('pointerdown', this.handlePointerDown, this);
        this.input.mouse.disableContextMenu();
    }

    shutdown() {
        this.input.off('pointerdown', this.handlePointerDown, this);
        this.time.removeAllEvents();

        if (this.trailEmitter) this.trailEmitter.manager.destroy();
        if (this.foodExplosionEmitter) this.foodExplosionEmitter.manager.destroy();
        if (this.reinforcementExplosionEmitter) this.reinforcementExplosionEmitter.manager.destroy();
        if (this.hazardExplosionEmitter) this.hazardExplosionEmitter.manager.destroy();

        if (this.particles) this.particles.destroy(true);
        if (this.foodGroup) this.foodGroup.destroy(true);
        if (this.hazardGroup) this.hazardGroup.destroy(true);
        if (this.hunterGroup) this.hunterGroup.destroy(true);
        if (this.powerUpGroup) this.powerUpGroup.destroy(true);
        if (this.influence_markers) this.influence_markers.destroy(true);

        if (this.background) this.background.destroy();

        this.influence_points = [];
        this.shieldTimer = null;
        this.speedBoostTimer = null;
        this.powerUpSpawnTimer = null;
        this.gameOver = false;
        this.shieldActive = false;
        this.speedBoostActive = false;
    }

    handlePointerDown(pointer) {
        if (pointer.y < 80) return;

        let type, color, marker;
        if (pointer.leftButtonDown()) {
            type = 'attractor';
            color = 0x00ff00;
            marker = this.add.circle(pointer.x, pointer.y, 8, color, 0.4);
        } else if (pointer.rightButtonDown()) {
            let removed = false;
            this.influence_markers.children.each(existingMarker => {
                if (existingMarker.getBounds().contains(pointer.x, pointer.y)) {
                    this.influence_points = this.influence_points.filter(ip => ip.marker !== existingMarker);
                    existingMarker.destroy();
                    removed = true;
                }
            });
            if (removed) return;

            type = 'repulsor';
            color = 0xff0000;
            marker = this.add.circle(pointer.x, pointer.y, 8, color, 0.4);
        } else {
            return;
        }

        const influencePoint = { x: pointer.x, y: pointer.y, type: type, marker: marker };
        this.influence_points.push(influencePoint);
        this.influence_markers.add(marker);
    }

    update(time, delta) {
        if (this.gameOver) {
            return;
        }

        this.background.tilePositionX += 0.4;
        this.background.tilePositionY -= 0.2;

        if (this.particles.countActive(true) === 0 && !this.gameOver) {
            this.gameOver = true;
            this.events.emit('gameOver');
            return;
        }

        if (this.foodGroup.countActive(true) === 0) {
            this.spawnFoodPattern();
        }

        this.hunterGroup.children.iterate(hunter => {
            if (this.particles.countActive(true) > 0) {
                const targetParticle = Phaser.Utils.Array.GetRandom(this.particles.getChildren());
                if (targetParticle) {
                    const angle = Phaser.Math.Angle.Between(hunter.x, hunter.y, targetParticle.x, targetParticle.y);
                    this.physics.velocityFromAngle(angle, 80, hunter.body.velocity);
                    hunter.rotation = angle;
                }
            }
        });

        const ATTRACTION_FORCE = 0.8;
        const REPULSION_FORCE = 1.2;

        this.particles.children.iterate((particle) => {
            particle.body.acceleration.set(0, 0);

            if (this.influence_points.length === 0) {
                if (Phaser.Math.RND.frac() < 0.02) {
                    const angle = Phaser.Math.RND.angle();
                    const force = Phaser.Math.RND.between(50, 150);
                    const vec = this.physics.velocityFromAngle(angle, force);
                    particle.body.velocity.x += vec.x;
                    particle.body.velocity.y += vec.y;
                }

                const speed = particle.body.velocity.length();
                if (speed > 30 && Phaser.Math.RND.frac() < 0.25) {
                    this.trailEmitter.emitParticleAt(particle.x, particle.y);
                }
                return;
            }

            let totalAcceleration = new Phaser.Math.Vector2(0, 0);
            this.influence_points.forEach(point => {
                const distance = Phaser.Math.Distance.Between(particle.x, particle.y, point.x, point.y);
                const angle = Phaser.Math.Angle.Between(particle.x, particle.y, point.x, point.y);

                if (point.type === 'attractor') {
                    const force = Math.min(distance * ATTRACTION_FORCE, 600);
                    totalAcceleration.x += Math.cos(angle) * force;
                    totalAcceleration.y += Math.sin(angle) * force;
                } else {
                    const force = Math.min(REPULSION_FORCE * 20000 / (distance * distance), 800);
                    totalAcceleration.x -= Math.cos(angle) * force;
                    totalAcceleration.y -= Math.sin(angle) * force;
                }
            });
            particle.body.acceleration.add(totalAcceleration);

            const speed = particle.body.velocity.length();
            if (speed > 30  && Phaser.Math.RND.frac() < 0.25) {
                this.trailEmitter.emitParticleAt(particle.x, particle.y);
            }
        });

        this.physics.world.wrap(this.particles, 2);
    }

    createParticle(x, y) {
        const particle = this.particles.create(x, y, 'particle');
        particle.body.setCircle(2);
        particle.setVelocity(Phaser.Math.Between(-100, 100), Phaser.Math.Between(-100, 100));
        particle.setBounce(0.8, 0.8);
        particle.setCollideWorldBounds(true);
        particle.body.useDamping = true;
        particle.body.setDrag(0.7);
        particle.body.setMaxVelocity(250);
        this.events.emit('particleCountChanged', this.particles.countActive(true));
        return particle;
    }

    spawnFoodPattern() {
        const patterns = ['circle', 'line', 'double_line'];
        const chosenPattern = Phaser.Math.RND.pick(patterns);

        const centerX = Phaser.Math.Between(200, this.game.config.width - 200);
        const centerY = Phaser.Math.Between(200, this.game.config.height - 200);

        switch (chosenPattern) {
            case 'circle':
                const radius = Phaser.Math.Between(80, 150);
                for (let i = 0; i < 12; i++) {
                    const angle = (i / 12) * Math.PI * 2;
                    this.createFood(centerX + Math.cos(angle) * radius, centerY + Math.sin(angle) * radius);
                }
                break;
            case 'line':
                for (let i = 0; i < 10; i++) {
                    this.createFood(centerX - 150 + (i * 30), centerY);
                }
                break;
            case 'double_line':
                 for (let i = 0; i < 8; i++) {
                    this.createFood(centerX - 120 + (i * 30), centerY - 20);
                    this.createFood(centerX - 120 + (i * 30), centerY + 20);
                }
                break;
        }
    }

    createFood(x, y) {
        const food = this.foodGroup.create(x, y, 'food');
        food.setCircle(5);
    }

    spawnHazard() {
        const x = Phaser.Math.Between(50, this.game.config.width - 50);
        const y = Phaser.Math.Between(100, this.game.config.height - 50);
        const hazard = this.hazardGroup.create(x, y, 'hazard');
        hazard.setCircle(7);
        hazard.setImmovable(true);
    }

    spawnHunter() {
        const x = Phaser.Math.RND.pick([0, this.game.config.width]);
        const y = Phaser.Math.Between(0, this.game.config.height);
        const hunter = this.hunterGroup.create(x, y, 'hunter');
        hunter.setCircle(8);
        hunter.setCollideWorldBounds(true);
        hunter.setBounce(1);
    }

    spawnPowerUp() {
        const powerUpTypes = ['shield_powerup', 'reinforcement_powerup', 'speed_boost_powerup'];
        const chosenType = Phaser.Math.RND.pick(powerUpTypes);

        const x = Phaser.Math.Between(50, this.game.config.width - 50);
        const y = Phaser.Math.Between(100, this.game.config.height - 50);

        const powerUp = this.powerUpGroup.create(x, y, chosenType);
        powerUp.setCircle(6);
        powerUp.setData('type', chosenType);

        this.tweens.add({
            targets: powerUp,
            alpha: { from: 0.5, to: 1 },
            scale: { from: 1, to: 1.2 },
            yoyo: true,
            duration: 800,
            repeat: -1
        });
    }

    collectFood(particle, food) {
        food.disableBody(true, true);
        this.events.emit('addScore', 10);
        this.foodExplosionEmitter.emitParticleAt(food.x, food.y);
    }

    collectPowerUp(particle, powerUp) {
        const powerUpType = powerUp.getData('type');
        const SPEED_BOOST_TINT = 0xffa500;
        const SHIELD_TINT = 0xffff00;

        if (powerUpType === 'shield_powerup') {
            if (this.shieldTimer) {
                this.shieldTimer.remove();
            }
            this.shieldActive = true;

            this.particles.children.iterate(p => p.setTint(SHIELD_TINT));

            this.events.emit('shieldActivated', 10000);

            this.shieldTimer = this.time.delayedCall(10000, () => {
                this.shieldActive = false;
                this.events.emit('shieldDeactivated');
                this.shieldTimer = null;

                this.particles.children.iterate(p => {
                    p.clearTint();
                    if (this.speedBoostActive) {
                        p.setTint(SPEED_BOOST_TINT);
                    }
                });
            });

        } else if (powerUpType === 'reinforcement_powerup') {
            const REINFORCEMENT_COUNT = 100;
            for (let i = 0; i < REINFORCEMENT_COUNT; i++) {
                this.createParticle(powerUp.x, powerUp.y);
            }
            this.events.emit('addScore', 50);
            this.reinforcementExplosionEmitter.emitParticleAt(powerUp.x, powerUp.y);

        } else if (powerUpType === 'speed_boost_powerup') {
            if (this.speedBoostTimer) {
                this.speedBoostTimer.remove();
            }
            this.speedBoostActive = true;

            const BOOST_DURATION = 7000;
            const BOOST_MAX_VELOCITY = 400;
            const NORMAL_MAX_VELOCITY = 250;

            this.particles.children.iterate(p => {
                p.body.setMaxVelocity(BOOST_MAX_VELOCITY);
                if (!this.shieldActive) {
                    p.setTint(SPEED_BOOST_TINT);
                }
            });

            this.events.emit('speedBoostActivated', BOOST_DURATION);

            this.speedBoostTimer = this.time.delayedCall(BOOST_DURATION, () => {
                this.speedBoostActive = false;
                this.events.emit('speedBoostDeactivated');
                this.speedBoostTimer = null;

                this.particles.children.iterate(p => {
                    p.body.setMaxVelocity(NORMAL_MAX_VELOCITY);
                    p.clearTint();
                    if (this.shieldActive) {
                        p.setTint(SHIELD_TINT);
                    }
                });
            });
        }
        powerUp.destroy();
    }

    hitHazard(particle, hazard) {
        if (this.shieldActive) {
            const angle = Phaser.Math.Angle.Between(hazard.x, hazard.y, particle.x, particle.y);
            const bounceVelocity = this.physics.velocityFromAngle(angle, 150);
            particle.body.velocity.copy(bounceVelocity);
            return;
        }

        particle.destroy();
        this.events.emit('particleCountChanged', this.particles.countActive(true));
        this.cameras.main.shake(100, 0.008);

        this.hazardExplosionEmitter.emitParticleAt(particle.x, particle.y);

        hazard.disableBody(true, true);
        this.time.delayedCall(2000, () => {
            this.spawnHazard();
            hazard.enableBody(true, hazard.x, hazard.y, true, true);
        });
    }

    hitHunter(particle, hunter) {
        if (this.shieldActive) {
            const angle = Phaser.Math.Angle.Between(hunter.x, hunter.y, particle.x, particle.y);
            const bounceVelocity = this.physics.velocityFromAngle(angle, 250);
            particle.body.velocity.copy(bounceVelocity);
            return;
        }

        particle.destroy();
        this.events.emit('particleCountChanged', this.particles.countActive(true));
        this.cameras.main.shake(100, 0.008);

        this.hazardExplosionEmitter.emitParticleAt(particle.x, particle.y);

        hunter.destroy();
        this.time.delayedCall(5000, this.spawnHunter, [], this);
    }
}
